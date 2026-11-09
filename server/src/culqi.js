/* ================================================================
   Cliente de la pasarela Culqi (Perú) — API v2
   ----------------------------------------------------------------
   * Los montos van en CÉNTIMOS (S/ 10.00 → amount: 1000).
   * La CLAVE SECRETA vive solo aquí (backend); en el frontend se
     usa la clave pública con Culqi.js para generar el token
     (source_id: tkn_xxx) de la tarjeta.
   * Los webhooks de Culqi NO traen firma criptográfica; por eso
     la regla de oro es: recibir el evento → contactar a Culqi
     directamente (obtenerCargo) → decidir según SU respuesta.
   Docs: https://docs.culqi.com
   ================================================================ */

const API_BASE = process.env.CULQI_API_URL || 'https://api.culqi.com/v2'
const SECRET_KEY = process.env.CULQI_SECRET_KEY

export function configuracionLista() {
  return Boolean(SECRET_KEY)
}

export function modo() {
  if (!SECRET_KEY) return 'sin_configurar'
  return SECRET_KEY.includes('_live_') ? 'live' : 'test'
}

async function llamada(metodo, rutaId, cuerpo = null) {
  const respuesta = await fetch(`${API_BASE}/${rutaId}`, {
    method: metodo,
    headers: {
      Authorization: `Bearer ${SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
  })
  const datos = await respuesta.json().catch(() => ({}))
  return { estado: respuesta.status, datos }
}

/**
 * Crea un cargo (cobro) en Culqi con el token generado en el front.
 * @param {object} p
 * @param {number} p.monto          Total en CÉNTIMOS (a cargo del servidor)
 * @param {string} p.token          source_id (tkn_test_xxx) generado por Culqi.js
 * @param {string} p.email          Correo del comprador (obligatorio por Culqi)
 * @param {string} p.pedidoId       Folio interno AMEC-XXXXXX (va en metadata)
 */
export async function crearCargo({ monto, token, email, pedidoId, celular = null }) {
  if (!configuracionLista()) {
    throw new Error('CULQI_SECRET_KEY no configurada en el servidor')
  }

  const { estado, datos } = await llamada('POST', 'charges', {
    amount: monto,
    currency_code: 'PEN',
    email,
    source_id: token,
    metadata: { pedido_id: pedidoId },
    ...(celular ? { antifraud_details: { phone_number: celular, country_code: 'PE' } } : {}),
  })

  return { exitoso: estado === 201, estadoHttp: estado, datos }
}

/** Consulta un cargo directamente a Culqi (fuente de verdad para webhooks) */
export async function obtenerCargo(idCargo) {
  const { estado, datos } = await llamada('GET', `charges/${idCargo}`)
  return { encontrado: estado === 200, transaccion: datos }
}

/** Un cargo de Culqi se considera pagado si "paid" es true o el outcome reporta venta exitosa */
export function esCargoExitoso(charge) {
  if (!charge) return false
  return charge.paid === true
    || charge.outcome?.type === 'venta_exitosa'
    || charge.status === 'paid'
}

/** Mensaje humano del rechazo, para mostrar al cliente */
export function mensajeDeRechazo(charge) {
  return charge?.outcome?.merchant_message
    || charge?.outcome?.user_message
    || charge?.error?.merchant_message
    || 'El cobro fue rechazado por la pasarela.'
}
