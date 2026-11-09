/* ================================================================
   AMEC SERVER — index
   ----------------------------------------------------------------
   npm.cmd run start   (o dev con --watch)
   Puerto por defecto: 3312  (ver server/.env.example)
   ================================================================ */
import express from 'express'
import rutasApi from './src/routes.js'

const PUERTO = Number(process.env.PORT || 3312)
const app = express()

/* Webhooks son server-to-server: CORS no afecta; los endpoints de
   la tienda se consumen con el origen del front (3311) */
app.use(express.json({ limit: '1mb' }))
app.get('/', (_req, res) => res.redirect('/api/salud'))
app.use('/api', rutasApi)

/* Manejo de errores (incluye JSON malformado) */
app.use((error, _req, res, _siguiente) => {
  if (error?.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Cuerpo JSON inválido.' })
  }
  console.error('⚠️', error)
  res.status(500).json({ error: 'Error interno del servidor.' })
})

app.listen(PUERTO, '127.0.0.1', () => {
  console.log(`✅ AMEC SERVER en http://127.0.0.1:${PUERTO}`)
  console.log(`   Culqi: ${process.env.CULQI_SECRET_KEY ? 'configurado 🟢' : 'FALTA CULQI_SECRET_KEY 🔴 (ver server/.env.example)'}`)
  console.log(`   Webhook: POST http://127.0.0.1:${PUERTO}/api/webhooks/culqi`)
})
