import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Trash2 } from 'lucide-react'
import type { Note, NoteColor } from '../lib/types'
import { NOTE_COLORS } from '../lib/noteColors'
import { formatDate } from '../lib/format'
import { Modal } from './Modal'
import { UnsavedChangesDialog } from './UnsavedChangesDialog'

interface Props {
  note: Note | null
  onSave: (values: Partial<Note>) => Promise<void>
  onDelete: () => void
  onClose: () => void
}

/** Nota abierta a pantalla completa (móvil): se lee entera y se puede editar. */
export function NoteDialog({ note, onSave, onDelete, onClose }: Props) {
  const [text, setText] = useState('')
  const [color, setColor] = useState<NoteColor>('violet')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [askSave, setAskSave] = useState(false)
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!note) return
    setText(note.content)
    setColor(note.color)
    setError(null)
    setAskSave(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note?.id])

  // el campo crece con el texto: la nota se lee completa, sin scroll interno
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [text, note])

  const dirty = !!note && (text !== note.content || color !== note.color)
  const requestClose = () => (dirty ? setAskSave(true) : onClose())

  const save = async () => {
    if (!note) return
    setSaving(true)
    try {
      await onSave({ content: text, color })
      onClose()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const c = NOTE_COLORS[color] ?? NOTE_COLORS.violet

  return (
    <Modal open={!!note} title="Nota" onClose={requestClose}>
      {note && (
        <>
          <p className="mb-2 font-mono text-xs text-muted">{formatDate(note.created_at)}</p>
          <div className={`rounded-card border p-4 transition-colors ${c.card}`}>
            <label htmlFor="note-dialog-text" className="sr-only">Contenido de la nota</label>
            <textarea id="note-dialog-text" ref={ref} rows={4} placeholder="Escribe algo…"
              className="block min-h-24 w-full resize-none overflow-hidden bg-transparent text-base leading-relaxed text-ghost [overflow-wrap:anywhere] placeholder:text-muted/60 focus:outline-none"
              value={text} onChange={(e) => setText(e.target.value)} />
          </div>

          <div className="mt-3 flex items-center gap-2">
            <span className="label mb-0">Color</span>
            <div className="flex" role="radiogroup" aria-label="Color">
              {(Object.keys(NOTE_COLORS) as NoteColor[]).map((k) => (
                <button type="button" key={k} role="radio" aria-checked={color === k} aria-label={NOTE_COLORS[k].label}
                  onClick={() => setColor(k)} className="group grid h-10 w-9 place-items-center">
                  <span className={`h-5 w-5 rounded-full ${NOTE_COLORS[k].swatch} ${color === k ? 'ring-2 ring-ghost ring-offset-2 ring-offset-carbon' : 'opacity-60 group-hover:opacity-100'}`} />
                </button>
              ))}
            </div>
          </div>

          {error && <p className="mt-3 text-sm text-danger" role="alert">{error}</p>}
          <div className="mt-6 flex items-center gap-2">
            <button type="button" onClick={onDelete} className="btn-icon -ml-2 hover:text-danger" aria-label="Eliminar nota" title="Eliminar nota">
              <Trash2 size={18} />
            </button>
            <button type="button" onClick={requestClose} className="btn-ghost ml-auto">Cerrar</button>
            <button type="button" onClick={save} className="btn-primary" disabled={!dirty || saving}>
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
          </div>

          <UnsavedChangesDialog open={askSave} saving={saving}
            onCancel={() => setAskSave(false)}
            onDiscard={() => { setAskSave(false); onClose() }}
            onSave={() => { setAskSave(false); save() }} />
        </>
      )}
    </Modal>
  )
}
