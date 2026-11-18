import { lazy } from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './hooks/useAuth'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Layout } from './components/Layout'
import { Login } from './pages/Login'

const Dashboard = lazy(() => import('./pages/Dashboard').then((m) => ({ default: m.Dashboard })))
const Projects = lazy(() => import('./pages/Projects').then((m) => ({ default: m.Projects })))
const Services = lazy(() => import('./pages/Services').then((m) => ({ default: m.Services })))
const Notes = lazy(() => import('./pages/Notes').then((m) => ({ default: m.Notes })))

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
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </AuthProvider>
  )
}
