// useGrouping 'always': en es-ES, sin esto 3000 se escribe "3000,00 €" en lugar de "3.000,00 €"
const eur = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', useGrouping: 'always' } as unknown as Intl.NumberFormatOptions)
const date = new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })

export const formatEUR = (n: number) => eur.format(n)
/** Admite ISO completo o solo fecha (YYYY-MM-DD, interpretada en hora local) */
export const formatDate = (iso: string) => date.format(new Date(/^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso}T00:00:00` : iso))

const pct = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2 })
/** 33.5 → "33,5 %" */
export const formatPct = (n: number) => `${pct.format(n)} %`

/** Tamaño legible: 1536 → "1,5 KB" */
export function formatBytes(bytes: number) {
  const units = ['B', 'KB', 'MB', 'GB']
  let n = bytes
  let i = 0
  while (n >= 1024 && i < units.length - 1) { n /= 1024; i++ }
  return `${new Intl.NumberFormat('es-ES', { maximumFractionDigits: i === 0 ? 0 : 1 }).format(n)} ${units[i]}`
}
