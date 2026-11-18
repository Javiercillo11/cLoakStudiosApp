/** Símbolo "C" de cLoak Studios (public/logo-mark.png, fondo transparente). */
const SRC = `${import.meta.env.BASE_URL}logo-mark.png`

interface Props {
  size?: number
  className?: string
  title?: string
}

export function LogoSymbol({ size = 32, className = '', title }: Props) {
  return (
    <img
      src={SRC}
      width={size}
      height={size}
      alt={title ?? ''}
      aria-hidden={title ? undefined : true}
      draggable={false}
      className={`shrink-0 select-none object-contain ${className}`}
    />
  )
}
