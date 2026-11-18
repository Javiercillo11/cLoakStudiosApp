import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { Check, ChevronDown, Search, X } from 'lucide-react'

export interface DropdownOption {
  value: string
  label: string
  hint?: string
  icon?: ReactNode
  /** Icono pequeño para la etiqueta del valor elegido (selección múltiple) */
  chipIcon?: ReactNode
}

interface BaseProps {
  id: string
  /** id del <label> visible que nombra el campo */
  labelId?: string
  options: DropdownOption[]
  placeholder?: string
  /** Muestra un buscador dentro del desplegable (por defecto, si hay más de 6 opciones). */
  searchable?: boolean
  emptyText?: string
}
interface SingleProps extends BaseProps {
  multiple?: false
  value: string
  onChange: (value: string) => void
}
interface MultiProps extends BaseProps {
  multiple: true
  value: string[]
  onChange: (value: string[]) => void
}

/**
 * Desplegable propio (selección simple o múltiple) con el estilo de `.input`.
 * El panel usa `position: fixed` para no quedar recortado dentro de modales con scroll.
 */
export function Dropdown(props: SingleProps | MultiProps) {
  const { id, labelId, options, placeholder = 'Selecciona…', emptyText = 'Sin opciones' } = props
  const searchable = props.searchable ?? options.length > 6
  const selected = props.multiple ? props.value : [props.value]
  const isOn = (v: string) => selected.includes(v)

  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const [pos, setPos] = useState<{ top: number; left: number; width: number; maxH: number } | null>(null)
  const triggerRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  const q = query.trim().toLowerCase()
  const visible = q
    ? options.filter((o) => [o.label, o.hint ?? ''].some((t) => t.toLowerCase().includes(q)))
    : options

  const place = () => {
    const r = triggerRef.current?.getBoundingClientRect()
    if (!r) return
    const gap = 6
    const want = Math.min(320, (panelRef.current?.scrollHeight ?? 280) + 2)
    const below = window.innerHeight - r.bottom - gap - 8
    const above = r.top - gap - 8
    const down = below >= want || below >= above
    const maxH = Math.max(160, Math.min(want, down ? below : above))
    setPos({ top: down ? r.bottom + gap : r.top - gap - maxH, left: r.left, width: r.width, maxH })
  }

  useLayoutEffect(() => {
    if (open) place()
  }, [open, visible.length])

  useEffect(() => {
    if (!open) return
    if (searchable) searchRef.current?.focus()
    else listRef.current?.focus()
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node
      if (!panelRef.current?.contains(t) && !triggerRef.current?.contains(t)) setOpen(false)
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

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [active])

  const openMenu = () => {
    setQuery('')
    setActive(Math.max(0, options.findIndex((o) => isOn(o.value))))
    setOpen(true)
  }
  const close = (refocus = true) => {
    setOpen(false)
    if (refocus) triggerRef.current?.focus()
  }

  const pick = (v: string) => {
    if (props.multiple) {
      props.onChange(isOn(v) ? props.value.filter((x) => x !== v) : [...props.value, v])
    } else {
      props.onChange(v)
      close()
    }
  }

  const onPanelKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation() // que no cierre también el Modal
      close()
    } else if (e.key === 'Tab') {
      close(false)
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((i) => Math.min(visible.length - 1, i + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => Math.max(0, i - 1))
    } else if (e.key === 'Enter' && visible[active]) {
      e.preventDefault()
      pick(visible[active].value)
    }
  }

  const chosen = options.filter((o) => isOn(o.value))
  const single = !props.multiple ? chosen[0] : undefined

  return (
    <>
      <div
        ref={triggerRef}
        id={id}
        role="combobox"
        tabIndex={0}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={labelId}
        onClick={() => (open ? close() : openMenu())}
        onKeyDown={(e) => {
          if (['Enter', ' ', 'ArrowDown'].includes(e.key)) { e.preventDefault(); if (!open) openMenu() }
        }}
        className={`input flex min-h-11 cursor-pointer items-center gap-2 sm:min-h-10 ${open ? 'border-violet' : ''}`}
      >
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
          {props.multiple ? (
            chosen.length === 0 ? (
              <span className="text-muted/60">{placeholder}</span>
            ) : (
              chosen.map((o) => (
                <span key={o.value} className="inline-flex max-w-full items-center gap-1 rounded-md bg-violet/15 py-0.5 pl-2 pr-1 text-xs text-ghost">
                  {o.chipIcon}
                  <span className="truncate">{o.label}</span>
                  <button type="button" aria-label={`Quitar ${o.label}`}
                    onClick={(e) => { e.stopPropagation(); pick(o.value) }}
                    className="grid h-5 w-5 place-items-center rounded text-muted hover:bg-white/10 hover:text-ghost">
                    <X size={12} />
                  </button>
                </span>
              ))
            )
          ) : single ? (
            <span className="flex min-w-0 items-center gap-2">
              {single.icon}
              <span className="truncate">{single.label}</span>
              {single.hint && <span className="hidden truncate text-muted min-[400px]:inline">· {single.hint}</span>}
            </span>
          ) : (
            <span className="text-muted/60">{placeholder}</span>
          )}
        </div>
        <ChevronDown size={16} className={`shrink-0 text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
      </div>

      {open && (
        <div
          ref={panelRef}
          onKeyDown={onPanelKey}
          style={{ top: pos?.top ?? -9999, left: pos?.left ?? -9999, width: pos?.width, maxHeight: pos?.maxH }}
          className="fixed z-50 flex flex-col overflow-hidden rounded-control border border-white/10 bg-carbon shadow-xl shadow-black/50"
        >
          {searchable && (
            <div className="relative shrink-0 border-b border-white/5 p-1.5">
              <Search size={14} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
              <input ref={searchRef} type="search" placeholder="Buscar…" aria-label="Buscar"
                value={query} onChange={(e) => { setQuery(e.target.value); setActive(0) }}
                className="w-full rounded-lg bg-white/5 py-2 pl-8 pr-2 text-base text-ghost placeholder:text-muted/60 focus:outline-none sm:text-sm" />
            </div>
          )}
          <ul ref={listRef} role="listbox" tabIndex={-1} aria-labelledby={labelId} aria-multiselectable={props.multiple || undefined}
            aria-activedescendant={visible[active] ? `${id}-opt-${active}` : undefined}
            className="overflow-y-auto overscroll-contain p-1 focus:outline-none">
            {visible.length === 0 && <li className="px-3 py-2.5 text-sm text-muted">{q ? 'Sin resultados' : emptyText}</li>}
            {visible.map((o, i) => {
              const on = isOn(o.value)
              return (
                <li key={o.value} id={`${id}-opt-${i}`} data-index={i} role="option" aria-selected={on}
                  onClick={() => pick(o.value)} onMouseMove={() => setActive(i)}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2.5 text-sm sm:py-2 ${
                    i === active ? 'bg-white/5' : ''}`}>
                  {props.multiple ? (
                    <span className={`grid h-4 w-4 shrink-0 place-items-center rounded border ${on ? 'border-violet bg-violet' : 'border-white/25'}`}>
                      {on && <Check size={12} strokeWidth={3} className="text-white" />}
                    </span>
                  ) : null}
                  {o.icon}
                  <span className="min-w-0 flex-1">
                    <span className={`block truncate ${on ? 'text-ghost' : 'text-ghost/90'}`}>{o.label}</span>
                    {o.hint && <span className="block truncate text-xs text-muted">{o.hint}</span>}
                  </span>
                  {!props.multiple && on && <Check size={14} className="shrink-0 text-violet-soft" />}
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </>
  )
}
