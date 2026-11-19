// Contenido de la notificación de una solicitud nueva. Sin dependencias: se prueba con vitest.

export interface LeadRecord {
  id: string
  user_id: string
  service: string
  name: string
  business?: string | null
}

export interface PushMessage {
  title: string
  body: string
  /** Una notificación por solicitud: si llega dos veces, la segunda sustituye a la primera */
  tag: string
  /** Ruta dentro de la app (HashRouter) */
  path: string
}

/** Mismos textos que el formulario de la web */
export const SERVICE_LABEL: Record<string, string> = {
  web: 'Página web para negocio',
  app: 'Aplicación de gestión',
  qr: 'QR para reseñas',
  otro: 'Otro / No estoy seguro',
}

/** «Nueva solicitud · QR para reseñas» / «Ana García — Bar La Plaza» */
export function leadNotification(l: LeadRecord): PushMessage {
  const business = (l.business ?? '').trim()
  return {
    title: `Nueva solicitud · ${SERVICE_LABEL[l.service] ?? 'Otro'}`,
    body: business ? `${l.name.trim()} — ${business}` : l.name.trim(),
    tag: `lead-${l.id}`,
    path: `#/solicitudes/${l.id}`,
  }
}

/** Comparación de cadenas en tiempo constante (para el secreto del webhook) */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

/** El servicio push responde 404/410 cuando la suscripción ya no existe: hay que borrarla */
export const isGone = (statusCode: unknown) => statusCode === 404 || statusCode === 410
