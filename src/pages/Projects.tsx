import { useMemo, useState, type FormEvent } from 'react'
import { ChevronRight, Pencil, Plus, Search, StickyNote, Trash2 } from 'lucide-react'
import { useTable } from '../hooks/useTable'
import { supabase } from '../lib/supabase'
import { STATUSES, STATUS_LABEL, type Note, type Project, type ProjectStatus, type Service } from '../lib/types'
import { NOTE_COLORS } from '../lib/noteColors'
import { formatDate } from '../lib/format'
import { PageHeader } from '../components/PageHeader'
import { Modal } from '../components/Modal'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { StateMessage } from '../components/StateMessage'
import { StatusMenu } from '../components/StatusMenu'

type Draft = {
  client_name: string
  business_name: string
  description: string
  serviceIds: string[]
}
const EMPTY: Draft = { client_name: '', business_name: '', description: '', serviceIds: [] }

export function Projects() {
  const projects = useTable<Project>('projects', '*, project_services(service_id)')
  const services = useTable<Service>('services')
  const notes = useTable<Note>('notes')
  const serviceById = useMemo(() => new Map(services.rows.map((s) => [s.id, s])), [services.rows])

  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<ProjectStatus | 'todos'>('todos')
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Project | null>(null)
  const [draft, setDraft] = useState<Draft>(EMPTY)
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [toDelete, setToDelete] = useState<Project | null>(null)
  const [viewingId, setViewingId] = useState<string | null>(null)
  const viewing = projects.rows.find((p) => p.id === viewingId) ?? null
  const viewingNotes = viewing ? notes.rows.filter((n) => n.project_id === viewing.id) : []

  const visible = projects.rows.filter((p) => {
    if (filter !== 'todos' && p.status !== filter) return false
    const q = query.trim().toLowerCase()
    return !q || [p.client_name, p.business_name, p.description].some((v) => v.toLowerCase().includes(q))
  })

  const openNew = () => { setEditing(null); setDraft(EMPTY); setFormError(null); setOpen(true) }
  const openEdit = (p: Project) => {
    setViewingId(null)
    setEditing(p)
    setDraft({
      client_name: p.client_name,
      business_name: p.business_name,
      description: p.description,
      serviceIds: p.project_services.map((x) => x.service_id),
    })
    setFormError(null)
    setOpen(true)
  }

  const toggleService = (id: string) =>
    setDraft((d) => ({
      ...d,
      serviceIds: d.serviceIds.includes(id) ? d.serviceIds.filter((x) => x !== id) : [...d.serviceIds, id],
    }))

  const save = async (e: FormEvent) => {
    e.preventDefault()
    if (!draft.client_name.trim()) return setFormError('El nombre del cliente es obligatorio.')
    setSaving(true)
    try {
      const { serviceIds, ...rest } = draft
      const values = {
        ...rest,
        client_name: rest.client_name.trim(),
        business_name: rest.business_name.trim(),
        description: rest.description.trim(),
      }
      let id = editing?.id
      if (id) {
        const { error } = await supabase.from('projects').update(values).eq('id', id)
        if (error) throw error
        const del = await supabase.from('project_services').delete().eq('project_id', id)
        if (del.error) throw del.error
      } else {
        // Los proyectos nuevos siempre empiezan en estado "Nuevo"
        const { data, error } = await supabase.from('projects').insert({ ...values, status: 'nuevo' }).select('id').single()
        if (error) throw error
        id = data.id as string
      }
      if (serviceIds.length) {
        const { error } = await supabase
          .from('project_services')
          .insert(serviceIds.map((service_id) => ({ project_id: id, service_id })))
        if (error) throw error
      }
      await projects.reload()
      setOpen(false)
    } catch (err) {
      setFormError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const changeStatus = (p: Project, status: ProjectStatus) => projects.update(p.id, { status })

  return (
    <>
      <PageHeader eyebrow="Clientes" title="Proyectos"
        action={<button onClick={openNew} className="btn-primary"><Plus size={16} /> Nuevo proyecto</button>} />

      <div className="mb-4 flex flex-col gap-3 sm:mb-5 sm:flex-row">
        <div className="relative flex-1">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input type="search" placeholder="Buscar cliente, negocio o descripción…" aria-label="Buscar proyectos"
            className="input pl-9" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <div className="flex shrink-0 gap-1 overflow-x-auto rounded-control border border-white/10 p-1 [scrollbar-width:none]" role="group" aria-label="Filtrar por estado">
          {(['todos', ...STATUSES] as const).map((s) => (
            <button key={s} onClick={() => setFilter(s)} aria-pressed={filter === s}
              className={`flex-1 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-medium transition-colors sm:flex-none sm:py-1.5 ${
                filter === s ? 'bg-violet/20 text-ghost' : 'text-muted hover:text-ghost'}`}>
              {s === 'todos' ? 'Todos' : STATUS_LABEL[s]}
            </button>
          ))}
        </div>
      </div>

      {projects.error ? (
        <StateMessage title="No se pudieron cargar los proyectos" tone="error">{projects.error}</StateMessage>
      ) : projects.loading ? (
        <StateMessage title="Cargando…" />
      ) : visible.length === 0 ? (
        <StateMessage title={projects.rows.length ? 'Sin resultados' : 'Aún no hay proyectos'}>
          {projects.rows.length ? 'Prueba con otra búsqueda o filtro.' : 'Crea el primero con el botón "Nuevo proyecto".'}
        </StateMessage>
      ) : (
        <>
        {/* Móvil: tarjetas */}
        <ul className="flex flex-col gap-3 md:hidden">
          {visible.map((p) => (
            <li key={p.id} className="card relative p-4 transition-colors active:bg-white/[0.03]">
              <div className="flex items-start justify-between gap-3">
                <button type="button" onClick={() => setViewingId(p.id)}
                  className="min-w-0 flex-1 text-left after:absolute after:inset-0 after:content-[''] focus-visible:outline-none">
                  <span className="block break-words font-medium">{p.client_name}</span>
                  {p.business_name && <span className="block truncate text-sm text-muted">{p.business_name}</span>}
                </button>
                <ChevronRight size={18} className="mt-0.5 shrink-0 text-muted" aria-hidden />
              </div>
              {p.description && <p className="mt-2 line-clamp-2 text-sm text-muted">{p.description}</p>}
              {p.project_services.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {p.project_services.map(({ service_id }) => (
                    <span key={service_id} className="rounded-md bg-white/5 px-2 py-0.5 text-xs text-ghost/90">
                      {serviceById.get(service_id)?.name ?? '…'}
                    </span>
                  ))}
                </div>
              )}
              <div className="mt-3 flex items-center justify-between gap-2 border-t border-white/5 pt-3">
                <div className="relative z-10 flex items-center gap-3">
                  <StatusMenu value={p.status} label={`Estado de ${p.client_name}`}
                    onChange={(status) => changeStatus(p, status)} />
                  <span className="font-mono text-xs text-muted">{formatDate(p.created_at)}</span>
                </div>
                <div className="relative z-10 -mr-2 flex">
                  <button onClick={() => openEdit(p)} className="btn-icon" aria-label={`Editar ${p.client_name}`}><Pencil size={16} /></button>
                  <button onClick={() => setToDelete(p)} className="btn-icon hover:text-danger" aria-label={`Eliminar ${p.client_name}`}><Trash2 size={16} /></button>
                </div>
              </div>
            </li>
          ))}
        </ul>

        {/* Tablet/escritorio: tabla */}
        <div className="card hidden overflow-x-auto md:block">
          <table className="w-full min-w-[56rem] text-left text-sm">
            <thead>
              <tr className="border-b border-white/5">
                {['Cliente', 'Negocio', 'Descripción', 'Servicios', 'Estado', 'Alta', ''].map((h) => (
                  <th key={h} scope="col" className="eyebrow px-4 py-3 font-normal">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((p) => (
                <tr key={p.id} onClick={() => setViewingId(p.id)}
                  className="cursor-pointer border-b border-white/5 last:border-0 hover:bg-white/[0.03]">
                  <td className="px-4 py-3 font-medium">
                    <button type="button" onClick={(e) => { e.stopPropagation(); setViewingId(p.id) }}
                      className="text-left hover:text-violet-soft focus-visible:text-violet-soft focus-visible:outline-none">
                      {p.client_name}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-muted">{p.business_name || '—'}</td>
                  <td className="max-w-xs px-4 py-3 text-muted"><p className="line-clamp-2">{p.description || '—'}</p></td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {p.project_services.length === 0 && <span className="text-muted">—</span>}
                      {p.project_services.map(({ service_id }) => (
                        <span key={service_id} className="rounded-md bg-white/5 px-2 py-0.5 text-xs text-ghost/90">
                          {serviceById.get(service_id)?.name ?? '…'}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusMenu value={p.status} label={`Estado de ${p.client_name}`}
                      onChange={(status) => changeStatus(p, status)} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-muted">{formatDate(p.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => openEdit(p)} className="btn-icon" aria-label={`Editar ${p.client_name}`}><Pencil size={16} /></button>
                      <button onClick={() => setToDelete(p)} className="btn-icon hover:text-danger" aria-label={`Eliminar ${p.client_name}`}><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </>
      )}

      <Modal open={open} title={editing ? 'Editar proyecto' : 'Nuevo proyecto'} onClose={() => setOpen(false)}>
        <form onSubmit={save} noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="p-client">Cliente</label>
              <input id="p-client" className="input" value={draft.client_name} autoCapitalize="words"
                onChange={(e) => setDraft({ ...draft, client_name: e.target.value })} />
            </div>
            <div>
              <label className="label" htmlFor="p-business">Negocio</label>
              <input id="p-business" className="input" value={draft.business_name}
                onChange={(e) => setDraft({ ...draft, business_name: e.target.value })} />
            </div>
          </div>
          <label className="label mt-4" htmlFor="p-desc">Descripción</label>
          <textarea id="p-desc" rows={3} className="input resize-y" value={draft.description}
            onChange={(e) => setDraft({ ...draft, description: e.target.value })} />

          <fieldset className="mt-4">
            <legend className="label">Servicios</legend>
            {services.rows.length === 0 ? (
              <p className="text-sm text-muted">No hay servicios. Créalos en la pantalla Servicios.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {services.rows.map((s) => {
                  const on = draft.serviceIds.includes(s.id)
                  return (
                    <button type="button" key={s.id} onClick={() => toggleService(s.id)} aria-pressed={on}
                      className={`rounded-full border px-3 py-1.5 text-sm transition-colors sm:py-1 sm:text-xs ${
                        on ? 'border-violet bg-violet/15 text-ghost' : 'border-white/10 text-muted hover:border-white/25'}`}>
                      {s.name}
                    </button>
                  )
                })}
              </div>
            )}
          </fieldset>

          {formError && <p className="mt-4 text-sm text-danger" role="alert">{formError}</p>}
          <div className="mt-6 flex justify-end gap-2">
            <button type="button" onClick={() => setOpen(false)} className="btn-ghost flex-1 sm:flex-none">Cancelar</button>
            <button type="submit" className="btn-primary flex-1 sm:flex-none" disabled={saving}>Guardar</button>
          </div>
        </form>
      </Modal>

      <Modal open={!!viewing} size="lg" title={viewing?.client_name ?? ''} onClose={() => setViewingId(null)}>
        {viewing && (
          <>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
              <div className="col-span-2 sm:col-span-1">
                <dt className="eyebrow mb-1">Negocio</dt>
                <dd className="text-sm">{viewing.business_name || '—'}</dd>
              </div>
              <div>
                <dt className="eyebrow mb-1.5">Estado</dt>
                <dd>
                  <StatusMenu value={viewing.status} label={`Estado de ${viewing.client_name}`}
                    onChange={(status) => changeStatus(viewing, status)} />
                </dd>
              </div>
              <div>
                <dt className="eyebrow mb-1">Alta</dt>
                <dd className="font-mono text-sm text-muted">{formatDate(viewing.created_at)}</dd>
              </div>
              <div className="col-span-2 sm:col-span-3">
                <dt className="eyebrow mb-1.5">Servicios</dt>
                <dd className="flex flex-wrap gap-1">
                  {viewing.project_services.length === 0 && <span className="text-sm text-muted">—</span>}
                  {viewing.project_services.map(({ service_id }) => (
                    <span key={service_id} className="rounded-md bg-white/5 px-2 py-0.5 text-xs text-ghost/90">
                      {serviceById.get(service_id)?.name ?? '…'}
                    </span>
                  ))}
                </dd>
              </div>
              <div className="col-span-2 sm:col-span-3">
                <dt className="eyebrow mb-1">Descripción</dt>
                <dd className="whitespace-pre-line text-sm leading-relaxed text-ghost/90">{viewing.description || '—'}</dd>
              </div>
            </dl>

            <section className="mt-6 border-t border-white/5 pt-5" aria-labelledby="project-notes">
              <h3 id="project-notes" className="mb-3 flex items-center gap-2 text-sm font-semibold">
                <StickyNote size={16} className="text-violet-soft" /> Notas
                <span className="font-mono text-xs font-normal text-muted">{viewingNotes.length}</span>
              </h3>
              {notes.error ? (
                <p className="text-sm text-danger">{notes.error}</p>
              ) : viewingNotes.length === 0 ? (
                <p className="text-sm text-muted">Este proyecto no tiene notas. Créalas desde la pantalla Notas.</p>
              ) : (
                <ul className="grid gap-3 sm:grid-cols-2">
                  {viewingNotes.map((n) => (
                    <li key={n.id} className={`rounded-card border p-3 ${(NOTE_COLORS[n.color] ?? NOTE_COLORS.violet).card}`}>
                      <p className="whitespace-pre-line text-sm leading-relaxed">
                        {n.content || <span className="text-muted">Nota vacía</span>}
                      </p>
                      <p className="mt-2 font-mono text-[11px] text-muted">{formatDate(n.created_at)}</p>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setViewingId(null)} className="btn-ghost flex-1 sm:flex-none">Cerrar</button>
              <button onClick={() => openEdit(viewing)} className="btn-primary flex-1 sm:flex-none"><Pencil size={16} /> Editar</button>
            </div>
          </>
        )}
      </Modal>

      <ConfirmDialog open={!!toDelete} title="Eliminar proyecto"
        message={`¿Eliminar el proyecto de "${toDelete?.client_name}"? Esta acción no se puede deshacer.`}
        onCancel={() => setToDelete(null)}
        onConfirm={async () => { if (toDelete) await projects.remove(toDelete.id); setToDelete(null) }} />
    </>
  )
}
