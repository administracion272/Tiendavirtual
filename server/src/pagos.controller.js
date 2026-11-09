/* ================================================================
   Controlador de pagos (pasarela Culqi)
   ----------------------------------------------------------------
   * procesarCargo   → POST /api/pagos/cargo   (el front manda token Culqi.js)
   * webhookCulqi    → POST /api/webhooks/culqi (URL configurada en panel Culqi)
   * verDetalleCargo → GET  /api/pagos/:chargeId (verificación manual)

   Regla anti-fraude: el monto SIEMPRE se recalcula desde la base de
   datos; el frontend nunca define cuánto se cobra.
   Marco automático: si Culqi confirma el cargo (vía respuesta del
   cargo o vía webhook, consultando a la API), el pedido queda
   estado='Pagado' con transaccion_culqi y fecha de pago.
   ================================================================ */
import * as culqi from './culqi.js'
import {
  obtenerPedido,
  marcarPedidoPagado,
  marcarPagoFallido,
  registrarPago,
  registrarEvento,
  eventoProcesado,
} from './db.js'

/* ---------- POST /api/pagos/cargo ---------- */

export async function procesarCargo(req, res) {
  const { pedido: pedidoId, token, email } = req.body ?? {}

  if (!culqi.configuracionLista()) {
    return res.status(503).json({
      error: 'Pasarela no configurada: falta CULQI_SECRET_KEY en el backend.',
    })
  }
  if (!pedidoId || !token || !email) {
    return res.status(400).json({ error: 'Se requieren { pedido, token, email }.' })
  }

  const pedido = obtenerPedido(pedidoId)
  if (!pedido) return res.status(404).json({ error: 'Pedido no encontrado.' })
  if (pedido.pagado) return res.status(409).json({ error: 'Este pedido ya está pagado.' })
  if (pedido.monto <= 0) {
    return res.status(422).json({ error: 'El pedido no tiene monto calculado en el servidor.' })
  }

  const { exitoso, estadoHttp, datos } = await culqi.crearCargo({
    monto: pedido.monto,
    token,
    email: pedido.cliente_email || email,
    pedidoId: pedido.id,
    celular: pedido.cliente_telefono,
  })

  const idCargo = datos?.id ?? null
  const pagado = exitoso && culqi.esCargoExitoso(datos)

  if (pagado) {
    registrarPago({
      pedidoId: pedido.id,
      tipo: 'cargo',
      transaccion: idCargo,
      monto: pedido.monto,
      estado: 'exitoso',
      resultado: JSON.stringify(datos),
    })
    const marco = marcarPedidoPagado(pedido.id, {
      transaccion: idCargo,
      estadoCulqi: datos?.outcome?.type ?? null,
    })
    return res.status(200).json({
      pagado: true,
      pedido: pedido.id,
      estado: 'Pagado',
      cargo: idCargo,
      aplicado: marco.aplicado,
    })
  }

  /* Rechazo del banco o error del servicio */
  const mensaje = culqi.mensajeDeRechazo(datos)
  registrarPago({
    pedidoId: pedido.id,
    tipo: 'cargo',
    transaccion: idCargo,
    monto: pedido.monto,
    estado: 'fallido',
    resultado: JSON.stringify(datos),
  })
  marcarPagoFallido(pedido.id, { transaccion: idCargo, mensaje })

  return res.status(estadoHttp === 201 ? 402 : estadoHttp === 200 ? 402 : estadoHttp).json({
    pagado: false,
    pedido: pedido.id,
    error: mensaje,
  })
}

/* ---------- POST /api/webhooks/culqi ---------- */

/** Busca recursivamente el id de cargo (chr_) en cualquier nivel del cuerpo del evento */
function extraerIdCargo(valor) {
  if (!valor || typeof valor !== 'object') return null
  if (typeof valor.id === 'string' && valor.id.startsWith('chr_')) return valor.id
  for (const hoja of Object.values(valor)) {
    const hallado = extraerIdCargo(hoja)
    if (hallado) return hallado
  }
  return null
}

