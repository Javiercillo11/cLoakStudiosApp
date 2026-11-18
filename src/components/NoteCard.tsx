import { useLayoutEffect, useRef, useState } from 'react'
import { Briefcase, Check, Trash2 } from 'lucide-react'
import type { Note, NoteColor } from '../lib/types'
import { NOTE_COLORS } from '../lib/noteColors'
import { formatDate } from '../lib/format'

interface Props {
  note: Note
  /** Nombre del proyecto asociado (se muestra arriba si se indica) */
  projectName?: string
  /** Versión más baja, para listas dentro de un modal */
  compact?: boolean
  onSave: (values: Partial<Note>) => Promise<void>
  onDelete: () => void
}

/** Nota editable: el texto se guarda al salir del campo; color y borrado al instante. */
export function NoteCard({ note, projectName, compact = false, onSave, onDelete }: Props) {
  const [text, setText] = useState(note.content)
  const [saved, setSaved] = useState(false)
  const ref = useRef<HTMLTextAreaElement>(null)
  const c = NOTE_COLORS[note.color] ?? NOTE_COLORS.violet

  // el campo crece con el texto, sin scroll interno
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [text])

  const commit = async () => {
    if (text === note.content) return
    await onSave({ content: text })
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  return (
    <article className={`flex flex-col rounded-card border p-4 transition-colors ${compact ? 'min-h-28' : 'min-h-36 sm:min-h-48'} ${c.card}`}>
      {projectName && (
        <p className="mb-2 flex items-center gap-1.5 truncate text-xs font-medium text-ghost/80" title={projectName}>
          <Briefcase size={12} className="shrink-0 text-violet-soft" />
          <span className="truncate">{projectName}</span>
        </p>
      )}
      <textarea
        ref={ref}
        aria-label="Contenido de la nota"
        placeholder="Escribe algo…"
        rows={compact ? 2 : 3}
        className="shrink-0 grow resize-none overflow-hidden bg-transparent text-base leading-relaxed text-ghost [overflow-wrap:anywhere] placeholder:text-muted/60 focus:outline-none sm:text-sm"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
      />
      <div className="-mb-2 mt-2 flex items-center justify-between gap-2">
        <div className="-ml-1.5 flex" role="group" aria-label="Color">
          {(Object.keys(NOTE_COLORS) as NoteColor[]).map((k) => (
            <button key={k} type="button" onClick={() => onSave({ color: k })} aria-label={NOTE_COLORS[k].label} aria-pressed={note.color === k}
              className="group grid h-8 w-7 place-items-center sm:h-7 sm:w-6">
              <span className={`h-4 w-4 rounded-full ${NOTE_COLORS[k].swatch} ${note.color === k ? 'ring-2 ring-ghost ring-offset-2 ring-offset-carbon' : 'opacity-60 group-hover:opacity-100'}`} />
            </button>
          ))}
        </div>
        <div className="-mr-2 flex items-center">
          {saved ? (
            <span className="flex items-center gap-1 text-[11px] text-success" role="status"><Check size={12} /> Guardado</span>
          ) : (
            <span className="font-mono text-[11px] text-muted">{formatDate(note.created_at)}</span>
          )}
          <button type="button" onClick={onDelete} className="btn-icon hover:text-danger" aria-label="Eliminar nota"><Trash2 size={15} /></button>
        </div>
      </div>
    </article>
  )
}
