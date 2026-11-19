import { describe, expect, it } from 'vitest'
import { isGone, leadNotification, safeEqual } from './message'

describe('leadNotification', () => {
  it('título con el servicio y cuerpo con nombre y negocio', () => {
    expect(leadNotification({ id: 'l1', user_id: 'u', service: 'qr', name: 'Ana García ', business: 'Bar La Plaza' })).toEqual({
      title: 'Nueva solicitud · QR para reseñas',
      body: 'Ana García — Bar La Plaza',
      tag: 'lead-l1',
      path: '#/solicitudes/l1',
    })
  })

  it('sin negocio solo el nombre; servicio desconocido como «Otro»', () => {
    const m = leadNotification({ id: 'l2', user_id: 'u', service: 'raro', name: 'Luis', business: '  ' })
    expect(m.body).toBe('Luis')
    expect(m.title).toBe('Nueva solicitud · Otro')
  })
})

describe('utilidades', () => {
  it('safeEqual', () => {
    expect(safeEqual('abc', 'abc')).toBe(true)
    expect(safeEqual('abc', 'abd')).toBe(false)
    expect(safeEqual('abc', 'abcd')).toBe(false)
    expect(safeEqual('', 'x')).toBe(false)
  })

  it('isGone: solo 404 y 410', () => {
    expect(isGone(410)).toBe(true)
    expect(isGone(404)).toBe(true)
    expect(isGone(500)).toBe(false)
    expect(isGone(undefined)).toBe(false)
  })
})
