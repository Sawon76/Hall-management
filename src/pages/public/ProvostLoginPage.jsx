import { Eye, EyeOff, Lock, Shield, User } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { ROLES } from '../../constants'
import { supabase } from '../../lib/supabaseClient'
import { useAuthStore } from '../../store/authStore'

export default function ProvostLoginPage() {
  const navigate = useNavigate()

  const user = useAuthStore((state) => state.user)
  const clearAuth = useAuthStore((state) => state.clearAuth)
  const setUser = useAuthStore((state) => state.setUser)
  const setLoading = useAuthStore((state) => state.setLoading)

  const [formData, setFormData] = useState({ email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (user?.role === ROLES.PROVOST) {
      navigate('/provost/dashboard', { replace: true })
    }
  }, [navigate, user])

  const handleInputChange = (event) => {
    const { name, value } = event.target
    setFormData((previous) => ({ ...previous, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setErrorMessage('')
    setSubmitting(true)
    setLoading(true)

    try {
      const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
        email: formData.email.trim(),
        password: formData.password,
      })

      if (signInError) {
        setErrorMessage(signInError.message || 'Login failed. Please try again.')
        return
      }

      const authenticatedUserId = authData.user?.id
      if (!authenticatedUserId) {
        setErrorMessage('Unable to verify account. Please try again.')
        return
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, role, full_name, hall_id')
        .eq('id', authenticatedUserId)
        .single()

      if (profileError || !profile) {
        setErrorMessage('No profile was found for this account.')
        await supabase.auth.signOut()
        return
      }

      if (profile.role !== ROLES.PROVOST) {
        setErrorMessage('Access denied: Not a provost account')
        await supabase.auth.signOut()
        return
      }

      clearAuth()
      setUser({
        id: profile.id,
        role: profile.role,
        name: profile.full_name || 'Provost',
        hall_id: profile.hall_id,
      })

      navigate('/provost/dashboard', { replace: true })
    } catch {
      setErrorMessage('Unexpected error occurred. Please try again.')
    } finally {
      setSubmitting(false)
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 to-blue-900 px-4 py-12">
      <div className="w-full max-w-md rounded-xl border border-white/15 bg-white/95 p-8 shadow-2xl backdrop-blur">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white">
            <Shield className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Hall Management System</h1>
          <span className="mt-3 inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-amber-700">
            Provost Portal
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Username (Email)</span>
            <div className="relative">
              <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                autoComplete="email"
                required
                className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-3 text-sm outline-none ring-primary transition focus:border-primary focus:ring-2"
                placeholder="provost@university.edu"
              />
            </div>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Password</span>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                autoComplete="current-password"
                required
                className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-10 text-sm outline-none ring-primary transition focus:border-primary focus:ring-2"
                placeholder="Enter your password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((previous) => !previous)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-slate-700"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </label>

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {submitting ? 'Signing in...' : 'Login'}
          </button>

          {errorMessage && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {errorMessage}
            </p>
          )}
        </form>

        <p className="mt-6 text-center text-xs text-slate-500">
          Staff account?{' '}
          <Link to="/staff/login" className="font-medium text-secondary hover:underline">
            Login here
          </Link>
        </p>
      </div>
    </div>
  )
}