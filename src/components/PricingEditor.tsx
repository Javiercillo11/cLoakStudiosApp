import { Plus, Trash2 } from 'lucide-react'
import { emptyExtra, validatePricing, type ExtraDraft, type PriceBreakdown } from '../lib/pricing'
import { formatEUR, formatPct } from '../lib/format'
import { FieldError } from './Accordion'

interface Props {
  extras: ExtraDraft[]
  onExtrasChange: (e: ExtraDraft[]) => void
  discount: string
  onDiscountChange: (d: string) => void
  breakdown: PriceBreakdown
  /** Mostrar errores de «falta rellenar» (tras intentar guardar) */
  showErrors: boolean
}

/** Cargos adicionales, descuento en % y precio total calculado (no editable). */
export function PricingEditor({ extras, onExtrasChange, discount, onDiscountChange, breakdown: b, showErrors }: Props) {
  const v = validatePricing(extras, discount)
  const patch = (id: string, values: Partial<ExtraDraft>) =>
    onExtrasChange(extras.map((e) => (e.id === id ? { ...e, ...values } : e)))
  const add = () => {
    const item = emptyExtra()
    onExtrasChange([...extras, item])
    setTimeout(() => document.getElementById(`x-${item.id}-desc`)?.focus(), 30)
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <p className="label mb-0">Cargos adicionales</p>
          <button type="button" onClick={() => add()} className="btn-ghost -mr-2 min-h-9 px-3 text-violet-soft" aria-label="Añadir cargo adicional">
            <Plus size={16} /> Añadir
          </button>
        </div>
        {extras.length === 0 ? (
          <p className="text-xs text-muted">Sin cargos adicionales.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {extras.map((e) => {
              const id = `x-${e.id}`
              const dErr = showErrors ? v.extras[e.id]?.description : undefined
              const aErr = v.extras[e.id]?.amount && (showErrors || e.amount.trim()) ? v.extras[e.id]?.amount : undefined
              return (
                <li key={e.id}>
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <label className="sr-only" htmlFor={`${id}-desc`}>Concepto</label>
                      <input id={`${id}-desc`} className="input" placeholder="Concepto"
                        value={e.description} aria-invalid={!!dErr} onChange={(ev) => patch(e.id, { description: ev.target.value })} />
                    </div>
                    <div className="relative w-24 shrink-0 sm:w-32">
                      <label className="sr-only" htmlFor={`${id}-amount`}>Importe</label>
                      <input id={`${id}-amount`} className="input pr-7 text-right font-mono" inputMode="decimal" placeholder="0"
                        value={e.amount} aria-invalid={!!aErr} onChange={(ev) => patch(e.id, { amount: ev.target.value })} />
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted">€</span>
                    </div>
                    <button type="button" onClick={() => onExtrasChange(extras.filter((x) => x.id !== e.id))}
                      className="btn-icon -mr-2 shrink-0 hover:text-danger" aria-label={`Quitar ${e.description || 'cargo'}`}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <FieldError id={`${id}-err`} message={dErr ?? aErr} />
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* Desglose: el precio total se calcula, no se escribe */}
      <div className="rounded-control border border-white/5 bg-obsidian p-4" aria-live="polite">
        <dl className="flex flex-col gap-2 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-muted">Suma de servicios</dt>
            <dd className="font-mono">{formatEUR(b.services)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted">Cargos adicionales</dt>
            <dd className="font-mono">{b.extras ? `+ ${formatEUR(b.extras)}` : formatEUR(0)}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt>
              <label htmlFor="p-discount" className="text-muted">Descuento</label>
            </dt>
            <dd className="flex min-w-0 items-center gap-2 sm:gap-3">
              <span className="relative w-20 shrink-0 sm:w-24">
                <input id="p-discount" className="input min-h-9 py-1.5 pr-7 text-right font-mono" inputMode="decimal" placeholder="0"
                  value={discount} aria-invalid={!!v.discount} aria-describedby={v.discount ? 'p-discount-err' : undefined}
                  onChange={(e) => onDiscountChange(e.target.value.replace(/[^\d.,-]/g, ''))} />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted">%</span>
              </span>
              <span className="whitespace-nowrap text-right font-mono text-[#FCD34D] sm:min-w-[6.5rem]">
                {b.discount ? `− ${formatEUR(b.discount)}` : formatEUR(0)}
              </span>
            </dd>
          </div>
          <FieldError id="p-discount-err" message={v.discount} />
          <div className="mt-1 flex items-baseline justify-between gap-3 border-t border-white/10 pt-3">
            <dt className="font-medium">
              Precio total
              {b.discountPct > 0 && <span className="block text-xs font-normal text-muted">con {formatPct(b.discountPct)} de descuento</span>}
            </dt>
            <dd id="p-price" tabIndex={-1} className="font-mono text-lg font-semibold text-violet-soft">{formatEUR(b.total)}</dd>
          </div>
        </dl>
      </div>
    </div>
  )
}
