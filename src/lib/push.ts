/** Avisos push de solicitudes nuevas: suscripción del dispositivo y registro en Supabase. */
import { supabase } from './supabase'
import { detectPlatform, isStandalone } from './pwa'

const VAPID_PUBLIC_KEY = ((import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined) ?? '').trim()

export type PushState =
  /** El navegador no soporta push, falta la clave VAPID o estamos en desarrollo (sin service worker) */
  | 'unsupported'
  /** iPhone/iPad sin instalar: push solo funciona con la app en la pantalla de inicio */
  | 'needs-install'
  /** El usuario bloqueó las notificaciones en el navegador */
  | 'blocked'
  | 'off'
  | 'on'

/** Clave VAPID (base64url) → bytes, como pide pushManager.subscribe */
export function urlBase64ToUint8Array(base64url: string): Uint8Array {
  const base64 = (base64url + '='.repeat((4 - (base64url.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  return Uint8Array.from(raw, (c) => c.charCodeAt(0))
}

/** Nombre legible del dispositivo, para reconocerlo en la base de datos */
export function deviceLabel(ua: string, platform: ReturnType<typeof detectPlatform>): string {
  const device = platform === 'ios' ? (/iPad|Macintosh/.test(ua) ? 'iPad' : 'iPhone') : platform === 'android' ? 'Android' : /Windows/.test(ua) ? 'Windows' : /Mac/.test(ua) ? 'Mac' : 'Ordenador'
  const browser = /Edg\//.test(ua) ? 'Edge' : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) || /CriOS\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'Navegador'
  return `${device} · ${browser}`
}

const supported = () =>
  import.meta.env.PROD && !!VAPID_PUBLIC_KEY &&
  'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window

async function registration() {
  return navigator.serviceWorker.ready
}

/** Guarda (o actualiza) la suscripción del dispositivo en Supabase */
async function save(sub: PushSubscription) {
  const json = sub.toJSON()
  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      endpoint: sub.endpoint,
      p256dh: json.keys?.p256dh ?? '',
      auth: json.keys?.auth ?? '',
      device_label: deviceLabel(navigator.userAgent, detectPlatform()),
    },
    { onConflict: 'endpoint' },
  )
  if (error) throw new Error(error.message)
}

export async function getPushState(): Promise<PushState> {
  if (detectPlatform() === 'ios' && !isStandalone()) return 'needs-install'
  if (!supported()) return 'unsupported'
  if (Notification.permission === 'denied') return 'blocked'
  const sub = await (await registration()).pushManager.getSubscription()
  if (!sub || Notification.permission !== 'granted') return 'off'
  // Mantiene la fila al día por si se borró (p. ej. tras un 410 del servicio push)
  save(sub).catch(() => {})
  return 'on'
}

export async function enablePush(): Promise<PushState> {
  if (!supported()) return 'unsupported'
  const permission = await Notification.requestPermission()
  if (permission === 'denied') return 'blocked'
  if (permission !== 'granted') return 'off'
  const reg = await registration()
  // Una suscripción antigua (p. ej. con otra clave VAPID) impide crear la nueva
  await (await reg.pushManager.getSubscription())?.unsubscribe()
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
  })
  await save(sub)
  return 'on'
}

export async function disablePush(): Promise<PushState> {
  if (!supported()) return 'unsupported'
  const sub = await (await registration()).pushManager.getSubscription()
  if (sub) {
    await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
    await sub.unsubscribe()
  }
  return 'off'
}
