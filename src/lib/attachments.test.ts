import { describe, expect, it, vi } from 'vitest'
vi.mock('./supabase', () => ({ supabase: {} }))
import { MAX_FILE_BYTES, validateFile } from './attachments'

const f = (name: string, type: string, size = 1000) => ({ name, type, size })

describe('validateFile', () => {
  it('acepta imágenes, PDF y Excel', () => {
    expect(validateFile(f('foto.JPG', 'image/jpeg'))).toMatchObject({ ok: true, kind: 'image' })
    expect(validateFile(f('a.jpeg', 'image/jpeg'))).toMatchObject({ ok: true, mime: 'image/jpeg' })
    expect(validateFile(f('a.png', 'image/png'))).toMatchObject({ ok: true })
    expect(validateFile(f('a.webp', 'image/webp'))).toMatchObject({ ok: true })
    expect(validateFile(f('doc.pdf', 'application/pdf'))).toMatchObject({ ok: true, kind: 'pdf' })
    expect(validateFile(f('t.xls', 'application/vnd.ms-excel'))).toMatchObject({ ok: true, kind: 'excel' })
    expect(validateFile(f('t.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'))).toMatchObject({ ok: true })
  })
  it('MIME genérico: decide la extensión y usa el MIME canónico', () => {
    expect(validateFile(f('t.xls', ''))).toMatchObject({ ok: true, mime: 'application/vnd.ms-excel' })
    expect(validateFile(f('t.xlsx', 'application/octet-stream'))).toMatchObject({ ok: true })
  })
  it('rechaza otras extensiones y MIME que no cuadra', () => {
    expect(validateFile(f('virus.exe', 'application/x-msdownload')).ok).toBe(false)
    expect(validateFile(f('nota.txt', 'text/plain')).ok).toBe(false)
    expect(validateFile(f('sinextension', '')).ok).toBe(false)
    expect(validateFile(f('falso.pdf', 'text/html')).ok).toBe(false)
  })
  it('rechaza vacíos y demasiado grandes', () => {
    expect(validateFile(f('a.pdf', 'application/pdf', 0)).ok).toBe(false)
    expect(validateFile(f('a.pdf', 'application/pdf', MAX_FILE_BYTES + 1)).ok).toBe(false)
    expect(validateFile(f('a.pdf', 'application/pdf', MAX_FILE_BYTES)).ok).toBe(true)
  })
})
