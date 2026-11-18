import { useEffect } from 'react'
import { Modal } from './Modal'

interface Props {
  open: boolean
  saving?: boolean
  onSave: () => void
  onDiscard: () => void
  onCancel: () => void
}

/** Aviso al salir de un formulario con cambios sin guardar. */
export function UnsavedChangesDialog({ open, saving, onSave, onDiscard, onCancel }: Props) {
  return (
    <Modal open={open} size="sm" title="Cambios sin guardar" onClose={onCancel}>
      <p className="mb-6 text-sm text-muted">Has modificado el formulario. ¿Quieres guardar los cambios antes de salir?</p>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" onClick={onCancel} className="btn-ghost">Seguir editando</button>
        <button type="button" onClick={onDiscard} className="btn-danger">Descartar</button>
        <button type="button" onClick={onSave} className="btn-primary" disabled={saving} autoFocus>Guardar</button>
      </div>
    </Modal>
  )
}

/** Mientras haya cambios sin guardar, el navegador avisa al recargar o cerrar la pestaña. */
export function useWarnOnUnload(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [dirty])
}
