/* ================================================================
   AMEC NUTRITION — Tienda virtual completa
   ----------------------------------------------------------------
   * Página de inicio: más vendidos, recién llegados, próximos,
     boticas aliadas y zonas de cobertura.
   * Página de catálogo general con panel de filtros (y buscador).
   * Páginas legales con rutas propias (#/legal/...).
   * Precios: el público ve SIEMPRE el precio B2C; al iniciar
     sesión como distribuidor aprobado, la tienda muestra B2B.
   * Carrito lateral + checkout multi-paso + pedidos con folio.
   * Portal distribuidor con solicitudes y aprobación (admin).

   Rutas disponibles:
     #/                    Inicio
     #/catalogo            Catálogo completo
     #/producto/<slug>     Ficha de producto (SEO)
     #/admin[/…]           Panel administrativo
     #/legal/envios | privacidad | terminos | devoluciones |
     #/legal/reclamaciones | #/legal/trabaja-con-nosotros

   Cuentas demo: distribuidor@amec.com / amec2024 · admin@amec.com / admin2024
   Nota: precios `precioPublico` (B2C) y `precioB2B` son simbólicos (0);
   reemplázalos por la lista oficial y toda la matemática se ajusta sola.
   ================================================================ */
import { useEffect, useState } from 'react'
import './index.css'
import { formatearPrecio } from './configuracion.js'
import {
  CONFIGURACION_INICIAL,
  costoEnvio,
  evaluarDescuento,
  definirMetatags,
  aplicarAnalitica,
  aplicarApariencia,
  textoASlug,
} from './configuracion.js'
import { PanelTiendaAdmin, ESTADOS_PEDIDO } from './panel-admin.jsx'
import { AmecBot } from './amecbot.jsx'

/* ============ Datos de marca y contacto ============ */

const MARCA = 'AMEC NUTRITION'

const DATOS_CONTACTO = {
  telefono: '074-775986',
  telefonoHref: 'tel:+51074775986',
  celular: '994 254 676',
  whatsapp: 'https://wa.me/51994254676',
  correo: 'amecnutrition@amecpharma.com',
  redes: [
    { id: 'facebook', nombre: 'Facebook', url: 'https://www.facebook.com/amecnutrition' },
    { id: 'instagram', nombre: 'Instagram', url: 'https://www.instagram.com/amecnutrition' },
    { id: 'tiktok', nombre: 'TikTok', url: 'https://www.tiktok.com/@amecnutrition' },
  ],
}

const CATEGORIAS = [
  { id: 'todas', etiqueta: 'Todos los productos' },
  { id: 'nutricion-recuperacion', etiqueta: 'Nutrición y recuperación' },
  { id: 'infantil', etiqueta: 'Línea infantil' },
  { id: 'vitaminas', etiqueta: 'Vitaminas y minerales' },
  { id: 'femenina', etiqueta: 'Salud femenina' },
  { id: 'descanso-calma', etiqueta: 'Descanso y bienestar' },
  { id: 'especializada', etiqueta: 'Fórmulas especializadas' },
]

const ZONAS = [
  { id: 'todas', etiqueta: 'Todas las zonas' },
  { id: 'norte', etiqueta: 'Zona Norte' },
  { id: 'centro', etiqueta: 'Zona Centro' },
  { id: 'sur', etiqueta: 'Zona Sur' },
  { id: 'lima', etiqueta: 'Lima Metropolitana' },
]

/* ============ Catálogo: 16 productos AMEC ============

   precioPublico = precio B2C (visible por defecto para cualquiera)
   precioB2B     = precio de distribución (solo con sesión aprobada)
   masVendido / nuevo = banderas para las secciones del Home. */

const PRODUCTOS = [
  {
    id: 'ansineuro',
    nombre: 'Ansineuro',
    formato: 'Frasco x 30 cápsulas',
    categoria: 'descanso-calma',
    icono: '🧠',
    variante: 'v-azul',
    precioPublico: 134.90,
    precioB2B: 95.21,
    descripcion:
      'Fórmula nutricional orientada al equilibrio del sistema nervioso, con ingredientes que contribuyen a reducir la tensión y la irritabilidad cotidiana.',
    beneficios: [
      'Apoyo al equilibrio emocional y nervioso',
      'Ingredientes botánicos y micronutrientes',
      'R.S.N° DE-5631',
    ],
    uso: '1 cápsula al día junto a la comida, o según indicación del profesional de salud.',
  },
  {
    id: 'bioartimec',
    nombre: 'Bioartimec',
    formato: 'Lata x 500 g',
    masVendido: true,
    categoria: 'nutricion-recuperacion',
    icono: '🥤',
    variante: 'v-verde',
    precioPublico: 134.90,
    precioB2B: 86.72,
    descripcion:
      'Alimento en polvo con proteína, vitaminas y minerales diseñado para el aporte nutricional diario y el apoyo a la recuperación.',
    beneficios: [
      'Proteína de alta calidad biológica',
      'Vitaminas y minerales esenciales',
      'Fácil disolución y digestión',
    ],
    uso: '2 medidas en agua o leche, una o dos veces al día.',
  },
  {
    id: 'floramec',
    nombre: 'Floramec',
    formato: 'Caja x 30 sachets de 5 g',
    nuevo: true,
    categoria: 'especializada',
    icono: '🌸',
    variante: 'v-verde',
    precioPublico: 0,
    precioB2B: 0,
    descripcion:
      'Fórmula con cepas microbianas diseñada para balancear la microflora intestinal y apoyar la salud digestiva.',
    beneficios: [
      'Equilibra la microflora intestinal',
      'Apoyo a la digestión y el bienestar abdominal',
      'Sachets individuales de 5 g',
    ],
    uso: '1 sachet al día disuelto en agua o jugo, preferiblemente en ayunas.',
  },
  {
    id: 'femestrogen',
    nombre: 'Femestrogen',
    formato: 'Caja x 30 sachets',
    nuevo: true,
    categoria: 'femenina',
    icono: '🌺',
    variante: 'v-azul',
    precioPublico: 0,
    precioB2B: 0,
    descripcion:
      'Fórmula nutricional femenina con vitaminas y compuestos vegetales estandarizados, orientada al bienestar durante las diferentes etapas de la mujer.',
    beneficios: [
      'Apoyo al bienestar hormonal femenino',
      'Vitamina B6 y ácido fólico',
      'Formato sachet práctico para el consumo diario',
    ],
    uso: 'El contenido de un sachet al día con agua o jugo.',
  },
  {
    id: 'inmunoamec-kids',
    nombre: 'Inmunoamec Kids',
    formato: 'Frasco x 150 ml',
    masVendido: true,
    categoria: 'infantil',
    icono: '🧸',
    variante: 'v-azul',
    precioPublico: 0,
    precioB2B: 0,
    descripcion:
      'Jarabe infantil con zinc, vitaminas C y D, formulado para apoyar las defensas naturales de los niños durante todo el año.',
    beneficios: [
      'Apoyo al sistema inmune infantil',
      'Zinc y vitaminas C y D',
      'Sabor frutal agradable, sin azúcar añadida',
    ],
    uso: 'Según la edad del niño, según lo indicado en el empaque del producto.',
  },
  {
    id: 'megamec',
    nombre: 'Megamec',
    formato: 'Gomitas x 60 · sabor naranja',
    masVendido: true,
    categoria: 'vitaminas',
    icono: '🍬',
    variante: 'v-verde',
    precioPublico: 0,
    precioB2B: 0,
    descripcion:
      'Gomitas multivitamínicas de sabor naranja, ideales para complementar la dieta de toda la familia.',
    beneficios: [
      '10 vitaminas y minerales esenciales',
      'Sin azúcar añadida',
      'Sabor natural a naranja',
    ],
    uso: '1 gomita al día después de alguna comida.',
  },
  {
    id: 'nutriamec-adulto',
    nombre: 'Nutriamec Adulto',
    formato: 'Lata x 1000 g',
    masVendido: true,
    categoria: 'nutricion-recuperacion',
    icono: '🥤',
    variante: 'v-verde',
    precioPublico: 0,
    precioB2B: 0,
    descripcion:
      'Complemento nutricional completo para adultos, en presentación familiar de 1000 g: 26 vitaminas, minerales y proteína.',
    beneficios: [
      '26 vitaminas y minerales',
      'Aminoácidos esenciales',
      'Apoyo diario al rendimiento y la vitalidad',
    ],
    uso: '3 a 4 medidas en leche o agua una vez al día.',
  },
  {
    id: 'nutridiabet',
    nombre: 'Nutridiabet',
    formato: 'Lata x 1000 g',
    categoria: 'especializada',
    icono: '🩺',
    variante: 'v-azul',
    precioPublico: 0,
    precioB2B: 0,
    descripcion:
      'Nutrición clínica diseñada para personas con diabetes: hidratos de carbono con bajo índice glucémico, fibra y proteína de calidad.',
    beneficios: [
      'Índice glucémico controlado',
      'Fibra dietética y ácidos grasos esenciales',
      'Apto para planes de alimentación diabéticos',
    ],
    uso: '1 porción diaria indicada en el envase, bajo supervisión médica.',
  },
  {
    id: 'nad-plus',
    nombre: 'NAD+',
    formato: 'Frasco x 90 cápsulas · 500 mg',
    nuevo: true,
    categoria: 'especializada',
    icono: '🧬',
    variante: 'v-azul',
    precioPublico: 0,
    precioB2B: 0,
    descripcion:
      'Precursor de NAD+ para el apoyo a la energía celular y los procesos de restablecimiento natural del organismo.',
    beneficios: [
      'Apoyo a la energía mitocondrial',
      'Contribuye a la restauración celular',
      '500 mg por cápsula · pureza certificada',
    ],
    uso: '1 cápsula cada mañana con el estómago vacío.',
  },
  {
    id: 'nutriamec-kids-sachets',
    nombre: 'Nutriamec Kids',
    formato: 'Caja x 15 sachets',
    categoria: 'infantil',
    icono: '🧒',
    variante: 'v-verde',
    precioPublico: 0,
    precioB2B: 0,
    descripcion:
      'Multivitamínico infantil en sachets individuales de exactamente una dosis, ideal para la escuela o los viajes.',
    beneficios: [
      'Dosis única por sachet',
      'Vitaminas A, C, D y zinc',
      'Sabor frutal que los niños disfrutan',
    ],
    uso: '1 sachet al día directo o disuelto en agua o leche.',
  },
  {
    id: 'nutriamec-hierro',
    nombre: 'Nutriamec Hierro',
    formato: 'Caja x 15 sachets',
    nuevo: true,
    categoria: 'vitaminas',
    icono: '💪',
    variante: 'v-azul',
    precioPublico: 0,
    precioB2B: 0,
    descripcion:
      'Aporte de hierro micronizado con vitamina C, para la prevención nutricional de la anemia en niños y adultos.',
    beneficios: [
      'Hierro con vitamina C: mejor absorción',
      'Minimiza el sabor metálico',
      'Sachets individuales de fácil transporte',
    ],
    uso: '1 sachet al día, o según la pauta del pediatra.',
  },
  {
    id: 'nutriamec-kids-lata',
    nombre: 'Nutriamec Kids',
    formato: 'Lata x 500 g',
    masVendido: true,
    categoria: 'infantil',
    icono: '🧒',
    variante: 'v-verde',
    precioPublico: 0,
    precioB2B: 0,
    descripcion:
      'Nutrición infantil en polvo con proteína, calcio, vitamina D y vitaminas para el crecimiento y el desarrollo mental.',
    beneficios: [
      'Calcio y vitamina D para huesos y dientes',
      'Complejo de vitaminas del grupo B',
      'El formato familiar rinde para un mes',
    ],
    uso: '2 medidas en leche, una o dos veces al día.',
  },
  {
    id: 'pregnamec',
    nombre: 'Pregnamec',
    formato: 'Lata x 500 g',
    categoria: 'femenina',
    icono: '🤰',
    variante: 'v-azul',
    precioPublico: 0,
    precioB2B: 0,
    descripcion:
      'Nutrición materna con folato, hierro y DHA, diseñada para el embarazo y la lactancia.',
    beneficios: [
      'Ácido fólico y DHA para la etapa prenatal',
      'Hierro y calcio adicionales',
      'Sin azúcar añadida',
    ],
    uso: '2 medidas en leche o agua al día, según lo recomendado por el médico.',
  },
  {
    id: 'rhc-colageno',
    nombre: 'RHC Colágeno',
    formato: 'Caja x 30 sachets',
    masVendido: true,
    categoria: 'especializada',
    icono: '💧',
    variante: 'v-verde',
    precioPublico: 0,
    precioB2B: 0,
    descripcion:
      'Péptidos de colágeno hidrolizado fortificados con vitamina C, para la salud de la piel y las articulaciones.',
    beneficios: [
      'Fortalece piel, uñas y cabello',
      'Apoyo a cartílagos y articulaciones',
      'Dosis diaria en sachet',
    ],
    uso: '1 sachet al día diluido en agua o cualquier bebida.',
  },
  {
    id: 'sleep-amec-adulto',
    nombre: 'Sleep AMEC Adulto',
    formato: 'Gomitas x 60 · melatonina',
    masVendido: true,
    categoria: 'descanso-calma',
    icono: '🌙',
    variante: 'v-azul',
    precioPublico: 0,
    precioB2B: 0,
    descripcion:
      'Gomitas con melatonina, formuladas para ayudar a conciliar el sueño y mejorar la calidad del descanso en adultos.',
    beneficios: [
      'Melatonina de rápida absorción',
      'Sabor frutal natural',
      '60 gomitas por frasco',
    ],
    uso: '2 gomitas 30 minutos antes de dormir.',
  },
  {
    id: 'sleep-amec-kids',
    nombre: 'Sleep AMEC Kids',
    formato: 'Gomitas x 60 · relajantes',
    nuevo: true,
    categoria: 'infantil',
    icono: '🐻',
    variante: 'v-verde',
    precioPublico: 0,
    precioB2B: 0,
    descripcion:
      'Gomitas relajantes pediátricas con ingredientes naturales que acompañan al niño hacia un sueño tranquilo.',
    beneficios: [
      'Ingredientes relajantes naturales',
      'Sin azúcar añadida ni colorantes',
      'Fórmula adaptada a la edad pediátrica',
    ],
    uso: '1 gomita 30 minutos antes de dormir, según lo indique el pediatra.',
  },
]

