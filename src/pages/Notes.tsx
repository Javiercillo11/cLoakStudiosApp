import { useMemo, useState, type FormEvent } from 'react'
import { Briefcase, ChevronDown, Plus, StickyNote } from 'lucide-react'
import { useTable } from '../hooks/useTable'
import type { Note, NoteColor, Project } from '../lib/types'
import { NOTE_COLORS } from '../lib/noteColors'
import { PageHeader } from '../components/PageHeader'
import { StateMessage } from '../components/StateMessage'
import { Modal } from '../components/Modal'
import { Dropdown } from '../components/Dropdown'
import { NoteCard } from '../components/NoteCard'

type ProjectRef = Pick<Project, 'id' | 'client_name' | 'business_name' | 'created_at'>

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

const COLLAPSED_KEY = 'cloak-notes-collapsed'

export function Notes() {
  const { rows, loading, error, insert, update, remove } = useTable<Note>('notes')
  const projects = useTable<ProjectRef>('projects', 'id, client_name, business_name, created_at')
  const projectById = useMemo(() => new Map(projects.rows.map((p) => [p.id, p])), [projects.rows])
  const [creating, setCreating] = useState(false)

  // Grupos minimizados (se recuerdan en este navegador)
  const [collapsed, setCollapsed] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem(COLLAPSED_KEY) ?? '[]') as string[]) } catch { return new Set() }
  })
  const toggleGroup = (key: string) =>
    setCollapsed((cur) => {
      const next = new Set(cur)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      try { localStorage.setItem(COLLAPSED_KEY, JSON.stringify([...next])) } catch { /* sin almacenamiento */ }
      return next
    })

  // Grupos: un bloque por proyecto (el de la nota más reciente primero) y al final las notas libres.
  // Las notas ya vienen ordenadas por fecha descendente.
  const groups = useMemo(() => {
    const byProject = new Map<string, Note[]>()
    const free: Note[] = []
    for (const n of rows) {
      if (n.project_id && projectById.has(n.project_id)) {
        const list = byProject.get(n.project_id) ?? []
        list.push(n)
        byProject.set(n.project_id, list)
      } else free.push(n)
    }
    const out = [...byProject].map(([id, notes]) => {
      const p = projectById.get(id)!
      return { key: id, title: p.client_name, subtitle: p.business_name, free: false, notes }
    })
    if (free.length) out.push({ key: 'free', title: 'Notas libres', subtitle: 'Sin proyecto asociado', free: true, notes: free })
    return out
  }, [rows, projectById])

  return (
    <>
      <PageHeader eyebrow="Ideas y recordatorios" title="Notas"
        action={<button onClick={() => setCreating(true)} className="btn-primary"><Plus size={16} /> Nueva nota</button>} />
      {error ? (
        <StateMessage title="No se pudieron cargar las notas" tone="error">{error}</StateMessage>
      ) : loading || projects.loading ? (
        <StateMessage title="Cargando…" />
      ) : rows.length === 0 ? (
        <StateMessage title="Sin notas">Apunta ideas, tareas o recordatorios rápidos.</StateMessage>
      ) : (
        <div className="flex flex-col gap-8">
          {groups.map((g) => (
            <section key={g.key} aria-labelledby={`notes-${g.key}`}>
              <header className={`flex items-center gap-3 border-b border-white/5 pb-2 ${collapsed.has(g.key) ? '' : 'mb-3'}`}>
                <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-control ${g.free ? 'bg-white/5 text-muted' : 'bg-violet/15 text-violet-soft'}`}>
                  {g.free ? <StickyNote size={16} /> : <Briefcase size={16} />}
                </span>
                <div className="min-w-0 flex-1">
                  <h2 id={`notes-${g.key}`} className="truncate text-base font-semibold">{g.title}</h2>
                  {g.subtitle && <p className="truncate text-xs text-muted">{g.subtitle}</p>}
                </div>
                <span className="shrink-0 font-mono text-xs text-muted">{g.notes.length}</span>
                <button type="button" onClick={() => toggleGroup(g.key)}
                  aria-expanded={!collapsed.has(g.key)} aria-controls={`notes-list-${g.key}`}
                  aria-label={`${collapsed.has(g.key) ? 'Mostrar' : 'Ocultar'} notas de ${g.title}`}
                  title={collapsed.has(g.key) ? 'Mostrar notas' : 'Ocultar notas'}
                  className="btn-icon -mr-2 shrink-0">
                  <ChevronDown size={18} className={`transition-transform ${collapsed.has(g.key) ? '-rotate-90' : ''}`} />
                </button>
              </header>
              {/* la clase "grid" anularía el atributo hidden, así que se usa display condicional */}
              <div id={`notes-list-${g.key}`}
                className={`${collapsed.has(g.key) ? 'hidden' : 'grid'} gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5`}>
                {g.notes.map((n) => (
                  <NoteCard key={n.id} note={n} onSave={(v) => update(n.id, v)} onDelete={() => remove(n.id)} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <NewNoteDialog open={creating} projects={projects.rows} onClose={() => setCreating(false)}
        onCreate={async (v) => { await insert(v) }} />
    </>
  )
}
