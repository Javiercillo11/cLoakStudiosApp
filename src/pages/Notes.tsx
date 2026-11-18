import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useTable } from '../hooks/useTable'
import type { Note, NoteColor } from '../lib/types'
import { formatDate } from '../lib/format'
import { PageHeader } from '../components/PageHeader'
import { StateMessage } from '../components/StateMessage'

const COLORS: Record<NoteColor, { card: string; swatch: string; label: string }> = {
  violet: { card: 'bg-violet/15 border-violet/30', swatch: 'bg-violet', label: 'Violeta' },
  lavender: { card: 'bg-violet-soft/10 border-violet-soft/25', swatch: 'bg-violet-soft', label: 'Lavanda' },
  amber: { card: 'bg-amber-400/10 border-amber-400/25', swatch: 'bg-amber-400', label: 'Ámbar' },
  emerald: { card: 'bg-emerald-400/10 border-emerald-400/25', swatch: 'bg-emerald-400', label: 'Verde' },
  rose: { card: 'bg-rose-400/10 border-rose-400/25', swatch: 'bg-rose-400', label: 'Rosa' },
  sky: { card: 'bg-sky-400/10 border-sky-400/25', swatch: 'bg-sky-400', label: 'Azul' },
}

function NoteCard({ note, onSave, onDelete }: {
  note: Note
  onSave: (values: Partial<Note>) => Promise<void>
  onDelete: () => void
}) {
  const [text, setText] = useState(note.content)
  const c = COLORS[note.color] ?? COLORS.violet
  return (
    <article className={`flex min-h-48 flex-col rounded-card border p-4 transition-colors ${c.card}`}>
      <textarea
        aria-label="Contenido de la nota"
        placeholder="Escribe algo…"
        className="flex-1 resize-none bg-transparent text-sm leading-relaxed text-ghost placeholder:text-muted/60 focus:outline-none"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => text !== note.content && onSave({ content: text })}
      />
      <div className="mt-3 flex items-center justify-between gap-2">
        <div className="flex gap-1.5" role="group" aria-label="Color">
          {(Object.keys(COLORS) as NoteColor[]).map((k) => (
            <button key={k} onClick={() => onSave({ color: k })} aria-label={COLORS[k].label} aria-pressed={note.color === k}
              className={`h-4 w-4 rounded-full ${COLORS[k].swatch} ${note.color === k ? 'ring-2 ring-ghost ring-offset-2 ring-offset-carbon' : 'opacity-60 hover:opacity-100'}`} />
          ))}
        </div>
        <div className="flex items-center gap-1">
          <span className="font-mono text-[11px] text-muted">{formatDate(note.created_at)}</span>
          <button onClick={onDelete} className="btn-ghost p-1.5 hover:text-danger" aria-label="Eliminar nota"><Trash2 size={14} /></button>
        </div>
      </div>
    </article>
  )
}

export function Notes() {
  const { rows, loading, error, insert, update, remove } = useTable<Note>('notes')
  const [busy, setBusy] = useState(false)

  const add = async () => {
    setBusy(true)
    try { await insert({ content: '', color: 'violet' }) } finally { setBusy(false) }
  }

  return (
    <>
      <PageHeader eyebrow="Ideas y recordatorios" title="Notas"
        action={<button onClick={add} disabled={busy} className="btn-primary"><Plus size={16} /> Nueva nota</button>} />
      {error ? (
        <StateMessage title="No se pudieron cargar las notas" tone="error">{error}</StateMessage>
      ) : loading ? (
        <StateMessage title="Cargando…" />
      ) : rows.length === 0 ? (
        <StateMessage title="Sin notas">Apunta ideas, tareas o recordatorios rápidos.</StateMessage>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {rows.map((n) => (
            <NoteCard key={n.id} note={n} onSave={(v) => update(n.id, v)} onDelete={() => remove(n.id)} />
          ))}
        </div>
      )}
    </>
  )
}
