import { useEffect, useState } from 'react'
import { Bell, BellOff, BellRing, Loader2 } from 'lucide-react'
import { disablePush, enablePush, getPushState, type PushState } from '../lib/push'

const HINT: Partial<Record<PushState, string>> = {
  'needs-install': 'Para recibir avisos en el iPhone, instala la app en la pantalla de inicio y ábrela desde allí.',
  blocked: 'Las notificaciones están bloqueadas para esta app. Actívalas en los ajustes del navegador o del móvil.',
  unsupported: 'Este navegador no permite avisos push.',
}

/** Activa o desactiva los avisos de solicitudes nuevas en este dispositivo */
export function PushToggle() {
  const [state, setState] = useState<PushState | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getPushState().then(setState).catch(() => setState('unsupported'))
  }, [])

  if (state === null) return null

  const toggle = async () => {
    setBusy(true)
    setError(null)
    try {
      setState(state === 'on' ? await disablePush() : await enablePush())
    } catch (err) {
      setError(`No se pudo ${state === 'on' ? 'desactivar' : 'activar'} los avisos: ${(err as Error).message}`)
    } finally {
      setBusy(false)
    }
  }

  const hint = HINT[state]
  const on = state === 'on'
  const canToggle = state === 'on' || state === 'off'

  return (
    <div className="flex flex-col items-start gap-1.5 sm:items-end">
      {canToggle ? (
        <button type="button" onClick={toggle} disabled={busy} aria-pressed={on}
          className={on ? 'btn-ghost border border-success/30 text-success hover:text-success' : 'btn-ghost border border-white/10'}>
          {busy ? <Loader2 size={16} className="animate-spin" /> : on ? <BellRing size={16} /> : <Bell size={16} />}
          {on ? 'Avisos activados' : 'Activar avisos en este dispositivo'}
        </button>
      ) : (
        <p className="flex max-w-xs items-start gap-2 text-xs text-muted sm:text-right">
          <BellOff size={14} className="mt-0.5 shrink-0" aria-hidden /> {hint}
        </p>
      )}
      {on && <p className="text-xs text-muted">Pulsa para desactivarlos.</p>}
      {error && <p role="alert" className="max-w-xs text-xs text-danger sm:text-right">{error}</p>}
    </div>
  )
}
