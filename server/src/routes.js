/* ================================================================
   Rutas del backend AMEC
   ----------------------------------------------------------------
   Pagos (Culqi):
     POST /api/pagos/cargo        Cobro con token Culqi.js
     POST /api/webhooks/culqi     Webhook de Culqi → marca pagado
     GET  /api/pagos/:chargeId    Verificación de un cargo
   Pedidos:
     GET  /api/pedidos            Listado (admin)
     GET  /api/pedidos/:id        Detalle de un pedido
   Salud:
     GET  /api/salud
   ================================================================ */
import { Router } from 'express'
import { procesarCargo, webhookCulqi, verDetalleCargo } from './pagos.controller.js'
import { verPedido, listar } from './pedidos.controller.js'
import * as culqi from './culqi.js'

const rutas = Router()

rutas.get('/salud', (_req, res) => {
  res.json({
    servicio: 'AMEC SERVER',
    pasarela: 'culqi',
    modo: culqi.modo(),
    configurado: culqi.configuracionLista(),
    hora: new Date().toISOString(),
  })
})

rutas.post('/pagos/cargo', procesarCargo)
rutas.post('/webhooks/culqi', webhookCulqi)
rutas.get('/pagos/:chargeId', verDetalleCargo)

rutas.get('/pedidos', listar)
rutas.get('/pedidos/:id', verPedido)

export default rutas
