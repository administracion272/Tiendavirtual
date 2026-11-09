/* ================================================================
   Controlador de pedidos — consultas desde el frontend / admin
   ================================================================ */
import { obtenerPedido, listarPedidos } from './db.js'

export function verPedido(req, res) {
  const pedido = obtenerPedido(req.params.id)
  if (!pedido) return res.status(404).json({ error: 'Pedido no encontrado' })
  res.json(pedido)
}

export function listar(req, res) {
  res.json({ pedidos: listarPedidos() })
}
