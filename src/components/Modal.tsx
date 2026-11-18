import { useEffect, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'

interface Props {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
}

export function Modal({ open, title, onClose, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className="w-[min(32rem,calc(100vw-2rem))] rounded-card border border-white/10 bg-carbon p-0 text-ghost backdrop:bg-black/70"
    >
      {open && (
        <div className="p-6">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-xl font-semibold">{title}</h2>
            <button onClick={onClose} className="btn-ghost p-2" aria-label="Cerrar">
              <X size={18} />
            </button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  )
}
