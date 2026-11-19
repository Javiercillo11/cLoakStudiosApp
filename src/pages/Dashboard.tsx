import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, ArrowRight, HardDrive, Inbox } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useTable } from '../hooks/useTable'
import { useNewLeadsCount } from '../hooks/useLeads'
import { STATUSES, STATUS_LABEL, type Project, type Service } from '../lib/types'
import { formatBytes, formatDate, formatEUR, formatPct } from '../lib/format'
import { STORAGE_QUOTA_BYTES, STORAGE_WARN_RATIO, storageUsedBytes } from '../lib/attachments'
import { PageHeader } from '../components/PageHeader'
import { StateMessage } from '../components/StateMessage'
import { StatusBadge, StatusIcon, STATUS_STYLE } from '../components/StatusBadge'

function Kpi({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="card min-w-0 p-4 sm:p-5">
      <p className="eyebrow mb-2 sm:mb-3">{label}</p>
      <p className="break-words font-display text-xl font-semibold tracking-tight min-[400px]:text-2xl sm:text-3xl">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  )
}

/** Aviso cuando los ficheros adjuntos superan el 80 % de la cuota de almacenamiento */
function StorageWarning({ used }: { used: number | null }) {
  if (used === null) return null
  const ratio = used / STORAGE_QUOTA_BYTES
  if (ratio < STORAGE_WARN_RATIO) return null
  const critical = ratio >= 0.95
  const pct = Math.min(100, Math.round(ratio * 100))
  return (
    <section role="alert" aria-labelledby="storage-warning"
      className={`card flex flex-col gap-3 border p-4 sm:flex-row sm:items-center sm:gap-4 sm:p-5 ${
        critical ? 'border-danger/40 bg-danger/10' : 'border-[#F59E0B]/40 bg-[#F59E0B]/10'}`}>
      <AlertTriangle size={22} className={`shrink-0 ${critical ? 'text-danger' : 'text-[#FCD34D]'}`} aria-hidden />
      <div className="min-w-0 flex-1">
        <h2 id="storage-warning" className="text-base font-semibold">
          {ratio >= 1 ? 'Almacenamiento lleno' : `Almacenamiento al ${pct} %`}
        </h2>
        <p className="mt-0.5 text-sm text-muted">
          Los ficheros adjuntos ocupan {formatBytes(used)} de {formatBytes(STORAGE_QUOTA_BYTES)}.
          {' '}Elimina ficheros que ya no necesites o amplía el plan de almacenamiento.
        </p>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10" role="progressbar"
          aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label="Uso del almacenamiento">
          <div className={critical ? 'h-full bg-danger' : 'h-full bg-[#F59E0B]'} style={{ width: `${pct}%` }} />
        </div>
      </div>
      <Link to="/documentacion" className="btn-ghost shrink-0 self-start sm:self-center">Revisar ficheros <ArrowRight size={16} /></Link>
    </section>
  )
}

