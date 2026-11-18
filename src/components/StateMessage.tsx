import type { ReactNode } from 'react'

export function StateMessage({ title, children, tone = 'muted' }: { title: string; children?: ReactNode; tone?: 'muted' | 'error' }) {
  return (
    <div className={`card px-6 py-12 text-center ${tone === 'error' ? 'border-danger/30' : ''}`} role={tone === 'error' ? 'alert' : undefined}>
      <p className={`font-display text-lg ${tone === 'error' ? 'text-danger' : 'text-ghost'}`}>{title}</p>
      {children && <div className="mt-2 text-sm text-muted">{children}</div>}
    </div>
  )
}
