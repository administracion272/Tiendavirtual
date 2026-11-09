/* ================================================================
   Imágenes de producto — validación + optimización
   ----------------------------------------------------------------
   Archivo recomendado: 1200 × 900 px (relación 4:3).
   Mínimo aceptado:     800 × 600 px.
   Formatos: JPG, PNG o WEBP · Peso máximo: 2 MB.
   Al registrar la imagen se recorta al centro (4:3) y se exporta
   optimizada a 900 × 675 px (JPEG 85%) para la plantilla.
   ================================================================ */

export const FORMATOS_IMAGEN_OK = ['image/jpeg', 'image/png', 'image/webp']
export const PESO_MAX_IMAGEN = 2 * 1024 * 1024 /* 2 MB */
export const ANCHO_MIN_IMAGEN = 800
export const ALTO_MIN_IMAGEN = 600
export const RELACION_IMAGEN = 4 / 3
export const IMAGEN_SALIDA = { ancho: 900, alto: 675 }

export const ESPECIFICACION_IMAGEN =
  'JPG, PNG o WEBP · Mínimo 800×600 px · Recomendado 1200×900 (4:3) · Máx. 2 MB (ideal ≤ 800 KB)'

/* ---------- Logotipo de la marca (panel → Apariencia) ----------
   Formatos: PNG, SVG o JPG · Peso máximo: 1 MB.
   El PNG/JPG se reescala a un alto de 128 px conservando la
   transparencia; el SVG se usa tal cual (símbolos vectoriales). */

export const FORMATO_LOGO_OK = ['image/png', 'image/svg+xml', 'image/jpeg']
export const PESO_MAX_LOGO = 1024 * 1024 /* 1 MB */
export const LOGO_ALTO = 128
export const ESPECIFICACION_LOGO = 'PNG, SVG o JPG · Máx. 1 MB · Ideal cuadrado con fondo transparente'

export async function procesarLogo(archivo, notificar) {
  /* 1. Formato */
  if (!FORMATO_LOGO_OK.includes(archivo.type)) {
    notificar('❌ Formato de logo no permitido. Usa PNG, SVG o JPG.')
    return null
  }

  /* 2. Peso */
  if (archivo.size > PESO_MAX_LOGO) {
    notificar('❌ El logo supera el 1 MB permitido. Reduce su tamaño e intenta de nuevo.')
    return null
  }

  let dataUrl
  try {
    dataUrl = await new Promise((resolver, rechazar) => {
      const lector = new FileReader()
      lector.onload = () => resolver(lector.result)
      lector.onerror = () => rechazar(new Error('lectura'))
      lector.readAsDataURL(archivo)
    })
  } catch {
    notificar('❌ No se pudo leer el archivo del logo.')
    return null
  }

  /* 3. SVG: se conserva vectorial sin reprocesar */
  if (archivo.type === 'image/svg+xml') {
    return dataUrl
  }

  /* 4. PNG/JPG: reescalar a alto 128 px conservando proporción y transparencia */
  let imagen
  try {
    imagen = await new Promise((resolver, rechazar) => {
      const instancia = new Image()
      instancia.onload = () => resolver(instancia)
      instancia.onerror = () => rechazar(new Error('imagen'))
      instancia.src = dataUrl
    })
  } catch {
    notificar('❌ El logo parece corrupto. Prueba con otro archivo.')
    return null
  }

  const alto = imagen.naturalHeight
  const ancho = imagen.naturalWidth
  if (Math.max(ancho, alto) < 64) {
    notificar(`❌ Logo muy pequeño (${ancho}×${alto}). Usa uno de al menos 64 px.`)
    return null
  }

  const escala = Math.min(1, LOGO_ALTO / alto)
  const lienzo = document.createElement('canvas')
  lienzo.width = Math.max(1, Math.round(ancho * escala))
  lienzo.height = Math.max(1, Math.round(alto * escala))
  const contexto = lienzo.getContext('2d')
  contexto.drawImage(imagen, 0, 0, lienzo.width, lienzo.height)

  return lienzo.toDataURL('image/png')
}

export async function procesarImagenProducto(file, notificar) {
  /* 1. Formato */
  if (!FORMATOS_IMAGEN_OK.includes(file.type)) {
    notificar('❌ Formato no permitido. Usa JPG, PNG o WEBP.')
    return null
  }

  /* 2. Peso */
  if (file.size > PESO_MAX_IMAGEN) {
    notificar('❌ El archivo supera los 2 MB permitidos. Ideal: ≤ 800 KB.')
    return null
  }

  let dataUrl
  try {
    dataUrl = await new Promise((resolver, rechazar) => {
      const lector = new FileReader()
      lector.onload = () => resolver(lector.result)
      lector.onerror = () => rechazar(new Error('lectura'))
      lector.readAsDataURL(file)
    })
  } catch {
    notificar('❌ No se pudo leer el archivo. Intenta de nuevo.')
    return null
  }

  let imagen
  try {
    imagen = await new Promise((resolver, rechazar) => {
      const instancia = new Image()
      instancia.onload = () => resolver(instancia)
      instancia.onerror = () => rechazar(new Error('imagen'))
      instancia.src = dataUrl
    })
  } catch {
    notificar('❌ La imagen parece corrupta. Prueba con otro archivo.')
    return null
  }

  /* 3. Dimensiones */
  const ancho = imagen.naturalWidth
  const alto = imagen.naturalHeight
  if (ancho < ANCHO_MIN_IMAGEN || alto < ALTO_MIN_IMAGEN) {
    notificar(`❌ Imagen muy pequeña (${ancho}×${alto}). Mínimo: ${ANCHO_MIN_IMAGEN}×${ALTO_MIN_IMAGEN} px.`)
    return null
  }

  /* Aviso suave si la relación no es 4:3 (se recorta al centro) */
  if (Math.abs(ancho / alto - RELACION_IMAGEN) > 0.15) {
    notificar(`⚠️ Relación ${ancho}×${alto} no es 4:3: se recorta al centro automáticamente.`)
  }

  /* 4. Recorte central a 4:3 y exportación optimizada (JPEG 85%) */
  const lienzo = document.createElement('canvas')
  lienzo.width = IMAGEN_SALIDA.ancho
  lienzo.height = IMAGEN_SALIDA.alto
  const contexto = lienzo.getContext('2d')

  let cropAncho
  let cropAlto
  if (ancho / alto > RELACION_IMAGEN) {
    cropAncho = Math.round(alto * RELACION_IMAGEN)
    cropAlto = alto
  } else {
    cropAncho = ancho
    cropAlto = Math.round(ancho / RELACION_IMAGEN)
  }

  const origenX = Math.round((ancho - cropAncho) / 2)
  const origenY = Math.round((alto - cropAlto) / 2)
  contexto.drawImage(imagen, origenX, origenY, cropAncho, cropAlto, 0, 0, IMAGEN_SALIDA.ancho, IMAGEN_SALIDA.alto)

  return lienzo.toDataURL('image/jpeg', 0.85)
}
