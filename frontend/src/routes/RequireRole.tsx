import { Navigate, Outlet } from 'react-router-dom'
import { useAuth, type User } from '../auth/AuthContext'

type Role = NonNullable<User['role']>

type Props = {
  roles: Role[]
}

export default function RequireRole({ roles }: Props) {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return <div className="text-sm text-gray-600">Chargement...</div>
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  const role = user.role || 'user'
  if (!roles.includes(role as Role)) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
