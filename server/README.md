# AMEC SERVER — Pagos con Culqi

Backend de pedidos y pagos para la tienda AMEC NUTRITION (pasarela **Culqi**, Perú).

## Puesta en marcha

```powershell
cd server
copy .env.example .env      # y coloca tus claves pk_test_… / sk_test_… del panel Culqi
npm.cmd install
npm.cmd run dev             # http://127.0.0.1:3312
```

Base de datos: **SQLite** (`server/datos/amec.sqlite`, se crea sola al arrancar).
Todos los montos se almacenan en **céntimos** (soles × 100), igual que Culqi.

## Base de datos

| Tabla | Propósito |
|---|---|
| `usuarios` | Cuentas B2C / B2B / admin (en demo: `clave_inicio` texto; en producción usar hash) |
| `pedidos` | Cabecera del pedido + estado del pago (`estado`, `pagado`, transaccion/fecha de Culqi) |
| `pedidos_items` | Líneas de producto (nombre, cantidad, precio_unitario, tipo B2B/B2C) |
| `pagos` | Bitácora de cargos (`chr_xxx`), fallidos y webhooks, con la respuesta cruda |
| `eventos_webhook` | Idempotencia de eventos `evt_xxx` (evita dobles marcas por reintentos) |

## API

| Método | Ruta | Uso |
|---|---|---|
| POST | `/api/pagos/cargo` | Cobra con el token del front: `{ pedido, token, email }`. El monto se recalcula del pedido en BD (el front nunca define el cobro). En éxito marca el pedido como **Pagado** en el acto. |
| POST | `/api/webhooks/culqi` | Endpoint para el panel de Culqi. Recibe el evento, **verifica el cargo llamando a la API de Culqi** y marca el pedido pagado automáticamente. Idempotente (ignora eventos duplicados). |
| GET | `/api/pagos/:chargeId` | Verificación manual de un cargo. |
| GET | `/api/pedidos` · `/api/pedidos/:id` | Listado y detalle de pedidos. |
| GET | `/api/salud` | Estado del servicio y modo de la pasarela (test/live/sin_configurar). |

## Flujo completo de pago

1. **Frontend**: con la clave **pública** (`CULQI_PUBLIC_KEY`), Culqi.js tokeniza la tarjeta → `token` (`tkn_…`). La clave secreta JAMÁS va al navegador.
2. **Frontend → backend**: `POST /api/pagos/cargo` con `{ pedido, token, email }`.
3. **Backend → Culqi**: `POST /v2/charges` con el monto recalculado desde SQLite.
4. **Marco automático por duplicidad** (doble garantía):
   - Si la respuesta del cargo confirma pago → pedido `Pagado` inmediato.
   - Además Culqi dispara el **webhook** a `/api/webhooks/culqi`; el backend vuelve a consultar el cargo a la API y confirma la marca (sirve de respaldo si la app del cliente se cerró).
5. Rechazos: el pedido pasa a `Pago rechazado` con el mensaje del banco.

## Webhook en producción

- URL a registrar en el panel Culqi: `https://tu-dominio.com/api/webhooks/culqi` (HTTPS obligatorio).
- Los webhooks de Culqi no llevan firma; por eso **nunca** se marca el pedido con los datos del cuerpo: siempre se re-consulta el cargo a la API con la clave secreta.
- Respuesta rápida `200` evita reintentos; un error temporal devuelve `500` y Culqi reintenta solo.

## Tarjetas de prueba (modo test)

Las publica Culqi en su documentación; p. ej. `4111 1111 1111 1111` (Visa) resulta en venta exitosa, y la `4000 0000 0000 0002` en rechazo.

## Pendiente para producción

- Autenticación de endpoints admin (JWT/sesión) para `/api/pedidos`.
- Sustituir la demo del front (localStorage) por llamadas reales a estos endpoints.
- Hash de contraseñas (bcrypt/argon2) y filament de facturación.
