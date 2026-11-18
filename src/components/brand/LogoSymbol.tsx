import { useId } from 'react'

/** C abstracta formada por una cinta plegada. Original SVG, viewBox 64×64. */
export const SYMBOL_PATH =
  'M58 6H30A26 26 0 0 0 30 58H58L50 46H30A14 14 0 0 1 30 18H50Z'

interface Props {
  size?: number
  /** Monocromo: usa currentColor (blanco sobre oscuro, negro sobre claro). */
  mono?: boolean
  className?: string
  title?: string
}

export function LogoSymbol({ size = 32, mono = false, className, title }: Props) {
  const id = useId()
  const grad = `cloak-grad-${id}`
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={className}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      {!mono && (
        <defs>
          <linearGradient id={grad} x1="8" y1="58" x2="58" y2="6" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#7C3AED" />
            <stop offset="0.55" stopColor="#A855F7" />
            <stop offset="1" stopColor="#D946EF" />
          </linearGradient>
        </defs>
      )}
      <path d={SYMBOL_PATH} fill={mono ? 'currentColor' : `url(#${grad})`} />
      {!mono && (
        <g fill="#fff">
          {/* facetas del pliegue */}
          <path d="M36 6H58L42 12.5Z" opacity="0.28" />
          <path d="M33 53L58 58L46 51Z" opacity="0.18" />
        </g>
      )}
    </svg>
  )
}
