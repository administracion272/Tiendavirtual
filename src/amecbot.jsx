/* ================================================================
   AmecBot — Asistente virtual oficial de AMEC Nutrition
   ----------------------------------------------------------------
   * Botón flotante de chat en la esquina inferior derecha.
   * Asesor de nutrición: recomienda 1–2 productos del catálogo
     según la necesidad (sueño, energía, digestión, inmunidad…).
   * Muestra fichas rápidas (precio, formato, uso) con acción
     "＋ Agregar" al carrito y enlace a la ficha del producto.
   * Límites obligatorios: no diagnostica ni prescribe; ante
     patologías graves deriva a un profesional y, ante consultas
     fuera del catálogo/políticas, ofrece un asesor humano por
     los canales oficiales (WhatsApp 994 254 676).
   El motor 100% local: catálogo editable desde #/admin se refleja
   aquí automáticamente (nombres, precios, slugs, stock).
   ================================================================ */
import { useState, useRef, useEffect } from 'react'
import { formatearPrecio, textoASlug } from './configuracion.js'

const normalizar = t => String(t || '')
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')

const AVISO_PROFESIONAL =
  '\n\nℹ️ **Soy un asistente informativo de nutrición: no diagnostico, no prescribo y no reemplazo la indicación de un profesional de la salud.**'

const CONTACTO_AMEC = {
  celular: '994 254 676',
  telefono: '074-775986',
  correo: 'amecnutrition@amecpharma.com',
}

const CANAL_HUMANO = {
  texto:
    `Con gusto te conecto con nuestro equipo humano 🧑‍⚕️\n\n• WhatsApp / Cel: **${CONTACTO_AMEC.celular}**\n• Teléfono fijo: **${CONTACTO_AMEC.telefono}**\n• Correo: **${CONTACTO_AMEC.correo}**\n\nUn asesor de AMEC Nutrition resolverá tu consulta lo antes posible.`,
  ids: [],
}

const enTexto = (texto, palabras) => palabras.some(p => texto.includes(p))

/* ---------------- Fichas rápidas de producto ---------------- */

function fichaProducto(prod, esB2B) {
  const precio = formatearPrecio(esB2B ? prod.precioB2B : prod.precioPublico)
  const canal = esB2B ? 'B2B' : 'público'
  if (prod.proximo) {
    return `**${prod.nombre}** 🚀\n${prod.descripcion}\n• Presentación: ${prod.formato}\n• Estado: **Próximamente disponible** — aún no está a la venta.\n\n¿Te aviso de algo más?`
  }
  return `**${prod.nombre}** · ${prod.formato}\n${prod.descripcion}\n• **Modo de uso:** ${prod.uso || 'según indicación del profesional de salud'}\n• **Precio (${canal}):** ${precio}\n\nPuedes agregarlo con el botón **＋** de la tarjeta o ver su ficha completa.`
}

/* ---------------- Temas de recomendación ----------------
   Cada tema: keywords + texto de respuesta + ids de productos
   que se muestran como tarjetas (si existen en el catálogo). */

