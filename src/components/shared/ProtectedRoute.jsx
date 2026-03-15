import { Navigate, Outlet } from 'react-router-dom'

import { ROLES } from '../../constants'
import { useAuthStore } from '../../store/authStore'

export default function ProtectedRoute({ allowedRoles = [], redirectTo = '/halls', children }) {
  const user = useAuthStore((state) => state.user)
  const studentSession = useAuthStore((state) => state.studentSession)

  const allowsStudent = allowedRoles.includes(ROLES.STUDENT)
  const hasRoleAccess = Boolean(user?.role && allowedRoles.includes(user.role))
  const hasStudentAccess = allowsStudent && Boolean(studentSession)

  if (!hasRoleAccess && !hasStudentAccess) {
    return <Navigate to={redirectTo} replace />
  }

  return children ?? <Outlet />
}