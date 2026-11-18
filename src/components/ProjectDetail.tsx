import type { ReactNode } from 'react'
import { Briefcase, CheckCircle2, Circle, FileSignature, MapPin, Paperclip, Pencil, Phone, Receipt, StickyNote, UserRound } from 'lucide-react'
import { PAYMENT_METHOD_LABEL, type Note, type PaymentMilestone, type Project, type ProjectStatus, type Service } from '../lib/types'
import { paymentSummary } from '../lib/milestones'
import { priceBreakdown } from '../lib/pricing'
import { formatDate, formatEUR, formatPct } from '../lib/format'
import { ServiceIcon } from '../lib/serviceIcons'
import { StatusMenu } from './StatusMenu'
import { NoteCard } from './NoteCard'
import { PaymentSummary } from './PaymentSummary'
import { AttachmentsPanel } from './AttachmentsPanel'
import { PaymentMethodIcon } from './PaymentMethodIcon'

function Block({ id, title, icon, children, extra }: { id: string; title: string; icon: ReactNode; children: ReactNode; extra?: ReactNode }) {
  return (
    <section className="border-t border-white/5 pt-5" aria-labelledby={id}>
      <h3 id={id} className="mb-3 flex items-center gap-2 text-sm font-semibold">
        <span className="text-violet-soft">{icon}</span> {title}
        {!!extra && <span className="font-mono text-xs font-normal text-muted">{extra}</span>}
      </h3>
      {children}
    </section>
  )
}

const dash = (v?: string | null) => (v && v.trim() ? v : '—')

export function ServiceChip({ service }: { service?: Service }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-md bg-white/5 px-2 py-0.5 text-xs text-ghost/90">
      <ServiceIcon name={service?.icon} size={12} className="text-violet-soft" />
      {service?.name ?? '…'}
    </span>
  )
}

interface Props {
  project: Project
  serviceById: Map<string, Service>
  notes: Note[]
  notesError: string | null
  onStatusChange: (status: ProjectStatus) => void
  onTogglePaid: (milestones: PaymentMilestone[]) => Promise<void>
  onNoteSave: (id: string, values: Partial<Note>) => Promise<void>
  onNoteDelete: (n: Note) => void
  onEdit: () => void
  onClose: () => void
}

