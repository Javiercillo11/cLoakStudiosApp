import { createClient } from '@supabase/supabase-js'

// En GitHub Actions un secret inexistente llega como cadena vacía, no undefined.
const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() || ''
const key = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() || ''

export const isConfigured = Boolean(url && key)

export const supabase = createClient(url || 'http://localhost', key || 'missing-key', {
  auth: { persistSession: true, autoRefreshToken: true },
})