const TEMAS = [
  {
    id: 'sueno',
    palabras: ['dormir', 'sueño', 'insomnio', 'descanso', 'despierta en la noche', 'melatonina', 'descansar'],
    texto:
      'Para un buen descanso te recomiendo:\n\n• **Sleep AMEC Adulto** 🌙 — gomitas con melatonina de rápida absorción que ayudan a conciliar el sueño y a descansar mejor. Modo de uso: **2 gomitas 30 minutos antes de dormir**.\n• Si es para un niño, **Sleep AMEC Kids** 🧒 — fórmula relajante pediátrica, sin azúcar añadida (1 gomita antes de dormir, según lo indique el pediatra).\n\n¿Quieres que te dé más detalles de alguno?',
    ids: ['sleep-amec-adulto', 'sleep-amec-kids'],
  },
  {
    id: 'ansiedad',
    palabras: ['ansiedad', 'estrés', 'nervios', 'irritable', 'tensión', 'estres', 'ansioso'],
    texto:
      'Para el equilibrio emocional y nervioso te sugiero:\n\n• **Ansineuro** 🧠 — fórmula con ingredientes botánicos y micronutrientes que contribuyen a reducir la tensión y la irritabilidad del día a día. Se toma **1 cápsula al día junto a la comida**.\n• Complemento ideal: **Sleep AMEC Adulto** 🌙, porque un buen descanso ayuda mucho a manejar el estrés.\n\nSi el malestar es intenso o prolongado, considera también consultar con un profesional.',
    ids: ['ansineuro', 'sleep-amec-adulto'],
  },
  {
    id: 'energia',
    palabras: ['energía', 'cansancio', 'fatiga', 'rendimiento', 'vitalidad', 'energia', 'agotado', 'rendir', 'concentracion', 'memoria'],
    texto:
      'Para recuperar energía y rendimiento:\n\n• **NAD+** ⚡ — precursor que apoya la **energía celular y la recuperación natural del organismo**. Se toma **1 cápsula cada mañana en ayunas**.\n• **Megamec** 🍊 — 10 vitaminas y minerales en gomitas sin azúcar (1 al día): ideal para complementar la dieta de toda la familia.\n\nIdeal con una buena hidratación y desayuno 😉',
    ids: ['nad-plus', 'megamec'],
  },
  {
    id: 'inmunidad',
    palabras: ['defensas', 'inmunidad', 'inmune', 'resfrio', 'gripa', 'gripe', 'catarro', 'antioxidante'],
    texto:
      'Para apoyar tus defensas naturales:\n\n• **Megamec** 🍊 — multivitamínico para toda la familia, sin azúcar añadida (1 gomita al día).\n• Para los peques: **Inmunoamec Kids** 🧒 — jarabe con **zinc, vitaminas C y D** para apoyar el sistema inmune infantil todo el año.\n\nOtros aliados: dormir bien y una dieta variada 🥗',
    ids: ['megamec', 'inmunoamec-kids'],
  },
  {
    id: 'digestion',
    palabras: ['digestión', 'digestion', 'estómago', 'estomago', 'intestino', 'probiótico', 'probiotico', 'colón', 'colon', 'pesadez', 'flora intestinal', 'gastritis'],
    texto:
      'Para la salud digestiva te recomiendo:\n\n• **Floramec** 🌿 — sachets con cepas microbianas que **equilibran la microflora intestinal** y apoyan el bienestar abdominal. Se disuelve **1 sachet al día en agua o jugo, preferiblemente en ayunas**.\n• Pronto tendremos **Gastroprotect Digest** 🚀 (jengibre y curcumina), un coadyuvante digestivo masticable.\n\n¿Es para un adulto o para toda la familia?',
    ids: ['floramec', 'proximo-gastro'],
  },
  {
    id: 'ninos',
    palabras: ['niños', 'ninos', 'hijo', 'hija', 'peque', 'mi peque', 'infantil', 'crecimiento', 'escuela', 'estudio'],
    texto:
      'Para los más pequeños de la casa:\n\n• **Nutriamec Kids (lata)** 🧒 — nutrición en polvo con proteína, calcio, vitamina D y complejo B para el crecimiento y desarrollo mental; 2 medidas en leche 1–2 veces al día.\n•**Nutriamec Kids (sachets)** — dosis individuales perfectas para la escuela.\n• **Inmunoamec Kids** 🛡️ — defensas con zinc y vitaminas C y D.\n\nUso pediátrico: si tiene una condición médica, valida con su pediatra 💙',
    ids: ['nutriamec-kids-lata', 'nutriamec-kids-sachets', 'inmunoamec-kids'],
  },
  {
    id: 'hierro',
    palabras: ['anemia', 'hierro', 'hierro bajo', 'palidez', 'debilidad', 'ferropenia'],
    texto:
      'Para el apoyo nutricional en anemia:\n\n• **Nutriamec Hierro** 💊 — hierro micronizado **con vitamina C para mejor absorción** y menos sabor metálico; 1 sachet al día (o según pauta del especialista).\n• Para lactantes llega pronto **FerriKids Gotas** 🚀, bajo indicación pediátrica.\n\nSi le diagnosticaron anemia, seguimos las indicaciones de su médico 🩺',
    ids: ['nutriamec-hierro', 'proximo-ferri'],
  },
  {
    id: 'huesos',
    palabras: ['huesos', 'osteoporosis', 'fractura', 'calcio', 'menopausia', 'postura', 'dientes'],
    texto:
      'Para huesos y dientes fuertes:\n\n• **Nutriamec Kids (lata)** 🧒 — calcio + vitamina D para etapas de crecimiento.\n• Pronto disponible **Calciomec + D3** 🚀 — calcio con vitamina D3 para crecimiento y adulto mayor.\n\nCon orientación del profesional, ejercicio y sol ☀️ potencian los resultados.',
    ids: ['nutriamec-kids-lata', 'proximo-calcio'],
  },
  {
    id: 'piel',
    palabras: ['piel', 'arrugas', 'colágeno', 'colageno', 'articulaciones', 'rodillas', 'cabello', 'uñas'],
    texto:
      'Para piel, uñas, cabello y articulaciones:\n\n• **RHC Colágeno** ✨ — péptidos de colágeno hidrolizado **fortificados con vitamina C**: fortalece piel, uñas y cabello, y apoya cartílagos y articulaciones. 1 sachet al día en agua o tu bebida favorita.\n\nEl resultado se nota con uso constante 💪',
    ids: ['rhc-colageno'],
  },
  {
    id: 'mujer',
    palabras: ['mujer', 'femenina', 'femenino', 'hormonal', 'menstruacion', 'anticonceptivo', 'sindrome'],
    texto:
      'Para el bienestar femenino:\n\n• **Femestrogen** 🌸 — sachets con vitaminas (B6 y ácido fólico) y compuestos vegetales estandarizados para el bienestar hormonal en las distintas etapas de la mujer; 1 sachet al día.\n\n¿Estás en etapa de embarazo o lactancia? Pregúntame por **Pregnamec** 🤰',
    ids: ['femestrogen'],
  },
  {
    id: 'embarazo',
    palabras: ['embarazada', 'embarazo', 'lactancia', 'materna', 'prenatal', 'bebe'],
    texto:
      'Para el embarazo y la lactancia:\n\n• **Pregnamec** 🤰 — nutrición materna con **folato, hierro, calcio y DHA** para el desarrollo del bebé y la salud de la mamá; 2 medidas al día en leche o agua.\n\n⚠️ Recuerda: durante el embarazo toma la nutrición **según el plan de tu médico o ginecólogo**. 💙',
    ids: ['pregnamec'],
  },
  {
    id: 'diabetes',
    palabras: ['diabetes', 'diabético', 'diabetico', 'azúcar en la sangre', 'glucosa', 'insulina'],
    texto:
      'Existe **Nutridiabet** 🩸 — nutrición clínica con **hidratos de bajo índice glucémico, fibra y proteína de calidad**, diseñada para personas con diabetes.\n\n⚠️ Importante:\n• Se consume **bajo supervisión médica**, como indica el propio producto.\n• No sustituye el tratamiento ni la dieta indicada por tu médico.\n\nSi tu caso es específico (glucosa alta, insulina, etc.), **consulta siempre a tu médico**. 💙',
    ids: ['nutridiabet'],
  },
  {
    id: 'recuperacion',
    palabras: ['recuperación', 'postoperatorio', 'quede debilitado', 'convaleciente', 'proteína', 'proteina', 'masa muscular'],
    texto:
      'Para el aporte nutricional y recuperación:\n\n• **Bioartimec** 🥤 — proteína de alta calidad biológica con vitaminas y minerales fácil de digerir; 2 medidas en agua o leche, 1–2 veces al día.\n• **Nutriamec Adulto** 💪 — 26 vitaminas y minerales, formato familiar para el apoyo diario.\n\nSi el paciente está en tratamiento médico, coordina el uso con su nutricionista 🩺',
    ids: ['bioartimec', 'nutriamec-adulto'],
  },
  {
    id: 'envios',
    palabras: ['envío', 'envio', 'gratis', 'enviogratis', 'delivery', 'despacho', 'pago', 'culqi', 'tarjeta', 'yape', 'plin'],
    texto:
      'Sobre pedidos y pagos 🛒\n\n• **Envío:** tarifas por departamento en el checkout y **envío gratis** al superar el mínimo configurado por AMEC.\n• **Pago:** tarjeta u otros canales según disponibilidad; si elegiste pago coordinado, confirmamos por WhatsApp.\n• **Cupón:** ten a la mano los cupones vigentes para aplicarlos al confirmar tu pedido 🎟️\n\n¿Necesitas ayuda con un pedido ya realizado?',
    ids: [],
  },
  {
    id: 'distribuidor',
    palabras: ['distribuidor', 'b2b', 'farmacia mayorista', 'revender', 'mayorista'],
    texto:
      'Si tienes farmacia o distribuidora 🏢\n\n• El **Portal B2B** te da precios de distribución al iniciar sesión con cuenta aprobada.\n• Solicita tu acceso desde el botón **🔐 Portal** de la barra superior: el equipo comercial lo evalúa.\n\nY si prefieres hablar con un asesor comercial humano, dímelo y te comparto los canales 📱',
    ids: [],
  },
  {
    id: 'humano',
    palabras: ['asesor', 'humano', 'persona', 'operator', 'atención humana', 'hablar con alguien', 'reclamo', 'queja'],
    texto: 'human',
  },
  {
    id: 'despedida',
    palabras: ['gracias', 'adiós', 'adios', 'chao', 'hasta luego', 'nos vemos', 'gracias amecbot'],
    texto:
      '¡Con mucho gusto! 💚 Recuerda que AMEC Nutrition es la línea de suplementos con respaldo profesional y se siembra en tu bienestar **con constancia**.\n\nAquí estaré cuando me necesites 🤖 ¡Que tengas un día muy saludable!',
    ids: [],
  },
]

