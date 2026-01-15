import { Navigate, Outlet } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthContext'

export default function RequireAuth() {
  const { user, accessToken, isLoading } = useAuth()
  const hasRefreshToken = (() => {
    try {
      return !!localStorage.getItem('refreshToken') || !!sessionStorage.getItem('refreshToken')
    } catch {
      return false
    }
  })()
  const [waitedTooLong, setWaitedTooLong] = useState(false)

  useEffect(() => {
    if (hasRefreshToken && !isLoading && !user && !waitedTooLong) {
      const timer = setTimeout(() => setWaitedTooLong(true), 2000)
      return () => clearTimeout(timer)
    }
  }, [hasRefreshToken, isLoading, user, waitedTooLong])

  // Si on est en train de charger, on attend
  if (isLoading) {
    return <div className="text-sm text-gray-600">Chargement...</div>
  }

  // Si pas de user mais on a déjà un token, on attend que le contexte reconstruise le profil
  if (!user && (accessToken || hasRefreshToken)) {
    return <div className="text-sm text-gray-600">Chargement...</div>
  }

  // Si pas de user MAIS qu'on a un refreshToken, on attend le refresh
  if (!user) {
    if (hasRefreshToken) {
      // Si on a un refreshToken et qu'on a attendu plus de 2s sans user, on redirige
      if (waitedTooLong) {
        return <Navigate to="/login" replace />
      }
      // Sinon on attend (le refresh est en cours ou vient de finir)
      return <div className="text-sm text-gray-600">Chargement...</div>
    }

    // Pas de refreshToken : on redirige tout de suite
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}