import { describe, expect, it } from 'vitest'
import { deviceLabel, urlBase64ToUint8Array } from './push'

describe('urlBase64ToUint8Array', () => {
  it('decodifica base64url sin relleno', () => {
    expect(Array.from(urlBase64ToUint8Array('AQID_-8'))).toEqual([1, 2, 3, 255, 239])
  })

  it('una clave VAPID pública ocupa 65 bytes y empieza por 0x04', () => {
    const key = 'BFywFGP32DVU7XQnsYm2DNI24VrfrA8_sSfVmy8NW3-BWS-wnUPV-qX0MBs4WfofUwONJXX0XDhftZ3627XZ8j8'
    const bytes = urlBase64ToUint8Array(key)
    expect(bytes.length).toBe(65)
    expect(bytes[0]).toBe(4)
  })
})

describe('deviceLabel', () => {
  it('reconoce los dispositivos habituales', () => {
    expect(deviceLabel('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1', 'ios')).toBe('iPhone · Safari')
    expect(deviceLabel('Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 Chrome/131.0 Mobile Safari/537.36', 'android')).toBe('Android · Chrome')
    expect(deviceLabel('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0 Safari/537.36 Edg/131.0', 'desktop')).toBe('Windows · Edge')
  })
})
