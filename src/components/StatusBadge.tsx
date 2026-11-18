import { CodeXml, Rocket, Sparkles, type LucideIcon } from 'lucide-react'
import { STATUS_LABEL, type ProjectStatus } from '../lib/types'

/** Colores de estado: amarillo (nuevo), naranja (en desarrollo), verde (desplegado). Texto claro para contraste sobre carbon. */
export const STATUS_STYLE: Record<ProjectStatus, { badge: string; text: string; hex: string; icon: LucideIcon }> = {
  nuevo: { badge: 'bg-[#EAB308]/15 text-[#FDE047]', text: 'text-[#FDE047]', hex: '#EAB308', icon: Sparkles },
  en_desarrollo: { badge: 'bg-[#F97316]/15 text-[#FDBA74]', text: 'text-[#FDBA74]', hex: '#F97316', icon: CodeXml },
  desplegado: { badge: 'bg-[#16A34A]/15 text-success', text: 'text-success', hex: '#16A34A', icon: Rocket },
}

export function StatusIcon({ status, size = 12, className = '' }: { status: ProjectStatus; size?: number; className?: string }) {
  const Icon = STATUS_STYLE[status].icon
  return <Icon size={size} strokeWidth={2.25} className={`shrink-0 ${className}`} aria-hidden />
}

export function StatusBadge({ status }: { status: ProjectStatus }) {
  const s = STATUS_STYLE[status]
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${s.badge}`}>
      <StatusIcon status={status} />
      {STATUS_LABEL[status]}
    </span>
  )
}
