import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { Check, Loader2 } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { getRemember, getRememberedEmail, isConfigured, setRemember } from '../lib/supabase'
import { Wordmark } from '../components/brand/Wordmark'

export function Login() {
  const { session, signIn } = useAuth()
  const [email, setEmail] = useState(getRememberedEmail)
  const [remember, setRememberState] = useState(getRemember)
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (session) return <Navigate to="/" replace />

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setRemember(remember, email.trim())
    const err = await signIn(email, password)
    if (err) setError(err === 'Invalid login credentials' ? 'Email o contraseña incorrectos.' : err)
    setBusy(false)
  }

  return (
    <div className="relative grid min-h-full place-items-center overflow-hidden px-4 py-12">
      {/* brillo diagonal sutil, guiño a la tarjeta */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-40 -top-40 h-[28rem] w-[28rem] rotate-45 bg-gradient-to-b from-violet/25 to-transparent blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-24 -left-24 h-px w-[40rem] rotate-[-35deg] bg-gradient-to-r from-transparent via-violet/60 to-transparent"
      />

      <div className="relative w-full max-w-sm">
        <Wordmark size="lg" className="mb-10 justify-center" />
        <form onSubmit={submit} className="card p-6 sm:p-8" noValidate>
          <p className="eyebrow mb-2">Área privada</p>
          <h1 className="mb-6 text-2xl font-semibold">Build beyond the visible.</h1>

          {!isConfigured && (
            <p className="mb-4 rounded-control bg-danger/10 p-3 text-sm text-danger" role="alert">
              Falta configurar VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.
            </p>
          )}

          <label className="label" htmlFor="email">Email</label>
          <input id="email" type="email" autoComplete="email" required className="input mb-4"
            autoFocus={!email} value={email} onChange={(e) => setEmail(e.target.value)} />

          <label className="label" htmlFor="password">Contraseña</label>
          <input id="password" type="password" autoComplete="current-password" required className="input mb-4"
            autoFocus={!!email} value={password} onChange={(e) => setPassword(e.target.value)} />

          <label className="mb-6 flex cursor-pointer select-none items-center gap-2.5 text-sm text-muted hover:text-ghost">
            <input type="checkbox" className="peer sr-only" checked={remember}
              onChange={(e) => setRememberState(e.target.checked)} />
            <span aria-hidden
              className="grid h-4 w-4 shrink-0 place-items-center rounded border border-white/25 transition-colors peer-checked:border-violet peer-checked:bg-violet peer-focus-visible:ring-2 peer-focus-visible:ring-violet/60 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-carbon">
              {remember && <Check size={12} strokeWidth={3} className="text-white" />}
            </span>
            Recuérdame
          </label>

          {error && <p className="mb-4 text-sm text-danger" role="alert">{error}</p>}

          <button type="submit" className="btn-primary w-full" disabled={busy || !email || !password}>
            {busy && <Loader2 size={16} className="animate-spin" />} Entrar
          </button>
        </form>
      </div>
    </div>
  )
}
