// Edge Function: envía un aviso push a los dispositivos del propietario con cada solicitud nueva.
//
// La llama un Database Webhook de Supabase en INSERT de public.leads, con la cabecera
// x-webhook-secret = LEAD_WEBHOOK_SECRET. Se despliega sin verificación JWT (--no-verify-jwt):
// la autenticación es ese secreto.
//
// Secretos (Edge Functions → Secrets): VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT, LEAD_WEBHOOK_SECRET.
// SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY los proporciona Supabase automáticamente.

import webpush from 'npm:web-push@3.6.7'
import { createClient } from 'npm:@supabase/supabase-js@2.45.4'
import { isGone, leadNotification, safeEqual, type LeadRecord } from './message.ts'

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

function env(name: string): string {
  const value = Deno.env.get(name)
  if (!value) throw new Error(`Falta el secreto ${name}`)
  return value
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  const secret = Deno.env.get('LEAD_WEBHOOK_SECRET') ?? ''
  if (!secret || !safeEqual(req.headers.get('x-webhook-secret') ?? '', secret)) return json({ error: 'unauthorized' }, 401)

  const payload = await req.json().catch(() => null)
  const record = payload?.record as LeadRecord | undefined
  if (payload?.type !== 'INSERT' || payload?.table !== 'leads' || !record?.id || !record.user_id) {
    return json({ skipped: true })
  }

  try {
    webpush.setVapidDetails(env('VAPID_SUBJECT'), env('VAPID_PUBLIC_KEY'), env('VAPID_PRIVATE_KEY'))
    const admin = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const { data: subs, error } = await admin
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth')
      .eq('user_id', record.user_id)
    if (error) throw new Error(error.message)
    if (!subs?.length) return json({ sent: 0, removed: 0, failed: 0 })

    const message = JSON.stringify(leadNotification(record))
    const results = await Promise.all(
      subs.map(async (s) => {
        try {
          await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, message, {
            TTL: 60 * 60 * 24, // si el móvil está apagado, el aviso espera hasta un día
            urgency: 'high',
          })
          return { id: s.id, ok: true, gone: false }
        } catch (err) {
          const statusCode = (err as { statusCode?: number }).statusCode
          console.warn('[notify-new-lead] envío fallido', statusCode, (err as Error).message)
          return { id: s.id, ok: false, gone: isGone(statusCode) }
        }
      }),
    )

    const sent = results.filter((r) => r.ok).map((r) => r.id)
    const gone = results.filter((r) => r.gone).map((r) => r.id)
    if (gone.length) await admin.from('push_subscriptions').delete().in('id', gone)
    if (sent.length) await admin.from('push_subscriptions').update({ last_used_at: new Date().toISOString() }).in('id', sent)

    return json({ sent: sent.length, removed: gone.length, failed: results.length - sent.length - gone.length })
  } catch (err) {
    console.error('[notify-new-lead]', (err as Error).message)
    return json({ error: (err as Error).message }, 500)
  }
})
