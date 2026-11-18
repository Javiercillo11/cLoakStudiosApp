import { Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from '../hooks/useAuth'
import { LogoSymbol } from './brand/LogoSymbol'

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth()
  if (loading)
    return (
      <div className="grid h-full place-items-center">
        <LogoSymbol size={40} className="animate-pulse" />
      </div>
    )
  if (!session) return <Navigate to="/login" replace />
  return <>{children}</>
}
