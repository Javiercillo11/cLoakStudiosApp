import { createClient } from '@supabase/supabase-js'

// En GitHub Actions un secret inexistente llega como cadena vacía, no undefined.
const rawUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() || ''
const key = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() || ''

/** Solo el origen (https://xxx.supabase.co): tolera URLs pegadas con /rest/v1/ o barra final. */
function toOrigin(value: string) {
  try {
    return new URL(value).origin
  } catch {
    return ''
  }
}

const url = toOrigin(rawUrl)

export const isConfigured = Boolean(url && key)

const REMEMBER_KEY = 'cloak-remember'
const EMAIL_KEY = 'cloak-remember-email'

function safe<T>(fn: () => T, fallback: T): T {
  try {
    return fn()
  } catch {
    return fallback
  }
}

/** "Recuérdame": true (por defecto) guarda la sesión en localStorage; false, solo hasta cerrar el navegador. */
export function getRemember() {
  return safe(() => localStorage.getItem(REMEMBER_KEY) !== '0', true)
}

export function getRememberedEmail() {
  return safe(() => localStorage.getItem(EMAIL_KEY) ?? '', '')
}

/** Se llama antes de iniciar sesión, para que el token se guarde en el almacén elegido. */
export function setRemember(remember: boolean, email: string) {
  safe(() => {
    localStorage.setItem(REMEMBER_KEY, remember ? '1' : '0')
    if (remember) localStorage.setItem(EMAIL_KEY, email)
    else localStorage.removeItem(EMAIL_KEY)
  }, undefined)
}

/** Almacén de sesión que alterna entre localStorage y sessionStorage según "Recuérdame". */
const authStorage = {
  getItem: (k: string) =>
    safe(() => localStorage.getItem(k) ?? sessionStorage.getItem(k), null),
  setItem: (k: string, v: string) =>
    safe(() => {
      const [target, other] = getRemember() ? [localStorage, sessionStorage] : [sessionStorage, localStorage]
      target.setItem(k, v)
      other.removeItem(k)
    }, undefined),
  removeItem: (k: string) =>
    safe(() => {
      localStorage.removeItem(k)
      sessionStorage.removeItem(k)
    }, undefined),
}

export const supabase = createClient(url || 'http://localhost', key || 'missing-key', {
  auth: { persistSession: true, autoRefreshToken: true, storage: authStorage },
})
