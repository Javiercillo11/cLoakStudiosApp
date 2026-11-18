import { STATUS_LABEL, type ProjectStatus } from '../lib/types'

/** Colores de estado validados (CVD + contraste) sobre la superficie carbon. */
export const STATUS_STYLE: Record<ProjectStatus, { badge: string; dot: string; hex: string }> = {
  nuevo: { badge: 'bg-[#0B98D6]/15 text-[#7DD3FC]', dot: 'bg-[#0B98D6]', hex: '#0B98D6' },
  en_desarrollo: { badge: 'bg-violet/15 text-violet-soft', dot: 'bg-violet', hex: '#8B5CF6' },
  desplegado: { badge: 'bg-[#16A34A]/15 text-success', dot: 'bg-[#16A34A]', hex: '#16A34A' },
}

export function StatusBadge({ status }: { status: ProjectStatus }) {
  const s = STATUS_STYLE[status]
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${s.badge}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {STATUS_LABEL[status]}
    </span>
  )
}
