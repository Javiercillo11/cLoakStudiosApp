import { describe, expect, it } from 'vitest'
import { discountToStored, emptyExtra, extrasToStored, priceBreakdown, validatePricing } from './pricing'

const x = (description: string, amount: string) => ({ ...emptyExtra(description), amount })

describe('priceBreakdown', () => {
  it('servicios + cargos − 10 % de descuento', () => {
    const b = priceBreakdown(1000, [x('Dietas', '150'), x('Kilometraje', '50')], '10')
    expect(b).toEqual({ services: 1000, extras: 200, subtotal: 1200, discountPct: 10, discount: 120, total: 1080 })
  })
  it('sin descuento ni cargos, el total es la suma de servicios', () => {
    expect(priceBreakdown(2500, [], '').total).toBe(2500)
  })
  it('descuento con decimales y céntimos exactos', () => {
    const b = priceBreakdown(99.99, [x('Dietas', '0,01')], '12,5')
    expect(b.subtotal).toBe(100)
    expect(b.discount).toBe(12.5)
    expect(b.total).toBe(87.5)
  })
  it('importes en formato español', () => {
    expect(priceBreakdown(0, [x('Kilometraje', '1.250,40')], '').total).toBe(1250.4)
  })
  it('100 % de descuento deja el total a 0', () => {
    expect(priceBreakdown(500, [], '100').total).toBe(0)
  })
  it('acepta números (datos guardados)', () => {
    expect(priceBreakdown(1000, [{ amount: 200 }], 10).total).toBe(1080)
  })
})

describe('validatePricing', () => {
  it('cargos sin concepto o importe, y descuentos fuera de rango', () => {
    const a = x('', '10'), b = x('Dietas', ''), c = x('Km', '-3')
    const v = validatePricing([a, b, c], '120')
    expect(v.valid).toBe(false)
    expect(v.extras[a.id].description).toBeTruthy()
    expect(v.extras[b.id].amount).toBeTruthy()
    expect(v.extras[c.id].amount).toBeTruthy()
    expect(v.discount).toMatch(/100/)
    expect(validatePricing([], '-5').discount).toMatch(/negativo/)
    expect(validatePricing([x('Dietas', '40')], '').valid).toBe(true)
  })
  it('conversión a lo que se guarda', () => {
    expect(extrasToStored([x(' Dietas ', '40,5')])[0]).toMatchObject({ description: 'Dietas', amount: 40.5 })
    expect(discountToStored('10')).toBe(10)
    expect(discountToStored('')).toBe(0)
  })
})
