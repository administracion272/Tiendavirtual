/* ================================================================
   PANEL ADMINISTRATIVO — ruta independiente #/admin
   ----------------------------------------------------------------
   * Layout propio (sidebar + contenido), sin modales ni pop-ups.
   * Acceso restringido: solo sesión admin@amec.com (rol admin).
   * Módulos: Dashboard · Pedidos · Productos (CRUD) · Envíos
     · Promociones y cupones · Apariencia · SEO.
   Los datos viven en localStorage (demo); el catálogo de productos
   usa el array gestionado por App — cada acción dispara callbacks.
   ================================================================ */
import { useState } from 'react'
import { formatearPrecio, TIPOGRAFIAS, textoASlug } from './configuracion.js'
import {
  procesarImagenProducto,
  procesarLogo,
  ESPECIFICACION_IMAGEN,
  ESPECIFICACION_LOGO,
} from './imagenes.js'

/* ============ Estados de pedido ============ */

export const ESTADOS_PEDIDO = [
  { id: 'pago', etiqueta: 'Pendiente de pago', icono: '🧾' },
  { id: 'confirmado', etiqueta: 'Confirmado', icono: '✅' },
  { id: 'preparacion', etiqueta: 'En preparación', icono: '📦' },
  { id: 'enviado', etiqueta: 'Enviado', icono: '🚚' },
  { id: 'entregado', etiqueta: 'Entregado', icono: '🏠' },
  { id: 'cancelado', etiqueta: 'Cancelado', icono: '✕' },
]

export const PILL_ESTADO = estado => {
  const canon = ESTADOS_PEDIDO.find(x => x.etiqueta === estado)
  return canon ? `estado-pill estado-${canon.id}` : 'estado-pill estado-historial'
}

/* ============ Página de pedidos (tabla + detalle) ============ */

const RANGOS_FECHA = [
  { id: 'todas', etiqueta: 'Todas las fechas' },
  { id: 'hoy', etiqueta: 'Hoy' },
  { id: '7d', etiqueta: 'Últimos 7 días' },
  { id: '30d', etiqueta: 'Últimos 30 días' },
]

function limiteFecha(rangoId) {
  if (rangoId === 'hoy') return new Date().setHours(0, 0, 0, 0)
  if (rangoId === '7d') return Date.now() - 7 * 24 * 3600 * 1000
  if (rangoId === '30d') return Date.now() - 30 * 24 * 3600 * 1000
  return null
}