export async function webhookCulqi(req, res) {
  const cuerpo = req.body ?? {}
  const eventoId = typeof cuerpo.id === 'string' ? cuerpo.id : `sin_id_${Date.now()}`
  const tipoEvento = cuerpo.type ?? cuerpo.evento ?? 'desconocido'

  if (!culqi.configuracionLista()) {
    registrarEvento(eventoId, tipoEvento, cuerpo, false, 'sin_configurar')
    return res.status(503).json({ error: 'Webhook recibido pero la pasarela no está configurada (CULQI_SECRET_KEY).' })
  }

  const idCargo = extraerIdCargo(cuerpo)
  if (!idCargo) {
    registrarEvento(eventoId, tipoEvento, cuerpo, false, 'sin_id_de_cargo')
    /* Culqi exige 200 para no reintentar; un evento sin cargo no se puede procesar */
    return res.status(200).json({ recibido: true, procesado: false, motivo: 'sin_id_de_cargo' })
  }

  /* Idempotencia: si el mismo evento ya se procesó, responder OK sin doble cobro */
  if (eventoProcesado(eventoId)) {
    return res.status(200).json({ recibido: true, procesado: true, motivo: 'duplicado_ignorado' })
  }

  /* Verificar SIEMPRE contra la API de Culqi (el cuerpo del webhook no es fuente de verdad) */
  const { encontrado, transaccion } = await culqi.obtenerCargo(idCargo)
  if (!encontrado) {
    registrarEvento(eventoId, tipoEvento, cuerpo, false, `cargo_no_verificado:${idCargo}`)
    /* 500 → Culqi reintentará más tarde */
    return res.status(500).json({ error: 'No se pudo verificar el cargo con Culqi; se reintentará.' })
  }

  registrarPago({
    pedidoId: transaccion?.metadata?.pedido_id ?? 'desconocido',
    tipo: 'webhook',
    transaccion: idCargo,
    monto: transaccion?.amount ?? null,
    estado: culqi.esCargoExitoso(transaccion) ? 'exitoso' : 'fallido',
    resultado: JSON.stringify(transaccion),
  })

  if (!culqi.esCargoExitoso(transaccion)) {
    registrarEvento(eventoId, tipoEvento, cuerpo, true, `cargo_no_pagado:${transaccion?.outcome?.type ?? ''}`)
    return res.status(200).json({ recibido: true, procesado: true, pagado: false })
  }

  const pedidoId = transaccion?.metadata?.pedido_id
  if (!pedidoId) {
    registrarEvento(eventoId, tipoEvento, cuerpo, false, 'cargo_sin_pedido_en_metadata')
    return res.status(200).json({ recibido: true, procesado: false, motivo: 'sin_pedido_asociado' })
  }

  /* —— Marca automática del pedido como pagado —— */
  const marco = marcarPedidoPagado(pedidoId, {
    transaccion: idCargo,
    estadoCulqi: transaccion?.outcome?.type ?? 'venta_exitosa',
  })

  registrarEvento(eventoId, tipoEvento, cuerpo, true, `pedido_${pedidoId}:${marco.motivo}`)
  return res.status(200).json({ recibido: true, procesado: true, pagado: true, pedido: pedidoId, aplicado: marco.aplicado })
}

/* ---------- GET /api/pagos/:chargeId ---------- */

export async function verDetalleCargo(req, res) {
  if (!culqi.configuracionLista()) {
    return res.status(503).json({ error: 'Pasarela no configurada.' })
  }
  const { encontrado, transaccion } = await culqi.obtenerCargo(req.params.chargeId)
  if (!encontrado) return res.status(404).json({ error: 'Cargo no encontrado en Culqi.' })
  res.json({ pagado: culqi.esCargoExitoso(transaccion), cargo: transaccion })
}
