import { useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronRight, Layers, Plus, Search, Trash2 } from 'lucide-react'
import { useTable } from '../hooks/useTable'
import { STATUSES, STATUS_LABEL, type Note, type Project, type ProjectStatus, type Service } from '../lib/types'
import { removeAttachmentsFor } from '../lib/attachments'
import { formatDate, formatEUR, formatPct } from '../lib/format'
import { paymentSummary } from '../lib/milestones'
import { PageHeader } from '../components/PageHeader'
import { Modal } from '../components/Modal'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { StateMessage } from '../components/StateMessage'
import { StatusMenu } from '../components/StatusMenu'
import { StatusIcon, STATUS_STYLE } from '../components/StatusBadge'
import { Dropdown } from '../components/Dropdown'
import { ClampedText } from '../components/ClampedText'
import { ProjectForm } from '../components/ProjectForm'
import { DeleteProjectDialog } from '../components/DeleteProjectDialog'
import { supabase } from '../lib/supabase'
import { ProjectDetail, ServiceChip } from '../components/ProjectDetail'

/** % cobrado según los hitos de pago marcados como pagados */
function PaidProgress({ project, compact = false }: { project: Project; compact?: boolean }) {
  const ms = project.payment_milestones ?? []
  if (!ms.length) return <span className="text-muted">—</span>
  const s = paymentSummary(Number(project.total_price), ms)
  const done = s.collectedPct >= 100
  return (
    <span className="inline-flex items-center gap-2" title={`Cobrado ${formatEUR(s.collected)} de ${formatEUR(s.total)}`}
      aria-label={`Cobrado ${formatPct(s.collectedPct)}`}>
      <span className={`h-1.5 overflow-hidden rounded-full bg-white/10 ${compact ? 'w-10' : 'w-14'}`} aria-hidden>
        <span className={`block h-full rounded-full ${done ? 'bg-success' : 'bg-[#F59E0B]'}`} style={{ width: `${s.collectedPct}%` }} />
      </span>
      <span className={`whitespace-nowrap font-mono text-xs ${done ? 'text-success' : 'text-ghost'}`}>{formatPct(s.collectedPct)}</span>
    </span>
  )
}

/** Nombre con el que se muestra el proyecto: el del negocio o, si no tiene, el del cliente */
const projectName = (p: Project) => p.business_name?.trim() || p.client_name

const deleteDetails = (notes: number) =>
  `${notes === 0 ? 'sus notas' : notes === 1 ? 'su nota' : `sus ${notes} notas`}, sus ficheros adjuntos y sus condiciones de pago`