function PanelPedidos({ pedidos, alCambiarEstado }) {
  const [texto, setTexto] = useState('')
  const [estadoFiltro, setEstadoFiltro] = useState('todos')
  const [rangoFecha, setRangoFecha] = useState('todas')
  const [detalleId, setDetalleId] = useState(null)

  const desde = limiteFecha(rangoFecha)
  const busqueda = texto.trim().toLowerCase()

  const filtrados = pedidos
    .filter(pedido => {
      const cliente = [
        pedido.cliente.empresa,
        pedido.cliente.nombre,
        pedido.cliente.email,
      ].filter(Boolean).join(' ').toLowerCase()

      const coincideTexto = !busqueda
        || cliente.includes(busqueda)
        || pedido.id.toLowerCase().includes(busqueda)

      const coincideEstado = estadoFiltro === 'todos'
        || pedido.estado === ESTADOS_PEDIDO.find(e => e.id === estadoFiltro)?.etiqueta

      const coincideFecha = !desde || (pedido.ts && pedido.ts >= desde)

      return coincideTexto && coincideEstado && coincideFecha
    })
    .sort((a, b) => (b.ts ?? 0) - (a.ts ?? 0))

  const detalle = pedidos.find(p => p.id === detalleId) ?? null

  if (detalle) {
    const cliente = detalle.cliente
    const aDomicilio = cliente.metodo !== 'tienda'

    return (
      <>
        <div className="detalle-pedido-cab">
          <button type="button" className="btn-volver-tabla" onClick={() => setDetalleId(null)}>
            ← Volver a la tabla
          </button>
          <span className={PILL_ESTADO(detalle.estado)}>{detalle.estado}</span>
          <span className="etiqueta-pill">🧾 {detalle.canal} · {detalle.fecha}</span>
        </div>

        <div className="tarjeta-info-pedido">
          <div>
            <h4>Cliente</h4>
            <p><strong>{cliente.empresa || cliente.nombre}</strong></p>
            <p>{cliente.email}</p>
            {cliente.telefono ? <p>Tel. {cliente.telefono}</p> : null}
            <p>Modalidad: <strong>{detalle.canal === 'B2B' ? '🏢 Distribuidor B2B' : '👤 Cliente B2C'}</strong></p>
          </div>

          <div>
            <h4>Entrega</h4>
            <p><strong>{aDomicilio ? '🚚 Despacho a domicilio' : '🏬 Recoge en botica / punto AMEC'}</strong></p>
            {aDomicilio && cliente.direccion ? (
              <p>{cliente.direccion}, {cliente.region || cliente.ciudad}</p>
            ) : null}
            {cliente.notas ? <p>📝 {cliente.notas}</p> : <p>Sin notas adicionales.</p>}
          </div>
        </div>

        <div className="tabla-scroll">
          <table className="tabla-pedidos">
            <thead>
              <tr>
                <th>Producto</th>
                <th>Formato</th>
                <th>Cant.</th>
                <th>Precio unit.</th>
                <th>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {detalle.items.map(item => (
                <tr key={item.id}>
                  <td className="folio">{item.nombre}</td>
                  <td>{item.formato}</td>
                  <td>{item.cantidad}</td>
                  <td>{formatearPrecio(item.precioUnitario)}</td>
                  <td><strong>{formatearPrecio(item.precioUnitario * item.cantidad)}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <details className="resumen-pedido-completo" style={{ marginTop: '1rem' }}>
          <summary style={{ cursor: 'pointer', fontWeight: 700 }}>💸 Totales del pedido</summary>
          <div className="resumen-filas" style={{ marginTop: '0.6rem' }}>
            <div className="cuenta-fila"><span>Subtotal</span><strong>{formatearPrecio(detalle.subtotal ?? detalle.total)}</strong></div>
            {(detalle.descuento ?? 0) > 0 && (
              <div className="cuenta-fila"><span>Descuento {detalle.cupon ? `(${detalle.cupon})` : ''}</span><strong>-{formatearPrecio(detalle.descuento)}</strong></div>
            )}
            <div className="cuenta-fila"><span>Envío ({detalle.region ?? '—'})</span><strong>{(detalle.costoEnvio ?? 0) === 0 ? 'Gratis' : formatearPrecio(detalle.costoEnvio)}</strong></div>
          </div>
          <div className="resumen-total">
            <span>Total</span>
            <span className="monto">{formatearPrecio(detalle.total)}</span>
          </div>
        </details>

        <div className="control-estados">
          <span>Cambiar estado del pedido</span>
          <div className="filas-estados">
            {ESTADOS_PEDIDO.map(estado => (
              <button
                type="button"
                key={estado.id}
                className={`boton-estado${detalle.estado === estado.etiqueta ? ' activo' : ''}`}
                onClick={() => alCambiarEstado(detalle.id, estado.etiqueta)}
              >
                {estado.icono} {estado.etiqueta}
              </button>
            ))}
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <div className="herramientas-pedidos">
        <input
          type="text"
          className="input-pedidos"
          value={texto}
          onChange={e => setTexto(e.target.value)}
          placeholder="🔎 Cliente, correo o folio AMEC-…"
          aria-label="Filtrar pedidos por cliente o folio"
        />
        <select
          className="select-pedidos"
          value={estadoFiltro}
          onChange={e => setEstadoFiltro(e.target.value)}
          aria-label="Filtrar pedidos por estado"
        >
          <option value="todos">Todos los estados</option>
          {ESTADOS_PEDIDO.map(estado => (
            <option key={estado.id} value={estado.id}>{estado.etiqueta}</option>
          ))}
        </select>
        <select
          className="select-pedidos"
          value={rangoFecha}
          onChange={e => setRangoFecha(e.target.value)}
          aria-label="Filtrar pedidos por fecha"
        >
          {RANGOS_FECHA.map(rango => (
            <option key={rango.id} value={rango.id}>{rango.etiqueta}</option>
          ))}
        </select>
      </div>

      {filtrados.length === 0 ? (
        <p className="empty-state">
          {pedidos.length === 0
            ? 'Aún no hay pedidos registrados. 🛍️'
            : 'Ningún pedido coincide con los filtros aplicados. 🔍'}
        </p>
      ) : (
        <div className="tabla-scroll">
          <table className="tabla-pedidos">
            <thead>
              <tr>
                <th>Pedido</th>
                <th>Cliente</th>
                <th>Canal</th>
                <th>Estado</th>
                <th>Total</th>
                <th>Estado rápido</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map(pedido => {
                const sinGestionar = PILL_ESTADO(pedido.estado).includes('historial')
                return (
                  <tr key={pedido.id}>
                    <td className="folio">
                      {pedido.id}
                      <small>{pedido.fecha}</small>
                    </td>
                    <td>
                      {pedido.cliente.empresa || pedido.cliente.nombre}
                      <small style={{ display: 'block', fontSize: '0.74rem', color: 'var(--gris-600)' }}>
                        {pedido.cliente.email}
                      </small>
                    </td>
                    <td>{pedido.canal}</td>
                    <td><span className={PILL_ESTADO(pedido.estado)}>{pedido.estado}</span></td>
                    <td><strong>{formatearPrecio(pedido.total)}</strong></td>
                    <td>
                      <select
                        className="select-estado-mini"
                        value={sinGestionar ? '' : pedido.estado}
                        onChange={e => alCambiarEstado(pedido.id, e.target.value)}
                        aria-label={`Cambiar estado de ${pedido.id}`}
                        title="Cambiar estado directamente"
                      >
                        {sinGestionar && <option value="">Sin gestionar…</option>}
                        {ESTADOS_PEDIDO.map(estado => (
                          <option key={estado.id} value={estado.etiqueta}>
                            {estado.icono} {estado.etiqueta}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <button type="button" className="btn-ver-detalle" onClick={() => setDetalleId(pedido.id)}>
                        Ver detalle
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}

/* ============ Acceso restringido (página, no modal) ============ */

function AdminLogin({ usuarios, apariencia, alIniciar }) {
  const [error, setError] = useState(null)

  const entrar = evento => {
    evento.preventDefault()
    setError(null)
    const datos = new FormData(evento.currentTarget)
    const email = String(datos.get('email') || '').trim().toLowerCase()
    const clave = String(datos.get('clave') || '')

    const cuenta = usuarios.find(u => u.email.toLowerCase() === email && u.clave === clave)
    if (!cuenta) {
      setError('Credenciales incorrectas.')
      return
    }
    if (cuenta.rol !== 'admin') {
      setError('Esta sección es exclusiva del administrador de la tienda.')
      return
    }
    alIniciar(cuenta)
  }

  return (
    <div className="admin-login">
      <div className="admin-login-tarjeta">
        <div className="footer-logo" style={{ justifyContent: 'center' }}>
          <span className={`logo-mark${apariencia?.logoImage ? ' con-imagen' : ''}`}>
            {apariencia?.logoImage
              ? <img src={apariencia.logoImage} alt="Logotipo" />
              : <span aria-hidden="true">{apariencia?.logoIco ?? '🌱'}</span>}
          </span>
          {apariencia?.marcaTexto ?? 'AMEC NUTRITION'}
        </div>
        <p className="subtitulo-seccion" style={{ textAlign: 'center' }}>
          Panel de administración — acceso restringido
        </p>

        <form onSubmit={entrar}>
          <label className="campo">
            <span>Correo administrador</span>
            <input type="email" name="email" autoComplete="email" placeholder="admin@amec.com" required />
          </label>
          <label className="campo">
            <span>Contraseña</span>
            <input type="password" name="clave" autoComplete="current-password" placeholder="••••••••" required />
          </label>
          {error && <div className="mensaje-estado mensaje-error" role="alert">{error}</div>}
          <button type="submit" className="btn btn-primario" style={{ width: '100%', marginTop: '0.6rem' }}>
            🔐 Entrar al panel
          </button>
        </form>

        <p className="nota-b2b" style={{ marginTop: '1rem' }}>
          Cuenta demo: <code>admin@amec.com</code> / <code>admin2024</code><br />
          <a href="#/" className="volver-inicio" style={{ marginTop: '0.5rem' }}>← Volver a la tienda</a>
        </p>
      </div>
    </div>
  )
}

/* ============ Piezas de interfaz ============ */

function Titulo({ icono, texto, subtitulo }) {
  return (
    <div className="admin-cabecera">
      <div>
        <h2 className="titulo-seccion" style={{ fontSize: '1.5rem' }}>{icono} {texto}</h2>
        {subtitulo && <p className="subtitulo-seccion" style={{ marginBottom: 0 }}>{subtitulo}</p>}
      </div>
    </div>
  )
}

function Cuadro({ icono, valor, etiqueta, tono }) {
  return (
    <div className="admin-cuadro">
      <span className={`admin-cuadro-ico ${tono ?? ''}`} aria-hidden="true">{icono}</span>
      <div>
        <strong>{valor}</strong>
        <small>{etiqueta}</small>
      </div>
    </div>
  )
}

/* ============ Dashboard ============ */

function Dashboard({ pedidos, productos }) {
  const pagados = pedidos.filter(p => p.pagado || p.estado === 'Pagado')
  const ventas = pagados.reduce((s, p) => s + (p.total ?? 0), 0)
  const hace24h = Date.now() - 24 * 3600 * 1000
  const recientes = [...pedidos]
    .sort((a, b) => (b.ts ?? 0) - (a.ts ?? 0))
    .slice(0, 5)
  const stockBajo = productos
    .filter(p => !p.proximo && (p.stock ?? 0) <= 10)
    .sort((a, b) => (a.stock ?? 0) - (b.stock ?? 0))
  const conteo = {}
  for (const pedido of pagados) {
    for (const item of pedido.items ?? []) {
      conteo[item.id] = (conteo[item.id] ?? 0) + item.cantidad
    }
  }
  const top = Object.entries(conteo)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([id, unidades]) => ({
      ...productos.find(p => p.id === id),
      unidades,
    }))
    .filter(p => p.nombre)

  const vivos = productos.filter(p => !p.proximo)

  return (
    <>
      <Titulo icono="📊" texto="Dashboard" subtitulo={`Métricas al ${new Date().toLocaleDateString('es-PE', { dateStyle: 'long' })}`} />

      <div className="admin-cuadros">
        <Cuadro icono="💰" valor={formatearPrecio(ventas)} etiqueta="Ventas totales (cobradas)" tono="v" />
        <Cuadro icono="🛍️" valor={pedidos.length} etiqueta="Pedidos registrados" tono="a" />
        <Cuadro icono="⏳" valor={pedidos.filter(p => !p.pagado && p.estado !== 'Cancelado').length} etiqueta="Por cobrar /gestionar" tono="a" />
        <Cuadro icono="📦" valor={stockBajo.length} etiqueta="Productos con stock bajo (≤10)" tono="v" />
      </div>

      <div className="admin-dos-col">
        <div className="admin-ficha">
          <h3>🕘 Pedidos recientes</h3>
          {recientes.length === 0 ? (
            <p className="empty-state">Sin pedidos todavía.</p>
          ) : (
            <ul className="panel-lista" style={{ marginTop: 0 }}>
              {recientes.map(p => (
                <li className="panel-fila" key={p.id}>
                  <div>
                    <strong>{p.id} · {p.canal}</strong>
                    <small>{p.fecha} · {p.cliente.empresa || p.cliente.nombre}</small>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span className={PILL_ESTADO(p.estado)} style={{ display: 'inline-block' }}>{p.estado}</span>
                    <strong style={{ display: 'block' }}>{formatearPrecio(p.total)}</strong>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <a href="#/admin/pedidos" className="btn-ver-detalle">Gestionar pedidos →</a>
        </div>

        <div className="admin-ficha">
          <h3>⚠️ Inventario bajo</h3>
          {stockBajo.length === 0 ? (
            <p className="empty-state">Nada crítico. Toda la línea por encima de 10 unidades. 🎉</p>
          ) : (
            <ul className="panel-lista" style={{ marginTop: 0 }}>
              {stockBajo.slice(0, 6).map(p => (
                <li className="panel-fila" key={p.id}>
                  <div>
                    <strong>{p.nombre}</strong>
                    <small>{p.formato}</small>
                  </div>
                  <span className={`estado-pill ${p.stock === 0 ? 'estado-cancelado' : 'estado-pago'}`}>
                    {p.stock === 0 ? 'Agotado' : `${p.stock} unid.`}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <a href="#/admin/productos" className="btn-ver-detalle">Reponer stock →</a>
        </div>
      </div>

      <div className="admin-ficha">
        <h3>🏆 Más vendidos (unidades cobradas)</h3>
        {top.length === 0 ? (
          <p className="empty-state">Los rankings aparecerán con los primeros pedidos pagados.</p>
        ) : (
          <ul className="panel-lista" style={{ marginTop: 0 }}>
            {top.map((p, indice) => (
              <li className="panel-fila" key={p.id ?? indice}>
                <div>
                  <strong>{indice + 1}. {p.nombre}</strong>
                  <small>{p.formato}</small>
                </div>
                <strong>{p.unidades} unid.</strong>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="admin-ficha">
        <h3>🗂️ Catálogo</h3>
        <p className="cuenta-fila" style={{ border: 'none' }}><span>Productos activos en tienda</span><strong>{vivos.length}</strong></p>
        <p className="cuenta-fila" style={{ border: 'none' }}><span>En modo "Próximamente"</span><strong>{productos.filter(p => p.proximo).length}</strong></p>
        <p className="cuenta-fila" style={{ border: 'none' }}><span>Con fotografía subida</span><strong>{productos.filter(p => p.imagen).length}</strong></p>
      </div>
    </>
  )
}

/* ============ Productos: CRUD en página ============ */

function AdminProductos({ productos, alGuardar, alEliminar, notificar }) {
  const [busqueda, setBusqueda] = useState('')
  const [porEliminar, setPorEliminar] = useState(null)
  const [subiendo, setSubiendo] = useState(null)

  const filtro = busqueda.trim().toLowerCase()
  const visibles = productos.filter(p =>
    !filtro || p.nombre.toLowerCase().includes(filtro) || p.id.toLowerCase().includes(filtro))

  const cambiarImagen = async (archivo, producto) => {
    if (!archivo || subiendo) return
    setSubiendo(producto.id)
    try {
      const dataUrl = await procesarImagenProducto(archivo, notificar)
      if (dataUrl) alGuardar({ ...producto, imagen: dataUrl })
    } finally {
      setSubiendo(null)
    }
  }

  return (
    <>
      <Titulo
        icono="🧴"
        texto="Productos"
        subtitulo="Crea, edita y elimina productos de la tienda sin tocar código."
      />

      <div className="herramientas-pedidos">
        <input
          type="text"
          className="input-pedidos"
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          placeholder="🔎 Buscar producto por nombre o ID…"
          aria-label="Buscar productos"
          style={{ flex: '2 1 280px' }}
        />
        <a href="#/admin/productos/nuevo" className="btn btn-primario" style={{ textAlign: 'center', flex: '0 0 auto' }}>
          ＋ Nuevo producto
        </a>
      </div>

      <div className="tabla-scroll">
        <table className="tabla-pedidos">
          <thead>
            <tr>
              <th>Foto</th>
              <th>Producto</th>
              <th>Categoría</th>
              <th>Precio público</th>
              <th>Precio B2B</th>
              <th>Stock</th>
              <th>Destacados</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {visibles.map(p => (
              <tr key={p.id}>
                <td>
                  <div className="miniatura">
                    {p.imagen
                      ? <img src={p.imagen} alt={`Imagen de ${p.nombre}`} />
                      : <span aria-hidden="true">{p.icono}</span>}
                  </div>
                </td>
                <td className="folio">
                  {p.nombre}
                  <small>/{p.seo?.slug || p.id}</small>
                </td>
                <td>{ETIQUETAS_CATEGORIA[p.categoria] ?? p.categoria}</td>
                <td>{formatearPrecio(p.precioPublico ?? 0)}</td>
                <td>{formatearPrecio(p.precioB2B ?? 0)}</td>
                <td>
                  <span className={`estado-pill ${p.proximo ? 'estado-historial' : (p.stock ?? 0) <= 10 ? 'estado-pago' : 'estado-entregado'}`}>
                    {p.proximo ? 'Por ingresar' : `${p.stock ?? 0} unid.`}
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {p.masVendido && <span className="estado-pill estado-entregado">🔥 Vendido</span>}
                    {p.nuevo && <span className="estado-pill estado-confirmado">🆕 Nuevo</span>}
                    {p.ok && <span className="estado-pill estado-enviado">Visible</span>}
                  </div>
                </td>
                <td>
                  <div className="panel-acciones" style={{ flexWrap: 'wrap' }}>
                    <label
                      className={`btn-mini btn-aprobar campo-archivo${subiendo === p.id ? ' activo' : ''}`}
                      style={subiendo === p.id ? { opacity: 0.6, pointerEvents: 'none' } : undefined}
                      title={`Imagen · ${ESPECIFICACION_IMAGEN}`}
                    >
                      {subiendo === p.id ? '⏳' : '📷'}
                      <input
                        type="file"
                        accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                        onChange={e => { cambiarImagen(e.target.files?.[0], p); e.target.value = '' }}
                      />
                    </label>
                    <a href={`#/admin/productos/${p.id}`} className="btn-mini btn-aprobar" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
                      ✏️ Editar
                    </a>
                    {porEliminar === p.id ? (
                      <button
                        type="button"
                        className="btn-mini btn-rechazar"
                        onClick={() => { alEliminar(p.id); setPorEliminar(null) }}
                      >
                        ✓ Confirmar borrado
                      </button>
                    ) : (
                      <button type="button" className="btn-mini btn-rechazar" onClick={() => setPorEliminar(p.id)}>
                        🗑️
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {visibles.length === 0 && <p className="empty-state">Sin resultados para "{busqueda}". 🔍</p>}

      <p className="nota-b2b" style={{ marginTop: '1rem' }}>
        Esquema de imagen: {ESPECIFICACION_IMAGEN} — proporción 4:3. La eliminación requiere confirmar dos clics para evitar accidentes.
      </p>
    </>
  )
}

/* ============ Ficha editable de producto ============ */

const VACIA = {
  id: '',
  nombre: '',
  formato: '',
  categoria: 'nutricion-recuperacion',
  icono: '📦',
  variante: 'v-verde',
  precioPublico: 0,
  precioB2B: 0,
  stock: 20,
  descripcion: '',
  uso: '',
  masVendido: false,
  nuevo: false,
  proximo: false,
  visible: true,
  imagen: null,
  seo: { slug: '', metaTitulo: '', metaDescripcion: '', ogTitulo: '', ogDescripcion: '' },
}

const ETIQUETAS_CATEGORIA = {
  'nutricion-recuperacion': 'Nutrición y recuperación',
  infantil: 'Línea infantil',
  vitaminas: 'Vitaminas y minerales',
  femenina: 'Salud femenina',
  'descanso-calma': 'Descanso y bienestar',
  especializada: 'Fórmulas especializadas',
}

function AdminProductoForm({ productos, idProducto, alGuardar, notificar }) {
  const esNuevo = !idProducto
  const original = esNuevo ? VACIA : productos.find(p => p.id === idProducto)
  const [ficha, setFicha] = useState(() => (original
    ? { ...VACIA, ...original, beneficiosTexto: (original.beneficios ?? []).join('\n') }
    : null))
  const [beneficiosTexto, setBeneficiosTexto] = useState(() => (original?.beneficios ?? []).join('\n'))
  const [subiendo, setSubiendo] = useState(false)
  const [slugEditado, setSlugEditado] = useState(!esNuevo)

  if (!ficha) {
    return (
      <>
        <Titulo icono="🧴" texto="Producto no encontrado" />
        <p className="empty-state">
          El producto <code>{idProducto}</code> no existe o fue eliminado.{' '}
          <a href="#/admin/productos">Volver al catálogo</a>
        </p>
      </>
    )
  }

  const actualizar = campo => evento => {
    const valor = evento?.target?.type === 'checkbox' ? evento.target.checked : evento.target.value
    setFicha(prev => {
      const nueva = { ...prev, [campo]: valor }
      /* Autogenerar slug en nombre hasta que el admin lo personalice */
      if (campo === 'nombre' && !slugEditado) {
        nueva.seo = { ...nueva.seo, slug: textoASlug(valor) }
      }
      return nueva
    })
  }

  const subirImagen = async archivo => {
    if (!archivo || subiendo) return
    setSubiendo(true)
    try {
      const dataUrl = await procesarImagenProducto(archivo, notificar)
      if (dataUrl) setFicha(prev => ({ ...prev, imagen: dataUrl }))
    } finally {
      setSubiendo(false)
    }
  }

  const guardar = evento => {
    evento.preventDefault()
    const nombre = ficha.nombre?.trim()
    if (!nombre) {
      notificar('❌ El nombre del producto es obligatorio.')
      return
    }
    const slug = textoASlug(ficha.seo?.slug || nombre)
    if (esNuevo) {
      const base = (slug || textoASlug(nombre)).slice(0, 24)
      let idUnico = base || `prod-${Date.now()}`
      let n = 2
      while (productos.some(p => p.id === idUnico)) idUnico = `${base}-${n++}`
      ficha.id = idUnico
    }
    if (slug && productos.some(p => p.id !== ficha.id && (p.seo?.slug || '') === slug)) {
      notificar(`❌ El slug /${slug} ya lo usa otro producto.`)
      return
    }

    alGuardar({
      ...ficha,
      nombre,
      precioPublico: Number(ficha.precioPublico) || 0,
      precioB2B: Number(ficha.precioB2B) || 0,
      stock: Number(ficha.stock) || 0,
      beneficios: beneficiosTexto.split('\n').map(t => t.trim()).filter(Boolean),
      seo: { ...ficha.seo, slug },
    })
  }

  return (
    <>
      <Titulo
        icono={esNuevo ? '✨' : '✏️'}
        texto={esNuevo ? 'Nuevo producto' : `Editar: ${ficha.nombre}`}
        subtitulo="Todos los campos se guardan en línea, sin recargar la tienda."
      />

      <form onSubmit={guardar} className="admin-ficha">
        <h3>🧱 Datos generales</h3>
        <div className="admin-cuadricula">
          <label className="campo">
            <span>Nombre</span>
            <input type="text" value={ficha.nombre} onChange={actualizar('nombre')} required />
          </label>
          <label className="campo">
            <span>Formato / presentación</span>
            <input type="text" value={ficha.formato} onChange={actualizar('formato')} placeholder="Ej. Frasco x 30 cápsulas" />
          </label>
          <label className="campo">
            <span>Categoría</span>
            <select value={ficha.categoria} onChange={actualizar('categoria')}>
              {Object.entries(ETIQUETAS_CATEGORIA).map(([id, etiqueta]) => (
                <option key={id} value={id}>{etiqueta}</option>
              ))}
            </select>
          </label>
          <div className="campo-fila">
            <label className="campo">
              <span>Icono (emoji)</span>
              <input type="text" value={ficha.icono} onChange={actualizar('icono')} maxLength={4} />
            </label>
            <label className="campo">
              <span>Tarjeta</span>
              <select value={ficha.variante} onChange={actualizar('variante')}>
                <option value="v-verde">Verde</option>
                <option value="v-azul">Azul</option>
              </select>
            </label>
          </div>
        </div>

        <div className="admin-cuadricula">
          <label className="campo">
            <span>Stock (unidades)</span>
            <input type="number" min="0" value={ficha.stock} onChange={actualizar('stock')} />
          </label>
          <label className="campo">
            <span>Precio público S/ (B2C)</span>
            <input type="number" min="0" step="0.01" value={ficha.precioPublico} onChange={actualizar('precioPublico')} />
          </label>
          <label className="campo">
            <span>Precio de distribución S/ (B2B)</span>
            <input type="number" min="0" step="0.01" value={ficha.precioB2B} onChange={actualizar('precioB2B')} />
          </label>
        </div>

        <div className="admin-chips">
          <label style={{ fontWeight: 700, fontSize: '0.88rem' }}>
            <input type="checkbox" checked={ficha.masVendido} onChange={actualizar('masVendido')} /> 🔥 Más vendido
          </label>
          <label style={{ fontWeight: 700, fontSize: '0.88rem' }}>
            <input type="checkbox" checked={ficha.nuevo} onChange={actualizar('nuevo')} /> 🆕 Recién llegados
          </label>
          <label style={{ fontWeight: 700, fontSize: '0.88rem' }}>
            <input type="checkbox" checked={ficha.proximo} onChange={actualizar('proximo')} /> 🚀 Próximamente (sin venta)
          </label>
        </div>

        <h3>📝 Descripción</h3>
        <div className="admin-cuadricula">
          <label className="campo">
            <span>Descripción</span>
            <textarea rows="3" className="area-admin" value={ficha.descripcion} onChange={actualizar('descripcion')} />
          </label>
          <label className="campo">
            <span>Beneficios (uno por línea)</span>
            <textarea
              rows="4"
              className="area-admin"
              value={beneficiosTexto}
              onChange={e => setBeneficiosTexto(e.target.value)}
              placeholder={'✓ Primer beneficio\n✓ Segundo beneficio'}
            />
          </label>
          <label className="campo">
            <span>Uso sugerido</span>
            <input type="text" value={ficha.uso} onChange={actualizar('uso')} placeholder="Ej. 1 cápsula al día con la comida" />
          </label>
        </div>

        <h3>🖼️ Imagen del producto</h3>
        <div className="admin-cuadricula">
          <div>
            <p className="miniatura" style={{ width: 96, height: 96, borderRadius: 16, fontSize: '2rem' }}>
              {ficha.imagen ? <img src={ficha.imagen} alt="Vista previa" /> : (ficha.icono || '📦')}
            </p>
          </div>
          <div>
            <label className={`campo-archivo`}>
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                onChange={e => { subirImagen(e.target.files?.[0]); e.target.value = '' }}
              />
            </label>
            <button
              type="button"
              className="btn-mini btn-aprobar"
              style={{ marginTop: '0.5rem', cursor: 'pointer' }}
              disabled={subiendo}
            >
              {subiendo ? '⏳ Procesando…' : '📷 Subir / cambiar imagen'}
            </button>
            {ficha.imagen && (
              <button type="button" className="btn-mini btn-rechazar" style={{ cursor: 'pointer' }} onClick={() => setFicha(prev => ({ ...prev, imagen: null }))}>
                ♻ Quitar imagen
              </button>
            )}
            <p className="nota-b2b">Especificación: {ESPECIFICACION_IMAGEN}.</p>
          </div>
        </div>

        <h3>🔍 SEO y redes</h3>
        <div className="admin-cuadricula">
          <label className="campo">
            <span>Slug / URL amigable ("#/producto/…")</span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                value={ficha.seo?.slug ?? ''}
                onChange={e => { setSlugEditado(true); setFicha(prev => ({ ...prev, seo: { ...prev.seo, slug: e.target.value } })) }}
                placeholder={textoASlug(ficha.nombre) || 'mi-producto'}
              />
              <button
                type="button"
                className="btn-mini btn-aprobar"
                title="Regenerar según nombre"
                style={{ cursor: 'pointer' }}
                onClick={() => {
                  setSlugEditado(false)
                  setFicha(prev => ({ ...prev, seo: { ...prev.seo, slug: textoASlug(ficha.nombre) } }))
                }}
              >
                ♻
              </button>
            </div>
          </label>
          <label className="campo">
            <span>Meta título (Google)</span>
            <input type="text" value={ficha.seo?.metaTitulo ?? ''} onChange={e => setFicha(prev => ({ ...prev, seo: { ...prev.seo, metaTitulo: e.target.value } }))} />
          </label>
          <label className="campo">
            <span>Meta descripción (Google)</span>
            <textarea
              rows="2"
              className="area-admin"
              value={ficha.seo?.metaDescripcion ?? ''}
              onChange={e => setFicha(prev => ({ ...prev, seo: { ...prev.seo, metaDescripcion: e.target.value } }))}
            />
          </label>
          <div className="campo-fila">
            <label className="campo">
              <span>Título Open Graph (FB / WA / LinkedIn)</span>
              <input type="text" value={ficha.seo?.ogTitulo ?? ''} onChange={e => setFicha(prev => ({ ...prev, seo: { ...prev.seo, ogTitulo: e.target.value } }))} />
            </label>
            <label className="campo">
              <span>Descripción Open Graph</span>
              <input type="text" value={ficha.seo?.ogDescripcion ?? ''} onChange={e => setFicha(prev => ({ ...prev, seo: { ...prev.seo, ogDescripcion: e.target.value } }))} />
            </label>
          </div>
        </div>

        <div className="config-navegacion">
          <a href="#/admin/productos" className="btn-atras">← Cancelar</a>
          <button type="submit" className="btn btn-primario">
            {esNuevo ? '✓ Crear producto' : '✓ Guardar cambios'}
          </button>
        </div>
      </form>
    </>
  )
}

/* ============ Envíos y logística ============ */

function AdminEnvios({ config, alGuardar, notificar }) {
  const envio = config.envio
  const [nuevoRegion, setNuevoRegion] = useState('')
  const [nuevoCosto, setNuevoCosto] = useState('')

  const actualizar = (campo, valor) => alGuardar('envio', { [campo]: valor })

  const agregar = evento => {
    evento.preventDefault()
    const region = nuevoRegion.trim()
    const costo = Number(nuevoCosto)
    if (!region || Number.isNaN(costo) || costo < 0) {
      notificar('❌ Completa región y costo válido (S/ ≥ 0).')
      return
    }
    if (envio.tarifas.some(t => t.region.toLowerCase() === region.toLowerCase())) {
      notificar('❌ Esa región ya tiene una tarifa configurada.')
      return
    }
    alGuardar('envio', { tarifas: [...envio.tarifas, { region, costo }] })
    setNuevoRegion('')
    setNuevoCosto('')
    notificar(`✓ Tarifa de ${region} agregada`)
  }

  const quitar = region => {
    alGuardar('envio', { tarifas: envio.tarifas.filter(t => t.region !== region) })
    notificar(`🗑️ Tarifa de ${region} eliminada`)
  }

  return (
    <>
      <Titulo
        icono="🚛"
        texto="Envíos y logística"
        subtitulo="Tarifas por departamento/región y la regla de envío gratis."
      />

      <div className="admin-ficha">
        <h3>🚀 Regla de envío gratis</h3>
        <div className="admin-cuadricula">
          <label style={{ fontWeight: 700, fontSize: '0.9rem' }}>
            <input
              type="checkbox"
              checked={envio.activo}
              onChange={e => actualizar('activo', e.target.checked)}
            />{' '}
            Cobrar envío en los pedidos a domicilio
          </label>
          <label className="campo">
            <span>Envío GRATIS a partir de S/</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={envio.envioGratisDesde}
              onChange={e => actualizar('envioGratisDesde', Number(e.target.value) || 0)}
            />
          </label>
          <label className="campo">
            <span>Costo si la región no está en la lista S/</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={envio.costoBase}
              onChange={e => actualizar('costoBase', Number(e.target.value) || 0)}
            />
          </label>
        </div>
        <p className="nota-b2b">
          El envío gratis se aplica automáticamente en el checkout cuando el subtotal supera el monto
          (0 = nunca gratis). El costo base se usa para regiones sin tarifa específica.
        </p>
      </div>

      <div className="admin-ficha">
        <h3>🗺️ Tarifas por región</h3>
        <div className="tabla-scroll">
          <table className="tabla-pedidos">
            <thead>
              <tr><th>Región / zona</th><th>Costo</th><th></th></tr>
            </thead>
            <tbody>
              {envio.tarifas.map(tarifa => (
                <tr key={tarifa.region}>
                  <td className="folio">{tarifa.region}</td>
                  <td>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={tarifa.costo}
                      onChange={e => actualizar('tarifas', envio.tarifas.map(t2 => (
                        t2.region === tarifa.region ? { region: tarifa.region, costo: Number(e.target.value) || 0 } : t2
                      )))}
                      style={{ width: 90 }}
                    />
                  </td>
                  <td>
                    <button type="button" className="btn-mini btn-rechazar" onClick={() => quitar(tarifa.region)}>
                      ✕ Quitar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <form onSubmit={agregar} className="admin-cuadricula" style={{ marginTop: '1rem' }}>
          <label className="campo">
            <span>Agregar región</span>
            <input
              type="text"
              value={nuevoRegion}
              onChange={e => setNuevoRegion(e.target.value)}
              placeholder="Ej. Ica"
            />
          </label>
          <label className="campo">
            <span>Costo S/</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={nuevoCosto}
              onChange={e => setNuevoCosto(e.target.value)}
              placeholder="Ej. 18"
            />
          </label>
          <button type="submit" className="btn btn-primario">
            ＋ Agregar tarifa
          </button>
        </form>
      </div>
    </>
  )
}

/* ============ Boticas aliadas (con logo de farmacia) ============ */

const ZONA_BOTICAS = [
  { id: 'norte', etiqueta: 'Zona Norte' },
  { id: 'centro', etiqueta: 'Zona Centro' },
  { id: 'sur', etiqueta: 'Zona Sur' },
  { id: 'lima', etiqueta: 'Lima Metropolitana' },
]

function AdminBoticas({ config, alGuardar, notificar }) {
  const boticas = config.boticas ?? []
  const [ficha, setFicha] = useState(null) /* null = lista; objeto = formulario */
  const [subiendo, setSubiendo] = useState(false)

  const guardarBoticas = lista => alGuardar('boticas', lista)

  const nuevaFicha = () => setFicha({
    id: null, nombre: '', ciudad: '', zona: 'norte', logo: null,
  })

  const editarFicha = botica => setFicha({ ...botica })

  const subirLogo = async archivo => {
    if (!archivo || subiendo) return
    setSubiendo(true)
    try {
      const dataUrl = await procesarLogo(archivo, notificar)
      if (dataUrl) setFicha(prev => ({ ...prev, logo: dataUrl }))
    } finally {
      setSubiendo(false)
    }
  }

  const eliminar = id => {
    guardarBoticas(boticas.filter(b => b.id !== id))
    notificar('🗑️ Botica eliminada de la sección aliadas')
  }

  const guardar = evento => {
    evento.preventDefault()
    const nombre = ficha.nombre.trim()
    const ciudad = ficha.ciudad.trim()
    if (!nombre || !ciudad) {
      notificar('❌ Completa el nombre de la botica y su ciudad.')
      return
    }
    if (ficha.id) {
      guardarBoticas(boticas.map(b => (b.id === ficha.id ? { ...ficha, nombre, ciudad } : b)))
      notificar(`✓ "${nombre}" actualizada`)
    } else {
      guardarBoticas([...boticas, { ...ficha, id: `botica-${Date.now()}`, nombre, ciudad }])
      notificar(`✓ "${nombre}" agregada a las boticas aliadas`)
    }
    setFicha(null)
  }

  const zonaEtiqueta = id => ZONA_BOTICAS.find(z => z.id === id)?.etiqueta ?? id

  if (ficha) {
    return (
      <>
        <Titulo
          icono={ficha.id ? '✏️' : '✨'}
          texto={ficha.id ? `Editar: ${ficha.nombre}` : 'Nueva botica aliada'}
          subtitulo="El logo se mostrará en la sección «Boticas aliadas» de la tienda."
        />

        <form onSubmit={guardar} className="admin-ficha">
          <div className="admin-logo-zona">
            <div className="logo-vista-previa" aria-hidden="true">
              {ficha.logo
                ? <img src={ficha.logo} alt="" />
                : <span>🏥</span>}
            </div>
            <div>
              <div className="panel-acciones">
                <label className={`btn-mini btn-aprobar campo-archivo${subiendo ? ' activo' : ''}`}>
                  {subiendo ? '⏳ Procesando…' : '📷 Subir logo de la farmacia'}
                  <input
                    type="file"
                    accept=".png,.svg,.jpg,.jpeg,image/png,image/svg+xml,image/jpeg"
                    onChange={e => { subirLogo(e.target.files?.[0]); e.target.value = '' }}
                    disabled={subiendo}
                  />
                </label>
                {ficha.logo && (
                  <button
                    type="button"
                    className="btn-mini btn-rechazar"
                    onClick={() => setFicha(prev => ({ ...prev, logo: null }))}
                  >
                    ♻ Quitar logo
                  </button>
                )}
              </div>
              <p className="nota-b2b" style={{ margin: '0.5rem 0 0' }}>
                Especificación: {ESPECIFICACION_LOGO}.
              </p>
            </div>
          </div>

          <div className="admin-cuadricula" style={{ marginTop: '1rem' }}>
            <label className="campo">
              <span>Nombre de la botica / farmacia</span>
              <input type="text" value={ficha.nombre} onChange={e => setFicha(prev => ({ ...prev, nombre: e.target.value }))} required />
            </label>
            <label className="campo">
              <span>Ciudad</span>
              <input type="text" value={ficha.ciudad} onChange={e => setFicha(prev => ({ ...prev, ciudad: e.target.value }))} required />
            </label>
            <label className="campo">
              <span>Zona</span>
              <select value={ficha.zona} onChange={e => setFicha(prev => ({ ...prev, zona: e.target.value }))}>
                {ZONA_BOTICAS.map(z => <option key={z.id} value={z.id}>{z.etiqueta}</option>)}
              </select>
            </label>
          </div>

          <div className="form-pie-admin">
            <button type="button" className="btn-volver-tabla" onClick={() => setFicha(null)}>← Cancelar</button>
            <button type="submit" className="btn btn-chico-admin">✓ Guardar botica</button>
          </div>
        </form>
      </>
    )
  }

  return (
    <>
      <Titulo
        icono="🏥"
        texto="Boticas aliadas"
        subtitulo="Gestiona las farmacias que aparecen en la tienda: nombre, ciudad, zona y su logotipo."
      />

      <div className="herramientas-pedidos">
        <span className="etiqueta-pill" style={{ alignSelf: 'center' }}>
          {boticas.length} aliadas registradas
        </span>
        <button type="button" className="btn btn-chico-admin" onClick={nuevaFicha} style={{ marginLeft: 'auto' }}>
          ＋ Nueva botica
        </button>
      </div>

      {boticas.length === 0 ? (
        <p className="empty-state">No hay boticas aliadas. Crea la primera con «＋ Nueva botica». 🏥</p>
      ) : (
        <div className="tabla-scroll">
          <table className="tabla-pedidos">
            <thead>
              <tr><th>Logo</th><th>Botica</th><th>Ciudad</th><th>Zona</th><th></th></tr>
            </thead>
            <tbody>
              {boticas.map(botica => (
                <tr key={botica.id}>
                  <td>
                    <div className="miniatura">
                      {botica.logo
                        ? <img src={botica.logo} alt={`Logo de ${botica.nombre}`} />
                        : <span aria-hidden="true">🏥</span>}
                    </div>
                  </td>
                  <td className="folio">{botica.nombre}</td>
                  <td>{botica.ciudad}</td>
                  <td><span className="etiqueta-pill">{zonaEtiqueta(botica.zona)}</span></td>
                  <td>
                    <div className="panel-acciones" style={{ flexWrap: 'wrap' }}>
                      <button type="button" className="btn-mini btn-aprobar" onClick={() => editarFicha(botica)}>
                        ✏️ Editar
                      </button>
                      <button type="button" className="btn-mini btn-rechazar" onClick={() => eliminar(botica.id)}>
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}

/* ============ Promociones y cupones ============ */

function AdminPromos({ config, alGuardar, notificar }) {
  const promos = config.promos
  const [cupon, setCupon] = useState({ codigo: '', tipo: 'porcentaje', valor: '', minimo: 0 })
  const [auto, setAuto] = useState({ nombre: '', tipo: 'porcentaje', valor: '', minimo: '', desde: '', hasta: '' })

  const guardarCupon = evento => {
    evento.preventDefault()
    const codigo = cupon.codigo.trim().toUpperCase()
    const valor = Number(cupon.valor)
    if (!codigo || Number.isNaN(valor) || valor <= 0) {
      notificar('❌ Completa el código y un valor de descuento válido.')
      return
    }
    if (promos.cupones.some(c => c.codigo === codigo)) {
      notificar('❌ Ya existe ese código.')
      return
    }
    alGuardar('promos', {
      cupones: [...promos.cupones, {
        codigo,
        tipo: cupon.tipo,
        valor,
        minimo: Number(cupon.minimo) || 0,
        activo: true,
      }],
    })
    notificar(`🎟️ Cupón ${codigo} creado`)
    setCupon({ codigo: '', tipo: 'porcentaje', valor: '', minimo: 0 })
  }

  const alternarCupon = codigo => {
    alGuardar('promos', {
      cupones: promos.cupones.map(c => (c.codigo === codigo ? { ...c, activo: !c.activo } : c)),
    })
  }

  const borrarCupon = codigo => {
    alGuardar('promos', { cupones: promos.cupones.filter(c => c.codigo !== codigo) })
    notificar(`🗑️ Cupón ${codigo} eliminado`)
  }

  const guardarAuto = evento => {
    evento.preventDefault()
    const valor = Number(auto.valor)
    if (!auto.nombre.trim() || Number.isNaN(valor) || valor <= 0) {
      notificar('❌ Nombra la promoción y pon un valor válido.')
      return
    }
    alGuardar('promos', {
      automaticas: [...promos.automaticas, {
        nombre: auto.nombre.trim(),
        tipo: auto.tipo,
        valor,
        minimo: Number(auto.minimo) || 0,
        desde: auto.desde || '',
        hasta: auto.hasta || '',
        activo: true,
      }],
    })
    notificar('🎁 Promoción automática creada')
    setAuto({ nombre: '', tipo: 'porcentaje', valor: '', minimo: '', desde: '', hasta: '' })
  }

  const alternarAuto = indice => {
    alGuardar('promos', {
      automaticas: promos.automaticas.map((p, i) => (i === indice ? { ...p, activo: !p.activo } : p)),
    })
  }

  const borrarAuto = indice => {
    alGuardar('promos', { automaticas: promos.automaticas.filter((_, i) => i !== indice) })
    notificar('🗑️ Promoción eliminada')
  }

  return (
    <>
      <Titulo
        icono="🎟️"
        texto="Promociones y marketing"
        subtitulo="Cupones de descuento y reglas automáticas que se aplican en el checkout."
      />

      <div className="admin-ficha">
        <h3>🎟️ Cupones activos</h3>
        <ul className="panel-lista" style={{ marginTop: 0 }}>
          {promos.cupones.map(c => (
            <li className="panel-fila" key={c.codigo}>
              <div>
                <strong>{c.codigo}</strong>
                <small>
                  {c.tipo === 'porcentaje' ? `${c.valor}% de descuento` : `S/ ${c.valor} de descuento`}
                  · compra mín. S/ {c.minimo ?? 0}
                </small>
              </div>
              <div className="panel-acciones">
                <span className={`estado-pill ${c.activo ? 'estado-entregado' : 'estado-historial'}`}>
                  {c.activo ? 'Activo' : 'Pausado'}
                </span>
                <button type="button" className="btn-mini btn-aprobar" onClick={() => alternarCupon(c.codigo)}>
                  {c.activo ? '⏸️ Pausar' : '▶️ Activar'}
                </button>
                <button type="button" className="btn-mini btn-rechazar" onClick={() => borrarCupon(c.codigo)}>
                  ✕
                </button>
              </div>
            </li>
          ))}
          {promos.cupones.length === 0 && <p className="empty-state">Sin cupones por ahora.</p>}
        </ul>

        <form onSubmit={guardarCupon} className="admin-cuadricula" style={{ marginTop: '1rem' }}>
          <div className="campo-fila">
            <label className="campo">
              <span>Código</span>
              <input
                type="text"
                value={cupon.codigo}
                onChange={e => setCupon(prev => ({ ...prev, codigo: e.target.value.toUpperCase() }))}
                placeholder="NAVIDAD10"
              />
            </label>
            <label className="campo">
              <span>Tipo</span>
              <select value={cupon.tipo} onChange={e => setCupon(prev => ({ ...prev, tipo: e.target.value }))}>
                <option value="porcentaje">Porcentaje (%)</option>
                <option value="monto">Monto fijo (S/)</option>
              </select>
            </label>
          </div>
          <div className="campo-fila">
            <label className="campo">
              <span>Valor</span>
              <input type="number" min="0" step="0.01" value={cupon.valor} onChange={e => setCupon(prev => ({ ...prev, valor: e.target.value }))} />
            </label>
            <label className="campo">
              <span>Compra mínima S/ (opcional)</span>
              <input type="number" min="0" step="0.01" value={cupon.minimo} onChange={e => setCupon(prev => ({ ...prev, minimo: e.target.value }))} />
            </label>
          </div>
          <div className="form-pie-admin">
            <button type="submit" className="btn btn-chico-admin">＋ Crear cupón</button>
          </div>
        </form>
      </div>

      <div className="admin-ficha">
        <h3>🤖 Promociones automáticas</h3>
        <p className="nota-b2b">
          Se aplican solas en el checkout cuando se cumple la compra mínima (y la vigencia, si se definió).
        </p>

        <ul className="panel-lista" style={{ marginTop: 0 }}>
          {promos.automaticas.map((p, indice) => (
            <li className="panel-fila" key={`${p.nombre}-${indice}`}>
              <div>
                <strong>{p.nombre}</strong>
                <small>
                  {p.tipo === 'porcentaje' ? `${p.valor}%` : `S/ ${p.valor}`}
                  · desde S/ {p.minimo ?? 0} ({p.minimo === 0 ? 'sin mínima' : 'compra mínima'})
                  {p.desde ? ` · vigente ${p.desde}` : ''}
                  {p.hasta ? ` → ${p.hasta}` : ''}
                </small>
              </div>
              <div className="panel-acciones">
                <span className={`estado-pill ${p.activo ? 'estado-entregado' : 'estado-historial'}`}>
                  {p.activo ? 'Activas' : 'Inactivas'}
                </span>
                <button type="button" className="btn-mini btn-aprobar" onClick={() => alternarAuto(indice)}>
                  {p.activo ? '⏸️ Pausar' : '▶️ Activar'}
                </button>
                <button type="button" className="btn-mini btn-rechazar" onClick={() => borrarAuto(indice)}>
                  ✕
                </button>
              </div>
            </li>
          ))}
          {promos.automaticas.length === 0 && <p className="empty-state">Sin promociones automáticas.</p>}
        </ul>

        <form onSubmit={guardarAuto} className="admin-cuadricula" style={{ marginTop: '1rem' }}>
          <div className="campo-fila">
            <label className="campo">
              <span>Nombre visible</span>
              <input type="text" value={auto.nombre} onChange={e => setAuto(prev => ({ ...prev, nombre: e.target.value }))} placeholder="Semana del ahorro" />
            </label>
            <label className="campo">
              <span>Tipo</span>
              <select value={auto.tipo} onChange={e => setAuto(prev => ({ ...prev, tipo: e.target.value }))}>
                <option value="porcentaje">Porcentaje (%)</option>
                <option value="monto">Monto fijo (S/)</option>
              </select>
            </label>
          </div>
          <div className="campo-fila">
            <label className="campo">
              <span>Valor</span>
              <input type="number" min="0" step="0.01" value={auto.valor} onChange={e => setAuto(prev => ({ ...prev, valor: e.target.value }))} />
            </label>
            <label className="campo">
              <span>Compra mínima S/ (0 = siempre)</span>
              <input type="number" min="0" step="0.01" value={auto.minimo} onChange={e => setAuto(prev => ({ ...prev, minimo: e.target.value }))} />
            </label>
          </div>
          <div className="campo-fila">
            <label className="campo">
              <span>Vigencia desde (opcional)</span>
              <input type="date" value={auto.desde} onChange={e => setAuto(prev => ({ ...prev, desde: e.target.value }))} />
            </label>
            <label className="campo">
              <span>Hasta (opcional)</span>
              <input type="date" value={auto.hasta} onChange={e => setAuto(prev => ({ ...prev, hasta: e.target.value }))} />
            </label>
          </div>
          <div className="form-pie-admin">
            <button type="submit" className="btn btn-chico-admin">＋ Crear promoción</button>
          </div>
        </form>
      </div>
    </>
  )
}

/* ============ Apariencia ============ */

function AdminApariencia({ config, alGuardar, notificar }) {
  const ap = config.apariencia
  const [subiendoLogo, setSubiendoLogo] = useState(false)
  const actualizar = campo => evento => alGuardar('apariencia', { [campo]: evento.target.value })

  const alGuardarTipografia = evento => alGuardar('apariencia', { tipografia: evento.target.value })

  const subirLogo = async archivo => {
    if (!archivo || subiendoLogo) return
    setSubiendoLogo(true)
    try {
      const dataUrl = await procesarLogo(archivo, notificar)
      if (dataUrl) {
        alGuardar('apariencia', { logoImage: dataUrl })
        notificar('✓ Logotipo actualizado en la tienda')
      }
    } finally {
      setSubiendoLogo(false)
    }
  }

  return (
    <>
      <Titulo
        icono="🎨"
        texto="Apariencia de la tienda"
        subtitulo="Logo, colores de la marca, tipografía y banners — cambios visibles al instante."
      />

      <div className="admin-ficha">
        <h3>🌱 Identidad</h3>
        <div className="admin-cuadricula">
          <label className="campo">
            <span>Nombre de la marca (logo)</span>
            <input type="text" value={ap.marcaTexto} onChange={actualizar('marcaTexto')} />
          </label>
          <label className="campo">
            <span>Icono logo (emoji, si no hay imagen)</span>
            <input type="text" value={ap.logoIco} onChange={actualizar('logoIco')} maxLength={4} />
          </label>
        </div>

        <div className="admin-logo-zona">
          <div className="logo-vista-previa" aria-hidden="true">
            {ap.logoImage
              ? <img src={ap.logoImage} alt="" />
              : <span>{ap.logoIco || '🌱'}</span>}
          </div>

          <div>
            <div className="panel-acciones">
              <label className={`btn-mini btn-aprobar campo-archivo${subiendoLogo ? ' activo' : ''}`}>
                {subiendoLogo ? '⏳ Procesando…' : '📷 Subir logo'}
                <input
                  type="file"
                  accept=".png,.svg,.jpg,.jpeg,image/png,image/svg+xml,image/jpeg"
                  onChange={e => { subirLogo(e.target.files?.[0]); e.target.value = '' }}
                  disabled={subiendoLogo}
                />
              </label>
              {ap.logoImage && (
                <button
                  type="button"
                  className="btn-mini btn-rechazar"
                  onClick={() => { alGuardar('apariencia', { logoImage: null }); notificar('♻ Logo reemplazado por el icono de emoji') }}
                >
                  ♻ Quitar logo
                </button>
              )}
            </div>
            <p className="nota-b2b" style={{ margin: '0.5rem 0 0' }}>
              Reemplaza el ícono/emoji por tu logotipo real. Se muestra en la barra superior y el pie de página.
              Especificación: {ESPECIFICACION_LOGO}.
            </p>
          </div>
        </div>

        <div className="admin-cuadricula" style={{ marginTop: '1rem' }}>
          <label className="campo">
            <span>Color primario</span>
            <input type="color" value={ap.colorPrimario} onChange={actualizar('colorPrimario')} style={{ height: 42 }} />
          </label>
          <label className="campo">
            <span>Color de acento</span>
            <input type="color" value={ap.colorAcento} onChange={actualizar('colorAcento')} style={{ height: 42 }} />
          </label>
          <label className="campo">
            <span>Tipografía</span>
            <select value={ap.tipografia} onChange={alGuardarTipografia}>
              {TIPOGRAFIAS.map(t => <option key={t.id} value={t.id}>{t.etiqueta}</option>)}
            </select>
          </label>
        </div>
        <p className="nota-b2b">
          Los colores actualizan gradientes, botones e íconos con variables CSS en vivo.
        </p>
      </div>

      <div className="admin-ficha">
        <h3>🖼️ Banner del inicio (hero)</h3>
        <div className="admin-cuadricula">
          <label className="campo">
            <span>Etiqueta superior</span>
            <input type="text" value={ap.heroEtiqueta} onChange={actualizar('heroEtiqueta')} />
          </label>
          <div className="campo-fila">
            <label className="campo">
              <span>Título (parte 1)</span>
              <input type="text" value={ap.heroTitulo1} onChange={actualizar('heroTitulo1')} />
            </label>
            <label className="campo">
              <span>Título con degradado (parte 2)</span>
              <input type="text" value={ap.heroTitulo2} onChange={actualizar('heroTitulo2')} />
            </label>
          </div>
          <label className="campo">
            <span>Subtítulo</span>
            <textarea rows="2" className="area-admin" value={ap.heroSubtitulo} onChange={actualizar('heroSubtitulo')} />
          </label>
          <label className="campo">
            <span>Franja promocional (banda superior del inicio)</span>
            <input type="text" value={ap.franjaPromo} onChange={actualizar('franjaPromo')} />
          </label>
        </div>
      </div>
    </>
  )
}

/* ============ SEO ============ */

function AdminSeo({ config, alGuardar, productos, notificar }) {
  const seo = config.seo
  const actualizar = campo => evento => alGuardar('seo', { [campo]: evento.target.value })

  return (
    <>
      <Titulo
        icono="🔍"
        texto="SEO y visibilidad"
        subtitulo="Metadatos del sitio, Open Graph y rastreo con Analytics / Pixel."
      />

      <div className="admin-ficha">
        <h3>🏠 Página principal</h3>
        <div className="admin-cuadricula">
          <div className="campo-fila">
            <label className="campo">
              <span>Meta título (≤ 60 caracteres)</span>
              <input type="text" value={seo.metaTitulo} onChange={actualizar('metaTitulo')} maxLength={65} />
            </label>
            <label className="campo">
              <span>Meta descripción (≤ 155)</span>
              <textarea
                rows="2"
                className="area-admin"
                value={seo.metaDescripcion}
                onChange={actualizar('metaDescripcion')}
                maxLength={180}
              />
            </label>
          </div>
          <div className="campo-fila">
            <label className="campo">
              <span>Título Open Graph</span>
              <input type="text" value={seo.ogTitulo} onChange={actualizar('ogTitulo')} />
            </label>
            <label className="campo">
              <span>Descripción Open Graph</span>
              <input type="text" value={seo.ogDescripcion} onChange={actualizar('ogDescripcion')} />
            </label>
          </div>
          <label className="campo">
            <span>Imagen Open Graph (URL absoluta) — tarjeta al compartir</span>
            <input
              type="url"
              value={seo.ogImagen}
              onChange={actualizar('ogImagen')}
              placeholder="https://…/banner-amec.jpg"
            />
          </label>
        </div>
      </div>

      <div className="admin-ficha">
        <h3>📈 Rastreo y publicidad</h3>
        <div className="admin-cuadricula">
          <label className="campo">
            <span>ID Google Analytics 4 (G-XXXXXXXXXX)</span>
            <input type="text" value={seo.gaId} onChange={actualizar('gaId')} placeholder="G-ABCDEFG123" />
          </label>
          <label className="campo">
            <span>ID Facebook Pixel (16-17 dígitos)</span>
            <input type="text" value={seo.pixelId} onChange={actualizar('pixelId')} placeholder="123456789012345" />
          </label>
        </div>
        <p className="nota-b2b">Los cambios se aplican al recargar la página en modo en vivo. El ID debe ser del formato válido.</p>
      </div>

      <div className="admin-ficha">
        <h3>🔗 SEO por producto</h3>
        <p className="nota-b2b">Cada producto tiene su slug, meta título, meta descripción y titulares OG en su ficha editable.</p>
        <div className="tabla-scroll">
          <table className="tabla-pedidos">
            <thead>
              <tr><th>Producto</th><th>Slug</th><th>Meta título</th><th>OG</th></tr>
            </thead>
            <tbody>
              {productos.filter(p => !p.proximo).map(p => (
                <tr key={p.id}>
                  <td className="folio">{p.nombre}</td>
                  <td>
                    <a href={`#/producto/${p.seo?.slug || p.id}`} target="_blank" rel="noreferrer" style={{ color: 'var(--azul-700)' }}>
                      /{p.seo?.slug || p.id}
                    </a>
                  </td>
                  <td>{p.seo?.metaTitulo ? (p.seo.metaTitulo.length > 45 ? `${p.seo.metaTitulo.slice(0, 45)}…` : p.seo.metaTitulo) : <em>(usa nombre)</em>}</td>
                  <td>{p.seo?.ogTitulo ? '✅' : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <a href="#/admin/productos" className="btn-ver-detalle" style={{ marginTop: '0.7rem', display: 'inline-block' }}>
          Editar fichas →
        </a>
      </div>
    </>
  )
}

/* ============ Layout y rutas del panel ============ */

const MENU = [
  { href: '#/admin', icono: '📊', texto: 'Dashboard' },
  { href: '#/admin/pedidos', icono: '🧾', texto: 'Pedidos' },
  { href: '#/admin/productos', icono: '🧴', texto: 'Productos' },
  { href: '#/admin/boticas', icono: '🏥', texto: 'Boticas' },
  { href: '#/admin/envios', icono: '🚛', texto: 'Envíos' },
  { href: '#/admin/promos', icono: '🎟️', texto: 'Promociones' },
  { href: '#/admin/apariencia', icono: '🎨', texto: 'Apariencia' },
  { href: '#/admin/seo', icono: '🔍', texto: 'SEO' },
]

const TITULOS_RUTA = {
  pedidos: 'Pedidos',
  productos: 'Productos',
  boticas: 'Boticas',
  envios: 'Envíos',
  promos: 'Promociones',
  apariencia: 'Apariencia',
  seo: 'SEO',
}

export function PanelTiendaAdmin({
  ruta,
  usuario,
  usuarios,
  pedidos,
  productos,
  config,
  acciones,
}) {
  const partes = ruta.split('/').filter(Boolean).slice(1) /* tras 'admin' */
  const pagina = partes[0] ?? ''
  const sesionValida = usuario?.rol === 'admin'

  if (!sesionValida) {
    return <AdminLogin usuarios={usuarios} apariencia={config?.apariencia} alIniciar={acciones.iniciarSesion} />
  }

  const moduloActivo = TITULOS_RUTA[pagina] ?? 'Dashboard'

  return (
    <div className="admin-shell">
      <aside className="admin-lado">
        <a href="#/" className="admin-marca">
          <span className={`logo-mark${config?.apariencia?.logoImage ? ' con-imagen' : ''}`}>
            {config?.apariencia?.logoImage
              ? <img src={config.apariencia.logoImage} alt="Logotipo" />
              : <span aria-hidden="true">{config?.apariencia?.logoIco ?? '🌱'}</span>}
          </span>{' '}
          AMEC
        </a>

        <nav className="admin-navega" aria-label="Panel administrativo">
          {MENU.map(item => (
            <a
              key={item.href}
              href={item.href}
              className={`admin-enlace${(item.href === '#/admin' && pagina === '') || (pagina && item.href.endsWith(`/${pagina}`)) ? ' activo' : ''}`}
            >
              <span aria-hidden="true">{item.icono}</span> {item.texto}
            </a>
          ))}
        </nav>

        <div className="admin-pie">
          <a href="#/" className="admin-enlace">🛍️ Ver tienda</a>
          <button
            type="button"
            className="admin-enlace"
            style={{ border: 'none', background: 'none', textAlign: 'left', cursor: 'pointer', width: '100%', font: 'inherit' }}
            onClick={acciones.cerrarSesion}
          >
            🚪 Cerrar sesión
          </button>
          <small>{usuario.email}</small>
        </div>
      </aside>

      <main className="admin-principal">
        <div className="admin-contenido">
          {pagina === '' && <Dashboard pedidos={pedidos} productos={productos} />}
          {pagina === 'pedidos' && <PanelPedidos pedidos={pedidos} alCambiarEstado={acciones.cambiarEstadoPedido} />}
          {pagina === 'productos' && partes.length === 1 && (
            <AdminProductos
              productos={productos}
              alGuardar={acciones.guardarProducto}
              alEliminar={acciones.eliminarProducto}
              notificar={acciones.notificar}
            />
          )}
          {pagina === 'productos' && partes[1] === 'nuevo' && (
            <AdminProductoForm productos={productos} idProducto={null} alGuardar={acciones.guardarProducto} notificar={acciones.notificar} />
          )}
          {pagina === 'productos' && partes[1] && partes[1] !== 'nuevo' && (
            <AdminProductoForm productos={productos} idProducto={partes[1]} alGuardar={acciones.guardarProducto} notificar={acciones.notificar} />
          )}
          {pagina === 'boticas' && (
            <AdminBoticas config={config} alGuardar={acciones.guardarConfig} notificar={acciones.notificar} />
          )}
          {pagina === 'envios' && (
            <AdminEnvios config={config} alGuardar={acciones.guardarConfig} notificar={acciones.notificar} />
          )}
          {pagina === 'promos' && (
            <AdminPromos config={config} alGuardar={acciones.guardarConfig} notificar={acciones.notificar} />
          )}
          {pagina === 'apariencia' && (
            <AdminApariencia config={config} alGuardar={acciones.guardarConfig} notificar={acciones.notificar} />
          )}
          {pagina === 'seo' && (
            <AdminSeo config={config} alGuardar={acciones.guardarConfig} productos={productos} notificar={acciones.notificar} />
          )}

          {!MENU.some(m => m.href.endsWith(`/${pagina}`)) && pagina !== '' && pagina !== 'productos' && (
            <p className="empty-state">Módulo no encontrado: <code>{ruta}</code></p>
          )}
        </div>
      </main>
    </div>
  )
}
