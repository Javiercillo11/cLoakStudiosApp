import { useLayoutEffect, useRef, useState } from 'react'

/**
 * Texto recortado a N líneas. Si no cabe entero, al pasar el ratón (o enfocar con teclado)
 * muestra un globo con el texto completo. Si cabe, no muestra nada extra.
 */
export function ClampedText({ text, className = '' }: { text: string; className?: string }) {
  const ref = useRef<HTMLParagraphElement>(null)
  const [truncated, setTruncated] = useState(false)
  const [tip, setTip] = useState<{ top: number; left: number; above: boolean } | null>(null)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const check = () => setTruncated(el.scrollHeight > el.clientHeight + 1)
    check()
    const ro = new ResizeObserver(check)
    ro.observe(el)
    return () => ro.disconnect()
  }, [text])

  const show = () => {
    const r = ref.current?.getBoundingClientRect()
    if (!truncated || !r) return
    const width = 320
    const above = r.bottom + 180 > window.innerHeight
    setTip({
      top: above ? r.top - 8 : r.bottom + 8,
      left: Math.max(8, Math.min(r.left - 12, window.innerWidth - width - 8)),
      above,
    })
  }
  const hide = () => setTip(null)

  return (
    <>
      <p
        ref={ref}
        className={`line-clamp-2 [overflow-wrap:anywhere] ${truncated ? 'cursor-help' : ''} ${className}`}
        tabIndex={truncated ? 0 : undefined}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        aria-description={truncated ? text : undefined}
      >
        {text}
      </p>
      {tip && (
        <div
          role="tooltip"
          style={{ top: tip.top, left: tip.left, transform: tip.above ? 'translateY(-100%)' : undefined }}
          className="pointer-events-none fixed z-50 w-[min(20rem,calc(100vw-1rem))] whitespace-pre-line [overflow-wrap:anywhere] rounded-control border border-white/10 bg-carbon px-3 py-2 text-sm leading-relaxed text-ghost shadow-xl shadow-black/50"
        >
          {text}
        </div>
      )}
    </>
  )
}
