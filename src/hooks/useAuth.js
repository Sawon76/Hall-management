import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'

import { ROLES } from '../constants'
import { supabase } from '../lib/supabaseClient'
import { useAuthStore } from '../store/authStore'

export const useAuth = () => {
	const navigate = useNavigate()

	const user = useAuthStore((state) => state.user)
	const studentSession = useAuthStore((state) => state.studentSession)
	const clearAuth = useAuthStore((state) => state.clearAuth)

	const role = user?.role ?? (studentSession ? ROLES.STUDENT : null)

	const authState = useMemo(
		() => ({
			user,
			studentSession,
			role,
			isProvost: role === ROLES.PROVOST,
			isStaff: role === ROLES.STAFF,
			isStudent: role === ROLES.STUDENT,
		}),
		[role, studentSession, user],
	)

	const logout = async () => {
		if (user) {
			await supabase.auth.signOut()
		}

		clearAuth()
		navigate('/halls', { replace: true })
	}

	return {
		...authState,
		logout,
	}
}