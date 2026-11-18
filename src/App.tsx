import { lazy } from 'react'
import type React from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './hooks/useAuth'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Layout } from './components/Layout'
import { Login } from './pages/Login'

/**
 * Tras un despliegue nuevo, una pestaña abierta con la versión anterior pide archivos que ya
 * no existen (404). En ese caso se recarga la página una vez para coger la versión nueva.
 */
const RELOAD_KEY = 'cloak-chunk-reload'
function lazyPage<T extends Record<string, unknown>>(load: () => Promise<T>, name: keyof T) {
  return lazy(async () => {
    try {
      const m = await load()
      try { sessionStorage.removeItem(RELOAD_KEY) } catch { /* sin almacenamiento */ }
      return { default: m[name] as React.ComponentType }
    } catch (err) {
      let already = false
      try { already = sessionStorage.getItem(RELOAD_KEY) === '1'; sessionStorage.setItem(RELOAD_KEY, '1') } catch { /* idem */ }
      if (!already) {
        window.location.reload()
        return new Promise<never>(() => {}) // la página se está recargando
      }
      throw err
    }
  })
}

const Dashboard = lazyPage(() => import('./pages/Dashboard'), 'Dashboard')
const Projects = lazyPage(() => import('./pages/Projects'), 'Projects')
const Services = lazyPage(() => import('./pages/Services'), 'Services')
const Notes = lazyPage(() => import('./pages/Notes'), 'Notes')
const Documentation = lazyPage(() => import('./pages/Documentation'), 'Documentation')

export default function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="proyectos" element={<Projects />} />
            <Route path="servicios" element={<Services />} />
            <Route path="notas" element={<Notes />} />
            <Route path="documentacion" element={<Documentation />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </AuthProvider>
  )
}
