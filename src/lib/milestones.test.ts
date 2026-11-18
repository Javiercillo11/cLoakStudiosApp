import { describe, expect, it } from 'vitest'
import {
  allocateCents, assignedHundredths, emptyMilestone, parseHundredths, parsePrice, paymentSummary,
  toStored, validateMilestones, type MilestoneDraft,
} from './milestones'

const m = (description: string, percentage: string, paid = false): MilestoneDraft =>
  ({ ...emptyMilestone(), description, percentage, paid })

describe('parseHundredths', () => {
  it('admite coma y punto, hasta 2 decimales', () => {
    expect(parseHundredths('30')).toBe(3000)
    expect(parseHundredths('33,33')).toBe(3333)
    expect(parseHundredths('33.5')).toBe(3350)
    expect(parseHundredths('0,1')).toBe(10)
    expect(parseHundredths('-5')).toBe(-500)
  })
  it('rechaza textos y más de 2 decimales', () => {
    expect(parseHundredths('abc')).toBeNull()
    expect(parseHundredths('33,333')).toBeNull()
    expect(parseHundredths('')).toBeNull()
  })
})

describe('validateMilestones', () => {
  it('30 + 40 + 30 = 100 % es válido', () => {
    const v = validateMilestones([m('Reserva', '30'), m('Inicio', '40'), m('Final', '30')])
    expect(v.valid).toBe(true)
  })
  it('30 + 40 + 20 avisa de que falta el 10 %', () => {
    const v = validateMilestones([m('Reserva', '30'), m('Inicio', '40'), m('Final', '20')])
    expect(v.valid).toBe(false)
    expect(v.total).toContain('falta distribuir el 10 %')
  })
  it('avisa si sobra', () => {
    const v = validateMilestones([m('A', '60'), m('B', '50')])
    expect(v.total).toContain('sobra un 10 %')
  })
  it('decimales exactos: 33,33 + 33,33 + 33,34', () => {
    const list = [m('A', '33,33'), m('B', '33,33'), m('C', '33,34')]
    expect(assignedHundredths(list)).toBe(10000)
    expect(validateMilestones(list).valid).toBe(true)
    // 0.1 + 0.2 no da problemas
    expect(validateMilestones([m('A', '0,1'), m('B', '0,2'), m('C', '99,7')]).valid).toBe(true)
  })
  it('rechaza negativos, cero, >100 y descripciones vacías', () => {
    const neg = m('A', '-10'), big = m('B', '110'), zero = m('C', '0'), noDesc = m('', '100')
    const v = validateMilestones([neg, big, zero, noDesc])
    expect(v.items[neg.id].percentage).toMatch(/negativo/)
    expect(v.items[big.id].percentage).toMatch(/100/)
    expect(v.items[zero.id].percentage).toMatch(/mayor que 0/)
    expect(v.items[noDesc.id].description).toBeTruthy()
  })
  it('sin hitos: obligatorio por defecto', () => {
    expect(validateMilestones([]).valid).toBe(false)
    expect(validateMilestones([], { required: false }).valid).toBe(true)
  })
})

describe('importes y resumen', () => {
  it('ejemplo 10.000 €: 30/40/30 con dos pagados', () => {
    const s = paymentSummary(10000, [
      { percentage: 30, paid: true }, { percentage: 40, paid: true }, { percentage: 30, paid: false },
    ])
    expect(s.amounts).toEqual([3000, 4000, 3000])
    expect(s.collected).toBe(7000)
    expect(s.pending).toBe(3000)
    expect(s.collectedPct).toBe(70)
    expect(s.pendingPct).toBe(30)
  })
  it('acepta porcentajes en texto (formulario)', () => {
    const s = paymentSummary(1000, [{ percentage: '25,5', paid: true }, { percentage: '74,5', paid: false }])
    expect(s.amounts).toEqual([255, 745])
    expect(s.collectedPct).toBe(25.5)
  })
  it('el reparto suma exactamente el total (tercios de 100 €)', () => {
    const cents = allocateCents(10000, [3333, 3333, 3334])
    expect(cents.reduce((a, b) => a + b, 0)).toBe(10000)
    const odd = allocateCents(1, [3333, 3333, 3334])
    expect(odd.reduce((a, b) => a + b, 0)).toBe(1)
  })
  it('precio 0 no rompe', () => {
    const s = paymentSummary(0, [{ percentage: 100, paid: true }])
    expect(s).toMatchObject({ total: 0, collected: 0, pending: 0, collectedPct: 100 })
  })
})

describe('toStored', () => {
  it('convierte a número y gestiona paidAt', () => {
    const [a, b] = toStored([m(' Reserva ', '33,33', true), m('Resto', '66,67')])
    expect(a).toMatchObject({ description: 'Reserva', percentage: 33.33, paid: true })
    expect(a.paidAt).toBeTruthy()
    expect(b).toMatchObject({ percentage: 66.67, paid: false, paidAt: null })
  })
})

describe('parsePrice', () => {
  it('formatos habituales', () => {
    expect(parsePrice('10000')).toBe(10000)
    expect(parsePrice('10.000')).toBe(10000)
    expect(parsePrice('1.250,50')).toBe(1250.5)
    expect(parsePrice('1250.5')).toBe(1250.5)
    expect(parsePrice('12,345')).toBeNull()
    expect(parsePrice('-3')).toBeNull()
  })
})
