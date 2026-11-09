/* ================================================================
   Script de demo
   ----------------------------------------------------------------
   npm.cmd run demo
   ----------------------------------------------------------------
   Crea un pedido de prueba en SQLite para poder ensayar el flujo:
     1) POST /api/pagos/cargo      { pedido, token, email }
     2) POST /api/webhooks/culqi   (evento de Culqi)
   Con claves sk_test configuradas se pueden usar las tarjetas de
   prueba de Culqi; sin claves el servidor responde con el error
   de configuración esperado (y guarda el pedido igualmente).
   ================================================================ */
import { crearPedido } from '../src/db.js'
import { modo } from '../src/culqi.js'

const pedido = crearPedido({
  id: 'AMEC-TEST01',
  fecha: new Date().toLocaleString('es-PE', { dateStyle: 'medium', timeStyle: 'short' }),
  canal: 'B2C',
  cliente: {
    nombre: 'Cliente Demo',
    email: 'demo@amec.com',
    telefono: '994 254 676',
    direccion: 'Av. Los Nutrientes 123',
    ciudad: 'Chiclayo',
    metodo: 'domicilio',
  },
  items: [
    { producto_id: 'megamec', nombre: 'Megamec', formato: 'Gomitas x 60', cantidad: 2, precio_unitario: 2990, tipo_precio: 'B2C' },
    { producto_id: 'rhc-colageno', nombre: 'RHC Colágeno', formato: 'Caja x 30 sachets', cantidad: 1, precio_unitario: 12990, tipo_precio: 'B2C' },
  ],
})

console.log('✅ Pedido demo creado en SQLite:')
console.log(`   ${pedido.id} · S/ ${(pedido.monto_calculado / 100).toFixed(2)} · ${pedido.items.length} ítems`)
console.log(`   Modo pasarela: ${modo()}`)
console.log(`
Ensaya con PowerShell:
  # Webhook (la marca automática de "Pagado"):
  Invoke-RestMethod -Method Post -Uri http://127.0.0.1:3312/api/webhooks/culqi -ContentType 'application/json' -Body '{"id":"evt_demo_1","type":"charge.succeeded","data":{"object":"charge","id":"chr_demo_abc","paid":true}}'

  # Consultar el pedido (estado tras el webhook):
  Invoke-RestMethod -Uri http://127.0.0.1:3312/api/pedidos/AMEC-TEST01
`)
