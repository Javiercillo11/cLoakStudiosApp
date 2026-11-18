import { useEffect, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'

let locks = 0
let savedY = 0

function lockScroll() {
  if (locks++ === 0) {
    savedY = window.scrollY
    const b = document.body.style
    b.position = 'fixed'
    b.top = `-${savedY}px`
    b.left = '0'
    b.right = '0'
    b.overflow = 'hidden'
  }
  return () => {
    if (--locks === 0) {
      const b = document.body.style
      b.position = b.top = b.left = b.right = b.overflow = ''
      window.scrollTo(0, savedY)
    }
  }
}

interface Props {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  /** Ancho del diálogo: 'md' (formularios) o 'lg' (vistas de detalle). */
  size?: 'md' | 'lg'
}

export function Modal({ open, title, onClose, children, size = 'md' }: Props) {
  const ref = useRef<HTMLDialogElement>(null)

  // Mientras el modal está abierto, la página de fondo no se puede desplazar (también en iOS)
  useEffect(() => {
    if (!open) return
    return lockScroll()
  }, [open])

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
      className={`${size === 'lg' ? 'sm:w-[min(44rem,calc(100vw-2rem))]' : 'sm:w-[min(32rem,calc(100vw-2rem))]'} m-auto max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-full overflow-hidden overscroll-none rounded-card border border-white/10 bg-carbon p-0 text-ghost backdrop:bg-black/70 sm:max-h-[min(90dvh,56rem)]`}
    >
      {open && (
        <div className="flex max-h-[inherit] flex-col">
          <div className="flex items-start justify-between gap-3 px-5 pb-4 pt-5 sm:px-6 sm:pt-6">
            <h2 className="line-clamp-2 min-w-0 pt-1.5 text-xl font-semibold">{title}</h2>
            <button onClick={onClose} className="btn-icon -mr-2 shrink-0" aria-label="Cerrar">
              <X size={18} />
            </button>
          </div>
          <div className="overflow-y-auto overscroll-contain px-5 pb-5 sm:px-6 sm:pb-6">
            {children}
          </div>
        </div>
      )}
    </dialog>
  )
}
