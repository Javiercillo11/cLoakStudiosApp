import type { PaymentMilestone } from './types'

/**
 * Hitos de pago: toda la aritmética se hace con ENTEROS para evitar errores de coma flotante.
 *  - Porcentajes en centésimas (33,33 % → 3333). 100 % = 10000.
 *  - Importes en céntimos (10.000 € → 1000000).
 */
export const FULL = 10000

/** Hito mientras se edita: el porcentaje es el texto tal cual lo escribe el usuario ("33,5"). */
export type MilestoneDraft = Omit<PaymentMilestone, 'percentage'> & { percentage: string }

export interface MilestoneErrors {
  description?: string
  percentage?: string
}

export interface MilestonesValidation {
  /** Errores por id de hito */
  items: Record<string, MilestoneErrors>
  /** Error general (sin hitos, suma ≠ 100 %) */
  total?: string
  valid: boolean
}

export const newMilestoneId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`

export function emptyMilestone(): MilestoneDraft {
  return { id: newMilestoneId(), description: '', percentage: '', dueDate: null, paid: false, paidAt: null }
}

/**
 * Convierte el texto de un porcentaje en centésimas. Acepta coma o punto decimal.
 * Devuelve null si no es un número válido o tiene más de 2 decimales.
 */
export function parseHundredths(input: string): number | null {
  const s = input.trim().replace(',', '.')
  if (!/^-?\d+(\.\d{0,2})?$/.test(s) && !/^-?\.\d{1,2}$/.test(s)) return null
  const negative = s.startsWith('-')
  const [int, dec = ''] = s.replace('-', '').split('.')
  const value = Number(int || '0') * 100 + Number(dec.padEnd(2, '0'))
  return negative ? -value : value
}

/** Número (de BD) → centésimas */
export const toHundredths = (pct: number) => Math.round(pct * 100)
/** Centésimas → número con 2 decimales como máximo (para guardar) */
export const fromHundredths = (h: number) => h / 100

/** Porcentaje → texto editable ("33,5") */
export const pctToInput = (pct: number) => String(pct).replace('.', ',')

export const toDraft = (m: PaymentMilestone): MilestoneDraft => ({ ...m, percentage: pctToInput(m.percentage) })

/** Hitos tal y como se guardan en BD. Solo llamar tras validar. */
export function toStored(drafts: MilestoneDraft[]): PaymentMilestone[] {
  return drafts.map((d) => ({
    id: d.id,
    description: d.description.trim(),
    percentage: fromHundredths(parseHundredths(d.percentage) ?? 0),
    dueDate: d.dueDate || null,
    paid: d.paid,
    paidAt: d.paid ? d.paidAt ?? new Date().toISOString() : null,
  }))
}

/** Suma de los porcentajes válidos, en centésimas (los inválidos cuentan 0). */
export function assignedHundredths(drafts: Pick<MilestoneDraft, 'percentage'>[]) {
  return drafts.reduce((sum, d) => {
    const h = parseHundredths(d.percentage)
    return sum + (h !== null && h > 0 ? h : 0)
  }, 0)
}

const fmt = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2 })
const pctText = (h: number) => `${fmt.format(h / 100)} %`

export function validateMilestones(drafts: MilestoneDraft[], { required = true } = {}): MilestonesValidation {
  const items: Record<string, MilestoneErrors> = {}
  for (const d of drafts) {
    const e: MilestoneErrors = {}
    if (!d.description.trim()) e.description = 'Escribe una descripción.'
    const h = parseHundredths(d.percentage)
    if (!d.percentage.trim()) e.percentage = 'Indica el porcentaje.'
    else if (h === null) e.percentage = 'Número no válido (máx. 2 decimales).'
    else if (h < 0) e.percentage = 'No puede ser negativo.'
    else if (h === 0) e.percentage = 'Debe ser mayor que 0.'
    else if (h > FULL) e.percentage = 'No puede superar el 100 %.'
    if (e.description || e.percentage) items[d.id] = e
  }

  let total: string | undefined
  if (drafts.length === 0) {
    if (required) total = 'Añade al menos un hito de pago (deben sumar 100 %).'
  } else {
    const sum = assignedHundredths(drafts)
    if (sum < FULL) total = `Los hitos suman ${pctText(sum)}: falta distribuir el ${pctText(FULL - sum)}.`
    else if (sum > FULL) total = `Los hitos suman ${pctText(sum)}: sobra un ${pctText(sum - FULL)}.`
  }

  return { items, total, valid: !total && Object.keys(items).length === 0 }
}

/**
 * Importe de cada hito en céntimos. Si los porcentajes suman 100 %, se reparte por el método del
 * resto mayor para que la suma de importes sea EXACTAMENTE el precio total.
 */
export function allocateCents(totalCents: number, hundredths: number[]): number[] {
  const exact = hundredths.map((h) => (totalCents * h) / FULL)
  const sum = hundredths.reduce((a, b) => a + b, 0)
  if (sum !== FULL) return exact.map((x) => Math.round(x))
  const floors = exact.map(Math.floor)
  let rest = totalCents - floors.reduce((a, b) => a + b, 0)
  const order = exact
    .map((x, i) => ({ i, frac: x - Math.floor(x) }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i)
  for (const { i } of order) {
    if (rest <= 0) break
    floors[i]++
    rest--
  }
  return floors
}

export interface PaymentSummaryData {
  total: number
  collected: number
  pending: number
  /** Porcentajes 0–100 */
  collectedPct: number
  pendingPct: number
  /** Importe de cada hito, en euros, en el mismo orden */
  amounts: number[]
}

/** Resumen económico a partir del precio total (euros) y los hitos (con porcentaje numérico o texto). */
export function paymentSummary(
  totalPrice: number,
  milestones: { percentage: number | string; paid: boolean }[],
): PaymentSummaryData {
  const totalCents = Math.max(0, Math.round((Number(totalPrice) || 0) * 100))
  const hs = milestones.map((m) => {
    const h = typeof m.percentage === 'number' ? toHundredths(m.percentage) : parseHundredths(m.percentage)
    return h !== null && h > 0 && h <= FULL ? h : 0
  })
  const cents = allocateCents(totalCents, hs)
  let collectedCents = 0
  let collectedH = 0
  milestones.forEach((m, i) => {
    if (m.paid) {
      collectedCents += cents[i]
      collectedH += hs[i]
    }
  })
  collectedCents = Math.min(collectedCents, totalCents)
  collectedH = Math.min(collectedH, FULL)
  return {
    total: totalCents / 100,
    collected: collectedCents / 100,
    pending: (totalCents - collectedCents) / 100,
    collectedPct: collectedH / 100,
    pendingPct: (FULL - collectedH) / 100,
    amounts: cents.map((c) => c / 100),
  }
}

/** Precio introducido por el usuario ("1.250,50" / "1250.5") → euros, o null si no es válido. */
export function parsePrice(input: string): number | null {
  let s = input.trim().replace(/\s|€/g, '')
  if (!s) return null
  // Formato español con miles: 1.250,50 → 1250.50
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.')
  // "1.250" o "10.000" sin coma: puntos de miles
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '')
  if (!/^\d+(\.\d{0,2})?$/.test(s)) return null
  return Math.round(Number(s) * 100) / 100
}

export const priceToInput = (n: number) => (Number(n) || 0).toFixed(2).replace('.', ',').replace(/,00$/, '')
