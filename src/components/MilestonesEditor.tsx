import { CheckCircle2, Plus, Trash2, AlertTriangle } from 'lucide-react'
import { PAYMENT_METHODS, PAYMENT_METHOD_LABEL, type PaymentMethod } from '../lib/types'
import {
  FULL, assignedHundredths, emptyMilestone, parseHundredths, paymentSummary, validateMilestones, type MilestoneDraft,
} from '../lib/milestones'
import { formatEUR, formatPct } from '../lib/format'
import { Dropdown } from './Dropdown'
import { FieldError } from './Accordion'
import { PaymentSummary } from './PaymentSummary'
import { PaymentMethodIcon } from './PaymentMethodIcon'

interface Props {
  method: PaymentMethod | ''
  onMethodChange: (m: PaymentMethod | '') => void
  methodError?: string
  milestones: MilestoneDraft[]
  onChange: (m: MilestoneDraft[]) => void
  totalPrice: number
  /** Mostrar todos los errores (tras intentar guardar) */
  showErrors: boolean
}

export function MilestonesEditor({ method, onMethodChange, methodError, milestones, onChange, totalPrice, showErrors }: Props) {
  const v = validateMilestones(milestones)
  const assigned = assignedHundredths(milestones)
  const remaining = FULL - assigned
  const summary = paymentSummary(totalPrice, milestones)
  const ok = milestones.length > 0 && assigned === FULL

  const patch = (id: string, values: Partial<MilestoneDraft>) =>
    onChange(milestones.map((m) => (m.id === id ? { ...m, ...values } : m)))

  /** Porcentaje: errores de formato al momento; "falta rellenar" solo tras intentar guardar */
  const pctError = (m: MilestoneDraft) => {
    const e = v.items[m.id]?.percentage
    if (!e) return undefined
    return showErrors || m.percentage.trim() ? e : undefined
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <label id="p-method-label" className="label" htmlFor="p-method">Método de pago</label>
        <Dropdown id="p-method" labelId="p-method-label" placeholder="Selecciona el método de pago" value={method}
          onChange={(x) => onMethodChange(x as PaymentMethod)}
          options={PAYMENT_METHODS.map((m) => ({ value: m, label: PAYMENT_METHOD_LABEL[m], icon: <PaymentMethodIcon method={m} /> }))} />
        <FieldError id="p-method-error" message={methodError} />
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="label mb-0">Hitos de pago</p>
          <button type="button" onClick={() => onChange([...milestones, emptyMilestone()])}
            className="btn-ghost -mr-2 min-h-9 px-3 text-violet-soft" aria-label="Añadir hito de pago">
            <Plus size={16} /> Añadir hito
          </button>
        </div>

        {/* Progreso del reparto, en tiempo real */}
        <div className={`mb-3 rounded-control border p-3 ${ok ? 'border-success/30 bg-success/5' : 'border-[#F59E0B]/30 bg-[#F59E0B]/5'}`}
          aria-live="polite" id="p-milestones-total">
          <div className="mb-2 flex h-1.5 overflow-hidden rounded-full bg-white/10">
            <div className={`transition-[width] ${assigned > FULL ? 'bg-danger' : ok ? 'bg-success' : 'bg-[#F59E0B]'}`}
              style={{ width: `${Math.min(assigned, FULL) / 100}%` }} />
          </div>
          <p className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs">
            <span className="font-mono text-ghost">Asignado {formatPct(assigned / 100)}</span>
            {ok ? (
              <span className="flex items-center gap-1 text-success"><CheckCircle2 size={14} /> Reparto completo</span>
            ) : (
              <span className={`flex items-center gap-1 ${assigned > FULL ? 'text-danger' : 'text-[#FCD34D]'}`}>
                <AlertTriangle size={14} />
                {milestones.length === 0
                  ? 'Añade hitos hasta sumar 100 %'
                  : remaining > 0 ? `Falta distribuir el ${formatPct(remaining / 100)}` : `Sobra un ${formatPct(-remaining / 100)}`}
              </span>
            )}
          </p>
        </div>

        {milestones.length > 0 && (
          <ol className="flex flex-col gap-3">
            {milestones.map((m, i) => {
              const errId = `ms-${m.id}`
              const pErr = pctError(m)
              const dErr = showErrors ? v.items[m.id]?.description : undefined
              const h = parseHundredths(m.percentage)
              return (
                <li key={m.id} className={`rounded-control border bg-obsidian p-3 ${pErr || dErr ? 'border-danger/40' : 'border-white/5'}`}>
                  <div className="grid grid-cols-[1fr_6.5rem] gap-2">
                    <div className="min-w-0">
                      <label className="label" htmlFor={`${errId}-desc`}>Hito {i + 1}</label>
                      <input id={`${errId}-desc`} className="input" placeholder="Ej.: Reserva" value={m.description}
                        aria-invalid={!!dErr} aria-describedby={dErr ? `${errId}-desc-err` : undefined}
                        onChange={(e) => patch(m.id, { description: e.target.value })} />
                      <FieldError id={`${errId}-desc-err`} message={dErr} />
                    </div>
                    <div>
                      <label className="label" htmlFor={`${errId}-pct`}>Porcentaje</label>
                      <div className="relative">
                        <input id={`${errId}-pct`} className="input pr-7 text-right font-mono" inputMode="decimal" placeholder="0"
                          value={m.percentage} aria-invalid={!!pErr} aria-describedby={pErr ? `${errId}-pct-err` : undefined}
                          onChange={(e) => patch(m.id, { percentage: e.target.value.replace(/[^\d.,-]/g, '') })} />
                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted">%</span>
                      </div>
                    </div>
                  </div>
                  <FieldError id={`${errId}-pct-err`} message={pErr} />
                  <div className="mt-2 flex items-end gap-3">
                    <div className="min-w-0 flex-1">
                      <label className="label" htmlFor={`${errId}-date`}>Fecha</label>
                      <input id={`${errId}-date`} type="date" className="input [color-scheme:dark]" value={m.dueDate ?? ''}
                        onChange={(e) => patch(m.id, { dueDate: e.target.value || null })} />
                    </div>
                    <label className="flex min-h-11 shrink-0 cursor-pointer items-center gap-2 text-sm sm:min-h-10">
                      <input type="checkbox" className="h-4 w-4 accent-[#4ADE80]" checked={m.paid}
                        onChange={(e) => patch(m.id, { paid: e.target.checked, paidAt: e.target.checked ? new Date().toISOString() : null })} />
                      Pagado
                    </label>
                  </div>
                  <div className="-mb-1 mt-2 flex items-center justify-between gap-2 border-t border-white/5 pt-1">
                    <span className="flex items-baseline gap-2">
                      <span className="text-xs text-muted">Importe</span>
                      <span className={`font-mono text-sm ${m.paid ? 'text-success' : 'text-ghost'}`}>
                        {h !== null && h > 0 && h <= FULL ? formatEUR(summary.amounts[i]) : '—'}
                      </span>
                    </span>
                    <button type="button" onClick={() => onChange(milestones.filter((x) => x.id !== m.id))}
                      className="btn-icon -mr-2 hover:text-danger" aria-label={`Eliminar hito ${i + 1}`}><Trash2 size={16} /></button>
                  </div>
                </li>
              )
            })}
          </ol>
        )}
        {showErrors && v.total && <p className="mt-2 text-xs text-danger" role="alert">{v.total}</p>}
      </div>

      <PaymentSummary data={summary} />
    </div>
  )
}
