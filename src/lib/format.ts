const eur = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' })
const date = new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })

export const formatEUR = (n: number) => eur.format(n)
export const formatDate = (iso: string) => date.format(new Date(iso))
