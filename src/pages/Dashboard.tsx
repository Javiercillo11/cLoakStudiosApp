import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useTable } from '../hooks/useTable'
import { STATUSES, STATUS_LABEL, type Project, type Service } from '../lib/types'
import { formatDate, formatEUR } from '../lib/format'
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

const monthFmt = new Intl.DateTimeFormat('es-ES', { month: 'short' })

export function Dashboard() {
  const projects = useTable<Project>('projects', '*, project_services(service_id)')
  const services = useTable<Service>('services')

  const stats = useMemo(() => {
    const price = new Map(services.rows.map((s) => [s.id, Number(s.price)]))
    const value = (p: Project) => p.project_services.reduce((sum, x) => sum + (price.get(x.service_id) ?? 0), 0)
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
          <section aria-label="Indicadores" className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <Kpi label="Proyectos" value={total} hint={`${stats.byStatus.en_desarrollo} en desarrollo`} />
            <Kpi label="Facturado" value={formatEUR(stats.billed)} hint="Servicios de proyectos desplegados" />
            <Kpi label="Pipeline" value={formatEUR(stats.pipeline)} hint="Nuevos + en desarrollo" />
            <Kpi label="Servicios" value={services.rows.length} hint={`Precio medio ${formatEUR(stats.avgTicket)}`} />
          </section>

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
