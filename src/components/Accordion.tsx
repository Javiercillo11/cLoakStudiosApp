import type { ReactNode } from 'react'
import { AlertCircle, ChevronDown } from 'lucide-react'

interface Props {
  id: string
  title: string
  icon?: ReactNode
  open: boolean
  onToggle: () => void
  /** Texto breve a la derecha del título (p. ej. "100 %", "3 ficheros") */
  badge?: ReactNode
  /** Marca la sección con error de validación */
  error?: boolean
  children: ReactNode
}

/**
 * Sección desplegable con animación de apertura/cierre. El contenido NO se desmonta:
 * al contraer una sección no se pierde nada de lo escrito.
 */
export function AccordionSection({ id, title, icon, open, onToggle, badge, error, children }: Props) {
  return (
    <section className={`rounded-card border transition-colors ${error ? 'border-danger/50' : 'border-white/10'}`}>
      <h3>
        <button type="button" id={`${id}-header`} aria-expanded={open} aria-controls={`${id}-panel`} onClick={onToggle}
          className="flex min-h-12 w-full items-center gap-3 rounded-card px-3 py-3 sm:px-4 text-left transition-colors hover:bg-white/[0.03]">
          {icon && <span className={`shrink-0 ${error ? 'text-danger' : 'text-violet-soft'}`}>{icon}</span>}
          <span className="min-w-0 flex-1 truncate text-sm font-semibold">{title}</span>
          {error && (
            <span className="flex shrink-0 items-center gap-1 text-xs text-danger">
              <AlertCircle size={14} /> <span className="hidden min-[400px]:inline">Revisar</span>
            </span>
          )}
          {!error && badge && <span className="shrink-0 font-mono text-xs text-muted">{badge}</span>}
          <ChevronDown size={18} aria-hidden
            className={`shrink-0 text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      </h3>
      {/* Apertura suave: la fila del grid pasa de 0fr a 1fr. Cerrada, "inert" la saca del foco y del lector de pantalla. */}
      <div id={`${id}-panel`} role="region" aria-labelledby={`${id}-header`}
        {...(open ? {} : { inert: '' })}
        className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none ${
          open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
        <div className="min-h-0 overflow-hidden">
          <div className="border-t border-white/5 p-3 sm:p-4">
            {children}
          </div>
        </div>
      </div>
    </section>
  )
}

/** Campo con mensaje de error accesible debajo */
export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null
  return <p id={id} className="mt-1 text-xs text-danger">{message}</p>
}