/* Temas patológicos: solo derivan a profesional de salud */
const PATOLOGICAS = ['cancer', 'tumor', 'quimio', 'cirugía', 'cirugia', 'insuficiencia', 'renal', 'cardiopatía', 'cardiopatia', 'epilepsia', 'vih', 'sida', 'leucemia', 'metástasis', 'metastasis']

const RESPUESTA_PATOLOGICA = {
  texto:
    'Entiendo tu consulta 🙏\n\nEse tipo de tema **va más allá de mi rol informativo**: los casos clínicos deben evaluarse directamente con un **profesional de la salud** (médico o nutricionista), quien puede considerar los productos AMEC dentro de un plan de tratamiento.\n\n¿Te gustaría que te comparta los canales para hablar con nuestro asesor humano?' + AVISO_PROFESIONAL,
  ids: [],
}

/* ---------------- Motor de respuestas ---------------- */

export function calcularRespuesta(textoUsuario, productos, config) {
  const texto = normalizar(textoUsuario)
  const prod = id => productos.find(p => p.id === id)

  /* 0. Busca producto por nombre (p. ej. "¿qué es floramec?") */
  const consultado = productos.find(p => {
    const nombre = normalizar(p.nombre)
    return nombre.length > 3 && texto.includes(nombre) && texto.length <= nombre.length + 24
  })
  if (consultado) {
    return { texto: fichaProducto(consultado, config?.esB2B), ids: [consultado.id] }
  }

  /* 1. Patologías graves → profesional de salud */
  if (enTexto(texto, PATOLOGICAS)) return RESPUESTA_PATOLOGICA

  /* 2. Consultas de dosis exacta → pauta definida por el profesional */
  if (enTexto(texto, ['dosis', 'miligramos que', 'cuánto debo tomar si tengo'])) {
    return {
      texto:
        'Sobre la dosis exacta de cualquier producto AMEC 📋\n\n• Cada envase indica su modo de uso.\n• Si tienes un diagnóstico o tratamiento en curso, **la pauta la define tu profesional de salud**.\n\n¿Te indico el modo de uso general de algún producto?' + AVISO_PROFESIONAL,
      ids: [],
    }
  }

  /* 3. Temas con intenciones específicas */
  for (const tema of TEMAS) {
    if (!enTexto(texto, tema.palabras)) continue
    if (tema.id === 'humano') return CANAL_HUMANO
    const disponibles = tema.ids.map(prod).filter(Boolean)
    return { texto: tema.texto, ids: disponibles.map(p => p.id) }
  }

  /* 4. Nombres de producto consultado sin frase corta */
  const mencionado = productos.find(p => texto.includes(normalizar(p.nombre)))
  if (mencionado) {
    return { texto: fichaProducto(mencionado, config?.esB2B), ids: [mencionado.id] }
  }

  /* 5. Fallback: no lo sé → asesor humano + explorar catálogo */
  return {
    texto:
      'Esa consulta está fuera de lo que puedo responder con certeza 🙊 (prefiero mantener una guía informativa y confiable).\n\nTe comparto los canales oficiales:\n• WhatsApp / Cel: **994 254 676**\n• Teléfono fijo: **074-775986**\n• Correo: **amecnutrition@amecpharma.com**\n\nTambién puedo recomendarte productos si me cuentas tu objetivo: dormir mejor, más energía, digestión, defensas… ¿qué buscas?',
    ids: [],
  }
}

