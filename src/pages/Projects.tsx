import { useMemo, useState, type FormEvent } from 'react'
import { Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { useTable } from '../hooks/useTable'
import { supabase } from '../lib/supabase'
import { STATUSES, STATUS_LABEL, type Project, type ProjectStatus, type Service } from '../lib/types'
import { formatDate } from '../lib/format'
import { PageHeader } from '../components/PageHeader'
import { Modal } from '../components/Modal'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { StateMessage } from '../components/StateMessage'
import { STATUS_STYLE } from '../components/StatusBadge'

type Draft = {
  client_name: string
  business_name: string
  description: string
  status: ProjectStatus
  serviceIds: string[]
}
const EMPTY: Draft = { client_name: '', business_name: '', description: '', status: 'nuevo', serviceIds: [] }

export function Projects() {
  const projects = useTable<Project>('projects', '*, project_services(service_id)')
  const services = useTable<Service>('services')
  const serviceById = useMemo(() => new Map(services.rows.map((s) => [s.id, s])), [services.rows])

  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<ProjectStatus | 'todos'>('todos')
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Project | null>(null)
  const [draft, setDraft] = useState<Draft>(EMPTY)
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [toDelete, setToDelete] = useState<Project | null>(null)

  const visible = projects.rows.filter((p) => {
    if (filter !== 'todos' && p.status !== filter) return false
    const q = query.trim().toLowerCase()
    return !q || [p.client_name, p.business_name, p.description].some((v) => v.toLowerCase().includes(q))
  })

  const openNew = () => { setEditing(null); setDraft(EMPTY); setFormError(null); setOpen(true) }
  const openEdit = (p: Project) => {
    setEditing(p)
    setDraft({
      client_name: p.client_name,
      business_name: p.business_name,
      description: p.description,
      status: p.status,
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
        const { data, error } = await supabase.from('projects').insert(values).select('id').single()
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

      <div className="mb-5 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input type="search" placeholder="Buscar cliente, negocio o descripción…" aria-label="Buscar proyectos"
            className="input pl-9" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <div className="flex gap-1 overflow-x-auto rounded-control border border-white/10 p-1" role="group" aria-label="Filtrar por estado">
          {(['todos', ...STATUSES] as const).map((s) => (
            <button key={s} onClick={() => setFilter(s)} aria-pressed={filter === s}
              className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
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
        <div className="card overflow-x-auto">
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
                <tr key={p.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                  <td className="px-4 py-3 font-medium">{p.client_name}</td>
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
                    <div className="relative inline-flex items-center">
                      <span className={`pointer-events-none absolute left-2.5 h-1.5 w-1.5 rounded-full ${STATUS_STYLE[p.status].dot}`} />
                      <select value={p.status} aria-label={`Estado de ${p.client_name}`}
                        onChange={(e) => changeStatus(p, e.target.value as ProjectStatus)}
                        className={`cursor-pointer appearance-none rounded-full border-0 py-1 pl-6 pr-3 text-xs font-medium ${STATUS_STYLE[p.status].badge}`}>
                        {STATUSES.map((s) => <option key={s} value={s} className="bg-carbon text-ghost">{STATUS_LABEL[s]}</option>)}
                      </select>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-muted">{formatDate(p.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => openEdit(p)} className="btn-ghost p-2" aria-label={`Editar ${p.client_name}`}><Pencil size={16} /></button>
                      <button onClick={() => setToDelete(p)} className="btn-ghost p-2 hover:text-danger" aria-label={`Eliminar ${p.client_name}`}><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={open} title={editing ? 'Editar proyecto' : 'Nuevo proyecto'} onClose={() => setOpen(false)}>
        <form onSubmit={save} noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="p-client">Cliente</label>
              <input id="p-client" className="input" value={draft.client_name} autoFocus
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
                      className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                        on ? 'border-violet bg-violet/15 text-ghost' : 'border-white/10 text-muted hover:border-white/25'}`}>
                      {s.name}
                    </button>
                  )
                })}
              </div>
            )}
          </fieldset>

          <fieldset className="mt-4">
            <legend className="label">Estado</legend>
            <div className="grid grid-cols-3 gap-2">
              {STATUSES.map((s) => (
                <button type="button" key={s} onClick={() => setDraft({ ...draft, status: s })} aria-pressed={draft.status === s}
                  className={`rounded-control border px-2 py-2 text-xs font-medium transition-colors ${
                    draft.status === s ? 'border-violet bg-violet/15 text-ghost' : 'border-white/10 text-muted hover:border-white/25'}`}>
                  {STATUS_LABEL[s]}
                </button>
              ))}
            </div>
          </fieldset>

          {formError && <p className="mt-4 text-sm text-danger" role="alert">{formError}</p>}
          <div className="mt-6 flex justify-end gap-2">
            <button type="button" onClick={() => setOpen(false)} className="btn-ghost">Cancelar</button>
            <button type="submit" className="btn-primary" disabled={saving}>Guardar</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog open={!!toDelete} title="Eliminar proyecto"
        message={`¿Eliminar el proyecto de "${toDelete?.client_name}"? Esta acción no se puede deshacer.`}
        onCancel={() => setToDelete(null)}
        onConfirm={async () => { if (toDelete) await projects.remove(toDelete.id); setToDelete(null) }} />
    </>
  )
}
