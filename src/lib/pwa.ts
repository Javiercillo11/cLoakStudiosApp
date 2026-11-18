/** Instalación como PWA: registro del service worker y captura del aviso de instalación del navegador. */

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let deferred: BeforeInstallPromptEvent | null = null
const listeners = new Set<() => void>()
const notify = () => listeners.forEach((fn) => fn())

export function initPwa() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault() // lo lanzamos nosotros desde el pop-up
    deferred = e as BeforeInstallPromptEvent
    notify()
  })
  window.addEventListener('appinstalled', () => {
    deferred = null
    notify()
  })
  // Solo en producción: en desarrollo una caché del SW mostraría código antiguo
  if (import.meta.env.PROD && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {})
    })
  }
}

export function subscribeInstall(fn: () => void) {
  listeners.add(fn)
  return () => { listeners.delete(fn) }
}

export const canPromptInstall = () => deferred !== null

/** Abre el diálogo nativo de instalación. Devuelve true si el usuario aceptó. */
export async function promptInstall() {
  if (!deferred) return false
  const e = deferred
  deferred = null
  await e.prompt()
  const { outcome } = await e.userChoice
  notify()
  return outcome === 'accepted'
}

export function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

export type Platform = 'ios' | 'android' | 'desktop'
export function detectPlatform(): Platform {
  const ua = navigator.userAgent
  // iPadOS se presenta como Mac con pantalla táctil
  if (/iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return 'ios'
  if (/Android/.test(ua)) return 'android'
  return 'desktop'
}
