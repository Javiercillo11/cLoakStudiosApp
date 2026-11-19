import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  Archive, Briefcase, ChevronRight, FolderPlus, Inbox, Layers, Mail, MessageCircle, MessagesSquare, Phone, Search,
  Sparkles, Trash2, type LucideIcon,
} from 'lucide-react'
import { useTable } from '../hooks/useTable'
import { useLeadsRealtime } from '../hooks/useLeads'
import {
  LEAD_SERVICE_LABEL, LEAD_STATUSES, LEAD_STATUS_LABEL, type Lead, type LeadStatus, type Note, type Service,
} from '../lib/types'
import { leadTitle, leadToProjectPrefill, telHref, whatsappLink, type ProjectPrefill } from '../lib/leads'
import { supabase } from '../lib/supabase'
import { PageHeader } from '../components/PageHeader'
import { Modal } from '../components/Modal'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { StateMessage } from '../components/StateMessage'
import { Dropdown } from '../components/Dropdown'
import { ProjectForm } from '../components/ProjectForm'
import { PushToggle } from '../components/PushToggle'

/** Colores de estado: amarillo (nueva), azul (contactada), verde (convertida), gris (descartada) */
const LEAD_STYLE: Record<LeadStatus, { badge: string; text: string; icon: LucideIcon }> = {
  nuevo: { badge: 'bg-[#EAB308]/15 text-[#FDE047]', text: 'text-[#FDE047]', icon: Sparkles },
  contactado: { badge: 'bg-[#0EA5E9]/15 text-[#7DD3FC]', text: 'text-[#7DD3FC]', icon: MessagesSquare },
  convertido: { badge: 'bg-[#16A34A]/15 text-success', text: 'text-success', icon: Briefcase },
  descartado: { badge: 'bg-white/5 text-muted', text: 'text-muted', icon: Archive },
}