/* Próximamente: productos por ingresar al catálogo */
const PRODUCTOS_PROXIMOS = [
  {
    id: 'proximo-omega-kids',
    nombre: 'Nutriomec Ômega Kids',
    formato: 'Frasco x 120 ml',
    categoria: 'infantil',
    icono: '🐟',
    variante: 'v-azul',
    descripcion: 'Omega 3 en forma de goteo con sabor frutal para el desarrollo cerebral de los peques.',
  },
  {
    id: 'proximo-calcio',
    nombre: 'Calciomec + D3',
    formato: 'Lata x 800 g',
    categoria: 'vitaminas',
    icono: '🦴',
    variante: 'v-verde',
    descripcion: 'Calcio con vitamina D3 para huesos fuertes en etapas de crecimiento y adulto mayor.',
  },
  {
    id: 'proximo-ferri',
    nombre: 'FerriKids Gotas',
    formato: 'Frasco x 30 ml',
    categoria: 'vitaminas',
    icono: '🩸',
    variante: 'v-azul',
    descripcion: 'Hierro en gotas de alta absorción, formulado para lactantes bajo indicación pediátrica.',
  },
  {
    id: 'proximo-gastro',
    nombre: 'Gastroprotect Digest',
    formato: 'Caja x 20 sachets',
    categoria: 'especializada',
    icono: '🛡️',
    variante: 'v-verde',
    descripcion: 'Coadyuvante digestivo con masticables de jengibre y curcumina.',
  },
]

/* ============ Portal distribuidor: sesion etc. ============ */

const USUARIOS_INICIALES = [
  {
    id: 'u-distribuidor-demo',
    rol: 'b2b',
    estado: 'aprobado',
    email: 'distribuidor@amec.com',
    clave: 'amec2024',
    empresa: 'Distribuciones Andina S.A.',
    contacto: 'Andrés Mera',
    ruc: 'RUC-09876543210',
    ciudad: 'Bogotá',
  },
  {
    id: 'u-admin',
    rol: 'admin',
    estado: 'aprobado',
    email: 'admin@amec.com',
    clave: 'admin2024',
    empresa: 'AMEC NUTRITION (Administración)',
    contacto: 'Equipo comercial AMEC',
    ruc: '—',
    ciudad: '—',
  },
]

const CLAVES = {
  sesion: 'amec_sesion',
  usuarios: 'amec_usuarios',
  carrito: 'amec_carrito',
  pedidos: 'amec_pedidos',
  reclamos: 'amec_reclamos',
  productos: 'amec_productos',
  configuracion: 'amec_configuracion',
  imagenes: 'amec_imagenes', /* legado: se migran a amec_productos */
}

function cargarDatos(clave, respaldo) {
  try {
    const guardado = JSON.parse(localStorage.getItem(clave))
    return guardado ?? respaldo
  } catch {
    return respaldo
  }
}

/**
 * Catálogo gestionado desde el panel (#/admin → Productos).
 * La primera vez se siembra con PRODUCTOS (+ PRODUCTOS_PROXIMOS con
 * bandera proximo) y se migran las imágenes guardadas en amec_imagenes.
 */
function cargarProductos() {
  const guardados = cargarDatos(CLAVES.productos, null)
  if (Array.isArray(guardados) && guardados.length > 0) return guardados

  const imagenesLegado = cargarDatos(CLAVES.imagenes, {})
  return [
    ...PRODUCTOS,
    ...PRODUCTOS_PROXIMOS.map(p => ({ ...p, proximo: true })),
  ].map(p => ({
    ...p,
    precioPublico: p.precioPublico ?? 0,
    precioB2B: p.precioB2B ?? 0,
    stock: p.stock ?? 20,
    visible: true,
    imagen: imagenesLegado[p.id] ?? null,
    seo: {
      slug: textoASlug(p.id),
      metaTitulo: '',
      metaDescripcion: '',
      ogTitulo: '',
      ogDescripcion: '',
      ...(p.seo ?? {}),
    },
  }))
}

/* ============ Enrutamiento (hash routing ligero) ============ */

function useRuta() {
  const [ruta, setRuta] = useState(() => window.location.hash.replace('#', '') || '/')

  useEffect(() => {
    const actualizar = () => {
      setRuta(window.location.hash.replace('#', '') || '/')
      window.scrollTo({ top: 0, behavior: 'instant' })
    }
    window.addEventListener('hashchange', actualizar)
    return () => window.removeEventListener('hashchange', actualizar)
  }, [])

  return ruta
}

/* ============ Componentes de contacto ============ */

