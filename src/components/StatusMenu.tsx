import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { STATUSES, STATUS_LABEL, type ProjectStatus } from '../lib/types'
import { STATUS_STYLE, StatusIcon } from './StatusBadge'

interface Props {
  value: ProjectStatus
  onChange: (status: ProjectStatus) => void | Promise<void>
  label: string
}

/**
 * Badge de estado que despliega un menú propio (sustituye al <select> nativo).
 * El menú se posiciona en `fixed` para no quedar recortado por el scroll de la tabla.
 */
export function StatusMenu({ value, onChange, label }: Props) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const [active, setActive] = useState(0)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([])
  const s = STATUS_STYLE[value]

  const place = () => {
    const r = triggerRef.current?.getBoundingClientRect()
    if (!r) return
    const menuH = menuRef.current?.offsetHeight ?? 132
    const menuW = menuRef.current?.offsetWidth ?? 176
    const below = r.bottom + 6 + menuH <= window.innerHeight
    const left = Math.max(8, Math.min(r.left, window.innerWidth - menuW - 8))
    setPos({ top: below ? r.bottom + 6 : r.top - 6 - menuH, left })
  }

  useLayoutEffect(() => {
    if (open) place()
  }, [open])

  useEffect(() => {
    if (!open) return
    itemRefs.current[active]?.focus()
  }, [open, active])

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (!menuRef.current?.contains(t) && !triggerRef.current?.contains(t)) setOpen(false)
    }
    // En móvil la barra del navegador dispara resize/scroll a menudo: recolocar en vez de cerrar
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

  const toggle = () => {
    setActive(Math.max(0, STATUSES.indexOf(value)))
    setOpen((o) => !o)
  }

  const pick = (status: ProjectStatus) => {
    setOpen(false)
    triggerRef.current?.focus()
    if (status !== value) onChange(status)
  }

  const onMenuKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape' || e.key === 'Tab') {
      e.preventDefault()
      e.stopPropagation() // que Escape no cierre también el Modal contenedor
      setOpen(false)
      triggerRef.current?.focus()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((i) => (i + 1) % STATUSES.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => (i - 1 + STATUSES.length) % STATUSES.length)
    }
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={(e) => { e.stopPropagation(); toggle() }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' && !open) { e.preventDefault(); toggle() }
        }}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full py-1.5 pl-2.5 pr-2 text-xs sm:py-1 font-medium ring-1 ring-inset ring-transparent transition hover:ring-white/15 focus-visible:outline-none focus-visible:ring-violet ${s.badge}`}
      >
        <StatusIcon status={value} />
        {STATUS_LABEL[value]}
        <ChevronDown size={12} className={`opacity-70 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          ref={menuRef}
          role="menu"
          aria-label={label}
          onKeyDown={onMenuKey}
          onClick={(e) => e.stopPropagation()}
          style={{ top: pos?.top ?? -9999, left: pos?.left ?? -9999 }}
          className="fixed z-50 min-w-[11rem] rounded-control border border-white/10 bg-carbon p-1 shadow-xl shadow-black/50"
        >
          <p className="eyebrow px-2.5 pb-1 pt-1.5">Cambiar estado</p>
          {STATUSES.map((st, i) => {
            const selected = st === value
            return (
              <button
                key={st}
                ref={(el) => { itemRefs.current[i] = el }}
                type="button"
                role="menuitemradio"
                aria-checked={selected}
                tabIndex={i === active ? 0 : -1}
                onClick={() => pick(st)}
                onMouseEnter={() => setActive(i)}
                className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-left text-sm sm:py-2 transition-colors focus:outline-none ${
                  i === active ? 'bg-white/5 text-ghost' : 'text-muted'}`}
              >
                <StatusIcon status={st} size={15} className={STATUS_STYLE[st].text} />
                <span className="flex-1">{STATUS_LABEL[st]}</span>
                {selected && <Check size={14} className="text-violet-soft" />}
              </button>
            )
          })}
        </div>
      )}
    </>
  )
}