function LeadBadge({ status }: { status: LeadStatus }) {
  const s = LEAD_STYLE[status]
  const Icon = s.icon
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${s.badge}`}>
      <Icon size={12} strokeWidth={2.25} aria-hidden />
      {LEAD_STATUS_LABEL[status]}
    </span>
  )
}

const dateTime = new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
const formatDateTime = (iso: string) => dateTime.format(new Date(iso))

type Filter = LeadStatus | 'abiertas' | 'todas'
const OPEN: LeadStatus[] = ['nuevo', 'contactado']

export function Leads() {
  const leads = useTable<Lead>('leads')
  const services = useTable<Service>('services')
  const notes = useTable<Note>('notes')
  useLeadsRealtime(leads.reload)

  const { id: viewingId } = useParams()
  const navigate = useNavigate()
  const viewing = leads.rows.find((l) => l.id === viewingId) ?? null
  const closeDetail = () => navigate('/solicitudes')

  const [filter, setFilter] = useState<Filter>('abiertas')
  const [query, setQuery] = useState('')
  const [converting, setConverting] = useState<{ lead: Lead; prefill: ProjectPrefill } | null>(null)
  const [toDelete, setToDelete] = useState<Lead | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const counts = useMemo(() => {
    const c = Object.fromEntries(LEAD_STATUSES.map((s) => [s, 0])) as Record<LeadStatus, number>
    for (const l of leads.rows) c[l.status]++
    return c
  }, [leads.rows])

  const visible = leads.rows
    .filter((l) => {
      if (filter === 'abiertas' ? !OPEN.includes(l.status) : filter !== 'todas' && l.status !== filter) return false
      const q = query.trim().toLowerCase()
      return !q || [l.name, l.business, l.email, l.phone, l.message].some((v) => v.toLowerCase().includes(q))
    })
    // Primero las nuevas; dentro de cada grupo, las más recientes
    .sort((a, b) => Number(b.status === 'nuevo') - Number(a.status === 'nuevo') || b.created_at.localeCompare(a.created_at))

  const run = async (fn: () => Promise<void>) => {
    try {
      setActionError(null)
      await fn()
    } catch (err) {
      setActionError((err as Error).message)
    }
  }

  const changeStatus = (l: Lead, status: LeadStatus) => run(() => leads.update(l.id, { status }))

  const startConversion = (l: Lead) => {
    closeDetail()
    setConverting({ lead: l, prefill: leadToProjectPrefill(l) })
  }

  /** En cuanto el proyecto existe, la solicitud queda enlazada y convertida */
  const linkProject = async (lead: Lead, projectId: string) => {
    const { error } = await supabase.from('leads').update({ status: 'convertido', project_id: projectId }).eq('id', lead.id)
    if (error) setActionError(`El proyecto se ha creado, pero no se pudo marcar la solicitud como convertida: ${error.message}`)
  }

  const deleteLead = (l: Lead) =>
    run(async () => {
      await leads.remove(l.id)
      setToDelete(null)
      closeDetail()
    })

  const filterOptions = [
    { value: 'abiertas', label: `Abiertas (${counts.nuevo + counts.contactado})`, icon: <Inbox size={15} className="shrink-0 text-muted" /> },
    ...LEAD_STATUSES.map((st) => {
      const Icon = LEAD_STYLE[st].icon
      return { value: st, label: `${LEAD_STATUS_LABEL[st]}s (${counts[st]})`, icon: <Icon size={15} className={`shrink-0 ${LEAD_STYLE[st].text}`} /> }
    }),
    { value: 'todas', label: `Todas (${leads.rows.length})`, icon: <Layers size={15} className="shrink-0 text-muted" /> },
  ]

  return (
    <>
      <PageHeader eyebrow="Web" title="Solicitudes" action={<PushToggle />} />

      <div className="mb-4 flex flex-col gap-3 sm:mb-5 sm:flex-row">
        <div className="relative flex-1">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input type="search" placeholder="Buscar solicitudes…" aria-label="Buscar solicitudes"
            className="input pl-9" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <div className="sm:w-60">
          <Dropdown id="lead-filter" placeholder="Estado" value={filter} onChange={(v) => setFilter(v as Filter)} options={filterOptions} />
        </div>
      </div>

      {actionError && !viewing && (
        <p role="alert" className="mb-4 rounded-control bg-danger/10 px-4 py-3 text-sm text-danger">{actionError}</p>
      )}

      {leads.error ? (
        <StateMessage title="No se pudieron cargar las solicitudes" tone="error">
          {leads.error}
          {/relation|does not exist|schema cache/i.test(leads.error) && (
            <p className="mt-2">Falta ejecutar la migración <code>supabase/migrations/006_leads.sql</code> en Supabase.</p>
          )}
        </StateMessage>
      ) : leads.loading ? (
        <StateMessage title="Cargando…" />
      ) : visible.length === 0 ? (
        <StateMessage title={leads.rows.length ? 'Sin resultados' : 'Aún no hay solicitudes'}>
          {leads.rows.length
            ? 'Prueba con otra búsqueda o filtro.'
            : 'Las solicitudes que se envíen desde el formulario de la web aparecerán aquí al momento.'}
        </StateMessage>
      ) : (
        <ul className="grid grid-cols-1 gap-3" aria-label="Solicitudes">
          {visible.map((l) => (
            <li key={l.id}>
              <Link to={`/solicitudes/${l.id}`}
                className={`card group flex items-start gap-3 p-4 transition-colors hover:border-violet/40 sm:gap-4 sm:p-5 ${
                  l.status === 'nuevo' ? 'border-[#EAB308]/30' : ''}`}>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                    <h2 className="truncate font-display text-base font-semibold">{leadTitle(l)}</h2>
                    <LeadBadge status={l.status} />
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    {l.business.trim() && <>{l.name} · </>}
                    {LEAD_SERVICE_LABEL[l.service]} · {formatDateTime(l.created_at)}
                  </p>
                  <p className="mt-2 line-clamp-2 text-sm text-ghost/80 [overflow-wrap:anywhere]">{l.message}</p>
                </div>
                <ChevronRight size={18} className="mt-1 shrink-0 text-muted transition-transform group-hover:translate-x-0.5" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Modal open={!!viewing} title={viewing ? leadTitle(viewing) : ''} onClose={closeDetail}>
        {viewing && (
          <LeadDetailView lead={viewing} error={actionError}
            onStatus={(s) => changeStatus(viewing, s)}
            onConvert={() => startConversion(viewing)}
            onDelete={() => setToDelete(viewing)} />
        )}
      </Modal>

      <ProjectForm open={!!converting} project={null} services={services.rows} notes={notes.rows}
        prefill={converting?.prefill}
        onCreated={async (projectId) => { if (converting) await linkProject(converting.lead, projectId) }}
        onClose={() => setConverting(null)}
        onSaved={leads.reload}
        onNoteSave={(id, v) => notes.update(id, v)} onNoteDelete={(n) => run(() => notes.remove(n.id))}
        onNoteCreate={async (v) => { await notes.insert(v) }} />

      <ConfirmDialog open={!!toDelete} title="Eliminar solicitud"
        message={`¿Eliminar la solicitud de ${toDelete?.name ?? ''}? Se borrarán todos sus datos y no se puede deshacer.`}
        onCancel={() => setToDelete(null)} onConfirm={() => toDelete && deleteLead(toDelete)} />
    </>
  )
}

function ContactButton({ href, icon: Icon, children, external = false }: { href: string; icon: LucideIcon; children: string; external?: boolean }) {
  return (
    <a href={href} className="btn-ghost min-w-24 flex-1 justify-center border border-white/10"
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
      <Icon size={16} /> {children}
    </a>
  )
}

function LeadDetailView({ lead, error, onStatus, onConvert, onDelete }: {
  lead: Lead
  error: string | null
  onStatus: (s: LeadStatus) => void
  onConvert: () => void
  onDelete: () => void
}) {
  const firstName = lead.name.trim().split(/\s+/)[0]
  const service = LEAD_SERVICE_LABEL[lead.service]
  const wa = whatsappLink(lead.phone, `Hola ${firstName}, te escribimos de cLoak Studios por tu solicitud de «${service}».`)
  const mail = `mailto:${lead.email}?subject=${encodeURIComponent('Tu solicitud en cLoak Studios')}`
  const details = (lead.details ?? []).filter((d) => d.value.trim())

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted">
        <LeadBadge status={lead.status} />
        <span>{service}</span>
        <span>Recibida el {formatDateTime(lead.created_at)}</span>
      </div>

      <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
        <div><dt className="eyebrow mb-1">Nombre</dt><dd className="[overflow-wrap:anywhere]">{lead.name}</dd></div>
        <div><dt className="eyebrow mb-1">Negocio</dt><dd className="[overflow-wrap:anywhere]">{lead.business || '—'}</dd></div>
        <div><dt className="eyebrow mb-1">Email</dt><dd className="[overflow-wrap:anywhere]">{lead.email}</dd></div>
        <div><dt className="eyebrow mb-1">Teléfono</dt><dd>{lead.phone || '—'}</dd></div>
      </dl>

      <div className="flex flex-wrap gap-2">
        <ContactButton href={mail} icon={Mail}>Email</ContactButton>
        {lead.phone && <ContactButton href={telHref(lead.phone)} icon={Phone}>Llamar</ContactButton>}
        {wa && <ContactButton href={wa} icon={MessageCircle} external>WhatsApp</ContactButton>}
      </div>

      <section aria-labelledby="lead-message">
        <h3 id="lead-message" className="eyebrow mb-2">Mensaje</h3>
        <p className="whitespace-pre-line rounded-control bg-white/[0.03] p-4 text-sm leading-relaxed [overflow-wrap:anywhere]">{lead.message}</p>
      </section>

      {details.length > 0 && (
        <section aria-labelledby="lead-details">
          <h3 id="lead-details" className="eyebrow mb-2">Respuestas del formulario</h3>
          <dl className="divide-y divide-white/5 rounded-control border border-white/5 text-sm">
            {details.map((d, i) => (
              <div key={i} className="grid gap-1 px-4 py-3 sm:grid-cols-[minmax(0,14rem)_1fr] sm:gap-4">
                <dt className="text-muted">{d.label}</dt>
                <dd className="whitespace-pre-line [overflow-wrap:anywhere]">{d.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      <section aria-labelledby="lead-status">
        <h3 id="lead-status" className="eyebrow mb-2">Estado</h3>
        {lead.status === 'convertido' && lead.project_id ? (
          <p className="text-sm text-muted">
            Convertida en proyecto. <Link to="/proyectos" className="text-violet-soft underline underline-offset-2">Ver proyectos</Link>
          </p>
        ) : (
          <div className="flex flex-wrap gap-2" role="group" aria-label="Cambiar estado">
            {(['nuevo', 'contactado', 'descartado'] as LeadStatus[]).map((s) => (
              <button key={s} type="button" onClick={() => onStatus(s)} aria-pressed={lead.status === s}
                className={`btn border ${lead.status === s ? `border-transparent ${LEAD_STYLE[s].badge}` : 'border-white/10 text-muted hover:bg-white/5 hover:text-ghost'}`}>
                {LEAD_STATUS_LABEL[s]}
              </button>
            ))}
          </div>
        )}
      </section>

      {error && <p role="alert" className="rounded-control bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p>}

      <div className="flex flex-col-reverse gap-2 border-t border-white/5 pt-5 sm:flex-row sm:justify-between">
        <button type="button" onClick={onDelete} className="btn-ghost text-danger hover:text-danger">
          <Trash2 size={16} /> Eliminar
        </button>
        {!lead.project_id && (
          <button type="button" onClick={onConvert} className="btn-primary">
            <FolderPlus size={16} /> Convertir en proyecto
          </button>
        )}
      </div>
    </div>
  )
}