export function Projects() {
  const projects = useTable<Project>('projects', '*, project_services(service_id)')
  const services = useTable<Service>('services')
  const notes = useTable<Note>('notes')
  const serviceById = useMemo(() => new Map(services.rows.map((s) => [s.id, s])), [services.rows])
  /** Precio total guardado en el proyecto (inicialmente, la suma de sus servicios) */
  const projectPrice = (p: Project) => Number(p.total_price ?? 0)

  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<ProjectStatus | 'todos'>('todos')
  /** Orden manual por columna; null = orden por defecto (Nuevo primero, luego por alta) */
  const [sort, setSort] = useState<{ key: 'price' | 'created'; dir: 'asc' | 'desc' } | null>(null)
  const toggleSort = (key: 'price' | 'created') =>
    setSort((cur) => (cur?.key !== key ? { key, dir: 'desc' } : cur.dir === 'desc' ? { key, dir: 'asc' } : null))
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Project | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [toDelete, setToDelete] = useState<Project | null>(null)
  const [viewingId, setViewingId] = useState<string | null>(null)
  const [noteToDelete, setNoteToDelete] = useState<Note | null>(null)
  const viewing = projects.rows.find((p) => p.id === viewingId) ?? null
  const viewingNotes = viewing ? notes.rows.filter((n) => n.project_id === viewing.id) : []

  const visible = projects.rows.filter((p) => {
    if (filter !== 'todos' && p.status !== filter) return false
    const q = query.trim().toLowerCase()
    return !q || [p.client_name, p.business_name, p.description].some((v) => v.toLowerCase().includes(q))
  }).sort((a, b) => {
    if (sort) {
      const sign = sort.dir === 'asc' ? 1 : -1
      const diff = sort.key === 'price' ? projectPrice(a) - projectPrice(b) : a.created_at.localeCompare(b.created_at)
      return sign * diff || b.created_at.localeCompare(a.created_at)
    }
    // Por defecto: primero los "Nuevo"; dentro de cada grupo, por fecha de alta (más reciente primero)
    return Number(b.status === 'nuevo') - Number(a.status === 'nuevo') || b.created_at.localeCompare(a.created_at)
  })

  const openNew = () => { setEditing(null); setOpen(true) }
  const openEdit = (p: Project) => {
    setViewingId(null)
    setEditing(p)
    setOpen(true)
  }

  /**
   * Borra el proyecto con todo lo suyo: ficheros (Storage), notas y, por cascada en BD,
   * los metadatos de los adjuntos y la relación con servicios.
   */
  const deleteProject = async (p: Project) => {
    try {
      await removeAttachmentsFor({ kind: 'project', id: p.id })
      const del = await supabase.from('notes').delete().eq('project_id', p.id)
      if (del.error) throw new Error(del.error.message)
      await projects.remove(p.id)
      await notes.reload()
      setToDelete(null)
      setViewingId(null)
      setDeleteError(null)
    } catch (err) {
      setDeleteError((err as Error).message)
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
        <div className="sm:w-56">
          <Dropdown id="status-filter" placeholder="Estado" value={filter}
            onChange={(v) => setFilter(v as ProjectStatus | 'todos')}
            options={[
              { value: 'todos', label: 'Todos los estados', icon: <Layers size={15} className="shrink-0 text-muted" /> },
              ...STATUSES.map((st) => ({
                value: st, label: STATUS_LABEL[st],
                icon: <StatusIcon status={st} size={15} className={STATUS_STYLE[st].text} />,
              })),
            ]} />
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
        {/* Móvil y tablet: tarjetas (dos columnas a partir de md) */}
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:hidden">
          {visible.map((p) => (
            <li key={p.id} className="card relative flex flex-col p-4 transition-colors active:bg-white/[0.03]">
              <div className="flex items-start justify-between gap-3">
                <button type="button" onClick={() => setViewingId(p.id)}
                  className="min-w-0 flex-1 text-left after:absolute after:inset-0 after:content-[''] focus-visible:outline-none">
                  <span className="block break-words font-medium">{projectName(p)}</span>
                  {p.business_name.trim() && <span className="block truncate text-sm text-muted">{p.client_name}</span>}
                </button>
                <span className="flex shrink-0 items-start gap-1">
                  <span className="flex flex-col items-end gap-1">
                    <span className="font-mono text-sm text-violet-soft">{formatEUR(projectPrice(p))}</span>
                    {(p.payment_milestones ?? []).length > 0 && <PaidProgress project={p} compact />}
                  </span>
                  <ChevronRight size={18} className="text-muted" aria-hidden />
                </span>
              </div>
              {p.description && <p className="mt-2 line-clamp-2 text-sm text-muted">{p.description}</p>}
              {p.project_services.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {p.project_services.map(({ service_id }) => (
                    <ServiceChip key={service_id} service={serviceById.get(service_id)} />
                  ))}
                </div>
              )}
              {/* Pie siempre abajo, alineado entre tarjetas de la misma fila */}
              <div className="mt-auto pt-3"><div className="flex items-center justify-between gap-2 border-t border-white/5 pt-3">
                <div className="relative z-10 flex items-center gap-3">
                  <StatusMenu value={p.status} label={`Estado de ${projectName(p)}`}
                    onChange={(status) => changeStatus(p, status)} />
                  <span className="font-mono text-xs text-muted">{formatDate(p.created_at)}</span>
                </div>
                <div className="relative z-10 -mr-2 flex">
                  <button onClick={() => setToDelete(p)} className="btn-icon hover:text-danger" aria-label={`Eliminar ${projectName(p)}`}><Trash2 size={16} /></button>
                </div>
              </div></div>
            </li>
          ))}
        </ul>

        {/* Escritorio: tabla. La descripción solo cabe en pantallas muy anchas (2xl) */}
        <div className="card hidden overflow-x-auto xl:block">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/5">
                {['Proyecto', 'Descripción', 'Servicios', 'Precio', 'Cobrado', 'Estado', 'Alta', ''].map((h) => {
                  const key = h === 'Precio' ? 'price' : h === 'Alta' ? 'created' : null
                  if (!key) return <th key={h} scope="col" className={`eyebrow whitespace-nowrap px-4 py-3 font-normal ${h === 'Descripción' ? 'hidden 2xl:table-cell' : ''}`}>{h}</th>
                  const active = sort?.key === key
                  const Arrow = !active ? ArrowUpDown : sort.dir === 'desc' ? ArrowDown : ArrowUp
                  return (
                    <th key={h} scope="col" className={`px-2 py-1.5 font-normal ${key === 'price' ? 'text-right' : ''}`}
                      aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
                      <button type="button" onClick={() => toggleSort(key)}
                        title={!active ? 'Ordenar de mayor a menor' : sort.dir === 'desc' ? 'Ordenar de menor a mayor' : 'Quitar orden'}
                        className={`eyebrow inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-white/5 hover:text-ghost ${
                          active ? 'text-ghost' : ''} ${key === 'price' ? 'flex-row-reverse' : ''}`}>
                        {h}
                        <Arrow size={12} className={active ? 'text-violet-soft' : 'opacity-50'} />
                      </button>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {visible.map((p) => (
                <tr key={p.id} onClick={() => setViewingId(p.id)}
                  className="cursor-pointer border-b border-white/5 last:border-0 hover:bg-white/[0.03]">
                  <td className="min-w-[11rem] max-w-[18rem] px-4 py-3">
                    <button type="button" onClick={(e) => { e.stopPropagation(); setViewingId(p.id) }}
                      className="block text-left font-medium hover:text-violet-soft focus-visible:text-violet-soft focus-visible:outline-none">
                      {projectName(p)}
                    </button>
                    {p.business_name.trim() && <span className="mt-0.5 block text-xs text-muted">{p.client_name}</span>}
                  </td>
                  <td className="hidden min-w-[9rem] max-w-[15rem] px-4 py-3 text-xs text-muted 2xl:table-cell">{p.description ? <ClampedText text={p.description} /> : '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {p.project_services.length === 0 && <span className="text-muted">—</span>}
                      {p.project_services.map(({ service_id }) => (
                        <ServiceChip key={service_id} service={serviceById.get(service_id)} />
                      ))}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right font-mono text-sm text-ghost">{formatEUR(projectPrice(p))}</td>
                  <td className="px-3 py-3"><PaidProgress project={p} compact /></td>
                  <td className="px-4 py-3">
                    <StatusMenu value={p.status} label={`Estado de ${projectName(p)}`}
                      onChange={(status) => changeStatus(p, status)} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-muted">{formatDate(p.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => setToDelete(p)} className="btn-icon hover:text-danger" aria-label={`Eliminar ${projectName(p)}`}><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </>
      )}

      <ProjectForm open={open} project={editing} services={services.rows} notes={notes.rows}
        onClose={() => setOpen(false)} onSaved={projects.reload}
        onNoteSave={(id, v) => notes.update(id, v)} onNoteDelete={setNoteToDelete}
        onNoteCreate={async (v) => { await notes.insert(v) }} />

      <Modal open={!!viewing} title={viewing ? projectName(viewing) : ''} onClose={() => setViewingId(null)}>
        {viewing && (
          <ProjectDetail project={viewing} serviceById={serviceById} notes={viewingNotes} notesError={notes.error}
            onStatusChange={(status) => changeStatus(viewing, status)}
            onTogglePaid={(payment_milestones) => projects.update(viewing.id, { payment_milestones })}
            onNoteSave={(id, v) => notes.update(id, v)} onNoteDelete={setNoteToDelete}
            onEdit={() => openEdit(viewing)} onClose={() => setViewingId(null)} />
        )}
      </Modal>

      <ConfirmDialog open={!!noteToDelete} title="Eliminar nota"
        message="¿Eliminar esta nota? Esta acción no se puede deshacer."
        onCancel={() => setNoteToDelete(null)}
        onConfirm={async () => { if (noteToDelete) await notes.remove(noteToDelete.id); setNoteToDelete(null) }} />

      <DeleteProjectDialog name={toDelete ? projectName(toDelete) : null} error={deleteError}
        details={toDelete ? deleteDetails(notes.rows.filter((n) => n.project_id === toDelete.id).length) : ''}
        onCancel={() => { setToDelete(null); setDeleteError(null) }}
        onConfirm={async () => { if (toDelete) await deleteProject(toDelete) }} />
    </>
  )
}
