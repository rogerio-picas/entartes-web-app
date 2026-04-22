import { Navigate } from 'react-router-dom'
import { authService } from '../services/authService'

export default function RoleRoute({ roles = [], children }) {
  const user = authService.getUser()
  const role = user?.role ?? null

  if (!role || !roles.includes(role)) {
    if (role === 1) return <Navigate to="/admin/home" replace />
    if (role === 2) return <Navigate to="/docente/home" replace />
    return <Navigate to="/aluno/home" replace />
  }

  return children
}