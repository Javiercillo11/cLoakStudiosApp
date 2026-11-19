import { LEAD_SERVICE_LABEL, type Lead } from './types'
import { formatDate } from './format'

/** Nombre con el que se muestra la solicitud: el negocio o, si no hay, la persona */
export const leadTitle = (l: Pick<Lead, 'name' | 'business'>) => l.business.trim() || l.name

/**
 * Número para wa.me: solo dígitos y con prefijo de país.
 * Los móviles y fijos españoles de 9 cifras (6, 7, 8 o 9 inicial) reciben el 34.
 */
export function waNumber(phone: string): string | null {
  let digits = phone.replace(/\D/g, '')
  if (phone.trim().startsWith('00')) digits = digits.slice(2)
  if (/^[6-9]\d{8}$/.test(digits)) digits = `34${digits}`
  return digits.length >= 10 && digits.length <= 15 ? digits : null
}

export function whatsappLink(phone: string, text = ''): string | null {
  const n = waNumber(phone)
  if (!n) return null
  return `https://wa.me/${n}${text.trim() ? `?text=${encodeURIComponent(text.trim())}` : ''}`
}

/** Teléfono para tel:, sin espacios ni símbolos salvo el + inicial */
export const telHref = (phone: string) => `tel:${phone.trim().replace(/(?!^\+)[^\d]/g, '')}`

/** Datos con los que se rellena el formulario de proyecto al convertir una solicitud */
export function leadToProjectPrefill(l: Lead) {
  const lines = [
    `Solicitud recibida desde la web el ${formatDate(l.created_at)} · ${LEAD_SERVICE_LABEL[l.service]}`,
    `Email: ${l.email}`,
    '',
    l.message.trim(),
  ]
  const details = (l.details ?? []).filter((d) => d.value.trim())
  if (details.length) lines.push('', ...details.map((d) => `${d.label}: ${d.value}`))
  return {
    client_name: l.name.trim(),
    business_name: l.business.trim(),
    phone: l.phone.trim(),
    description: lines.join('\n'),
  }
}

export type ProjectPrefill = ReturnType<typeof leadToProjectPrefill>