/** Solicitudes nuevas de la web. No se muestra si la tabla aún no existe (count null). */
function NewLeadsCard({ count }: { count: number | null }) {
  if (count === null) return null
  const any = count > 0
  return (
    <Link to="/solicitudes" aria-labelledby="new-leads"
      className={`card group flex items-center gap-3 p-4 transition-colors hover:border-violet/40 sm:gap-4 sm:p-5 ${
        any ? 'border-[#EAB308]/40 bg-[#EAB308]/[0.06]' : ''}`}>
      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-control ${any ? 'bg-[#EAB308]/15 text-[#FDE047]' : 'bg-violet/15 text-violet-soft'}`}>
        <Inbox size={17} aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <h2 id="new-leads" className="eyebrow">Solicitudes nuevas</h2>
        <p className="font-display text-xl font-semibold tracking-tight">
          {any ? `${count} por revisar` : 'Todo al día'}
        </p>
      </div>
      <span className="btn-ghost shrink-0 group-hover:text-ghost">Ver <ArrowRight size={16} /></span>
    </Link>
  )
}

const mbFmt = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1, useGrouping: 'always' } as unknown as Intl.NumberFormatOptions)
const toMB = (bytes: number) => mbFmt.format(bytes / 1024 / 1024)

/** Uso del almacenamiento de ficheros: % de la cuota y MB usados */
function StorageCard({ used, error }: { used: number | null; error: boolean }) {
  const ratio = used === null ? 0 : used / STORAGE_QUOTA_BYTES
  const pct = Math.min(100, ratio * 100)
  const tone = ratio >= 0.95 ? 'bg-danger' : ratio >= STORAGE_WARN_RATIO ? 'bg-[#F59E0B]' : 'bg-violet'
  return (
    <section className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-6 sm:p-5" aria-labelledby="storage-usage">
      <div className="flex items-center gap-3 sm:w-56 sm:shrink-0">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-control bg-violet/15 text-violet-soft">
          <HardDrive size={17} aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 id="storage-usage" className="eyebrow">Almacenamiento</h2>
          <p className="font-display text-xl font-semibold tracking-tight">
            {error ? '—' : used === null ? '…' : formatPct(pct < 10 ? Math.round(pct * 10) / 10 : Math.round(pct))}
          </p>
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <div className="h-2 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-label="Uso del almacenamiento"
          aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)}>
          <div className={`h-full rounded-full transition-[width] ${tone}`} style={{ width: `${used ? Math.max(pct, 0.5) : 0}%` }} />
        </div>
        <p className="mt-2 text-sm text-muted">
          {error ? 'No se pudo calcular el uso del almacenamiento.' : (
            <><span className="font-mono text-ghost">{used === null ? '…' : toMB(used)} MB</span> usados de {toMB(STORAGE_QUOTA_BYTES)} MB en ficheros adjuntos</>
          )}
        </p>
      </div>
    </section>
  )
}

const monthFmt = new Intl.DateTimeFormat('es-ES', { month: 'short' })

export function Dashboard() {
  const projects = useTable<Project>('projects', '*, project_services(service_id)')
  const services = useTable<Service>('services')
  const [storageUsed, setStorageUsed] = useState<number | null>(null)
  const [storageError, setStorageError] = useState(false)
  useEffect(() => {
    let alive = true
    storageUsedBytes()
      .then((n) => { if (alive) setStorageUsed(n) })
      .catch(() => { if (alive) setStorageError(true) })
    return () => { alive = false }
  }, [])

  const stats = useMemo(() => {
    const value = (p: Project) => Number(p.total_price ?? 0)
    const byStatus = Object.fromEntries(STATUSES.map((s) => [s, 0])) as Record<string, number>
    let billed = 0
    let pipeline = 0
    for (const p of projects.rows) {
      byStatus[p.status]++
      if (p.status === 'desplegado') billed += value(p)
      else pipeline += value(p)
    }
    // proyectos creados en los últimos 6 meses
    const now = new Date()
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1)
      return { key: `${d.getFullYear()}-${d.getMonth()}`, label: monthFmt.format(d), proyectos: 0 }
    })
    for (const p of projects.rows) {
      const d = new Date(p.created_at)
      const m = months.find((x) => x.key === `${d.getFullYear()}-${d.getMonth()}`)
      if (m) m.proyectos++
    }
    const avgTicket = services.rows.length
      ? services.rows.reduce((s, x) => s + Number(x.price), 0) / services.rows.length
      : 0
    return { byStatus, billed, pipeline, months, avgTicket }
  }, [projects.rows, services.rows])

  const total = projects.rows.length
  const newLeads = useNewLeadsCount()
  const error = projects.error || services.error

  return (
    <>
      <PageHeader eyebrow="Resumen" title="Dashboard"
        action={<Link to="/proyectos" className="btn-ghost">Ver proyectos <ArrowRight size={16} /></Link>} />

      {error ? (
        <StateMessage title="No se pudieron cargar los datos" tone="error">{error}</StateMessage>
      ) : projects.loading || services.loading ? (
        <StateMessage title="Cargando…" />
      ) : (
        <div className="flex flex-col gap-4 sm:gap-6">
          <StorageWarning used={storageUsed} />
          <NewLeadsCard count={newLeads} />
          <section aria-label="Indicadores" className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <Kpi label="Proyectos" value={total} hint={`${stats.byStatus.en_desarrollo} en desarrollo`} />
            <Kpi label="Facturado" value={formatEUR(stats.billed)} hint="Precio de proyectos desplegados" />
            <Kpi label="Pipeline" value={formatEUR(stats.pipeline)} hint="Nuevos + en desarrollo" />
            <Kpi label="Servicios" value={services.rows.length} hint={`Precio medio ${formatEUR(stats.avgTicket)}`} />
          </section>

          <StorageCard used={storageUsed} error={storageError} />

          <div className="grid gap-4 sm:gap-6 lg:grid-cols-5">
            <section className="card p-5 lg:col-span-2" aria-labelledby="by-status">
              <h2 id="by-status" className="mb-5 text-lg font-semibold">Proyectos por estado</h2>
              {total === 0 ? (
                <p className="text-sm text-muted">Sin proyectos todavía.</p>
              ) : (
                <>
                  <div className="mb-5 flex h-3 gap-0.5 overflow-hidden rounded-full" role="img"
                    aria-label={STATUSES.map((s) => `${STATUS_LABEL[s]}: ${stats.byStatus[s]}`).join(', ')}>
                    {STATUSES.filter((s) => stats.byStatus[s] > 0).map((s) => (
                      <div key={s} title={`${STATUS_LABEL[s]}: ${stats.byStatus[s]}`}
                        style={{ width: `${(stats.byStatus[s] / total) * 100}%`, background: STATUS_STYLE[s].hex }} />
                    ))}
                  </div>
                  <ul className="flex flex-col gap-3">
                    {STATUSES.map((s) => (
                      <li key={s} className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2 text-muted">
                          <StatusIcon status={s} size={15} className={STATUS_STYLE[s].text} />
                          {STATUS_LABEL[s]}
                        </span>
                        <span className="font-mono text-ghost">
                          {stats.byStatus[s]} <span className="text-muted">· {Math.round((stats.byStatus[s] / total) * 100)}%</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </section>

            <section className="card p-5 lg:col-span-3" aria-labelledby="by-month">
              <h2 id="by-month" className="mb-5 text-lg font-semibold">Nuevos proyectos · últimos 6 meses</h2>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.months} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: '#A1A1AA', fontSize: 12 }} />
                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: '#A1A1AA', fontSize: 12 }} />
                    <Tooltip
                      cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                      contentStyle={{ background: '#18181B', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#F4F4F5' }}
                      labelStyle={{ color: '#A1A1AA' }}
                      itemStyle={{ color: '#F4F4F5' }}
                    />
                    <Bar dataKey="proyectos" name="Proyectos" fill="#8B5CF6" radius={[4, 4, 0, 0]} maxBarSize={36} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
          </div>

          <section className="card p-5" aria-labelledby="latest">
            <h2 id="latest" className="mb-4 text-lg font-semibold">Últimos proyectos</h2>
            {total === 0 ? (
              <p className="text-sm text-muted">Cuando crees proyectos aparecerán aquí.</p>
            ) : (
              <ul className="divide-y divide-white/5">
                {projects.rows.slice(0, 5).map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 py-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{p.client_name}</p>
                      <p className="truncate text-sm text-muted">{p.business_name || '—'}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-mono text-xs text-muted">{formatDate(p.created_at)}</span>
                      <StatusBadge status={p.status} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </>
  )
}
