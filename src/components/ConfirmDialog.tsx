import { Modal } from './Modal'

interface Props {
  open: boolean
  title: string
  message: string
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({ open, title, message, onConfirm, onCancel }: Props) {
  return (
    <Modal open={open} size="sm" title={title} onClose={onCancel}>
      <p className="mb-6 whitespace-pre-line text-sm text-muted [overflow-wrap:anywhere]">{message}</p>
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="btn-ghost flex-1 sm:flex-none">Cancelar</button>
        <button onClick={onConfirm} className="btn-danger flex-1 sm:flex-none">Eliminar</button>
      </div>
    </Modal>
  )
}
