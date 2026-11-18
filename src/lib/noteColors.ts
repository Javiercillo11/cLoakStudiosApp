import type { NoteColor } from './types'

export const NOTE_COLORS: Record<NoteColor, { card: string; swatch: string; label: string }> = {
  violet: { card: 'bg-violet/15 border-violet/30', swatch: 'bg-violet', label: 'Violeta' },
  lavender: { card: 'bg-violet-soft/10 border-violet-soft/25', swatch: 'bg-violet-soft', label: 'Lavanda' },
  amber: { card: 'bg-amber-400/10 border-amber-400/25', swatch: 'bg-amber-400', label: 'Ámbar' },
  emerald: { card: 'bg-emerald-400/10 border-emerald-400/25', swatch: 'bg-emerald-400', label: 'Verde' },
  rose: { card: 'bg-rose-400/10 border-rose-400/25', swatch: 'bg-rose-400', label: 'Rosa' },
  sky: { card: 'bg-sky-400/10 border-sky-400/25', swatch: 'bg-sky-400', label: 'Azul' },
}
