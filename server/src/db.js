/* ================================================================
   Base de datos — SQLite (node:sqlite, integrado en Node ≥ 22)
   ----------------------------------------------------------------
   Tablas:
     usuarios        Cuentas B2C / B2B / admin
     pedidos         Cabecera de pedido + estado de pago
     pedidos_items   Líneas de producto por pedido
     pagos           Registro de cargos y transacciones Culqi
     eventos_webhook Bitácora idempotente de eventos recibidos

   Convención monetaria: TODOS los montos van en CÉNTIMOS
   (soles × 100), igual que exige la API de Culqi.
     S/ 49.90 → 4990
   ================================================================ */
import { DatabaseSync } from 'node:sqlite'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const DIR = path.dirname(fileURLToPath(import.meta.url))
const DB_PATH = process.env.DB_PATH || path.join(DIR, '..', 'datos', 'amec.sqlite')

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true })

export const db = new DatabaseSync(DB_PATH)

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS usuarios (
    id            TEXT PRIMARY KEY,
    rol           TEXT NOT NULL CHECK (rol IN ('b2c', 'b2b', 'admin')),
    estado        TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'aprobado', 'rechazado')),
    email         TEXT NOT NULL UNIQUE,
    clave_inicio  TEXT,                             -- solo para demo; en producción: hash (bcrypt/argon2)
    nombre        TEXT,
    empresa       TEXT,
    contacto      TEXT,
    ruc           TEXT,
    ciudad        TEXT,
    creado_en     TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS pedidos (
    id                   TEXT PRIMARY KEY,            -- folio AMEC-XXXXXX
    ts                   INTEGER,                     -- epoch ms del frontend
    fecha                TEXT,                        -- fecha legible (es-PE)
    canal                TEXT NOT NULL CHECK (canal IN ('B2C', 'B2B')),
    cliente_nombre       TEXT,
    cliente_email        TEXT NOT NULL,
    cliente_empresa      TEXT,
    cliente_telefono     TEXT,
    cliente_direccion    TEXT,
    cliente_ciudad       TEXT,
    cliente_metodo       TEXT,
    cliente_notas        TEXT,
    unidades             INTEGER NOT NULL DEFAULT 0,
    moneda               TEXT NOT NULL DEFAULT 'PEN',
    monto                INTEGER NOT NULL DEFAULT 0,  -- TOTAL encéntimos (soles × 100)
    estado               TEXT NOT NULL DEFAULT 'Pendiente de pago',
    pagado               INTEGER NOT NULL DEFAULT 0,
    pagado_en            TEXT,
    transaccion_culqi    TEXT,                        -- cargoid chr_xxx del último cargo
    estado_culqi         TEXT,                        -- outcome.type devuelto por Culqi
    creado_en            TEXT NOT NULL DEFAULT (datetime('now')),
    actualizado_en       TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS pedidos_items (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    pedido_id       TEXT NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
    producto_id     TEXT,
    nombre          TEXT NOT NULL,
    formato         TEXT,
    cantidad        INTEGER NOT NULL DEFAULT 1,
    precio_unitario INTEGER NOT NULL DEFAULT 0,      -- céntimos
    tipo_precio     TEXT NOT NULL DEFAULT 'B2C'      -- B2C | B2B
  );

  CREATE TABLE IF NOT EXISTS pagos (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    pedido_id     TEXT NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
    proveedor     TEXT NOT NULL DEFAULT 'culqi',
    tipo          TEXT NOT NULL CHECK (tipo IN ('cargo', 'webhook', 'manual')),
    transaccion   TEXT,                              -- chr_xxx
    monto         INTEGER,
    moneda        TEXT DEFAULT 'PEN',
    estado        TEXT NOT NULL CHECK (estado IN ('exitoso', 'fallido', 'pendiente')),
    resultado     TEXT,                              -- JSON cruda de la respuesta de Culqi
    creado_en     TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS eventos_webhook (
    evento_id   TEXT PRIMARY KEY,                    -- evt_xxx (idempotencia)
    tipo        TEXT,
    datos       TEXT,                                -- JSON recibido de Culqi
    procesado   INTEGER NOT NULL DEFAULT 0,
    resultado   TEXT,
    creado_en   TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_pedidos_email    ON pedidos(cliente_email);
  CREATE INDEX IF NOT EXISTS idx_pedidos_estado   ON pedidos(estado);
  CREATE INDEX IF NOT EXISTS idx_pagos_pedido     ON pagos(pedido_id);
`);

/* ==================== Pedidos ==================== */

/** Monto calculado en servidor desde los items (los céntimos NUNCA se confían del frontend) */
function montoDesdeItems(items) {
  const total = (items || []).reduce((suma, item) => suma + item.cantidad * item.precio_unitario, 0)
  return Math.max(0, Math.round(total))
}

export function crearPedido(datos) {
  const { id, ts = Date.now(), fecha, canal, cliente = {}, items = [] } = datos
  if (!id || !canal || !cliente.email || items.length === 0) {
    throw new Error('Pedido incompleto: se requieren id, canal, cliente.email e items')
  }

  const unidades = items.reduce((n, i) => n + i.cantidad, 0)
  const monto = montoDesdeItems(items)

  const insertar = db.prepare(`
    INSERT INTO pedidos (
      id, ts, fecha, canal,
      cliente_nombre, cliente_email, cliente_empresa, cliente_telefono,
      cliente_direccion, cliente_ciudad, cliente_metodo, cliente_notas,
      unidades, moneda, monto, estado
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PEN', ?, 'En preparación (pago pendiente)')
  `)

  insertar.run(
    id, ts, fecha ?? new Date(ts).toISOString(), canal,
    cliente.nombre ?? null, cliente.email.toLowerCase(), cliente.empresa ?? null,
    cliente.telefono ?? null, cliente.direccion ?? null, cliente.ciudad ?? null,
    cliente.metodo ?? 'domicilio', cliente.notas ?? null,
    unidades, monto,
  )

  const agregarItem = db.prepare(`
    INSERT INTO pedidos_items (pedido_id, producto_id, nombre, formato, cantidad, precio_unitario, tipo_precio)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `)
  for (const item of items) {
    agregarItem.run(
      id, item.producto_id ?? null, item.nombre, item.formato ?? null,
      item.cantidad, item.precio_unitario, item.tipo_precio ?? canal,
    )
  }

  return { ...obtenerPedido(id), monto_calculado: monto }
}

export function obtenerPedido(id) {
  const pedido = db.prepare('SELECT * FROM pedidos WHERE id = ?').get(id)
  if (!pedido) return null
  pedido.items = db.prepare('SELECT * FROM pedidos_items WHERE pedido_id = ? ORDER BY id').all(id)
  return pedido
}

export function listarPedidos({ limite = 200 } = {}) {
  return db.prepare(
    'SELECT * FROM pedidos ORDER BY COALESCE(ts, 0) DESC, creado_en DESC LIMIT ?',
  ).all(limite)
}

/** Marca el pedido como PAGADO de forma idempotente. Devuelve true si aplicó el cambio. */
export function marcarPedidoPagado(id, { transaccion = null, estadoCulqi = null } = {}) {
  const pedido = db.prepare('SELECT id, pagado FROM pedidos WHERE id = ?').get(id)
  if (!pedido) return { aplicado: false, motivo: 'pedido_no_encontrado' }
  if (pedido.pagado) return { aplicado: false, motivo: 'ya_pagado' }

  db.prepare(`
    UPDATE pedidos
    SET estado = 'Pagado',
        pagado = 1,
        pagado_en = datetime('now'),
        transaccion_culqi = COALESCE(?, transaccion_culqi),
        estado_culqi = COALESCE(?, estado_culqi),
        actualizado_en = datetime('now')
    WHERE id = ?
  `).run(transaccion, estadoCulqi, id)

  /* Si existe un pago previo caído por este pedido, se limpia el "error" en los reportes */
  db.prepare(`UPDATE pagos SET estado = 'exitoso' WHERE pedido_id = ? AND estado = 'pendiente'`).run(id)

  return { aplicado: true, motivo: 'marcado_pagado' }
}

/** Registra intento fallido o rechazo del cobro */
export function marcarPagoFallido(id, { transaccion = null, mensaje = null } = {}) {
  db.prepare(`
    UPDATE pedidos
    SET estado = 'Pago rechazado',
        transaccion_culqi = COALESCE(?, transaccion_culqi),
        estado_culqi = ?,
        actualizado_en = datetime('now')
    WHERE id = ? AND pagado = 0
  `).run(transaccion, mensaje, id)
}

/* ==================== Pagos ==================== */

export function registrarPago({ pedidoId, tipo, transaccion = null, monto = null, moneda = 'PEN', estado, resultado = null }) {
  if (transaccion) {
    const existente = db.prepare('SELECT id FROM pagos WHERE transaccion = ?').get(transaccion)
    if (existente) return existente.id
  }
  const info = db.prepare(`
    INSERT INTO pagos (pedido_id, tipo, transaccion, monto, moneda, estado, resultado)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(pedidoId, tipo, transaccion, monto, moneda, estado, resultado)
  return info.lastInsertRowid
}

/* ==================== Eventos webhook ==================== */

export function registrarEvento(eventoId, tipo, datos, procesado, resultado) {
  /* UPSERT: un evento reintentado por Culqi (fue fallar la 1.ª vez)
     actualiza la fila en lugar de conservar el proceso=0 original */
  db.prepare(`
    INSERT INTO eventos_webhook (evento_id, tipo, datos, procesado, resultado)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(evento_id) DO UPDATE SET
      tipo      = excluded.tipo,
      datos     = excluded.datos,
      procesado = excluded.procesado,
      resultado = excluded.resultado
  `).run(eventoId, tipo, JSON.stringify(datos), procesado ? 1 : 0, resultado)
}

export function eventoProcesado(eventoId) {
  const fila = db.prepare('SELECT procesado FROM eventos_webhook WHERE evento_id = ?').get(eventoId)
  return Boolean(fila?.procesado)
}