/* ---------------- Render de texto enriquecido ----------------
   Soporta **negritas**, viñetas "• " y cursivas *texto*. */

function TextoRico({ texto }) {
  const parrafos = String(texto).split('\n')
  return parrafos.map((linea, i) => {
    if (!linea) return <span key={i} style={{ display: 'block', height: 6 }} />
    const esVineta = linea.trim().startsWith('•') || linea.trim().startsWith('-')
    const partes = linea.split(/(\*\*[^*]+\*\*)/g).filter(Boolean)
    return (
      <p key={i} className={esVineta ? 'amecbot-bullet' : undefined}>
        {partes.map((parte, j) => (
          parte.startsWith('**') && parte.endsWith('**')
            ? <strong key={j}>{parte.slice(2, -2)}</strong>
            : <span key={j}>{parte}</span>
        ))}
      </p>
    )
  })
}

/* ---------------- Componente del widget ---------------- */

const SUGERENCIAS_INICIALES = [
  'Recomienda para dormir mejor 😴',
  'Necesito más energía ⚡',
  'Apoyo para mis defensas 🛡️',
  'Algo para la digestión 🌿',
  'Productos para niños 🧒',
]

export function AmecBot({ productos, esB2B, config, alAgregar, oculto }) {
  const [abierto, setAbierto] = useState(false)
  const [teaser, setTeaser] = useState(false)
  const [entrada, setEntrada] = useState('')
  const [pensando, setPensando] = useState(false)
  const [mensajes, setMensajes] = useState([])
  const cuerpoRef = useRef(null)

  /* Teaser del botón (una sola vez) */
  useEffect(() => {
    const temp = setTimeout(() => setTeaser(true), 3200)
    return () => clearTimeout(temp)
  }, [])

  /* Saludo del bot al abrir por primera vez */
  useEffect(() => {
    if (!abierto || mensajes.length > 0) return
    setPensando(true)
    const temp = setTimeout(() => {
      setMensajes([{
        id: 'm0',
        de: 'bot',
        texto:
          '¡Hola! 👋 Soy **AmecBot**, el asistente virtual oficial de **AMEC Nutrition**.\n\nPuedo ayudarte a:\n• Recomendarte el producto ideal según tu necesidad.\n• Explicarte beneficios, ingredientes y modo de uso.\n• Resolver dudas sobre pedidos y envíos.\n\n¿Qué estás buscando hoy? 🙂',
        ids: [],
      }])
      setPensando(false)
    }, 700)
    return () => clearTimeout(temp)
  }, [abierto, mensajes.length])

  /* Autoscroll al final */
  useEffect(() => {
    if (cuerpoRef.current) cuerpoRef.current.scrollTop = cuerpoRef.current.scrollHeight
  }, [mensajes, pensando])

  const enviar = textoUsuario => {
    const texto = String(textoUsuario || entrada).trim()
    if (!texto) return
    setEntrada('')
    setMensajes(prev => [...prev, { id: `u-${Date.now()}`, de: 'yo', texto, ids: [] }])
    setTeaser(false)
    setPensando(true)

    const respuesta = calcularRespuesta(texto, productos, { esB2B })
    const demora = Math.min(1600, 500 + texto.length * 18)
    setTimeout(() => {
      setMensajes(prev => [...prev, { id: `b-${Date.now()}`, de: 'bot', texto: respuesta.texto, ids: respuesta.ids }])
      setPensando(false)
    }, demora)
  }

  /* Chip de sugerencia: envía la pregunta */
  const sugerir = chip => enviar(chip)

  const reiniciar = () => {
    setMensajes([])
    setPensando(false)
  }

  return (
    <div className={`amecbot${oculto ? ' oculto' : ''}`} aria-hidden={oculto}>
      {abierto && (
        <div className="amecbot-ventana" role="dialog" aria-label="AmecBot: asistente de AMEC Nutrition">
          <header className="amecbot-cabecera">
            <span className="amecbot-avatar grande" aria-hidden="true">🤖</span>
            <div>
              <strong>AmecBot</strong>
              <small>Asesor de nutrición AMEC · En línea</small>
            </div>
            <button type="button" className="amecbot-accion" onClick={reiniciar} title="Reiniciar conversación">
              🗑️
            </button>
            <button type="button" className="amecbot-accion" onClick={() => { setAbierto(false); setTeaser(false) }} aria-label="Cerrar chat">
              ✕
            </button>
          </header>

          <div className="amecbot-cuerpo" ref={cuerpoRef}>
            {mensajes.map(msj => (
              <div key={msj.id} className={`amecbot-texto ${msj.de === 'yo' ? 'mio' : 'bot'}`}>
                <div className="amecbot-burbuja">
                  <TextoRico texto={msj.texto} />
                </div>

                {msj.ids.length > 0 && (
                  <div className="amecbot-tarjeta">
                    {msj.ids.map(id => {
                      const p = productos.find(q => q.id === id)
                      if (!p) return null
                      return (
                        <div className="amecbot-producto" key={id}>
                          <div className="amecbot-producto-ico" aria-hidden="true">
                            {p.imagen ? <img src={p.imagen} alt="" /> : (p.icono || '💊')}
                          </div>
                          <div className="amecbot-producto-datos">
                            <strong>{p.nombre}</strong>
                            <small>{p.formato}</small>
                            <span className="amecbot-precio">
                              {p.proximo ? '🚀 Próximamente' : formatearPrecio(esB2B ? p.precioB2B : p.precioPublico)}
                            </span>
                          </div>
                          <div className="amecbot-producto-acciones">
                            <a href={`#/producto/${p.seo?.slug || textoASlug(p.nombre)}`} title="Ver ficha">🔎</a>
                            {!p.proximo && (
                              <button type="button" onClick={() => alAgregar(p)} title="Agregar al carrito">＋</button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            ))}

            {pensando && (
              <div className="amecbot-texto bot">
                <div className="amecbot-burbuja amecbot-escribiendo" aria-hidden="true">
                  <span /><span /><span />
                </div>
              </div>
            )}

            {mensajes.length <= 1 && !pensando && (
              <div className="amecbot-chips">
                {SUGERENCIAS_INICIALES.map(chip => (
                  <button type="button" key={chip} onClick={() => sugerir(chip)}>{chip}</button>
                ))}
              </div>
            )}
          </div>

          <form className="amecbot-pie" onSubmit={e => { e.preventDefault(); enviar() }}>
            <input
              type="text"
              value={entrada}
              onChange={e => setEntrada(e.target.value)}
              placeholder="Escribe tu consulta…"
              aria-label="Escribe tu consulta para AmecBot"
              autoComplete="off"
            />
            <button type="submit" disabled={!entrada.trim()} aria-label="Enviar mensaje">➤</button>
          </form>
          <small className="amecbot-legal">
            AmecBot ofrece información orientativa; no sustituye el consejo de tu médico o nutricionista.
          </small>
        </div>
      )}

      {!abierto && (
        <>
          {teaser && (
            <button type="button" className="amecbot-teaser" onClick={() => { setAbierto(true); setTeaser(false) }}>
              👋 ¿Necesitas ayuda? Conversemos 💚
            </button>
          )}
          <button
            type="button"
            className="amecbot-btn"
            onClick={() => { setAbierto(true); setTeaser(false) }}
            aria-label="Abrir AmecBot, asistente virtual de AMEC Nutrition"
            title="AmecBot · Asistente virtual AMEC"
          >
            🤖
            {teaser && <span className="amecbot-pulso" aria-hidden="true" />}
          </button>
        </>
      )}
    </div>
  )
}
