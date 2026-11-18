import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react'
import { ChevronDown } from 'lucide-react'
import { SERVICE_ICONS, ServiceIcon } from '../lib/serviceIcons'

const KEYS = Object.keys(SERVICE_ICONS)
const COLS = 6

/** Botón compacto con el icono actual; al pulsarlo despliega la cuadrícula de iconos de servicio. */
export function IconPicker({ value, onChange }: { value: string; onChange: (key: string) => void }) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([])

  const place = () => {
    const r = btnRef.current?.getBoundingClientRect()
    if (!r) return
    const w = panelRef.current?.offsetWidth ?? 296
    const h = panelRef.current?.offsetHeight ?? 300
    const down = r.bottom + 6 + h <= window.innerHeight - 8 || r.top < h
    setPos({
      top: down ? r.bottom + 6 : r.top - 6 - h,
      left: Math.max(8, Math.min(r.left, window.innerWidth - w - 8)),
    })
  }

  useLayoutEffect(() => {
    if (open) place()
  }, [open])

  useEffect(() => {
    if (open) itemRefs.current[active]?.focus()
  }, [open, active])

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node
      if (!panelRef.current?.contains(t) && !btnRef.current?.contains(t)) setOpen(false)
    }
    const follow = () => place()
    document.addEventListener('pointerdown', onDown)
    window.addEventListener('resize', follow)
    window.addEventListener('scroll', follow, true)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      window.removeEventListener('resize', follow)
      window.removeEventListener('scroll', follow, true)
    }
  }, [open])

  const close = () => {
    setOpen(false)
    btnRef.current?.focus()
  }

  const onKey = (e: KeyboardEvent) => {
    const move: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: COLS, ArrowUp: -COLS }
    if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation() // que no cierre también el Modal
      close()
    } else if (e.key === 'Tab') {
      setOpen(false)
    } else if (e.key in move) {
      e.preventDefault()
      setActive((i) => Math.min(KEYS.length - 1, Math.max(0, i + move[e.key])))
    }
  }

  const label = SERVICE_ICONS[value]?.label ?? 'Otro'

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => {
          setActive(Math.max(0, KEYS.indexOf(value)))
          setOpen((o) => !o)
        }}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`Icono: ${label}. Cambiar icono`}
        title={label}
        className={`flex h-11 shrink-0 items-center gap-1 rounded-control border bg-obsidian pl-2.5 pr-1.5 text-violet-soft transition-colors sm:h-10 ${
          open ? 'border-violet' : 'border-white/10 hover:border-white/20'}`}
      >
        <ServiceIcon name={value} size={18} />
        <ChevronDown size={14} className={`text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Elegir icono"
          onKeyDown={onKey}
          style={{ top: pos?.top ?? -9999, left: pos?.left ?? -9999 }}
          className="fixed z-50 w-[min(18.5rem,calc(100vw-1rem))] rounded-control border border-white/10 bg-carbon p-2 shadow-xl shadow-black/50"
        >
          <p className="eyebrow mb-2 px-1">{SERVICE_ICONS[KEYS[active]]?.label}</p>
          <div className="grid grid-cols-6 gap-1" role="radiogroup" aria-label="Iconos">
            {KEYS.map((key, i) => {
              const { icon: Icon, label: name } = SERVICE_ICONS[key]
              const on = key === value
              return (
                <button
                  key={key}
                  ref={(el) => { itemRefs.current[i] = el }}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  aria-label={name}
                  title={name}
                  tabIndex={i === active ? 0 : -1}
                  onClick={() => { onChange(key); close() }}
                  onMouseEnter={() => setActive(i)}
                  className={`grid aspect-square place-items-center rounded-lg transition-colors focus:outline-none ${
                    on ? 'bg-violet/25 text-ghost ring-1 ring-inset ring-violet'
                      : i === active ? 'bg-white/10 text-ghost' : 'text-muted hover:text-ghost'}`}
                >
                  <Icon size={18} />
                </button>
              )
            })}
          </div>
        </div>
      )}
    </>
  )
}
