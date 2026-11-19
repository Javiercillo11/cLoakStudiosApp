import { describe, expect, it } from 'vitest'
import { leadTitle, leadToProjectPrefill, telHref, waNumber, whatsappLink } from './leads'
import type { Lead } from './types'

const lead = (over: Partial<Lead> = {}): Lead => ({
  id: 'l1',
  created_at: '2026-11-19T10:00:00Z',
  updated_at: '2026-11-19T10:00:00Z',
  status: 'nuevo',
  service: 'qr',
  name: ' Ana García ',
  business: 'Bar La Plaza',
  email: 'ana@example.com',
  phone: '612 345 678',
  message: 'Quiero un QR para que me dejen reseñas.',
  details: [
    { label: 'Plataforma', value: 'Google' },
    { label: '¿Dónde usará el QR?', value: 'Mesa, Mostrador' },
  ],
  project_id: null,
  ...over,
})

describe('leadToProjectPrefill', () => {
  it('rellena cliente, negocio y teléfono', () => {
    const p = leadToProjectPrefill(lead())
    expect(p.client_name).toBe('Ana García')
    expect(p.business_name).toBe('Bar La Plaza')
    expect(p.phone).toBe('612 345 678')
  })

  it('la descripción lleva servicio, email, mensaje y detalles en orden', () => {
    const d = leadToProjectPrefill(lead()).description
    expect(d).toContain('QR para reseñas')
    expect(d).toContain('Email: ana@example.com')
    expect(d).toContain('Quiero un QR para que me dejen reseñas.')
    expect(d.indexOf('Plataforma: Google')).toBeLessThan(d.indexOf('¿Dónde usará el QR?: Mesa, Mostrador'))
  })

  it('sin detalles no añade líneas vacías al final', () => {
    const d = leadToProjectPrefill(lead({ details: [] })).description
    expect(d.endsWith('reseñas.')).toBe(true)
  })
})

describe('contacto', () => {
  it('añade el prefijo 34 a los números españoles de 9 cifras', () => {
    expect(waNumber('612 345 678')).toBe('34612345678')
    expect(waNumber('+34 612 345 678')).toBe('34612345678')
    expect(waNumber('0034612345678')).toBe('34612345678')
  })

  it('respeta otros prefijos y descarta números imposibles', () => {
    expect(waNumber('+44 7911 123456')).toBe('447911123456')
    expect(waNumber('123')).toBeNull()
    expect(waNumber('')).toBeNull()
    expect(whatsappLink('')).toBeNull()
  })

  it('codifica el texto de WhatsApp', () => {
    expect(whatsappLink('612345678', 'Hola, Ana')).toBe('https://wa.me/34612345678?text=Hola%2C%20Ana')
  })

  it('tel: solo con dígitos y + inicial', () => {
    expect(telHref('+34 (612) 345-678')).toBe('tel:+34612345678')
  })

  it('título: negocio o, si falta, nombre', () => {
    expect(leadTitle({ name: 'Ana', business: '  ' })).toBe('Ana')
    expect(leadTitle({ name: 'Ana', business: 'Bar' })).toBe('Bar')
  })
})
