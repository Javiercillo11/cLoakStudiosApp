import { LogoSymbol } from './LogoSymbol'

interface Props {
  size?: 'sm' | 'lg'
  className?: string
}

/** Símbolo + wordmark "cLoak / STUDIOS", como en la tarjeta. */
export function Wordmark({ size = 'sm', className = '' }: Props) {
  const lg = size === 'lg'
  return (
    <div className={`flex items-center ${lg ? 'gap-4' : 'gap-3'} ${className}`} aria-label="cLoak Studios">
      <LogoSymbol size={lg ? 56 : 34} />
      <span aria-hidden className={`h-8 w-px bg-gradient-to-b from-transparent via-violet to-transparent ${lg ? 'h-12' : ''}`} />
      <span aria-hidden className="flex flex-col leading-none">
        <span className={`font-brand font-bold text-ghost ${lg ? 'text-4xl' : 'text-xl'} tracking-tight`}>cLoak</span>
        <span
          className={`font-brand font-semibold text-violet-soft ${lg ? 'mt-1.5 text-sm tracking-[0.62em]' : 'mt-1 text-[9px] tracking-[0.55em]'}`}
        >
          STUDIOS
        </span>
      </span>
    </div>
  )
}
