/* ================================================================
   Configuración de la tiendas (editable desde #/admin)
   ----------------------------------------------------------------
   * apariencia: logo, colores, tipografía y textos del hero/banner
   * envio:      tarifas por región/perú + envío gratis desde X
   * promos:     cupones (código) y promociones automáticas
   * seo:        metadatos globales, Open Graph, Google Analytics
                 y Facebook Pixel
   Los montos de envío/cupones están en SOLES DECIMALES (ider.cero
   distinto a Culqi, que usa céntimos solo en el backend).
   ================================================================ */

export const TIPOGRAFIAS = [
  { id: 'sistema', etiqueta: 'Sistema (Segoe UI/Roboto)' },
  { id: 'poppins', etiqueta: 'Poppins' },
  { id: 'montserrat', etiqueta: 'Montserrat' },
  { id: 'lato', etiqueta: 'Lato' },
]

export const FUENTES_WEB = {
  poppins: `https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700;800&display=swap`,
  montserrat: `https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800&display=swap`,
  lato: `https://fonts.googleapis.com/css2?family=Lato:wght@400;700;900&display=swap`,
}

export const CONFIGURACION_INICIAL = {
  apariencia: {
    marcaTexto: 'AMEC NUTRITION',
    logoIco: '🌱',
    logoImage: null,
    colorPrimario: '#18a373',
    colorAcento: '#2483d7',
    tipografia: 'sistema',
    heroEtiqueta: '🛍️ Precios públicos al alcance · Portal B2B para farmacias',
    heroTitulo1: 'Nutrición que se',
    heroTitulo2: 'confía, porque se conoce',
    heroSubtitulo: 'En AMEC producimos suplementos y nutracéuticos para ti y tu familia. Compra directo con precios al público, o solicita tu acceso de distribuidor B2B.',
    franjaPromo: '🚚 Envío gratis a partir de S/ 200 en compras B2C',
  },
  envio: {
    activo: true,
    costoBase: 15,
    envioGratisDesde: 200,
    tarifas: [
      { region: 'Lima Metropolitana', costo: 10 },
      { region: 'Lambayeque / Chiclayo', costo: 12 },
      { region: 'Cajamarca', costo: 14 },
      { region: 'La Libertad / Trujillo', costo: 14 },
      { region: 'Junín / Huancayo', costo: 18 },
      { region: 'Ayacucho', costo: 20 },
      { region: 'Cusco', costo: 22 },
      { region: 'Arequipa', costo: 20 },
      { region: 'Puno', costo: 25 },
    ],
  },
  promos: {
    cupones: [
      { codigo: 'AMECBIENVENIDA', tipo: 'porcentaje', valor: 10, minimo: 0, activo: true },
    ],
    automaticas: [],
  },
  /* Boticas aliadas: gestionables desde #/admin → Boticas (con logo propio) */
  boticas: [
    { id: 'botica-inkafarma', nombre: 'Inka Farma', ciudad: 'Cajamarca', zona: 'norte', logo: null },
    { id: 'botica-vidasanas', nombre: 'Boticas Vidasanas', ciudad: 'Chiclayo', zona: 'norte', logo: null },
    { id: 'botica-esperanza', nombre: 'Farmacia La Esperanza', ciudad: 'Trujillo', zona: 'norte', logo: null },
    { id: 'botica-sanrafael', nombre: 'Botica San Rafael', ciudad: 'Huancayo', zona: 'centro', logo: null },
    { id: 'botica-farmasol', nombre: 'Farmasol', ciudad: 'Ayacucho', zona: 'centro', logo: null },
    { id: 'botica-delsur', nombre: 'Boticas del Sur', ciudad: 'Arequipa', zona: 'sur', logo: null },
    { id: 'botica-farmacentro', nombre: 'Farmacentro Cusco', ciudad: 'Cusco', zona: 'sur', logo: null },
    { id: 'botica-mifarma', nombre: 'Mi Farma Express', ciudad: 'Lima', zona: 'lima', logo: null },
    { id: 'botica-universal', nombre: 'Boticas Universal', ciudad: 'Callao', zona: 'lima', logo: null },
  ],
  seo: {
    metaTitulo: 'AMEC NUTRITION — Suplementos y Nutracéuticos | Farmacias B2B',
    metaDescripcion: 'Tienda oficial AMEC NUTRITION: suplementos de grado clínico para el hogar, boticas y distribuidoras. Precios al público y portal B2B para farmacias del Perú.',
    ogTitulo: 'AMEC NUTRITION · Nutrición de grado clínico',
    ogDescripcion: 'Suplementos y nutracéuticos validados por profesionales de la salud. Despacho a todo el Perú.',
    ogImagen: '',
    gaId: '',
    pixelId: '',
  },
}

/* ---------- Envíos ---------- */

/** Costo de envío para una región (0 si aplica envío gratis) */
export function costoEnvio(config, region, subtotal) {
  const envio = config?.envio
  if (!envio?.activo) return 0
  if (envio.envioGratisDesde > 0 && subtotal >= envio.envioGratisDesde) return 0
  const tarifa = (envio.tarifas ?? []).find(t => t.region === region)
  return tarifa?.costo ?? envio.costoBase ?? 15
}

/* ---------- Cupones y promociones automáticas ---------- */

function vigenciaActiva(promo, ahora = new Date()) {
  if (promo.desde && ahora < new Date(`${promo.desde}T00:00:00`)) return false
  if (promo.hasta && ahora > new Date(`${promo.hasta}T23:59:59`)) return false
  return true
}