export function ProjectDetail({ project: p, serviceById, notes, notesError, onStatusChange, onTogglePaid, onNoteSave, onNoteDelete, onEdit, onClose }: Props) {
  const milestones = p.payment_milestones ?? []
  const extras = p.extra_charges ?? []
  const servicesSum = p.project_services.reduce((sum, x) => sum + Number(serviceById.get(x.service_id)?.price ?? 0), 0)
  const price = priceBreakdown(servicesSum, extras, Number(p.discount_pct ?? 0))
  const summary = paymentSummary(Number(p.total_price), milestones)
  const location = [p.postal_code, p.city].filter((x) => x?.trim()).join(' ')
  const fullPlace = [location, p.province].filter((x) => x?.trim()).join(', ')

  const togglePaid = (m: PaymentMilestone) =>
    onTogglePaid(milestones.map((x) => (x.id === m.id
      ? { ...x, paid: !x.paid, paidAt: !x.paid ? new Date().toISOString() : null }
      : x)))

  return (
    <div className="flex flex-col gap-5">
      <section aria-labelledby="pd-general">
        <h3 id="pd-general" className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <span className="text-violet-soft"><UserRound size={16} /></span> Información general
        </h3>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
          <div className="col-span-2 sm:col-span-1">
            <dt className="eyebrow mb-1">Cliente</dt>
            <dd className="text-sm [overflow-wrap:anywhere]">{p.client_name}</dd>
          </div>
          <div>
            <dt className="eyebrow mb-1.5">Estado</dt>
            <dd><StatusMenu value={p.status} label={`Estado de ${p.business_name?.trim() || p.client_name}`} onChange={onStatusChange} /></dd>
          </div>
          <div>
            <dt className="eyebrow mb-1">Alta</dt>
            <dd className="font-mono text-sm text-muted">{formatDate(p.created_at)}</dd>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <dt className="eyebrow mb-1">Teléfono</dt>
            <dd className="text-sm">
              {p.phone?.trim() ? (
                <a href={`tel:${p.phone.replace(/[^\d+]/g, '')}`} className="inline-flex items-center gap-1.5 hover:text-violet-soft">
                  <Phone size={13} className="text-muted" /> {p.phone}
                </a>
              ) : '—'}
            </dd>
          </div>
          <div className="col-span-2">
            <dt className="eyebrow mb-1">Dirección</dt>
            <dd className="flex gap-1.5 text-sm leading-relaxed">
              {p.address?.trim() || fullPlace ? (
                <>
                  <MapPin size={14} className="mt-1 shrink-0 text-muted" />
                  <span className="[overflow-wrap:anywhere]">
                    {p.address?.trim() && <span className="block">{p.address}</span>}
                    {fullPlace && <span className="block text-muted">{fullPlace}</span>}
                  </span>
                </>
              ) : '—'}
            </dd>
          </div>
          <div className="col-span-2 sm:col-span-1"><dt className="eyebrow mb-1">Provincia</dt><dd className="text-sm">{dash(p.province)}</dd></div>
          <div><dt className="eyebrow mb-1">Ciudad</dt><dd className="text-sm">{dash(p.city)}</dd></div>
          <div><dt className="eyebrow mb-1">C. postal</dt><dd className="font-mono text-sm">{dash(p.postal_code)}</dd></div>
        </dl>
      </section>

      <Block id="pd-business" title="Negocio" icon={<Briefcase size={16} />}>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
          <div className="col-span-2 sm:col-span-3">
            <dt className="eyebrow mb-1.5">Servicios</dt>
            <dd className="flex flex-wrap gap-1">
              {p.project_services.length === 0 && <span className="text-sm text-muted">—</span>}
              {p.project_services.map(({ service_id }) => <ServiceChip key={service_id} service={serviceById.get(service_id)} />)}
            </dd>
          </div>
          <div className="col-span-2 sm:col-span-3">
            <dt className="eyebrow mb-1">Descripción</dt>
            <dd className="whitespace-pre-line text-sm leading-relaxed text-ghost/90 [overflow-wrap:anywhere]">{dash(p.description)}</dd>
          </div>
        </dl>

        <dl className="mt-4 flex flex-col gap-1.5 rounded-control border border-white/5 bg-obsidian p-4 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-muted">Suma de servicios</dt>
            <dd className="font-mono">{formatEUR(price.services)}</dd>
          </div>
          {extras.map((x) => (
            <div key={x.id} className="flex justify-between gap-3">
              <dt className="min-w-0 truncate text-muted">{x.description}</dt>
              <dd className="shrink-0 font-mono">+ {formatEUR(Number(x.amount))}</dd>
            </div>
          ))}
          {price.discountPct > 0 && (
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Descuento {formatPct(price.discountPct)}</dt>
              <dd className="font-mono text-[#FCD34D]">− {formatEUR(price.discount)}</dd>
            </div>
          )}
          <div className="mt-1 flex items-baseline justify-between gap-3 border-t border-white/10 pt-2.5">
            <dt className="font-medium">Precio total</dt>
            <dd className="font-mono text-base font-semibold text-violet-soft">{formatEUR(Number(p.total_price))}</dd>
          </div>
        </dl>
      </Block>

      <Block id="pd-contract" title="Condiciones contractuales" icon={<FileSignature size={16} />}>
        <dl>
          <dt className="eyebrow mb-1">Método de pago</dt>
          <dd className="text-sm">
            {p.payment_method ? (
              <span className="inline-flex items-center gap-2"><PaymentMethodIcon method={p.payment_method} /> {PAYMENT_METHOD_LABEL[p.payment_method]}</span>
            ) : '—'}
          </dd>
        </dl>
      </Block>

      <Block id="pd-milestones" title="Hitos de pago y estado de cobros" icon={<Receipt size={16} />} extra={milestones.length || undefined}>
        {milestones.length > 0 && (
          <ul className="mb-4 divide-y divide-white/5 rounded-control border border-white/5">
            {milestones.map((m, i) => (
              <li key={m.id} className="flex items-center gap-3 px-3 py-2.5">
                <button type="button" onClick={() => togglePaid(m)} className="btn-icon -ml-1 shrink-0"
                  aria-pressed={m.paid} aria-label={`${m.paid ? 'Marcar como pendiente' : 'Marcar como pagado'}: ${m.description}`}
                  title={m.paid ? 'Marcar como pendiente' : 'Marcar como pagado'}>
                  {m.paid ? <CheckCircle2 size={20} className="text-success" /> : <Circle size={20} className="text-muted" />}
                </button>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{m.description}</span>
                  <span className="block text-xs text-muted">
                    {formatPct(m.percentage)}
                    {m.dueDate && <> · vence {formatDate(m.dueDate)}</>}
                    {m.paid && m.paidAt && <> · pagado el {formatDate(m.paidAt)}</>}
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className={`block font-mono text-sm ${m.paid ? 'text-success' : 'text-ghost'}`}>{formatEUR(summary.amounts[i])}</span>
                  <span className={`mt-0.5 inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${
                    m.paid ? 'bg-success/15 text-success' : 'bg-[#F59E0B]/15 text-[#FCD34D]'}`}>
                    {m.paid ? 'Pagado' : 'Pendiente'}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
        <PaymentSummary data={summary} />
      </Block>

      <Block id="pd-notes" title="Notas" icon={<StickyNote size={16} />} extra={notes.length || undefined}>
        {notesError ? (
          <p className="text-sm text-danger">{notesError}</p>
        ) : notes.length === 0 ? (
          <p className="text-sm text-muted">Este proyecto no tiene notas. Créalas desde «Editar» o desde la pantalla Notas.</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {notes.map((n) => (
              <li key={n.id}><NoteCard note={n} compact onSave={(v) => onNoteSave(n.id, v)} onDelete={() => onNoteDelete(n)} /></li>
            ))}
          </ul>
        )}
      </Block>

      <Block id="pd-files" title="Ficheros adjuntos" icon={<Paperclip size={16} />}>
        <AttachmentsPanel idPrefix="pd-files" owner={{ kind: 'project', id: p.id }} />
      </Block>

      <div className="mt-1 flex justify-end gap-2">
        <button onClick={onClose} className="btn-ghost flex-1 sm:flex-none">Cerrar</button>
        <button onClick={onEdit} className="btn-primary flex-1 sm:flex-none"><Pencil size={16} /> Editar</button>
      </div>
    </div>
  )
}
