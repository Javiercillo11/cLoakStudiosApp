import { Suspense, useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { Briefcase, LayoutDashboard, LogOut, Menu, StickyNote, Tag, X } from 'lucide-react'
import { Wordmark } from './brand/Wordmark'
import { useAuth } from '../hooks/useAuth'

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/proyectos', label: 'Proyectos', icon: Briefcase },
  { to: '/servicios', label: 'Servicios', icon: Tag },
  { to: '/notas', label: 'Notas', icon: StickyNote },
]

export function Layout() {
  const { session, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  useEffect(() => setOpen(false), [pathname])

  const sidebar = (
    <div className="flex h-full flex-col gap-8 p-5">
      <Wordmark />
      <nav aria-label="Principal" className="flex flex-col gap-1">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `group relative flex items-center gap-3 rounded-control px-3 py-2.5 text-sm transition-colors ${
                isActive ? 'bg-violet/10 text-ghost' : 'text-muted hover:bg-white/5 hover:text-ghost'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-violet" />}
                <Icon size={18} className={isActive ? 'text-violet-soft' : ''} />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto border-t border-white/5 pt-4">
        <p className="eyebrow mb-1">Sesión</p>
        <p className="mb-3 truncate text-sm text-muted" title={session?.user.email}>
          {session?.user.email}
        </p>
        <button onClick={signOut} className="btn-ghost w-full justify-start px-3">
          <LogOut size={16} /> Cerrar sesión
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex min-h-full">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-white/5 bg-carbon lg:block">
        {sidebar}
      </aside>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menú">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 border-r border-white/5 bg-carbon">
            <button onClick={() => setOpen(false)} className="btn-ghost absolute right-3 top-4 p-2" aria-label="Cerrar menú">
              <X size={18} />
            </button>
            {sidebar}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-white/5 bg-obsidian/90 px-4 py-3 backdrop-blur lg:hidden">
          <button onClick={() => setOpen(true)} className="btn-ghost p-2" aria-label="Abrir menú">
            <Menu size={20} />
          </button>
          <Wordmark />
        </header>
        <main className="mx-auto w-full max-w-[var(--content-width)] flex-1 px-4 py-8 sm:px-8 lg:py-12">
          <Suspense fallback={<p className="eyebrow">Cargando…</p>}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  )
}