/** Calcula el descuento (S/) por promos automáticas + cupón, según el subtotal */
export function evaluarDescuento(config, subtotal, codigoCupon = '') {
  let descuento = 0
  const detalle = []

  for (const promo of config?.promos?.automaticas ?? []) {
    if (!promo.activo || !vigenciaActiva(promo)) continue
    if ((promo.minimo ?? 0) > 0 && subtotal < promo.minimo) continue
    const monto = promo.tipo === 'porcentaje'
      ? (subtotal * promo.valor) / 100
      : Math.min(promo.valor ?? 0, subtotal)
    if (monto <= 0) continue
    descuento += monto
    detalle.push({
      etiqueta: promo.nombre || `Promoción ${promo.valor}${promo.tipo === 'porcentaje' ? '%' : ' S/'}`,
      monto,
    })
  }

  const codigo = String(codigoCupon || '').trim().toUpperCase()
  const cuponEncontrado = codigo
    ? (config?.promos?.cupones ?? []).find(c =>
        c.activo
        && String(c.codigo).toUpperCase() === codigo
        && (c.minimo ?? 0) <= subtotal)
    : null

  if (cuponEncontrado) {
    const monto = cuponEncontrado.tipo === 'porcentaje'
      ? (subtotal * cuponEncontrado.valor) / 100
      : Math.min(cuponEncontrado.valor ?? 0, subtotal)
    if (monto > 0) {
      descuento += monto
      detalle.push({
        etiqueta: `Cupón ${cuponEncontrado.codigo}`,
        monto,
      })
    }
  }

  return {
    descuento: Math.min(Math.round(descuento * 100) / 100, subtotal),
    detalle,
    cuponAplicado: cuponEncontrado ?? null,
  }
}

/* ---------- SEO: metadatos en el documento ---------- */

function fijarMeta(clave, contenido, esProperty = false) {
  if (contenido === undefined || contenido === null || contenido === '') return
  const selector = `${esProperty ? 'property' : 'name'}="${clave}"`
  let etiqueta = document.head.querySelector(`meta[${esProperty ? 'property' : 'name'}="${clave}"]`)
  if (!etiqueta) {
    etiqueta = document.createElement('meta')
    esProperty ? etiqueta.setAttribute('property', clave) : etiqueta.setAttribute('name', clave)
    document.head.appendChild(etiqueta)
  }
  etiqueta.setAttribute('content', contenido)
}

/** Metadatos de página (título, description, Open Graph, Twitter) */
export function definirMetatags({ titulo, descripcion, imagen } = {}) {
  if (titulo) document.title = titulo
  fijarMeta('description', descripcion)
  fijarMeta('og:title', titulo, true)
  fijarMeta('og:description', descripcion, true)
  fijarMeta('og:site_name', 'AMEC NUTRITION', true)
  fijarMeta('og:type', 'website', true)
  if (imagen) {
    fijarMeta('og:image', imagen, true)
    fijarMeta('twitter:image', imagen)
  }
  fijarMeta('twitter:card', 'summary_large_image')
  fijarMeta('twitter:title', titulo)
  fijarMeta('twitter:description', descripcion)
}

/* ---------- Analítica: Google Analytics y Facebook Pixel ---------- */

export function aplicarAnalitica({ gaId, pixelId } = {}) {
  if (gaId && !document.getElementById('amec-ga')) {
    const carga = document.createElement('script')
    carga.id = 'amec-ga'
    carga.async = true
    carga.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`
    document.head.appendChild(carga)

    const config = document.createElement('script')
    config.id = 'amec-ga-config'
    config.textContent = "window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','" + gaId + "');"
    document.head.appendChild(config)
  }

  if (pixelId && !document.getElementById('amec-pixel')) {
    const carga = document.createElement('script')
    carga.id = 'amec-pixel'
    carga.textContent = `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${pixelId}');fbq('track','PageView');`
    document.head.appendChild(carga)
  }
}

/* ---------- Apariencia → variables CSS ---------- */

const PILA_FUENTE_SISTEMA = '"Segoe UI", system-ui, -apple-system, Roboto, "Helvetica Neue", Arial, sans-serif'

export function aplicarApariencia(apariencia) {
  if (!apariencia) return
  const raiz = document.documentElement.style

  raiz.setProperty('--verde-500', apariencia.colorPrimario)
  raiz.setProperty('--verde-700', apariencia.colorPrimario)
  raiz.setProperty('--azul-500', apariencia.colorAcento)
  raiz.setProperty('--azul-700', apariencia.colorAcento)
  raiz.setProperty(
    '--grad-marca',
    `linear-gradient(120deg, ${apariencia.colorPrimario}, ${apariencia.colorAcento})`,
  )

  const fuente = TIPOGRAFIAS.find(t => t.id === apariencia.tipografia)
  raiz.fontFamily = fuente && fuente.id !== 'sistema'
    ? `"${fuente.etiqueta}", ${PILA_FUENTE_SISTEMA}`
    : PILA_FUENTE_SISTEMA
}

/* ---------- Utilidades ---------- */

/** Formato S/ de moneda peruana (unidad modelo: soles decimales) */
export function formatearPrecio(valor) {
  return `S/ ${Number(valor || 0).toFixed(2)}`
}

export function textoASlug(texto) {
  return String(texto || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 60)
}
