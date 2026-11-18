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
  /**
   * 'form' (por defecto): formularios y vistas. En ordenador todos tienen el mismo ancho y alto.
   * 'sm': confirmaciones y avisos breves, ajustados a su contenido.
   */
  size?: 'form' | 'sm'
}

export function Modal({ open, title, onClose, children, size = 'form' }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const openRef = useRef(open)
  openRef.current = open

  // Mientras el modal está abierto, la página de fondo no se puede desplazar (también en iOS)
  useEffect(() => {
    if (!open) return
    return lockScroll()
  }, [open])

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) {
      d.showModal()
      // showModal enfoca el primer botón (la X) y se ve marcado. Si nada pide el foco (autoFocus),
      // se enfoca el propio diálogo: el teclado sigue funcionando y la X no aparece resaltada.
      if (document.activeElement === closeRef.current) d.focus({ preventScroll: true })
    }
    if (!open && d.open) d.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      tabIndex={-1}
      // Escape: no se cierra solo; decide quien controla `open` (p. ej. preguntar si guardar cambios)
      // React propaga cancel/close de diálogos anidados al padre: solo se atienden los propios
      onCancel={(e) => { if (e.target !== e.currentTarget) return; e.preventDefault(); onClose() }}
      onClose={(e) => {
        if (e.target !== e.currentTarget) return
        // Cierre nativo que no venía de `open` (algunos navegadores ignoran preventDefault en Escape repetido):
        // se avisa y, si el modal debe seguir abierto, se vuelve a mostrar.
        if (!openRef.current) return
        onClose()
        requestAnimationFrame(() => {
          const d = ref.current
          if (d && openRef.current && !d.open) d.showModal()
        })
      }}
      onClick={(e) => e.target === ref.current && onClose()}
      className={`${size === 'form'
        ? 'sm:w-[min(44rem,calc(100vw-2rem))] lg:h-[min(88dvh,54rem)] lg:w-[min(60rem,calc(100vw-4rem))]'
        : 'sm:w-[min(32rem,calc(100vw-2rem))]'} m-auto max-h-[calc(100dvh-2rem)] outline-none focus-visible:ring-0 w-[calc(100vw-2rem)] max-w-full overflow-hidden overscroll-none rounded-card border border-white/10 bg-carbon p-0 text-ghost backdrop:bg-black/70 sm:max-h-[min(90dvh,56rem)]`}
    >
      {open && (
        <div className="flex h-full max-h-[inherit] flex-col">
          <div className="flex items-start justify-between gap-3 px-5 pb-4 pt-5 sm:px-6 sm:pt-6">
            <h2 className="line-clamp-2 min-w-0 pt-1.5 text-xl font-semibold">{title}</h2>
            <button ref={closeRef} onClick={onClose} className="btn-icon -mr-2 shrink-0" aria-label="Cerrar">
              <X size={18} />
            </button>
          </div>
          <div className="scroll-thin min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-5 pb-5 sm:px-6 sm:pb-6">
            {children}
          </div>
        </div>
      )}
    </dialog>
  )
}
