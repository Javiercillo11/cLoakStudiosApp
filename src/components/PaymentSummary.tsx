import type { PaymentSummaryData } from '../lib/milestones'
import { formatEUR, formatPct } from '../lib/format'

/** Resumen económico: total, cobrado, pendiente y porcentajes. Se calcula, nunca se escribe a mano. */
export function PaymentSummary({ data }: { data: PaymentSummaryData }) {
  return (
    <div className="rounded-control border border-white/5 bg-obsidian p-4" aria-live="polite">
      <p className="eyebrow mb-3">Resumen económico</p>
      <div className="mb-3 flex h-2 overflow-hidden rounded-full bg-white/10" role="img"
        aria-label={`Cobrado ${formatPct(data.collectedPct)}, pendiente ${formatPct(data.pendingPct)}`}>
        <div className="bg-success transition-[width]" style={{ width: `${data.collectedPct}%` }} />
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-3">
        <div className="col-span-2 sm:col-span-1">
          <dt className="text-xs text-muted">Total del proyecto</dt>
          <dd className="font-mono text-ghost">{formatEUR(data.total)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Cobrado · {formatPct(data.collectedPct)}</dt>
          <dd className="font-mono text-success">{formatEUR(data.collected)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Pendiente · {formatPct(data.pendingPct)}</dt>
          <dd className="font-mono text-[#FCD34D]">{formatEUR(data.pending)}</dd>
        </div>
      </dl>
    </div>
  )
}
