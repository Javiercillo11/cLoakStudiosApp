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
    <Modal open={open} title={title} onClose={onCancel}>
      <p className="mb-6 text-sm text-muted">{message}</p>
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="btn-ghost">Cancelar</button>
        <button onClick={onConfirm} className="btn-danger">Eliminar</button>
      </div>
    </Modal>
  )
}
