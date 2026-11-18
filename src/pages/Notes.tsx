import { useMemo, useState, type FormEvent } from 'react'
import { Briefcase, Plus, StickyNote, Trash2 } from 'lucide-react'
import { useTable } from '../hooks/useTable'
import type { Note, NoteColor, Project } from '../lib/types'
import { NOTE_COLORS } from '../lib/noteColors'
import { formatDate } from '../lib/format'
import { PageHeader } from '../components/PageHeader'
import { StateMessage } from '../components/StateMessage'
import { Modal } from '../components/Modal'
import { Dropdown } from '../components/Dropdown'

type ProjectRef = Pick<Project, 'id' | 'client_name' | 'business_name' | 'created_at'>

function NoteCard({ note, project, onSave, onDelete }: {
  note: Note
  project?: ProjectRef
  onSave: (values: Partial<Note>) => Promise<void>
  onDelete: () => void
}) {
  const [text, setText] = useState(note.content)
  const c = NOTE_COLORS[note.color] ?? NOTE_COLORS.violet
  return (
    <article className={`flex min-h-36 flex-col rounded-card border p-4 transition-colors sm:min-h-48 ${c.card}`}>
      {project && (
        <p className="mb-2 flex items-center gap-1.5 truncate text-xs font-medium text-ghost/80" title={project.client_name}>
          <Briefcase size={12} className="shrink-0 text-violet-soft" />
          <span className="truncate">{project.client_name}</span>
        </p>
      )}
      <textarea
        aria-label="Contenido de la nota"
        placeholder="Escribe algo…"
        rows={3}
        className="flex-1 resize-none bg-transparent text-base leading-relaxed sm:text-sm text-ghost placeholder:text-muted/60 focus:outline-none"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => text !== note.content && onSave({ content: text })}
      />
      <div className="-mb-2 mt-2 flex items-center justify-between gap-2">
        <div className="-ml-1.5 flex" role="group" aria-label="Color">
          {(Object.keys(NOTE_COLORS) as NoteColor[]).map((k) => (
            <button key={k} onClick={() => onSave({ color: k })} aria-label={NOTE_COLORS[k].label} aria-pressed={note.color === k}
              className="group grid h-8 w-7 place-items-center sm:h-7 sm:w-6">
              <span className={`h-4 w-4 rounded-full ${NOTE_COLORS[k].swatch} ${note.color === k ? 'ring-2 ring-ghost ring-offset-2 ring-offset-carbon' : 'opacity-60 group-hover:opacity-100'}`} />
            </button>
          ))}
        </div>
        <div className="-mr-2 flex items-center">
          <span className="font-mono text-[11px] text-muted">{formatDate(note.created_at)}</span>
          <button onClick={onDelete} className="btn-icon hover:text-danger" aria-label="Eliminar nota"><Trash2 size={15} /></button>
        </div>
      </div>
    </article>
  )
}

function NewNoteDialog({ open, projects, onClose, onCreate }: {
  open: boolean
  projects: ProjectRef[]
  onClose: () => void
  onCreate: (values: Partial<Note>) => Promise<void>
}) {
  const [projectId, setProjectId] = useState('')
  const [content, setContent] = useState('')
  const [color, setColor] = useState<NoteColor>('violet')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const options = [
    { value: '', label: 'Nota libre', hint: 'Sin proyecto asociado', icon: <StickyNote size={16} className="shrink-0 text-muted" /> },
    ...projects.map((p) => ({
      value: p.id, label: p.client_name, hint: p.business_name || undefined,
      icon: <Briefcase size={16} className="shrink-0 text-violet-soft" />,
    })),
  ]

  const reset = () => { setProjectId(''); setContent(''); setColor('violet'); setError(null) }
  const close = () => { reset(); onClose() }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await onCreate({ project_id: projectId || null, content: content.trim(), color })
      close()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} title="Nueva nota" onClose={close}>
      <form onSubmit={submit} noValidate>
        <label id="n-project-label" className="label" htmlFor="n-project">¿A qué va asociada?</label>
        <Dropdown id="n-project" labelId="n-project-label" options={options} value={projectId} onChange={setProjectId} />

        <label className="label mt-4" htmlFor="n-content">Contenido <span className="text-muted">(opcional)</span></label>
        <textarea id="n-content" rows={3} className="input resize-y" placeholder="Escribe algo…"
          value={content} onChange={(e) => setContent(e.target.value)} />

        <div className="mt-3 flex items-center gap-2">
          <span className="label mb-0">Color</span>
          <div className="flex" role="radiogroup" aria-label="Color">
            {(Object.keys(NOTE_COLORS) as NoteColor[]).map((k) => (
              <button type="button" key={k} role="radio" aria-checked={color === k} aria-label={NOTE_COLORS[k].label}
                onClick={() => setColor(k)} className="group grid h-10 w-9 place-items-center sm:h-8 sm:w-8">
                <span className={`h-5 w-5 rounded-full ${NOTE_COLORS[k].swatch} ${color === k ? 'ring-2 ring-ghost ring-offset-2 ring-offset-carbon' : 'opacity-60 group-hover:opacity-100'}`} />
              </button>
            ))}
          </div>
        </div>

        {error && <p className="mt-4 text-sm text-danger" role="alert">{error}</p>}
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={close} className="btn-ghost flex-1 sm:flex-none">Cancelar</button>
          <button type="submit" className="btn-primary flex-1 sm:flex-none" disabled={saving}><Plus size={16} /> Crear nota</button>
        </div>
      </form>
    </Modal>
  )
}

export function Notes() {
  const { rows, loading, error, insert, update, remove } = useTable<Note>('notes')
  const projects = useTable<ProjectRef>('projects', 'id, client_name, business_name, created_at')
  const projectById = useMemo(() => new Map(projects.rows.map((p) => [p.id, p])), [projects.rows])
  const [creating, setCreating] = useState(false)

  return (
    <>
      <PageHeader eyebrow="Ideas y recordatorios" title="Notas"
        action={<button onClick={() => setCreating(true)} className="btn-primary"><Plus size={16} /> Nueva nota</button>} />
      {error ? (
        <StateMessage title="No se pudieron cargar las notas" tone="error">{error}</StateMessage>
      ) : loading ? (
        <StateMessage title="Cargando…" />
      ) : rows.length === 0 ? (
        <StateMessage title="Sin notas">Apunta ideas, tareas o recordatorios rápidos.</StateMessage>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {rows.map((n) => (
            <NoteCard key={n.id} note={n} project={n.project_id ? projectById.get(n.project_id) : undefined}
              onSave={(v) => update(n.id, v)} onDelete={() => remove(n.id)} />
          ))}
        </div>
      )}

      <NewNoteDialog open={creating} projects={projects.rows} onClose={() => setCreating(false)}
        onCreate={async (v) => { await insert(v) }} />
    </>
  )
}
