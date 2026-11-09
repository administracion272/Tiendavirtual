/* ================================================================
   Mock de la API de Culqi (SOLO para desarrollo)
   ----------------------------------------------------------------
   node scripts/mock-culqi.js [puerto]
   Emula GET /v2/charges/:id con una venta exitosa. Permite probar
   el webhook y el marcado automático sin claves reales:
     $env:CULQI_API_URL='http://127.0.0.1:3399'
     $env:CULQI_SECRET_KEY='sk_test_mock'
   ================================================================ */
import express from 'express'

const PORT = Number(process.argv[2] || 3399)
const CARGO = {
  id: 'chr_test_abc',
  object: 'charge',
  amount: 18970,
  currency: 'PEN',
  paid: true,
  outcome: { type: 'venta_exitosa', merchant_message: 'Operación autorizada por el banco emisor' },
  metadata: { pedido_id: 'AMEC-TEST01' },
}

const app = express()
app.use(express.json())

app.get(['/v2/charges/:id', '/charges/:id'], (req, res) => {
  if (req.params.id === CARGO.id) return res.status(200).json(CARGO)
  return res.status(404).json({ error: 'cargo_no_encontrado' })
})

app.post(['/v2/charges', '/charges'], (req, res) => {
  /* Simula la creación de cargo: exitoso si el token empieza con tkn_ */
  const correcto = typeof req.body?.source_id === 'string' && req.body.source_id.startsWith('tkn_')
  if (!correcto) {
    return res.status(402).json({ object: 'error', outcome: { type: 'card_declined' }, error: { merchant_message: 'Token inválido' } })
  }
  res.status(201).json({ ...CARGO, id: `chr_mock_${Date.now()}` })
})

app.listen(PORT, '127.0.0.1', () => {
  console.log(`🧪 Mock Culqi en http://127.0.0.1:${PORT}`)
})
