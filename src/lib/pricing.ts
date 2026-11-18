import type { ExtraCharge } from './types'
import { newMilestoneId, parseHundredths, parsePrice } from './milestones'

/**
 * Precio del proyecto (todo en céntimos enteros):
 *   subtotal = suma de servicios + cargos adicionales (dietas, kilometraje…)
 *   descuento = subtotal × % descuento
 *   total = subtotal − descuento
 */

/** Cargo mientras se edita: el importe es el texto que escribe el usuario */
export type ExtraDraft = { id: string; description: string; amount: string }

export const emptyExtra = (description = ''): ExtraDraft => ({ id: newMilestoneId(), description, amount: '' })

export const extraToDraft = (e: ExtraCharge): ExtraDraft => ({
  id: e.id, description: e.description, amount: String(e.amount).replace('.', ','),
})

const toCents = (eur: number) => Math.round((Number(eur) || 0) * 100)

export interface PriceBreakdown {
  services: number
  extras: number
  subtotal: number
  discountPct: number
  discount: number
  total: number
}

/** Desglose a partir de la suma de servicios (€), los cargos y el % de descuento (texto o número). */
export function priceBreakdown(servicesSum: number, extras: { amount: string | number }[], discount: string | number): PriceBreakdown {
  const servicesC = toCents(servicesSum)
  const extrasC = extras.reduce((sum, e) => {
    const v = typeof e.amount === 'number' ? e.amount : parsePrice(e.amount)
    return sum + (v !== null && v > 0 ? toCents(v) : 0)
  }, 0)
  const subtotalC = servicesC + extrasC
  const h = typeof discount === 'number' ? Math.round(discount * 100) : (discount.trim() ? parseHundredths(discount) : 0)
  const dH = h !== null && h >= 0 && h <= 10000 ? h : 0
  const discountC = Math.round((subtotalC * dH) / 10000)
  return {
    services: servicesC / 100,
    extras: extrasC / 100,
    subtotal: subtotalC / 100,
    discountPct: dH / 100,
    discount: discountC / 100,
    total: (subtotalC - discountC) / 100,
  }
}

export interface PricingErrors {
  extras: Record<string, { description?: string; amount?: string }>
  discount?: string
}

export function validatePricing(extras: ExtraDraft[], discount: string): PricingErrors & { valid: boolean } {
  const out: PricingErrors = { extras: {} }
  for (const e of extras) {
    const err: { description?: string; amount?: string } = {}
    if (!e.description.trim()) err.description = 'Indica el concepto.'
    const v = parsePrice(e.amount)
    if (!e.amount.trim()) err.amount = 'Indica el importe.'
    else if (v === null) err.amount = 'Importe no válido.'
    else if (v <= 0) err.amount = 'Debe ser mayor que 0.'
    if (err.description || err.amount) out.extras[e.id] = err
  }
  if (discount.trim()) {
    const h = parseHundredths(discount)
    if (h === null) out.discount = 'Número no válido (máx. 2 decimales).'
    else if (h < 0) out.discount = 'No puede ser negativo.'
    else if (h > 10000) out.discount = 'No puede superar el 100 %.'
  }
  return { ...out, valid: !out.discount && Object.keys(out.extras).length === 0 }
}

/** Cargos tal y como se guardan. Solo llamar tras validar. */
export const extrasToStored = (extras: ExtraDraft[]): ExtraCharge[] =>
  extras.map((e) => ({ id: e.id, description: e.description.trim(), amount: parsePrice(e.amount) ?? 0 }))

export const discountToStored = (discount: string) => (discount.trim() ? (parseHundredths(discount) ?? 0) / 100 : 0)
