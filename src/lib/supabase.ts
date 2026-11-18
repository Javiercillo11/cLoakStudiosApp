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

export const supabase = createClient(url || 'http://localhost', key || 'missing-key', {
  auth: { persistSession: true, autoRefreshToken: true },
})
