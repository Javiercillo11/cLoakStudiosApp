import { useEffect, useState, type FormEvent } from 'react'
import { AlertTriangle, Trash2 } from 'lucide-react'
import { Modal } from './Modal'

interface Props {
  /** Nombre del proyecto a borrar; null = cerrado */
  name: string | null
  /** Qué más se borra (p. ej. "3 notas y 2 ficheros adjuntos") */
  details: string
  error: string | null
  onConfirm: () => Promise<void>
  onCancel: () => void
}

const normalize = (s: string) => s.trim().replace(/\s+/g, ' ').toLocaleLowerCase('es')

/**
 * Borrado con doble confirmación:
 *  1) aviso de lo que se va a eliminar → «Continuar»
 *  2) hay que escribir el nombre del proyecto para habilitar «Eliminar».
 */
export function DeleteProjectDialog({ name, details, error, onConfirm, onCancel }: Props) {
  const [step, setStep] = useState<1 | 2>(1)
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (name !== null) { setStep(1); setTyped(''); setBusy(false) }
  }, [name])

  const matches = name !== null && normalize(typed) === normalize(name)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!matches || busy) return
    setBusy(true)
    try { await onConfirm() } finally { setBusy(false) }
  }

  return (
    <Modal open={name !== null} size="sm" title="Eliminar proyecto" onClose={onCancel}>
      {step === 1 ? (
        <>
          <div className="mb-6 flex gap-3 rounded-control border border-danger/30 bg-danger/10 p-3 text-sm">
            <AlertTriangle size={18} className="mt-0.5 shrink-0 text-danger" aria-hidden />
            <p className="[overflow-wrap:anywhere]">
              Vas a eliminar el proyecto <strong className="font-semibold">«{name}»</strong> junto con {details}.
              <span className="mt-1 block text-muted">Esta acción no se puede deshacer.</span>
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onCancel} className="btn-ghost flex-1 sm:flex-none">Cancelar</button>
            <button type="button" onClick={() => setStep(2)} className="btn-danger flex-1 sm:flex-none">Continuar</button>
          </div>
        </>
      ) : (
        <form onSubmit={submit} noValidate>
          <label htmlFor="delete-confirm-name" className="mb-2 block text-sm text-muted [overflow-wrap:anywhere]">
            Para confirmar, escribe el nombre del proyecto: <strong className="select-all font-semibold text-ghost">{name}</strong>
          </label>
          <input id="delete-confirm-name" className="input" autoFocus autoComplete="off" spellCheck={false}
            value={typed} onChange={(e) => setTyped(e.target.value)} aria-describedby="delete-confirm-hint" />
          <p id="delete-confirm-hint" className="mt-1.5 text-xs text-muted">
            {matches ? 'Nombre correcto. Ya puedes eliminarlo.' : 'El botón «Eliminar» se habilita cuando el nombre coincide.'}
          </p>
          {error && <p className="mt-3 text-sm text-danger" role="alert">{error}</p>}
          <div className="mt-6 flex justify-end gap-2">
            <button type="button" onClick={onCancel} className="btn-ghost flex-1 sm:flex-none">Cancelar</button>
            <button type="submit" disabled={!matches || busy} className="btn-danger flex-1 sm:flex-none">
              <Trash2 size={16} /> {busy ? 'Eliminando…' : 'Eliminar'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  )
}
