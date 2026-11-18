import { useEffect, useRef } from 'react'
import { Download, X } from 'lucide-react'

interface Props {
  url: string | null
  name: string
  onClose: () => void
  onDownload: () => void
}

/** Vista ampliada de una imagen. Se cierra con X, Escape o clic fuera de la imagen. */
export function ImageLightbox({ url, name, onClose, onDownload }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (url && !d.open) d.showModal()
    if (!url && d.open) d.close()
  }, [url])

  return (
    <dialog ref={ref} onClose={onClose} aria-label={name}
      onClick={(e) => { if (e.target === e.currentTarget || (e.target as HTMLElement).dataset.backdrop) onClose() }}
      className="m-0 h-dvh max-h-none w-screen max-w-none bg-black/90 p-0 text-ghost backdrop:bg-black/80">
      {url && (
        <div data-backdrop="1" className="flex h-full flex-col">
          <div className="flex items-center gap-2 px-4 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))]">
            <p className="min-w-0 flex-1 truncate text-sm">{name}</p>
            <button type="button" onClick={onDownload} className="btn-icon" aria-label={`Descargar ${name}`} title="Descargar">
              <Download size={18} />
            </button>
            <button type="button" onClick={onClose} className="btn-icon" aria-label="Cerrar vista ampliada" autoFocus>
              <X size={20} />
            </button>
          </div>
          <div data-backdrop="1" className="flex min-h-0 flex-1 items-center justify-center p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <img src={url} alt={name} className="max-h-full max-w-full rounded-control object-contain" />
          </div>
        </div>
      )}
    </dialog>
  )
}