function IconoSocial({ red }) {
  if (red === 'facebook') {
    return (
      <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
        <path
          d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"
          fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        />
      </svg>
    )
  }
  if (red === 'instagram') {
    return (
      <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
        <rect x="3.4" y="3.4" width="17.2" height="17.2" rx="5" fill="none" stroke="currentColor" strokeWidth="2" />
        <circle cx="12" cy="12" r="3.8" fill="none" stroke="currentColor" strokeWidth="2" />
        <circle cx="17" cy="7" r="1.15" fill="currentColor" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
      <path
        d="M16.6 2.4c.4 2.1 1.7 3.5 3.9 3.7v3.1c-1.5 0-2.9-.5-3.9-1.2v6.7a5.9 5.9 0 1 1-5.9-5.9c.3 0 .6 0 .9.1v3.2c-.3-.1-.6-.2-.9-.2a2.9 2.9 0 1 0 2.9 2.9V2.4z"
        fill="currentColor"
      />
    </svg>
  )
}

function BarraContacto() {
  return (
    <div className="barra-contacto">
      <div className="contenedor barra-contacto-inner">
        <div className="contacto-datos">
          <a href={DATOS_CONTACTO.telefonoHref} aria-label={`Teléfono ${DATOS_CONTACTO.telefono}`}>
            <span aria-hidden="true">📞</span> {DATOS_CONTACTO.telefono}
          </a>
          <a href={DATOS_CONTACTO.whatsapp} target="_blank" rel="noreferrer" aria-label={`WhatsApp ${DATOS_CONTACTO.celular}`}>
            <span aria-hidden="true">📱</span> {DATOS_CONTACTO.celular}
          </a>
          <a href={`mailto:${DATOS_CONTACTO.correo}`} className="texto-escondido-movil" aria-label={DATOS_CONTACTO.correo}>
            <span aria-hidden="true">✉️</span> {DATOS_CONTACTO.correo}
          </a>
        </div>

        <div className="contacto-redes" aria-label="Redes sociales de AMEC Nutrition">
          {DATOS_CONTACTO.redes.map(red => (
            <a
              key={red.id}
              className="icono-social"
              href={red.url}
              target="_blank"
              rel="noreferrer"
              aria-label={red.nombre}
              title={red.nombre}
            >
              <IconoSocial red={red.id} />
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ============ Navegación ============ */

function Nav({ ruta, irASeccion, unidades, usuario, esB2B, pendientes, apariencia, alAbrirCarrito, alAbrirPortal, alAbrirMiCuenta, alSalir }) {
  const [abierto, setAbierto] = useState(false)
  const cerrar = () => setAbierto(false)

  return (
    <nav className="nav" aria-label="Navegación principal">
      <div className="contenedor nav-inner">
        <a href="#/" className="logo" onClick={cerrar}>
          <span className={`logo-mark${apariencia?.logoImage ? ' con-imagen' : ''}`}>
            {apariencia?.logoImage
              ? <img src={apariencia.logoImage} alt="Logotipo" />
              : <span aria-hidden="true">{apariencia?.logoIco ?? '🌱'}</span>}
          </span>
          {apariencia?.marcaTexto ?? MARCA}
        </a>

        <ul className={`nav-links${abierto ? ' abierto' : ''}`}>
          <li>
            <a href="#/" onClick={cerrar} style={ruta === '/' ? { color: 'var(--verde-700)' } : undefined}>Inicio</a>
          </li>
          <li>
            <a href="#/catalogo" onClick={cerrar} style={ruta === '/catalogo' ? { color: 'var(--verde-700)' } : undefined}>Catálogo</a>
          </li>
          <li>
            <a href="#/" onClick={e => { e.preventDefault(); cerrar(); irASeccion('productos') }}>Más vendidos</a>
          </li>
          <li>
            <a href="#/" onClick={e => { e.preventDefault(); cerrar(); irASeccion('aliadas') }}>Boticas aliadas</a>
          </li>
        </ul>

        <div className="nav-acciones">
          <button
            type="button"
            className="boton-cuenta"
            onClick={() => {
              cerrar()
              if (usuario) alAbrirMiCuenta()
              else alAbrirPortal('login')
            }}
            aria-label={usuario ? 'Abrir mi cuenta' : 'Iniciar sesión en mi cuenta'}
            title={usuario ? 'Mi cuenta' : 'Iniciar sesión'}
          >
            <span aria-hidden="true">👤</span>
            <span className="texto-nav-oculto">{usuario ? 'Mi cuenta' : 'Ingresar'}</span>
          </button>

          {!usuario && (
            <button type="button" className="btn-portal" onClick={() => { cerrar(); alAbrirPortal('login') }}>
              <span aria-hidden="true">🔐</span>
              <span className="texto-nav-oculto">Portal</span>
            </button>
          )}

          {usuario && usuario.rol === 'b2b' && (
            <span className="chip-sesion">
              <span aria-hidden="true">🏢</span>
              <span className="empresa-texto">{usuario.empresa}</span>
              {esB2B
                ? <span className="rol">B2B</span>
                : <span className="rol estado-pendiente">En revisión</span>}
            </span>
          )}

          {usuario && usuario.rol === 'b2c' && (
            <span className="chip-sesion">
              <span aria-hidden="true">👤</span>
              <span className="empresa-texto">{usuario.nombre}</span>
              <span className="rol">Cliente</span>
            </span>
          )}

          <button type="button" className="boton-carrito" onClick={() => { cerrar(); alAbrirCarrito() }}>
            🛒
            {unidades > 0 && <span className="carrito-badge">{unidades}</span>}
            <span className="texto-nav-oculto">Carrito</span>
          </button>

          {usuario && (
            <button type="button" className="boton-salir" onClick={alSalir} aria-label="Cerrar sesión">
              Salir
            </button>
          )}

          <button
            type="button"
            className="menu-toggle"
            onClick={() => setAbierto(valor => !valor)}
            aria-label="Abrir o cerrar menú"
            aria-expanded={abierto}
          >
            {abierto ? '✕' : '☰'}
          </button>
        </div>
      </div>
    </nav>
  )
}

/* ============ Barra de contacto (header) — ver App abajo ============ */

function Hero({ alAbrirPortal, apariencia }) {
  return (
    <header className="hero" id="inicio">
      <div className="contenedor hero-grid">
        <div>
          <span className="etiqueta-pill">{apariencia?.heroEtiqueta ?? '🛍️ Precios públicos al alcance · Portal B2B para farmacia'}</span>

          <h1>
            {apariencia?.heroTitulo1 ?? 'Nutrición que se'}{' '}
            <span className="texto-gradiente">{apariencia?.heroTitulo2 ?? 'confía, porque se conoce'}</span>
          </h1>

          <p className="hero-descripcion">
            {apariencia?.heroSubtitulo
              ?? `En ${MARCA} producimos suplementos y nutracéuticos para ti y tu familia.
            Compra directo con precios al público, o solicita tu acceso de distribuidor B2B.`}
          </p>

          <div className="hero-acciones">
            <a href="#/catalogo" className="btn btn-primario">Ver catálogo completo</a>
            <button type="button" className="btn btn-fantasma" onClick={() => alAbrirPortal('registro')}>
              Ser distribuidor
            </button>
          </div>

          <div className="hero-chips">
            <div className="chip">
              <span className="chip-ico">🏥</span>
              +9 boticas aliadas en 4 zonas
            </div>
            <div className="chip">
              <span className="chip-ico">🧪</span>
              Lotes con análisis externo
            </div>
          </div>
        </div>

        <div className="hero-visual" aria-hidden="true">
          <div className="flotante flotante-uno">✅ 99% pureza garantizada</div>

          <div className="tarjeta-medica">
            <div className="tarjeta-head">
              <div className="tarjeta-avatar">📦</div>
              <div>
                <h3>Estado del pedido</h3>
                <span>AMEC-100284 · Confirmado</span>
              </div>
            </div>

            <div className="tarjeta-fila">
              <span>Confección de kit lista</span>
              <strong>100%</strong>
            </div>
            <div className="barra"><span style={{ width: '100%' }} /></div>

            <div className="tarjeta-fila">
              <span>Empaque sellado</span>
              <strong>82%</strong>
            </div>
            <div className="barra"><span style={{ width: '82%' }} /></div>

            <div className="tarjeta-fila">
              <span>En camino</span>
              <strong>73%</strong>
            </div>
            <div className="barra"><span style={{ width: '73%' }} /></div>

            <div className="tarjeta-footer">
              🚚 Despacho estimado: 48-72 horas
            </div>
          </div>

          <div className="flotante flotante-dos">🌿 0% colorantes artificiales</div>
        </div>
      </div>
    </header>
  )
}

function Franja({ apariencia }) {
  const items = [
    ...(apariencia?.franjaPromo ? [{ ico: '🚚', texto: apariencia.franjaPromo }] : []),
    { ico: '🧾', texto: 'Facturación simplificada' },
    { ico: '🔬', texto: 'Certificación BPA' },
    { ico: '❤️', texto: '+16 fórmulas por línea' },
    { ico: '📦', texto: 'Despacho sellado en todo el país' },
  ]

  /* El track se duplica para un desfile infinito perfecto (CSS -50%) */
  return (
    <section className="franja" aria-label="Promociones y garantías de la marca">
      <div className="franja-ticker">
        <div className="franja-track">
          {[0, 1].map(copia => (
            <div className="franja-grupo" key={copia} aria-hidden={copia === 1}>
              {items.map(item => (
                <div className="franja-item" key={item.texto}>
                  <span aria-hidden="true">{item.ico}</span>
                  {item.texto}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ============ Tarjeta de producto (reutilizable) ============ */

function ProductoItem({ producto, esB2B, proximo, alAgregar, alAbrirDetalle }) {
  const [agregado, setAgregado] = useState(false)

  const enviarAlCarrito = () => {
    if (agregado) return
    setAgregado(true)
    alAgregar(producto)
    setTimeout(() => setAgregado(false), 1800)
  }

  return (
    <article className={`producto${proximo ? ' producto-proximo' : ''}`}>
      <div
        {...(proximo
          ? {}
          : {
              className: 'producto-info',
              onClick: () => alAbrirDetalle(producto),
              role: 'button',
              tabIndex: 0,
              onKeyDown: e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  alAbrirDetalle(producto)
                }
              },
            })}
      >
        <div className={`producto-visual ${producto.variante}`}>
          <span className="producto-tag">
            {proximo ? 'Próximamente' : producto.etiqueta ?? 'Producto AMEC'}
          </span>
          {producto.imagen
            ? <img src={producto.imagen} alt={producto.nombre} loading="lazy" />
            : <span aria-hidden="true">{producto.icono}</span>}
        </div>

        <h3>{producto.nombre}</h3>
        <p className="producto-descripcion">{producto.formato}</p>

        <div className="producto-precio">
          <span className="precio-tag">
            {proximo ? 'Disponibilidad' : esB2B ? 'Precio' : 'Precio'}
          </span>
          <span className="precio-valor">
            {proximo ? 'Por confirmar' : formatearPrecio(esB2B ? producto.precioB2B : producto.precioPublico)}
          </span>
        </div>

        {!proximo && (
          <>
            <p className="producto-descripcion">{producto.descripcion}</p>
            <span className="ver-mas">Ver más sobre el producto →</span>
          </>
        )}

        {proximo && <p className="producto-descripcion">{producto.descripcion}</p>}
      </div>

      {proximo ? (
        <button type="button" className="btn-proximo" disabled>
          🚀 Muy pronto en boticas
        </button>
      ) : (
        <button
          type="button"
          className={`btn-carrito-producto${agregado ? ' agregado' : ''}`}
          onClick={enviarAlCarrito}
        >
          {agregado ? '✓ Agregado' : <>＋ Agregar al carrito</>}
        </button>
      )}
    </article>
  )
}

function CuadriculaProductos({ productos, esB2B, proximo, alAgregar, alAbrirDetalle }) {
  return (
    <div className="grid-productos">
      {productos.map(p => (
        <ProductoItem
          key={p.id}
          producto={p}
          esB2B={esB2B}
          proximo={proximo}
          alAgregar={alAgregar}
          alAbrirDetalle={alAbrirDetalle}
        />
      ))}
    </div>
  )
}

function PaginaProducto({ producto, esB2B, alAgregar, alAbrirPortal }) {
  const [agregado, setAgregado] = useState(false)

  const enviar = () => {
    if (agregado) return
    setAgregado(true)
    alAgregar(producto)
    setTimeout(() => setAgregado(false), 1800)
  }

  return (
    <>
      <section className="cabecera-pagina">
        <div className="contenedor">
          <a className="volver-inicio" href="#/catalogo">← Volver al catálogo</a>
          <span className="etiqueta-pill">
            {CATEGORIAS.find(c => c.id === producto.categoria)?.etiqueta ?? 'Producto AMEC'}
          </span>
          <h1 className="titulo-seccion" style={{ marginTop: '0.8rem' }}>{producto.nombre}</h1>
          <p className="subtitulo-seccion" style={{ marginTop: '0.2rem' }}>{producto.formato}</p>
        </div>
      </section>

      <section style={{ paddingBottom: '2rem' }}>
        <div className="contenedor" style={{ maxWidth: 880 }}>
          <div className="pagina">
            <div className="detalle-head">
              <div className={`detalle-visual ${producto.variante}`}>
                {producto.imagen
                  ? <img src={producto.imagen} alt={`Fotografía de ${producto.nombre}`} />
                  : <span aria-hidden="true">{producto.icono}</span>}
              </div>
              <div>
                <h3>{producto.nombre}</h3>
                <p className="detalle-formato">{producto.formato}</p>
                {!producto.proximo && (
                  <span className="etiqueta-pill detalle-filtro">
                    {producto.stock === 0 ? '⚠️ Agotado' : `📦 ${producto.stock} unidades en stock`}
                  </span>
                )}
              </div>
            </div>

            <p className="subtitulo-seccion">{producto.descripcion}</p>

            <ul className="detalle-lista">
              {(producto.beneficios ?? []).map(b =>
                <li key={b}><span aria-hidden="true">✓</span>{b}</li>)}
            </ul>

            <div className="detalle-uso">
              <span aria-hidden="true">💡</span>
              <span><strong>Uso sugerido:</strong> {producto.uso}</span>
            </div>

            <div className="detalle-precio" style={esB2B ? undefined : { background: 'var(--azul-100)' }}>
              <div>
                <span className="precio-tag">
                  {esB2B ? 'Precio B2B · Distribuidor' : 'Precio al público'}
                </span>
                <div className="precio-valor">
                  {formatearPrecio(esB2B ? producto.precioB2B : producto.precioPublico)}
                </div>
              </div>

              <div style={{ display: 'grid', gap: '0.55rem', justifyItems: 'stretch' }}>
                {!producto.proximo && producto.stock !== 0 && (
                  <button
                    type="button"
                    className={`btn-carrito-producto${agregado ? ' agregado' : ''}`}
                    onClick={enviar}
                  >
                    {agregado ? '✓ Agregado al carrito' : <>＋ Agregar al carrito</>}
                  </button>
                )}

                {!esB2B && (
                  <button
                    type="button"
                    className="boton-salir"
                    style={{ width: '100%', textAlign: 'center' }}
                    onClick={() => alAbrirPortal('login')}
                  >
                    🔐 Ver precio B2B (distribuidores)
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}

/* ============ Inicio ============ */

function Mostrador({ id, etiqueta, titulo1, titulo2, subtitulo, productos, esB2B, alAgregar, alAbrirDetalle, proximo = false }) {
  return (
    <section className="seccion" id={id}>
      <div className="contenedor">
        <span className="etiqueta-pill">{etiqueta}</span>
        <h2 className="titulo-seccion">
          {titulo1} <span className="texto-gradiente">{titulo2}</span>
        </h2>
        <p className="subtitulo-seccion">{subtitulo}</p>
        <div style={{ marginTop: '2.2rem' }}>
          <CuadriculaProductos
            productos={productos}
            esB2B={esB2B}
            proximo={proximo}
            alAgregar={alAgregar}
            alAbrirDetalle={alAbrirDetalle}
          />
        </div>
      </div>
    </section>
  )
}

function SeccionAliadas({ boticas }) {
  const listaBoticas = boticas?.length ? boticas : []
  const [zona, setZona] = useState('todas')
  const filtradas = listaBoticas.filter(a => zona === 'todas' || a.zona === zona)
  const ciudades = [...new Set(listaBoticas.map(a => a.ciudad))]
  const contarZona = id => listaBoticas.filter(a => a.zona === id).length

  return (
    <section className="seccion fondo-productos" id="aliadas">
      <div className="contenedor">
        <span className="etiqueta-pill">📍 Cobertura nacional</span>
        <h2 className="titulo-seccion">
          Boticas aliadas y <span className="texto-gradiente">ciudades donde nos encuentras</span>
        </h2>
        <p className="subtitulo-seccion">
          Nuestros productos ya están disponibles en farmacias y boticas aliadas por todo el país.
          Filtra por zona para conocer los aliados más cercanos.
        </p>

        <div className="filtros" role="group" aria-label="Filtrar boticas por zona" style={{ marginTop: '1.8rem' }}>
          {ZONAS.map(z => (
            <button
              type="button"
              key={z.id}
              className={`filtro${zona === z.id ? ' activo' : ''}`}
              onClick={() => setZona(z.id)}
            >
              {z.etiqueta}
              <span className="filtro-contador">
                ({z.id === 'todas' ? listaBoticas.length : contarZona(z.id)})
              </span>
            </button>
          ))}
        </div>

        <div className="aliadas-grid">
          {filtradas.map(aliada => (
            <div className="aliada" key={aliada.id ?? `${aliada.nombre}-${aliada.ciudad}`}>
              <div className="pin" aria-hidden="true">
                {aliada.logo
                  ? <img src={aliada.logo} alt="" />
                  : <span>🏥</span>}
              </div>
              <div>
                <strong>{aliada.nombre}</strong>
                <small>📍 {aliada.ciudad}</small>
                <span className="zona-pill">{ZONAS.find(z => z.id === aliada.zona)?.etiqueta}</span>
              </div>
            </div>
          ))}
          {filtradas.length === 0 && (
            <p className="empty-state" style={{ gridColumn: '1 / -1' }}>
              Todavía no hay boticas registradas en esta zona. 🏥
            </p>
          )}
        </div>

        <p className="cobertura-nota">
          🗺️ <strong>Cobertura AMEC:</strong> {ciudades.join(' · ') || 'en preparación'}. ¿Tu botica aún no nos tiene?
          ¡Escríbenos y la sumamos a tu zona!
        </p>
      </div>
    </section>
  )
}

function Beneficios() {
  const beneficios = [
    { ico: '🔬', titulo: 'Fórmulas de grado clínico', texto: 'Ingredientes en dosis efectivas respaldados por evidencia científica.', variante: 'ico-verde' },
    { ico: '🩺', titulo: 'Validación profesional', texto: 'Cada producto es revisado por nutricionistas y médicos especialistas.', variante: 'ico-azul' },
    { ico: '🌿', titulo: 'Ingredientes limpios', texto: 'Sin colorantes artificiales, sin azúcares añadidos y sin gluten.', variante: 'ico-verde' },
    { ico: '🚚', titulo: 'Envío asegurado', texto: 'Empaque sellado, despacho rastreado y entrega garantizada.', variante: 'ico-azul' },
  ]

  return (
    <section className="seccion" id="beneficios">
      <div className="contenedor">
        <span className="etiqueta-pill">¿Por qué elegirnos?</span>
        <h2 className="titulo-seccion">Cuidado que se <span className="texto-gradiente">nota y se mide</span></h2>
        <p className="subtitulo-seccion">
          Trabajamos con dosis reales y transparencia total en cada etiqueta: lo que ves es lo que tomas.
        </p>

        <div className="grid-beneficios">
          {beneficios.map(b => (
            <article className="beneficio" key={b.titulo}>
              <div className={`beneficio-ico ${b.variante}`} aria-hidden="true">{b.ico}</div>
              <h3>{b.titulo}</h3>
              <p>{b.texto}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

function Proceso({ usuario, esB2B, alAbrirPortal }) {
  const pasos = usuario
    ? [
        {
          titulo: 'Arma tu pedido',
          texto: esB2B
            ? 'Agrega fórmulas al carrito viendo los precios de lista B2B por caja.'
            : 'Agrega las fórmulas a tu carrito y ajusta las cantidades.',
        },
        {
          titulo: 'Confirma tu orden',
          texto: esB2B
            ? 'El equipo comercial confirma stock, facturación y condiciones de tu cuenta.'
            : 'Pasa por el checkout: entrega a domicilio o recoge en tienda.',
        },
        {
          titulo: 'Recibe tu despacho',
          texto: 'Enviamos tu kit sellado con ficha técnica y factura.',
        },
      ]
    : [
        {
          titulo: 'Elige tu modelo',
          texto: 'Cliente: compra como invitado o crea tu cuenta. Distribuidor: solicita acceso B2B con aprobación.',
        },
        {
          titulo: 'Compra o cotiza',
          texto: 'Carrito con cantidades, checkout paso a paso y pedido generado al instante.',
        },
        {
          titulo: 'Recibe tu despacho',
          texto: 'Enviamos tu kit sellado con ficha técnica y factura.',
        },
      ]

  return (
    <section className="seccion" id="proceso">
      <div className="contenedor">
        <span className="etiqueta-pill">Simple y transparente</span>
        <h2 className="titulo-seccion">Tu pedido en <span className="texto-gradiente">tres pasos</span></h2>

        <div className="grid-pasos">
          {pasos.map((paso, indice) => (
            <article className="paso" key={paso.titulo}>
              <div className="paso-num" aria-hidden="true">{indice + 1}</div>
              <h3>{paso.titulo}</h3>
              <p>{paso.texto}</p>
            </article>
          ))}
        </div>

        {!usuario && (
          <div style={{ textAlign: 'center', marginTop: '1.6rem' }}>
            <button type="button" className="btn btn-primario" onClick={() => alAbrirPortal('login')}>
              🔐 Ir al portal distribuidor
            </button>
          </div>
        )}
      </div>
    </section>
  )
}

function Testimonios() {
  const testimonios = [
    {
      texto: 'La asesoría post-venta fue impecable. Nos recomendaron la línea completa para nuestra farmacia y rota muy bien.',
      nombre: 'Carolina M.',
      detalle: 'Farmacéutica · Cajamarca',
      inicial: 'C',
    },
    {
      texto: 'La línea infantil se agota rápido en nuestro establecimiento. El pedido mayoreo llegó sellado según lo acordado.',
      nombre: 'Estrella R.',
      detalle: 'Distribuidora desde 2021',
      inicial: 'E',
    },
  ]

  return (
    <section className="seccion" id="opiniones">
      <div className="contenedor">
        <span className="etiqueta-pill">Historias reales</span>
        <h2 className="titulo-seccion">Lo que dicen nuestros <span className="texto-gradiente">clientes y socios</span></h2>

        <div className="grid-testimonios">
          {testimonios.map(t => (
            <article className="testimonio" key={t.nombre}>
              <div className="estrellas" aria-label="5 de 5 estrellas">★★★★★</div>
              <p>"{t.texto}"</p>
              <div className="testimonio-autor">
                <span className="avatar" aria-hidden="true">{t.inicial}</span>
                <div>
                  <strong>{t.nombre}</strong>
                  <span>{t.detalle}</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

function CTA({ usuario, alAbrirPortal }) {
  if (usuario) return null

  return (
    <section className="seccion">
      <div className="contenedor">
        <div className="cta">
          <h2>Sé distribuidor oficial de {MARCA}</h2>
          <p>
            Solicita tu acceso Distribuidor: revisamos tu solicitud y, una vez aprobado, al iniciar sesión
            la tienda mostrará automáticamente los precios de distribución en todo el catálogo.
          </p>
          <button type="button" className="btn btn-primario" onClick={() => alAbrirPortal('registro')}>
            Solicitar acceso →
          </button>
        </div>
      </div>
    </section>
  )
}

function Inicio({ esB2B, alAgregar, alAbrirDetalle, alAbrirPortal, masVendidos, recienLlegados, proximos, config }) {
  return (
    <>
      <Hero alAbrirPortal={alAbrirPortal} apariencia={config?.apariencia} />
      <Franja apariencia={config?.apariencia} />
      <Mostrador
        id="productos"
        etiqueta="🔥 Los favoritos"
        titulo1="Los productos"
        titulo2="más vendidos"
        subtitulo="Las fórmulas que las familias y las boticas repiden mes a mes."
        productos={masVendidos.slice(0, 4)}
        esB2B={esB2B}
        alAgregar={alAgregar}
        alAbrirDetalle={alAbrirDetalle}
      />
      <Mostrador
        id="nuevos"
        etiqueta="🆕 Recién llegados"
        titulo1="Lo nuevo de"
        titulo2="Amec Nutrition"
        subtitulo="Las últimas fórmulas AMEC ahora disponibles en tu botica de confianza."
        productos={recienLlegados.slice(0, 4)}
        esB2B={esB2B}
        alAgregar={alAgregar}
        alAbrirDetalle={alAbrirDetalle}
      />
      <Mostrador
        id="proximos"
        etiqueta="🚀 Por ingresar"
        titulo1="Próximamente en"
        titulo2="todas las boticas"
        subtitulo="Estas fórmulas están en camino: pregunta por ellas en tu botica aliada."
        productos={proximos}
        esB2B={esB2B}
        proximo
        alAgregar={alAgregar}
        alAbrirDetalle={alAbrirDetalle}
      />
      <SeccionAliadas boticas={config?.boticas} />
      <Beneficios />
      <Proceso usuario={null} esB2B={esB2B} alAbrirPortal={alAbrirPortal} />
    </>
  )
}

/* ============ Página catálogo general ============ */

function PaginaCatalogo({ esB2B, alAgregar, alAbrirDetalle, alAbrirPortal, productos }) {
  const [categoria, setCategoria] = useState('todas')
  const [busqueda, setBusqueda] = useState('')

  const filtrados = productos.filter(p => {
    const coincideCategoria = categoria === 'todas' || p.categoria === categoria
    const coincideBusqueda = p.nombre.toLowerCase().includes(busqueda.trim().toLowerCase())
    return coincideCategoria && coincideBusqueda
  })

  return (
    <>
      <section className="cabecera-pagina">
        <div className="contenedor">
          <a className="volver-inicio" href="#/">← Volver al inicio</a>
          <span className="etiqueta-pill">🛒 Catálogo general</span>
          <h1 className="titulo-seccion" style={{ marginTop: '0.8rem' }}>
            Todo el catálogo <span className="texto-gradiente">{MARCA}</span>
          </h1>
          <p className="subtitulo-seccion" style={{ marginTop: '0.4rem' }}>
            {esB2B
              ? 'Precios de distribución B2B activos. Filtra por línea o busca por nombre.'
              : 'Estás viendo los precios al público. Filtra por línea o busca por nombre.'}
          </p>
        </div>
      </section>

      <section style={{ paddingBottom: '2rem' }}>
        <div className="contenedor catalogo-layout">
          <aside className="panel-filtros" aria-label="Filtros del catálogo">
            <h4>Buscar producto</h4>
            <div className="buscador">
              <input
                type="text"
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                placeholder="Ej: Nutriamec, sleep..."
                aria-label="Buscar producto por nombre"
                style={{
                  width: '100%', padding: '0.7rem 0.9rem', border: '1px solid var(--gris-200)',
                  borderRadius: '12px', font: 'inherit', fontSize: '0.92rem', background: '#fff',
                  outline: 'none', transition: 'border-color 0.2s',
                }}
              />
            </div>

            <h4>Filtrar por línea</h4>
            <ul className="lista-filtros">
              {CATEGORIAS.map(cat => (
                <li key={cat.id}>
                  <button
                    type="button"
                    className={`boton-filtro${categoria === cat.id ? ' activo' : ''}`}
                    onClick={() => setCategoria(cat.id)}
                  >
                    {cat.etiqueta}
                    <span>
                      {cat.id === 'todas'
                        ? productos.length
                        : productos.filter(p => p.categoria === cat.id).length}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </aside>

          <div>
            {filtrados.length === 0 ? (
              <p className="empty-state">Sin resultados. Prueba con otro término o cambia de línea. 🔍</p>
            ) : (
              <CuadriculaProductos
                productos={filtrados}
                esB2B={esB2B}
                alAgregar={alAgregar}
                alAbrirDetalle={alAbrirDetalle}
              />
            )}

            {!esB2B && (
              <div className="aviso-b2b" style={{ marginTop: '1.6rem' }}>
                <span aria-hidden="true">🔐</span>
                <span>
                  <strong>¿Perteneces a una botica o distribuidora?</strong> Inicia sesión como B2B y la
                  tienda mostrará automáticamente los precios de distribución.{' '}
                  <button
                    type="button"
                    onClick={() => alAbrirPortal('login')}
                    style={{
                      border: 'none', background: 'none', color: 'var(--azul-700)',
                      fontWeight: 700, cursor: 'pointer', textDecoration: 'underline', font: 'inherit',
                    }}
                  >
                    Ir al portal →
                  </button>
                </span>
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  )
}

/* ============ Pginas legales ============ */

const PAGINAS_LEGALES = {
  envios: {
    icono: '🚚',
    titulo: 'Políticas de Envíos',
    bloques: [
      {
        titulo: 'Cobertura y plazos',
        parrafos: ['Realizamos despachos a todo el país a través de operadores logísticos aliados.'],
        lista: [
          'Zona Norte (Cajamarca, Chiclayo, Trujillo): 24-48 horas.',
          'Zona Centro (Huancayo, Ayacucho): 48-72 horas.',
          'Zona Sur (Cusco, Arequipa): 48-72 horas.',
          'Lima Metropolitana y Callao: 24-48 horas.',
        ],
      },
      {
        titulo: 'Empaque y garantía de integridad',
        parrafos: [
          'Todos los productos viajan en empaque sellado de fábrica. Si recibes una unidad cuya seguridad está comprometida, el reemplazo o cambio es inmediato y sin costo.',
        ],
      },
      {
        titulo: 'Pedidos por mayor (B2B)',
        parrafos: [
          'Los pedidos de distribuidores coordinan ventanas de entrega con el asesor comercial asignado, priorizando bodegas de farmacias y establecimientos de salud.',
        ],
      },
    ],
  },
  privacidad: {
    icono: '🔒',
    titulo: 'Políticas de Privacidad',
    bloques: [
      {
        titulo: 'Datos que recopilamos',
        lista: [
          'Datos de identificación entregados al crear tu cuenta o hacer el checkout (nombre, correo, teléfono, dirección).',
          'Datos fiscales para facturación de distribuidores aprobados (RUC/NIT).',
          'Información de navegación del sitio con fines estadísticos.',
        ],
      },
      {
        titulo: 'Uso de la información',
        parrafos: [
          'Utilizamos tus datos exclusivamente para procesar pedidos, coordinar entregas, responder consultas y, si autorizas, enviarte promociones. No vendemos ni cedemos tu información a terceros ajenos a la operación logística.',
        ],
      },
      {
        titulo: 'Tus derechos',
        parrafos: [
          'Puedes solicitar acceso, rectificación o eliminación de tus datos escribiendo a amecnutrition@amecpharma.com.',
        ],
      },
    ],
  },
  terminos: {
    icono: '⚖️',
    titulo: 'Términos y Condiciones',
    bloques: [
      {
        titulo: 'Objeto',
        parrafos: [
          'Estas condiciones regulan la compra de suplementos y nutracéuticos en el sitio de AMEC NUTRITION, en modalidad B2C (precio al público) y B2B (precio de distribución tras aprobación).',
        ],
      },
      {
        titulo: 'Condiciones comerciales',
        lista: [
          'Los precios mostrados pueden variar sin previo aviso por listas oficiales vigentes.',
          'El estado de distribuidor B2B es personal e intransferible y puede ser revocado por incumplimiento.',
          'Los productos son suplementos; no son medicamentos y no sustituyen tratamientos médicos.',
          'El consumo debe ser supervisado por un profesional de la salud.',
        ],
      },
      {
        titulo: 'Legislación aplicable',
        parrafos: [
          'Toda controversia se somete a la normativa vigente correspondiente, privilegiando la solución amistosa.',
        ],
      },
    ],
  },
  devoluciones: {
    icono: '🔄',
    titulo: 'Cambios y Devoluciones',
    bloques: [
      {
        titulo: 'Criterio de aceptación',
        lista: [
          'Producto sellado sin abrir: cambio o devolución dentro de los 7 días calendario tras recibirlo.',
          'Producto con defecto de fábrica o dañado: cambio inmediato sin costo adicional.',
          'Producto enviado por error de la tienda: canje o devolución del importe.',
        ],
      },
      {
        titulo: 'Exclusiones',
        lista: [
          'Productos abiertos o usados (por razones de seguridad sanitaria).',
          'Productos devueltos después de 7 días de recibidos.',
        ],
      },
      {
        titulo: 'Cómo solicitar el cambio',
        parrafos: [
          'Escríbenos a amecnutrition@amecpharma.com o al WhatsApp 994 254 676 con tu número de pedido (AMEC-XXXXXX) y el detalle del caso. También puedes registrarlo en el Libro de Reclamaciones.',
        ],
      },
    ],
  },
}

function PaginaLegalSimple({ pagina }) {
  return (
    <>
      <section className="cabecera-pagina">
        <div className="contenedor">
          <a className="volver-inicio" href="#/">← Volver al inicio</a>
          <span className="etiqueta-pill">{pagina.icono} Información legal</span>
          <h1 className="titulo-seccion" style={{ marginTop: '0.8rem' }}>{pagina.titulo}</h1>
        </div>
      </section>

      <section style={{ paddingBottom: '2rem' }}>
        <div className="contenedor" style={{ maxWidth: 820 }}>
          <div className="pagina contenido-legal">
            {pagina.bloques.map(bloque => (
              <div key={bloque.titulo}>
                <h3>{bloque.titulo}</h3>
                {bloque.parrafos?.map(texto => <p key={texto}>{texto}</p>)}
                {bloque.lista && (
                  <ul>
                    {bloque.lista.map(texto => <li key={texto}>{texto}</li>)}
                  </ul>
                )}
              </div>
            ))}
            <p style={{ marginTop: '2rem', fontSize: '0.85rem' }}>
              Última actualización: noviembre 2026 · {MARCA} — amecnutrition@amecpharma.com · Tel. 074-775986
            </p>
          </div>
        </div>
      </section>
    </>
  )
}

function LibroReclamaciones() {
  const [enviado, setEnviado] = useState(null)

  const enviarReclamo = evento => {
    evento.preventDefault()
    const datos = new FormData(evento.currentTarget)
    const reclamos = cargarDatos(CLAVES.reclamos, [])
    const nuevoReclamo = {
      codigo: `REC-${String(Date.now()).toString(36).toUpperCase().slice(-5)}`,
      fecha: new Date().toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' }),
      nombre: String(datos.get('nombre') || ''),
      documento: String(datos.get('documento') || ''),
      contacto: String(datos.get('contacto') || ''),
      tipo: String(datos.get('tipo') || ''),
      producto: String(datos.get('producto') || ''),
      detalle: String(datos.get('detalle') || ''),
    }
    localStorage.setItem(CLAVES.reclamos, JSON.stringify([nuevoReclamo, ...reclamos]))
    setEnviado(nuevoReclamo)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <>
      <section className="cabecera-pagina">
        <div className="contenedor">
          <a className="volver-inicio" href="#/">← Volver al inicio</a>
          <span className="etiqueta-pill">📕 Libro de Reclamaciones</span>
          <h1 className="titulo-seccion" style={{ marginTop: '0.8rem' }}>Registra tu reclamo o queja</h1>
          <p className="subtitulo-seccion" style={{ marginTop: '0.4rem' }}>
            Según normativa de protección al consumidor, todo reclamo tiene respuesta en un plazo
            máximo de 30 días calendario.
          </p>
        </div>
      </section>

      <section style={{ paddingBottom: '2rem' }}>
        <div className="contenedor" style={{ maxWidth: 780 }}>
          {enviado ? (
            <div className="pagina exito-pedido">
              <div className="exito-check" aria-hidden="true">✓</div>
              <span className="etiqueta-pill">Reclamación registrada</span>
              <div className="folio-pedido">{enviado.codigo}</div>
              <p className="subtitulo-seccion" style={{ margin: '0 auto 0.6rem', fontSize: '0.95rem' }}>
                Tu {enviado.tipo.toLowerCase()} quedó registrada el {enviado.fecha}. El equipo de
                calidad {MARCA} se contactará al correo/teléfono indicado.
              </p>
              <button type="button" className="btn btn-primario" onClick={() => setEnviado(null)}>
                Registrar otra reclamación
              </button>
            </div>
          ) : (
            <div className="pagina">
              <form onSubmit={enviarReclamo}>
                <div className="campo-fila">
                  <label className="campo">
                    <span>Nombres y apellidos</span>
                    <input type="text" name="nombre" placeholder="Completo" required />
                  </label>
                  <label className="campo">
                    <span>DNI / CE</span>
                    <input type="text" name="documento" placeholder="Número de documento" required />
                  </label>
                </div>
                <div className="campo-fila">
                  <label className="campo">
                    <span>Correo o teléfono</span>
                    <input type="text" name="contacto" placeholder="Para notificar la respuesta" required />
                  </label>
                  <label className="campo">
                    <span>Tipo de solicitud</span>
                    <select name="tipo" defaultValue="Reclamo" required>
                      <option value="Reclamo">Reclamo (disconformidad con producto/servicio)</option>
                      <option value="Queja">Queja (disconformidad con la atención)</option>
                    </select>
                  </label>
                </div>
                <label className="campo">
                  <span>Producto afectado</span>
                  <input type="text" name="producto" placeholder="Ej: Nutriamec Kids Lata 500g · Lote B-2031" required />
                </label>
                <label className="campo">
                  <span>Detalle de la reclamación</span>
                  <input type="text" name="detalle" placeholder="Describe qué ocurrió y cómo esperas que se resuelva" required />
                </label>
                <button type="submit" className="btn btn-primario" style={{ width: '100%' }}>
                  📕 Enviar reclamación
                </button>
              </form>
            </div>
          )}
        </div>
      </section>
    </>
  )
}

function TrabajaConNosotros() {
  const [enviado, setEnviado] = useState(false)

  const vacantes = [
    'Representante técnico-médico de campo — Cajamarca',
    'Analista de aseguramiento de calidad — Planta AMEC',
    'Ejecutivo comercial mayorista (B2B) — Lima',
    'Especialista en marketing digital — Remoto',
    'Asistente logística y despacho — Chiclayo',
  ]

  const enviarHoja = evento => {
    evento.preventDefault()
    setEnviado(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <>
      <section className="cabecera-pagina">
        <div className="contenedor">
          <a className="volver-inicio" href="#/">← Volver al inicio</a>
          <span className="etiqueta-pill">💼 Trabaja con nosotros</span>
          <h1 className="titulo-seccion" style={{ marginTop: '0.8rem' }}>
            Crece con <span className="texto-gradiente">{MARCA}</span>
          </h1>
          <p className="subtitulo-seccion" style={{ marginTop: '0.4rem' }}>
            Únete a un equipo que lleva ciencia, nutrición y bienestar a cada botica del país.
          </p>
        </div>
      </section>

      <section style={{ paddingBottom: '2rem' }}>
        <div className="contenedor" style={{ maxWidth: 780, display: 'grid', gap: '1.2rem' }}>
          {enviado ? (
            <div className="pagina exito-pedido">
              <div className="exito-check" aria-hidden="true">✓</div>
              <span className="etiqueta-pill">Postulación recibida</span>
              <p className="subtitulo-seccion" style={{ margin: '0.8rem auto 1rem', fontSize: '0.95rem' }}>
                ¡Gracias por postular! Nuestro equipo de talento humano revisará tu hoja de vida
                y se comunicará en un plazo de 10 días hábiles si tu perfil encaja.
              </p>
              <button type="button" className="btn btn-primario" onClick={() => setEnviado(false)}>
                Postular a otra vacante
              </button>
            </div>
          ) : (
            <>
              <div className="pagina">
                <h3 style={{ color: 'var(--gris-800)', marginBottom: '0.8rem' }}>Vacantes abiertas</h3>
                <ul className="panel-lista" style={{ marginTop: 0 }}>
                  {vacantes.map(vacante => (
                    <li className="panel-fila" key={vacante}>
                      <div>
                        <strong>{vacante}</strong>
                        <small>Envía tu CV con referencia al puesto · Full time</small>
                      </div>
                      <span className="estado-pill estado-aprobado">Abierta</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pagina">
                <h3 style={{ color: 'var(--gris-800)', marginBottom: '1rem' }}>Postula aquí</h3>
                <form onSubmit={enviarHoja}>
                  <div className="campo-fila">
                    <label className="campo">
                      <span>Nombre completo</span>
                      <input type="text" name="nombre" placeholder="Nombre y apellido" required />
                    </label>
                    <label className="campo">
                      <span>Correo</span>
                      <input type="email" name="email" placeholder="tucorreo@ejemplo.com" required />
                    </label>
                  </div>
                  <label className="campo">
                    <span>Vacante de interés</span>
                    <select name="vacante" required>
                      {vacantes.map(vacante => <option key={vacante} value={vacante}>{vacante}</option>)}
                    </select>
                  </label>
                  <label className="campo">
                    <span>Preséntate (experiencia y logros)</span>
                    <input type="text" name="pres" placeholder="Cuéntanos por qué eres ideal para el puesto" required />
                  </label>
                  <button type="submit" className="btn btn-primario" style={{ width: '100%' }}>
                    💼 Enviar mi postulación
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      </section>
    </>
  )
}

/* ============ Carrito lateral ============ */

function PanelCarrito({ items, unidades, esB2B, total, alCerrar, alCambiarCantidad, alQuitar, alVaciar, alContinuar }) {
  return (
    <div className="cajon-overlay" onClick={alCerrar}>
      <aside className="cajon" role="dialog" aria-modal="true" aria-label="Carrito de compras" onClick={e => e.stopPropagation()}>
        <div className="cajon-head">
          <h3><span aria-hidden="true">🛒</span> Tu carrito</h3>
          <button type="button" className="modal-cerrar" onClick={alCerrar} aria-label="Cerrar carrito">✕</button>
        </div>

        {items.length === 0 ? (
          <div className="cajon-empty">
            <div>
              <div className="emoji" aria-hidden="true">🛒</div>
              <p>Tu carrito está vacío.<br />Explora el catálogo y agrega productos.</p>
              <a href="#/catalogo" className="btn btn-primario" onClick={alCerrar}>
                Explorar catálogo
              </a>
            </div>
          </div>
        ) : (
          <>
            <ul className="cajon-lista">
              {items.map(item => (
                <li className="cajon-item" key={item.id}>
                  <div className={`cajon-icono ${item.variante}`}>
                    {item.imagen
                      ? <img src={item.imagen} alt="" />
                      : <span aria-hidden="true">{item.icono}</span>}
                  </div>

                  <div className="cajon-info">
                    <strong>{item.nombre}</strong>
                    <small>{item.formato}</small>
                    <span className="cajon-precio">
                      {formatearPrecio(item.unitario)} × {item.cantidad} = {formatearPrecio(item.unitario * item.cantidad)}
                    </span>
                  </div>

                  <div className="cajon-cantidad">
                    <button type="button" onClick={() => alCambiarCantidad(item.id, -1)} aria-label="Quitar una unidad">−</button>
                    <span>{item.cantidad}</span>
                    <button type="button" onClick={() => alCambiarCantidad(item.id, 1)} aria-label="Agregar una unidad">＋</button>
                  </div>

                  <button type="button" className="cajon-quitar" onClick={() => alQuitar(item.id)} aria-label={`Quitar ${item.nombre} del carrito`}>
                    🗑️
                  </button>
                </li>
              ))}
            </ul>

            <div className="cajon-pie">
              <div className="cajon-total">
                <span>{esB2B ? 'Total B2B' : 'Total (precio público)'} · {unidades} unid.</span>
                <strong>{formatearPrecio(total)}</strong>
              </div>

              {!esB2B && (
                <p className="nota-carrito">
                  🔐 ¿Botica o distribuidora? Inicia sesión en el portal para ver estos mismos
                  productos con precios de distribución (B2B).
                </p>
              )}

              <button type="button" className="btn btn-primario" style={{ width: '100%' }} onClick={alContinuar}>
                Continuar con la compra →
              </button>
              <button type="button" className="boton-salir" style={{ width: '100%', textAlign: 'center' }} onClick={alVaciar}>
                Vaciar carrito
              </button>
            </div>
          </>
        )}
      </aside>
    </div>
  )
}

/* ============ Checkout ============ */

const ETIQUETAS_PASOS = ['Identificación', 'Entrega', 'Confirmación']

function Checkout({ items, esB2B, total, usuario, config, alCerrar, alConfirmarPedido, crearCuentaB2C, correoExiste }) {
  const [paso, setPaso] = useState(usuario ? 1 : 0)
  const [modo, setModo] = useState('invitado')
  const [error, setError] = useState(null)
  const [identificacion, setIdentificacion] = useState({
    nombre: usuario?.empresa ?? usuario?.nombre ?? '',
    email: usuario?.email ?? '',
  })
  const [entrega, setEntrega] = useState({
    receptor: usuario?.empresa ?? usuario?.nombre ?? '',
    telefono: '',
    direccion: '',
    ciudad: usuario?.ciudad ?? '',
    region: '',
    metodo: 'domicilio',
    notas: '',
  })
  const [region, setRegion] = useState('')
  const [cupon, setCupon] = useState('')
  const [pedido, setPedido] = useState(null)

  /* Totales recalculados en vivo: cupón + envío según la región */
  const evaluacion = evaluarDescuento(config, total, cupon)
  const subtotalConDescuento = total - evaluacion.descuento
  const costoEnvioActual = entrega.metodo === 'domicilio'
    ? costoEnvio(config, region, subtotalConDescuento)
    : 0
  const totalConCargos = Math.max(0, Math.round((subtotalConDescuento + costoEnvioActual) * 100) / 100)
  const aplicaEnvio = entrega.metodo === 'domicilio' && Boolean(config?.envio?.activo)
  const envioGratis = aplicaEnvio
    && costoEnvioActual === 0
    && (config.envio?.envioGratisDesde ?? 0) > 0
    && subtotalConDescuento >= config.envio.envioGratisDesde

  const clasePaso = indice => {
    if (paso > indice) return ' hecho'
    if (paso === indice) return ' activo'
    return ''
  }

  const continuarIdentificacion = evento => {
    evento.preventDefault()
    setError(null)
    const datos = new FormData(evento.currentTarget)
    const nombre = String(datos.get('nombre') || '').trim()
    const email = String(datos.get('email') || '').trim().toLowerCase()
    const clave = String(datos.get('clave') || '')

    if (!nombre || !email) {
      setError('Ingresa tu nombre y un correo de contacto.')
      return
    }

    if (modo === 'cuenta' && !usuario) {
      if (clave.length < 6) {
        setError('La contraseña debe tener al menos 6 caracteres.')
        return
      }
      if (correoExiste(email)) {
        setError('Ya existe una cuenta con ese correo. Inicia sesión y vuelve al carrito, o continúa como invitado.')
        return
      }
      const cuenta = crearCuentaB2C({ nombre, email, clave })
      setIdentificacion(cuenta)
    } else {
      setIdentificacion({ nombre, email, invitado: true })
    }

    setPaso(1)
  }

  const continuarEntrega = evento => {
    evento.preventDefault()
    setError(null)
    const datos = new FormData(evento.currentTarget)
    const entregaDatos = {
      receptor: String(datos.get('receptor') || '').trim(),
      telefono: String(datos.get('telefono') || '').trim(),
      direccion: String(datos.get('direccion') || '').trim(),
      ciudad: String(datos.get('ciudad') || '').trim(),
      region: String(datos.get('region') || '').trim(),
      metodo: String(datos.get('metodo') || 'domicilio'),
      notas: String(datos.get('notas') || '').trim(),
    }

    if (!entregaDatos.receptor
      || (entregaDatos.metodo === 'domicilio' && (!entregaDatos.direccion || !entregaDatos.ciudad || !entregaDatos.region))) {
      setError('Completa los datos de entrega (región, dirección y ciudad para despacho a domicilio).')
      return
    }

    setEntrega(entregaDatos)
    setRegion(entregaDatos.region)
    setPaso(2)
  }

  const confirmar = () => {
    const pedidoGenerado = alConfirmarPedido({
      modo: usuario ? (esB2B ? 'b2b' : 'cuenta') : modo,
      cupon,
      region: entrega.region,
      ...identificacion,
      ...entrega,
    })
    setPedido(pedidoGenerado)
  }

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) alCerrar() }}>
      <div className="modal modal--config" role="dialog" aria-modal="true" aria-label="Checkout">
        <button type="button" className="modal-cerrar" onClick={alCerrar} aria-label="Cerrar checkout">✕</button>

        {!pedido && (
          <>
            <span className="etiqueta-pill">🧾 Checkout</span>
            <h2 className="titulo-seccion" style={{ fontSize: '1.6rem' }}>
              {esB2B ? 'Cierre de pedido B2B' : 'Cierra tu compra'}
            </h2>

            <div className="pasos-config" aria-hidden="true">
              {ETIQUETAS_PASOS.map((etiqueta, indice) => (
                <div key={etiqueta} className={`paso-config${clasePaso(indice)}`}>
                  <span className="num">{paso > indice ? '✓' : indice + 1}</span>
                  {etiqueta}
                </div>
              ))}
            </div>

            {error && <div className="mensaje-estado mensaje-error" role="alert">{error}</div>}
          </>
        )}

        {!pedido && paso === 0 && !usuario && (
          <form onSubmit={continuarIdentificacion}>
            <label className={`opcion-cuenta${modo === 'invitado' ? ' activo' : ''}`}>
              <input type="radio" name="modo" value="invitado" checked={modo === 'invitado'} onChange={() => setModo('invitado')} />
              <span>
                <strong>👤 Continuar como invitado</strong>
                <small>Más rápido: solo pedimos tu nombre y correo para la entrega.</small>
              </span>
            </label>

            <label className={`opcion-cuenta${modo === 'cuenta' ? ' activo' : ''}`}>
              <input type="radio" name="modo" value="cuenta" checked={modo === 'cuenta'} onChange={() => setModo('cuenta')} />
              <span>
                <strong>✨ Crear mi cuenta</strong>
                <small>Historial de pedidos, repetir compras y recibir promociones.</small>
              </span>
            </label>

            <label className="campo">
              <span>Nombre completo</span>
              <input type="text" name="nombre" placeholder="Nombre y apellido" required />
            </label>
            <label className="campo">
              <span>Correo</span>
              <input type="email" name="email" placeholder="tucorreo@ejemplo.com" required />
            </label>

            {modo === 'cuenta' && (
              <label className="campo">
                <span>Contraseña</span>
                <input type="password" name="clave" placeholder="Mínimo 6 caracteres" minLength={6} required />
              </label>
            )}

            <div className="config-navegacion">
              <button type="button" className="btn-atras" onClick={alCerrar}>Volver al carrito</button>
              <button type="submit" className="btn btn-primario">Continuar a entrega →</button>
            </div>
          </form>
        )}

        {!pedido && paso === 1 && (
          <form onSubmit={continuarEntrega}>
            <div className="aviso-demos" style={{ marginBottom: '1.2rem' }}>
              <strong>{identificacion.nombre}</strong>{' '}· {identificacion.email}
            </div>

            <label className="campo">
              <span>¿Cómo prefieres recibir tu pedido?</span>
              <select
                name="metodo"
                value={entrega.metodo}
                onChange={e => setEntrega(prev => ({ ...prev, metodo: e.target.value }))}
              >
                <option value="domicilio">🚚 Despacho a domicilio</option>
                <option value="tienda">🏬 Recoger en botica aliada / punto AMEC</option>
              </select>
            </label>

            {entrega.metodo === 'domicilio' && (
              <label className="campo">
                <span>Departamento / región de envío</span>
                <select name="region" value={region} onChange={e => setRegion(e.target.value)} required>
                  <option value="">Selecciona tu región…</option>
                  {(config?.envio?.tarifas ?? []).map(tarifa => (
                    <option key={tarifa.region} value={tarifa.region}>
                      {tarifa.region} — {tarifa.costo === 0 ? 'Sin costo' : `S/ ${tarifa.costo.toFixed(2)}`}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <div className="campo-fila">
              <label className="campo">
                <span>Persona que recibe</span>
                <input type="text" name="receptor" defaultValue={entrega.receptor} placeholder="Nombre de quien recibe" required />
              </label>
              <label className="campo">
                <span>Teléfono / WhatsApp</span>
                <input type="tel" name="telefono" defaultValue={entrega.telefono} placeholder="Ej. 994 254 676" />
              </label>
            </div>

            <div className="campo-fila">
              <label className="campo">
                <span>Dirección</span>
                <input type="text" name="direccion" defaultValue={entrega.direccion} placeholder="Jiron / calle / número" />
              </label>
              <label className="campo">
                <span>Ciudad</span>
                <input type="text" name="ciudad" defaultValue={entrega.ciudad} placeholder="Ciudad" />
              </label>
            </div>

            <label className="campo">
              <span>Notas para el pedido (opcional)</span>
              <input type="text" name="notas" defaultValue={entrega.notas} placeholder="Referencias, horario preferido de entrega..." />
            </label>

            <div className="config-navegacion">
              {!usuario && <button type="button" className="btn-atras" onClick={() => setPaso(0)}>← Volver</button>}
              <button type="submit" className="btn btn-primario">Ir a la confirmación →</button>
            </div>
          </form>
        )}

        {!pedido && paso === 2 && (
          <div>
            <ul className="resumen-filas">
              {items.map(item => (
                <li key={item.id}>
                  <span><strong>{item.nombre}</strong> × {item.cantidad}</span>
                  <span>{formatearPrecio(item.unitario * item.cantidad)}</span>
                </li>
              ))}
            </ul>

            <form
              className="cupon-formulario"
              style={{ display: 'flex', gap: '0.5rem', margin: '1rem 0 0.4rem', alignItems: 'flex-end', flexWrap: 'wrap' }}
              onSubmit={e => e.preventDefault()}
            >
              <label className="campo" style={{ flex: '1 1 200px', marginBottom: 0 }}>
                <span>🎟️ Cupón de descuento (opcional)</span>
                <input
                  type="text"
                  value={cupon}
                  onChange={e => setCupon(e.target.value.toUpperCase())}
                  placeholder="Ej. AMECBIENVENIDA"
                />
              </label>
            </form>
            {cupon.trim() && evaluacion.cuponAplicado ? (
              <p className="detalle-resultado" style={{ marginTop: 0 }}>
                ✓ Cupón <strong>{evaluacion.cuponAplicado.codigo}</strong> aplicado:
                -{formatearPrecio(evaluacion.descuento)}
              </p>
            ) : null}
            {cupon.trim() && !evaluacion.cuponAplicado ? (
              <p className="detalle-resultado" style={{ marginTop: 0 }}>
                ⚠️ El cupón "{cupon}" no es válido, está pausado o la compra no alcanza el mínimo.
              </p>
            ) : null}
            {evaluacion.detalle.filter(d => !d.etiqueta.startsWith('Cupón')).map(promoAuto => (
              <p className="detalle-resultado" key={promoAuto.etiqueta} style={{ marginTop: 0 }}>
                🎁 {promoAuto.etiqueta}: -{formatearPrecio(promoAuto.monto)}
              </p>
            ))}

            <div className="resumen-filas" style={{ marginTop: '0.8rem' }}>
              <div className="cuenta-fila"><span>Subtotal</span><strong>{formatearPrecio(total)}</strong></div>
              {(evaluacion.descuento ?? 0) > 0 && (
                <div className="cuenta-fila"><span>Descuento</span><strong>-{formatearPrecio(evaluacion.descuento)}</strong></div>
              )}
              {aplicaEnvio && (
                <div className="cuenta-fila">
                  <span>
                    Envío {region ? `(${region})` : ''}
                    {envioGratis ? ' 🎉 gratis' : ''}
                  </span>
                  <strong>{costoEnvioActual === 0 ? (envioGratis ? 'Gratis' : '—') : formatearPrecio(costoEnvioActual)}</strong>
                </div>
              )}
            </div>
            <div className="resumen-total">
              <span>{esB2B ? 'Total B2B' : 'Total (precio público)'}</span>
              <span className="monto">{formatearPrecio(totalConCargos)}</span>
            </div>
            {aplicaEnvio && !envioGratis && (config.envio?.envioGratisDesde ?? 0) > 0 && subtotalConDescuento < config.envio.envioGratisDesde && (
              <p className="detalle-resultado" style={{ marginTop: '0.3rem' }}>
                🚚 Te faltan {formatearPrecio(config.envio.envioGratisDesde - subtotalConDescuento)} para el envío gratis.
              </p>
            )}

            <div className="detalle-uso" style={{ marginTop: '1.2rem' }}>
              <span aria-hidden="true">📍</span>
              <span>
                <strong>Entrega {entrega.metodo === 'domicilio' ? 'a domicilio' : 'en tienda / botica aliada'}</strong>
                {entrega.metodo === 'domicilio' ? ` — ${entrega.direccion}, ${entrega.ciudad}` : ''}
                {entrega.telefono ? ` · Tel. ${entrega.telefono}` : ''}
              </span>
            </div>

            <div className="config-navegacion">
              <button type="button" className="btn-atras" onClick={() => setPaso(1)}>← Volver</button>
              <button type="button" className="btn btn-primario" onClick={confirmar}>
                ✔ Generar pedido
              </button>
            </div>
          </div>
        )}

        {pedido && (
          <div className="exito-pedido">
            <div className="exito-check" aria-hidden="true">✓</div>
            <span className="etiqueta-pill">Pedido generado 🎉</span>
            <div className="folio-pedido">{pedido.id}</div>
            <p className="subtitulo-seccion" style={{ margin: '0 auto 0.4rem', fontSize: '0.95rem' }}>
              {pedido.canal === 'B2B'
                ? 'Tu pedido B2B quedó registrado. El equipo comercial confirmará stock y facturación.'
                : 'Tu pedido quedó registrado. Confirmaremos el pago y coordinaremos el despacho contigo.'}
            </p>
            <p className="detalle-resultado">
              {pedido.fecha} · {pedido.items.length} producto(s) · {formatearPrecio(pedido.total)} · Estado: {pedido.estado}
            </p>
            <p className="detalle-resultado" style={{ marginTop: '0.35rem' }}>
              ¿Consultas? WhatsApp 994 254 676 · {DATOS_CONTACTO.correo}
            </p>

            <div className="acciones-exito">
              <a href="#/catalogo" className="btn btn-primario" onClick={alCerrar}>
                Seguir comprando
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* ============ Portal distribuidor ============ */

function PortalAuth({ modoInicial, usuarios, alIniciar, alRegistrarse, alCerrar }) {
  const [tab, setTab] = useState(modoInicial)
  const [error, setError] = useState(null)
  const [exito, setExito] = useState(null)

  const alIniciarSesion = evento => {
    evento.preventDefault()
    setError(null)
    const datos = new FormData(evento.currentTarget)
    const email = String(datos.get('email') || '').trim().toLowerCase()
    const clave = String(datos.get('clave') || '')

    const encontrado = usuarios.find(u => u.email.toLowerCase() === email)
    if (!encontrado || encontrado.clave !== clave) {
      setError('Credenciales incorrectas. Verifica tu correo y contraseña.')
      return
    }

    setExito(encontrado.estado === 'aprobado'
      ? `Bienvenido, ${encontrado.empresa ?? encontrado.nombre}.`
      : 'Sesión iniciada. Tu solicitud sigue EN REVISIÓN: mientras tanto seguirás viendo los precios al público.')
    setTimeout(() => alIniciar(encontrado), 900)
  }

  const alEnviarRegistro = evento => {
    evento.preventDefault()
    setError(null)
    const datos = new FormData(evento.currentTarget)
    const nueva = {
      empresa: String(datos.get('empresa') || '').trim(),
      contacto: String(datos.get('contacto') || '').trim(),
      email: String(datos.get('email') || '').trim().toLowerCase(),
      clave: String(datos.get('clave') || ''),
      ruc: String(datos.get('ruc') || '').trim(),
      ciudad: String(datos.get('ciudad') || '').trim(),
    }

    if (!nueva.empresa || !nueva.contacto || !nueva.email || !nueva.clave || !nueva.ruc || !nueva.ciudad) {
      setError('Completa todos los campos para evaluar tu solicitud.')
      return
    }
    if (usuarios.some(u => u.email.toLowerCase() === nueva.email)) {
      setError('Ya existe una solicitud o cuenta con este correo.')
      return
    }

    setExito('✓ Solicitud enviada. El equipo comercial la revisará y aprobará si cumples los criterios B2B.')
    setTimeout(() => alRegistrarse(nueva), 1200)
  }

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) alCerrar() }}>
      <div className="modal" role="dialog" aria-modal="true" aria-label="Portal distribuidor">
        <button type="button" className="modal-cerrar" onClick={alCerrar} aria-label="Cerrar">✕</button>

        <span className="etiqueta-pill">🔐 Portal distribuidor AMEC</span>
        <h2 className="titulo-seccion" style={{ fontSize: '1.6rem' }}>
          {tab === 'login' ? 'Inicia sesión en tu cuenta' : 'Solicita tu acceso'}
        </h2>
        <p className="subtitulo-seccion" style={{ fontSize: '0.95rem' }}>
          {tab === 'login'
            ? 'Distribuidores aprobados: al entrar, la tienda actualiza todos los precios a la lista de distribución.'
            : 'Completa los datos de tu empresa. El equipo comercial evalúa y aprueba cada solicitud.'}
        </p>

        <div className="auth-tabs" role="tablist">
          <button type="button" role="tab" aria-selected={tab === 'login'}
            className={`auth-tab${tab === 'login' ? ' activo' : ''}`}
            onClick={() => { setTab('login'); setError(null) }}>
            Iniciar sesión
          </button>
          <button type="button" role="tab" aria-selected={tab === 'registro'}
            className={`auth-tab${tab === 'registro' ? ' activo' : ''}`}
            onClick={() => { setTab('registro'); setError(null) }}>
            Solicitar acceso
          </button>
        </div>

        {error && <div className="mensaje-estado mensaje-error" role="alert">{error}</div>}
        {exito && <div className="mensaje-estado mensaje-exito" role="status">{exito}</div>}

        {tab === 'login' ? (
          <form onSubmit={alIniciarSesion}>
            <label className="campo">
              <span>Correo</span>
              <input type="email" name="email" autoComplete="email" placeholder="ventas@tudistribuidora.com" required />
            </label>
            <label className="campo">
              <span>Contraseña</span>
              <input type="password" name="clave" autoComplete="current-password" placeholder="••••••••" required />
            </label>
            <button type="submit" className="btn btn-primario" style={{ width: '100%' }}>
              Entrar al portal →
            </button>
            <div className="aviso-demos" style={{ marginTop: '1rem' }}>
              <strong>Cuentas de demostración:</strong><br />
              Distribuidor aprobado: <code>distribuidor@amec.com</code> / <code>amec2024</code><br />
              Administrador: <code>admin@amec.com</code> / <code>admin2024</code>
            </div>
          </form>
        ) : (
          <form onSubmit={alEnviarRegistro}>
            <label className="campo">
              <span>Razón social / Empresa</span>
              <input type="text" name="empresa" placeholder="Farmacias del Pueblo S.A.C." required />
            </label>
            <div className="campo-fila">
              <label className="campo">
                <span>Contacto</span>
                <input type="text" name="contacto" placeholder="Nombre y apellido" required />
              </label>
              <label className="campo">
                <span>RUC</span>
                <input type="text" name="ruc" placeholder="Ej. 20601234567" required />
              </label>
            </div>
            <div className="campo-fila">
              <label className="campo">
                <span>Ciudad</span>
                <input type="text" name="ciudad" placeholder="Ciudad" required />
              </label>
              <label className="campo">
                <span>Correo</span>
                <input type="email" name="email" placeholder="compras@empresa.com" required />
              </label>
            </div>
            <label className="campo">
              <span>Contraseña</span>
              <input type="password" name="clave" placeholder="Mínimo 6 caracteres" required minLength={6} />
            </label>
            <button type="submit" className="btn btn-primario" style={{ width: '100%' }}>
              Enviar solicitud →
            </button>
            <p className="nota-b2b" style={{ marginTop: '0.8rem' }}>
              La aprobación la realiza el equipo comercial de {MARCA}
            </p>
          </form>
        )}
      </div>
    </div>
  )
}

/* ============ Panel administrativo ============ */

function MiCuenta({ usuario, pedidos, pendientes, alCerrar, alSalir }) {
  const esAdmin = usuario.rol === 'admin'
  const esB2B = usuario.rol === 'b2b'
  const misPedidos = pedidos.filter(
    p => (p.cliente.email || '').toLowerCase() === (usuario.email || '').toLowerCase(),
  )

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) alCerrar() }}>
      <div className="modal modal--config" role="dialog" aria-modal="true" aria-label="Mi cuenta">
        <button type="button" className="modal-cerrar" onClick={alCerrar} aria-label="Cerrar panel">✕</button>

        <span className="etiqueta-pill">👤 Mi cuenta</span>
        <h2 className="titulo-seccion" style={{ fontSize: '1.5rem', marginTop: '0.8rem' }}>
          {usuario.empresa || usuario.nombre}
        </h2>

        {esAdmin ? (
          <div className="detalle-uso" style={{ marginTop: '1rem' }}>
            <span aria-hidden="true">⚙️</span>
            <span>
              <strong>Sesión de administración.</strong> Solicitudes pendientes: {pendientes} ·
              Pedidos registrados: {pedidos.length}
            </span>
          </div>
        ) : (
          <>
            <div className="cuenta-fila">
              <span>Rol</span>
              <strong>{esB2B ? 'Distribuidor B2B' : 'Cliente B2C'}</strong>
            </div>
            <div className="cuenta-fila">
              <span>Estado de la cuenta</span>
              <strong>{usuario.estado}</strong>
            </div>
            <div className="cuenta-fila">
              <span>Correo</span>
              <strong>{usuario.email}</strong>
            </div>
            {usuario.ruc && usuario.ruc !== '—' && (
              <div className="cuenta-fila">
                <span>RUC / NIT</span>
                <strong>{usuario.ruc}</strong>
              </div>
            )}
            <div className="cuenta-fila">
              <span>Pedidos realizados</span>
              <strong>{misPedidos.length}</strong>
            </div>

            {misPedidos.length > 0 && (
              <>
                <h3 style={{ margin: '1.5rem 0 0.2rem' }}>Mis pedidos</h3>
                <ul className="panel-lista" style={{ marginTop: 0 }}>
                  {misPedidos.map(p => (
                    <li className="panel-fila" key={p.id}>
                      <div>
                        <strong>{p.id} · {p.canal}</strong>
                        <small>{p.fecha} · {p.items.length} producto(s) · {p.estado}</small>
                      </div>
                      <strong style={{ fontSize: '0.95rem' }}>{formatearPrecio(p.total)}</strong>
                    </li>
                  ))}
                </ul>
              </>
            )}

            {esB2B && usuario.estado !== 'aprobado' && (
              <div className="mensaje-estado mensaje-exito" style={{ marginTop: '1rem' }}>
                ⏳ Tu solicitud está en revisión. Al ser aprobada, la tienda mostrará los precios B2B.
              </div>
            )}
          </>
        )}

        <div className="config-navegacion">
          <button type="button" className="btn-atras" onClick={alCerrar}>Cerrar panel</button>
          <button type="button" className="btn btn-primario" onClick={alSalir}>Cerrar sesión</button>
        </div>
      </div>
    </div>
  )
}

/* ============ Pie de página ============ */

function Footer({ irASeccion, apariencia }) {
  const enlacesLegales = [
    { href: '#/legal/envios', texto: 'Políticas de envíos' },
    { href: '#/legal/privacidad', texto: 'Políticas de privacidad' },
    { href: '#/legal/terminos', texto: 'Términos y condiciones' },
    { href: '#/legal/devoluciones', texto: 'Cambios y devoluciones' },
    { href: '#/legal/reclamaciones', texto: 'Libro de reclamaciones' },
    { href: '#/legal/trabaja-con-nosotros', texto: 'Trabaja con nosotros' },
    { href: '#/admin', texto: '⚙️ Panel de administración' },
  ]

  return (
    <footer>
      <div className="contenedor">
        <div className="footer-grid">
          <div>
            <div className="footer-logo">
              <span className={`logo-mark${apariencia?.logoImage ? ' con-imagen' : ''}`}>
                {apariencia?.logoImage
                  ? <img src={apariencia.logoImage} alt="Logotipo" />
                  : <span aria-hidden="true">{apariencia?.logoIco ?? '🌱'}</span>}
              </span>
              {apariencia?.marcaTexto ?? MARCA}
            </div>
            <p className="footer-frase">
              Suplementación de grado clínico y nutracéuticos, formulada con ciencia y avalada por
              profesionales de la salud. Venta B2C y portal de distribución B2B.
            </p>

            <ul style={{ listStyle: 'none', marginTop: '1rem', display: 'grid', gap: '0.35rem' }}>
              <li><a href={DATOS_CONTACTO.telefonoHref}>📞 {DATOS_CONTACTO.telefono}</a></li>
              <li>
                <a href={DATOS_CONTACTO.whatsapp} target="_blank" rel="noreferrer">📱 {DATOS_CONTACTO.celular}</a>
              </li>
              <li><a href={`mailto:${DATOS_CONTACTO.correo}`}>✉️ {DATOS_CONTACTO.correo}</a></li>
            </ul>

            <div className="contacto-redes footer-redes" style={{ marginTop: '0.9rem' }}>
              {DATOS_CONTACTO.redes.map(red => (
                <a
                  key={red.id}
                  className="icono-social"
                  href={red.url}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={red.nombre}
                  title={red.nombre}
                >
                  <IconoSocial red={red.id} />
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4>Catálogo</h4>
            <ul>
              <li><a href="#/catalogo">Catálogo general</a></li>
              {CATEGORIAS.filter(c => c.id !== 'todas').map(c => (
                <li key={c.id}>
                  <a href="#/" onClick={e => { e.preventDefault(); irASeccion('productos') }}>{c.etiqueta}</a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4>Información legal</h4>
            <ul>
              {enlacesLegales.map(enlace => (
                <li key={enlace.href}><a href={enlace.href}>{enlace.texto}</a></li>
              ))}
            </ul>
          </div>
        </div>

        <div className="footer-abajo">
          <span>© {new Date().getFullYear()} {MARCA}. Todos los derechos reservados.</span>
          <span>⚠️ Este producto no es un medicamento. Consulte a su médico antes de usarlo.</span>
        </div>
      </div>
    </footer>
  )
}

/* ============ Aplicación ============ */

function App() {
  const ruta = useRuta()

  const [usuarios, setUsuarios] = useState(() => cargarDatos(CLAVES.usuarios, USUARIOS_INICIALES))
  const [usuario, setUsuario] = useState(() => cargarDatos(CLAVES.sesion, null))
  const [pedidos, setPedidos] = useState(() => cargarDatos(CLAVES.pedidos, []))
  const [carrito, setCarrito] = useState(() => cargarDatos(CLAVES.carrito, []))
  /* Catálogo + configuración editables desde #/admin (sin tocar código) */
  const [productosTienda, setProductosTienda] = useState(() => cargarProductos())
  const [configuracion, setConfiguracion] = useState(() => {
    const guardada = cargarDatos(CLAVES.configuracion, {})
    return {
      ...CONFIGURACION_INICIAL,
      ...guardada,
      /* fallback: semilla de boticas si la config guardada aún no las tiene */
      boticas: guardada.boticas ?? CONFIGURACION_INICIAL.boticas,
    }
  })

  const [toast, setToast] = useState(null)
  const [modalAuth, setModalAuth] = useState(null)
  const [panelCarrito, setPanelCarrito] = useState(false)
  const [checkoutAbierto, setCheckoutAbierto] = useState(false)
  const [miCuenta, setMiCuenta] = useState(false)

  /* El precio activo depende del canal: público ve B2C;
     distribuidor aprobado (sesión B2B) ve la lista de distribución */
  const esB2B = Boolean(usuario && usuario.rol === 'b2b' && usuario.estado === 'aprobado')
  const pendientes = usuarios.filter(u => u.rol === 'b2b' && u.estado === 'pendiente').length

  /* Catálogo gestible desde el panel; los productos ya traen su imagen */
  const catalogo = productosTienda.filter(p => !p.proximo)
  const masVendidos = productosTienda.filter(p => !p.proximo && p.masVendido)
  const recienLlegados = productosTienda.filter(p => !p.proximo && p.nuevo)
  const proximos = productosTienda.filter(p => p.proximo)

  const carritoItems = carrito
    .map(ci => {
      const producto = catalogo.find(p => p.id === ci.id)
      if (!producto) return null
      return {
        ...producto,
        cantidad: ci.cantidad,
        unitario: esB2B ? producto.precioB2B : producto.precioPublico,
      }
    })
    .filter(Boolean)

  const unidadesCarrito = carrito.reduce((n, ci) => n + ci.cantidad, 0)
  const totalCarrito = carritoItems.reduce((n, item) => n + item.unitario * item.cantidad, 0)

  /* Persistencia */
  useEffect(() => { localStorage.setItem(CLAVES.usuarios, JSON.stringify(usuarios)) }, [usuarios])
  useEffect(() => {
    if (usuario) localStorage.setItem(CLAVES.sesion, JSON.stringify(usuario))
    else localStorage.removeItem(CLAVES.sesion)
  }, [usuario])
  useEffect(() => { localStorage.setItem(CLAVES.carrito, JSON.stringify(carrito)) }, [carrito])
  useEffect(() => { localStorage.setItem(CLAVES.pedidos, JSON.stringify(pedidos)) }, [pedidos])
  useEffect(() => {
    try {
      localStorage.setItem(CLAVES.productos, JSON.stringify(productosTienda))
    } catch {
      setToast('⚠️ Almacenamiento lleno: reduce el peso de las imágenes.')
    }
  }, [productosTienda])
  useEffect(() => { localStorage.setItem(CLAVES.configuracion, JSON.stringify(configuracion)) }, [configuracion])

  /* Apariencia, SEO y analítica aplicados en vivo */
  useEffect(() => { aplicarApariencia(configuracion.apariencia) }, [configuracion])
  useEffect(() => { aplicarAnalitica(configuracion.seo) }, [])
  useEffect(() => {
    if (ruta.startsWith('/admin')) return
    if (ruta.startsWith('/producto/')) {
      const slugActual = ruta.slice('/producto/'.length)
      const producto = productosTienda.find(p => (p.seo?.slug || textoASlug(p.nombre)) === slugActual)
      const seoProducto = producto?.seo ?? {}
      definirMetatags({
        titulo: seoProducto.metaTitulo || (producto ? `${producto.nombre} · ${configuracion.apariencia.marcaTexto}` : 'Producto · AMEC NUTRITION'),
        descripcion: seoProducto.metaDescripcion || producto?.descripcion,
        imagen: producto?.imagen || seoProducto.ogImagen || configuracion.seo.ogImagen,
      })
      return
    }
    const seo = configuracion.seo
    definirMetatags({ titulo: seo.metaTitulo, descripcion: seo.metaDescripcion, imagen: seo.ogImagen })
  }, [ruta, configuracion, productosTienda])

  useEffect(() => {
    if (!toast) return
    const temporizador = setTimeout(() => setToast(null), 2400)
    return () => clearTimeout(temporizador)
  }, [toast])

  useEffect(() => {
    const bloquear = Boolean(modalAuth || panelCarrito || checkoutAbierto || miCuenta)
    if (!bloquear) return
    const anterior = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = anterior }
  }, [modalAuth, panelCarrito, checkoutAbierto, miCuenta])

  /* Navegación a secciones de la página de inicio */
  const irASeccion = id => {
    const desplazar = () => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
    if (ruta !== '/') {
      window.location.hash = '#/'
      setTimeout(desplazar, 120)
    } else {
      desplazar()
    }
  }

  /* Navegación a la ficha pública del producto (con su slug SEO) */
  const irAProducto = producto => {
    window.location.hash = '#/producto/' + (producto.seo?.slug || textoASlug(producto.nombre))
  }

  /* Carrito */
  const agregarAlCarrito = producto => {
    setCarrito(prev => {
      const existente = prev.find(ci => ci.id === producto.id)
      if (existente) {
        return prev.map(ci => (ci.id === producto.id ? { ...ci, cantidad: ci.cantidad + 1 } : ci))
      }
      return [...prev, { id: producto.id, cantidad: 1 }]
    })
    setToast(`✓ ${producto.nombre} agregado al carrito`)
  }

  const cambiarCantidad = (id, delta) => {
    setCarrito(prev => prev.map(ci => (
      ci.id === id ? { ...ci, cantidad: Math.max(1, ci.cantidad + delta) } : ci
    )))
  }

  const quitarDelCarrito = id => setCarrito(prev => prev.filter(ci => ci.id !== id))

  const vaciarCarrito = () => {
    setCarrito([])
    setToast('🗑️ Carrito vaciado')
  }

  /* Checkout */
  const correoExiste = email => usuarios.some(u => u.email.toLowerCase() === String(email).toLowerCase())

  const crearCuentaB2C = datos => {
    const nueva = {
      id: `u-${Date.now()}`,
      rol: 'b2c',
      estado: 'aprobado',
      nombre: datos.nombre,
      email: datos.email,
      clave: datos.clave,
      empresa: datos.nombre,
      ruc: '—',
      ciudad: '',
    }
    setUsuarios(prev => [...prev, nueva])
    setUsuario(nueva)
    setToast(`✨ Cuenta creada: ${datos.email}`)
    return { nombre: nueva.nombre, email: nueva.email }
  }

  const confirmarPedido = clienteDatos => {
    /* Montos recalculados en "servidor": el front no define el cobro final */
    const subtotal = totalCarrito
    const evaluacion = evaluarDescuento(configuracion, subtotal, clienteDatos.cupon)
    const subtotalConDescuento = subtotal - evaluacion.descuento
    const costoEnvioPedido = clienteDatos.metodo === 'domicilio'
      ? costoEnvio(configuracion, clienteDatos.region, subtotalConDescuento)
      : 0
    const totalFinal = Math.max(0, Math.round(
      (subtotalConDescuento + costoEnvioPedido) * 100,
    ) / 100)

    const pedido = {
      id: `AMEC-${String(Date.now()).slice(-6)}`,
      fecha: new Date().toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' }),
      canal: esB2B ? 'B2B' : 'B2C',
      cliente: {
        nombre: clienteDatos.nombre || '',
        email: clienteDatos.email || '',
        empresa: clienteDatos.modo === 'b2b' ? clienteDatos.nombre : '',
        telefono: clienteDatos.telefono || '',
        direccion: clienteDatos.direccion || '',
        ciudad: clienteDatos.ciudad || '',
        region: clienteDatos.region || '',
        metodo: clienteDatos.metodo || 'domicilio',
        notas: clienteDatos.notas || '',
      },
      items: carritoItems.map(item => ({
        id: item.id,
        nombre: item.nombre,
        formato: item.formato,
        cantidad: item.cantidad,
        precioUnitario: item.unitario,
        tipoPrecio: esB2B ? 'B2B' : 'B2C',
      })),
      unidades: unidadesCarrito,
      subtotal,
      descuento: evaluacion.descuento,
      cupon: evaluacion.cuponAplicado?.codigo ?? null,
      costoEnvio: costoEnvioPedido,
      region: clienteDatos.region || null,
      total: totalFinal,
      ts: Date.now(),
      estado: esB2B ? 'En preparación (pago por validar)' : 'En preparación (pago pendiente)',
    }

    setPedidos(prev => [pedido, ...prev])
    /* Descuento de inventario según lo vendido */
    setProductosTienda(prev => prev.map(p => {
      const vendido = pedido.items.find(i => i.id === p.id)
      return vendido
        ? { ...p, stock: Math.max(0, (p.stock ?? 0) - vendido.cantidad) }
        : p
    }))
    setCarrito([])
    return pedido
  }

  /* CRUD de productos y configuración (panel #/admin) */
  const guardarProducto = (producto, esCreacion = false) => {
    setProductosTienda(prev => {
      const existe = prev.some(p => p.id === producto.id)
      if (!existe) return [...prev, producto]
      return prev.map(p => (p.id === producto.id ? producto : p))
    })
    setToast(esCreacion
      ? `✨ Producto "${producto.nombre}" creado`
      : `✓ "${producto.nombre}" guardado`)
  }

  const eliminarProducto = id => {
    const buscado = productosTienda.find(p => p.id === id)
    setProductosTienda(prev => prev.filter(p => p.id !== id))
    setToast(`🗑️ "${buscado?.nombre ?? id}" eliminado del catálogo`)
  }

  const guardarConfig = (seccion, valores) => {
    setConfiguracion(prev => ({ ...prev, [seccion]: { ...prev[seccion], ...valores } }))
  }

  /* Estados de pedido (panel admin → Pedidos) */
  const cambiarEstadoPedido = (id, estado) => {
    setPedidos(prev => prev.map(p => (p.id === id ? { ...p, estado } : p)))
    setToast(`${ESTADOS_PEDIDO.find(e => e.etiqueta === estado)?.icono ?? '🔄'} ${id} → ${estado}`)
  }

  /* Autenticación */
  const iniciarSesion = cuenta => {
    setUsuario(cuenta)
    setModalAuth(null)
    setToast(cuenta.rol === 'admin'
      ? '⚙️ Sesión de administración iniciada'
      : cuenta.rol === 'b2c'
        ? `👤 Bienvenido, ${cuenta.nombre}`
        : cuenta.estado === 'aprobado'
          ? `🏢 ${cuenta.empresa}: la tienda ahora muestra precios B2B`
          : `⏳ ${cuenta.empresa}: solicitud en revisión (sigues viendo precios públicos)`)
  }

  const registrarse = datos => {
    const nueva = { id: `u-${Date.now()}`, rol: 'b2b', estado: 'pendiente', ...datos }
    setUsuarios(prev => [...prev, nueva])
    setModalAuth(null)
    setToast(`📨 Solicitud de ${datos.empresa} enviada a revisión`)
  }

  const cerrarSesion = () => {
    setUsuario(null)
    setMiCuenta(false)
    setToast('👋 Sesión cerrada: volviendo a precios al público')
  }

  const aprobar = id => {
    setUsuarios(prev => prev.map(u => (u.id === id ? { ...u, estado: 'aprobado' } : u)))
    const buscado = usuarios.find(u => u.id === id)
    if (usuario && usuario.id === id) setUsuario(actual => ({ ...actual, estado: 'aprobado' }))
    setToast(`✓ ${buscado?.empresa ?? 'Cuenta'} aprobada como distribuidor B2B`)
  }

  const rechazar = id => {
    setUsuarios(prev => prev.map(u => (u.id === id ? { ...u, estado: 'rechazado' } : u)))
    setToast('✕ Solicitud rechazada')
  }

  const alAbrirPortal = modo => setModalAuth({ modo })

  /* ============ Panel administrativo (ruta independiente) ============ */

  if (ruta === '/admin' || ruta.startsWith('/admin/')) {
    return (
      <>
        <PanelTiendaAdmin
          ruta={ruta}
          usuario={usuario}
          usuarios={usuarios}
          pedidos={pedidos}
          productos={productosTienda}
          config={configuracion}
          acciones={{
            iniciarSesion,
            cerrarSesion: () => cerrarSesion(),
            cambiarEstadoPedido,
            guardarProducto,
            eliminarProducto,
            guardarConfig,
            notificar: setToast,
          }}
        />
        {toast && <div className="toast" role="status">{toast}</div>}
      </>
    )
  }

  /* ============ Render según ruta ============ */

  const slugLegal = ruta.startsWith('/legal/') ? ruta.slice('/legal/'.length) : null

  let contenido = null
  if (ruta === '/') {
    contenido = (
      <Inicio
        esB2B={esB2B}
        alAgregar={agregarAlCarrito}
        alAbrirDetalle={irAProducto}
        alAbrirPortal={alAbrirPortal}
        masVendidos={masVendidos}
        recienLlegados={recienLlegados}
        proximos={proximos}
        config={configuracion}
      />
    )
  } else if (ruta === '/catalogo') {
    contenido = (
      <PaginaCatalogo
        esB2B={esB2B}
        alAgregar={agregarAlCarrito}
        alAbrirDetalle={irAProducto}
        alAbrirPortal={alAbrirPortal}
        productos={catalogo}
      />
    )
  } else if (ruta.startsWith('/producto/')) {
    const slugActual = ruta.slice('/producto/'.length)
    const productoRuta = productosTienda.find(
      p => (p.seo?.slug || textoASlug(p.nombre)) === slugActual,
    )
    contenido = productoRuta && !productoRuta.proximo ? (
      <PaginaProducto
        producto={productoRuta}
        esB2B={esB2B}
        alAgregar={agregarAlCarrito}
        alAbrirPortal={alAbrirPortal}
      />
    ) : (
      <section className="seccion">
        <div className="contenedor" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '3.5rem' }}>🔎</div>
          <h2 className="titulo-seccion">Producto no encontrado</h2>
          <p className="subtitulo-seccion" style={{ margin: '0 auto 1.4rem' }}>
            {productoRuta
              ? `"${productoRuta.nombre}" aún no está disponible en la tienda.`
              : 'El producto que buscas no existe o fue retirado del catálogo.'}
          </p>
          <a href="#/catalogo" className="btn btn-primario">Ver catálogo</a>
        </div>
      </section>
    )
  } else if (slugLegal === 'reclamaciones') {
    contenido = <LibroReclamaciones />
  } else if (slugLegal === 'trabaja-con-nosotros') {
    contenido = <TrabajaConNosotros />
  } else if (slugLegal && PAGINAS_LEGALES[slugLegal]) {
    contenido = <PaginaLegalSimple pagina={PAGINAS_LEGALES[slugLegal]} />
  } else {
    contenido = (
      <section className="seccion">
        <div className="contenedor" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '3.5rem' }}>🔎</div>
          <h2 className="titulo-seccion">Página no encontrada</h2>
          <p className="subtitulo-seccion" style={{ margin: '0 auto 1.4rem' }}>
            La ruta <code>{ruta}</code> no existe en {MARCA}.
          </p>
          <a href="#/" className="btn btn-primario">Volver al inicio</a>
        </div>
      </section>
    )
  }

  return (
    <>
      <BarraContacto />
      <Nav
        ruta={ruta}
        irASeccion={irASeccion}
        unidades={unidadesCarrito}
        usuario={usuario}
        esB2B={esB2B}
        pendientes={pendientes}
        apariencia={configuracion?.apariencia}
        alAbrirCarrito={() => setPanelCarrito(true)}
        alAbrirPortal={alAbrirPortal}
        alAbrirMiCuenta={() => setMiCuenta(true)}
        alSalir={cerrarSesion}
      />

      {contenido}

      {ruta === '/' && (
        <Testimonios />
      )}

      {ruta === '/' && (
        <CTA usuario={usuario} alAbrirPortal={alAbrirPortal} />
      )}

      <Footer irASeccion={irASeccion} apariencia={configuracion?.apariencia} />

      {panelCarrito && !checkoutAbierto && (
        <PanelCarrito
          items={carritoItems}
          unidades={unidadesCarrito}
          esB2B={esB2B}
          total={totalCarrito}
          alCerrar={() => setPanelCarrito(false)}
          alCambiarCantidad={cambiarCantidad}
          alQuitar={quitarDelCarrito}
          alVaciar={vaciarCarrito}
          alContinuar={() => {
            if (!carritoItems.length) {
              setToast('🛒 Tu carrito está vacío')
              return
            }
            setPanelCarrito(false)
            setCheckoutAbierto(true)
          }}
        />
      )}

      {checkoutAbierto && (
        <Checkout
          items={carritoItems}
          esB2B={esB2B}
          total={totalCarrito}
          usuario={usuario}
          config={configuracion}
          alCerrar={() => setCheckoutAbierto(false)}
          alConfirmarPedido={confirmarPedido}
          crearCuentaB2C={crearCuentaB2C}
          correoExiste={correoExiste}
        />
      )}

      {modalAuth && (
        <PortalAuth
          modoInicial={modalAuth.modo}
          usuarios={usuarios}
          alIniciar={iniciarSesion}
          alRegistrarse={registrarse}
          alCerrar={() => setModalAuth(null)}
        />
      )}

      {miCuenta && usuario && (
        <MiCuenta
          usuario={usuario}
          pedidos={pedidos}
          pendientes={pendientes}
          alCerrar={() => setMiCuenta(false)}
          alSalir={cerrarSesion}
        />
      )}

      {/* AmecBot: asistente flotante (se esconde bajo modales abiertos) */}
      <AmecBot
        productos={productosTienda}
        esB2B={esB2B}
        config={configuracion}
        alAgregar={agregarAlCarrito}
        oculto={checkoutAbierto || Boolean(modalAuth) || panelCarrito || miCuenta}
      />

      {toast && <div className="toast" role="status">{toast}</div>}
    </>
  )
}

export default App
