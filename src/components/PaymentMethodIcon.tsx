import { Banknote, Landmark, Smartphone } from 'lucide-react'
import type { PaymentMethod } from '../lib/types'

/** Efectivo → billete · Bizum → móvil · Transferencia → banco */
export function PaymentMethodIcon({ method, size = 16 }: { method: PaymentMethod; size?: number }) {
  if (method === 'efectivo') return <Banknote size={size} className="shrink-0 text-success" aria-hidden />
  if (method === 'bizum') return <Smartphone size={size} className="shrink-0 text-sky-300" aria-hidden />
  return <Landmark size={size} className="shrink-0 text-violet-soft" aria-hidden />
}
