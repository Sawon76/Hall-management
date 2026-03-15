import { AlertCircle, Building2, Eye, EyeOff, Lock, UserRound } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { DEFAULT_UNIVERSITY_LOGO } from '../../constants'
import { supabase } from '../../lib/supabaseClient'
import { useAuthStore } from '../../store/authStore'

export default function StudentLoginPage() {
  const { hallId } = useParams()
  const navigate = useNavigate()

  const studentSession = useAuthStore((state) => state.studentSession)
  const clearAuth = useAuthStore((state) => state.clearAuth)
  const setLoading = useAuthStore((state) => state.setLoading)
  const setStudentSession = useAuthStore((state) => state.setStudentSession)

  const [hall, setHall] = useState(null)
  const [loadingHall, setLoadingHall] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [formData, setFormData] = useState({ student_id: '', password: '' })

  useEffect(() => {
    if (studentSession) {
      navigate('/student/home', { replace: true })
    }
  }, [navigate, studentSession])

  useEffect(() => {
    let mounted = true

    const loadHall = async () => {
      if (!hallId) {
        setLoadingHall(false)
        setErrorMessage('Invalid hall login link.')
        return
      }

      const { data, error } = await supabase.from('halls').select('*').eq('id', hallId).single()

      if (!mounted) {
        return
      }

      if (error || !data) {
        setErrorMessage('Hall not found. Please return to Hall Master page.')
      } else {
        setHall(data)
      }

      setLoadingHall(false)
    }

    loadHall()

    return () => {
      mounted = false
    }
  }, [hallId])

  const handleInputChange = (event) => {
    const { name, value } = event.target
    setFormData((previous) => ({ ...previous, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!hallId) {
      setErrorMessage('Invalid hall login link.')
      return
    }

    setErrorMessage('')
    setSubmitting(true)
    setLoading(true)

    try {
      const { data, error } = await supabase.rpc('student_login', {
        p_student_id: formData.student_id.trim(),
        p_hall_id: hallId,
        p_password: formData.password,
      })

      const student = Array.isArray(data) ? data[0] : data

      if (error || !student) {
        setErrorMessage('Invalid student ID or password.')
        return
      }

      clearAuth()
      setStudentSession({
        id: student.id,
        student_id: student.student_id,
        name: student.name,
        hall_id: student.hall_id,
        category: student.category,
      })

      navigate('/student/home', { replace: true })
    } catch {
      setErrorMessage('Unable to login right now. Please try again.')
    } finally {
      setSubmitting(false)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-blue-50 px-4 py-8">
      <div className="mx-auto max-w-4xl space-y-8">
        <header className="rounded-xl border border-slate-200 bg-white p-6 text-center shadow-soft">
          {loadingHall ? (
            <p className="text-slate-500">Loading hall details...</p>
          ) : hall ? (
            <>
              <img
                src={hall.university_logo_url || DEFAULT_UNIVERSITY_LOGO}
                alt={`${hall.university_name} logo`}
                className="mx-auto mb-4 h-16 w-16 rounded-full border border-slate-200 object-cover"
              />
              <h1 className="text-2xl font-bold text-primary">{hall.university_name}</h1>
              <p className="mt-1 text-base font-medium text-slate-600">{hall.name}</p>
            </>
          ) : (
            <div className="flex items-center justify-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              <span>{errorMessage || 'Hall details unavailable.'}</span>
            </div>
          )}
        </header>

        <div className="mx-auto w-full max-w-md rounded-xl border border-slate-200 bg-white p-7 shadow-soft">
          <h2 className="mb-5 text-center text-xl font-semibold text-slate-900">Student Login</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Student ID</span>
              <div className="relative">
                <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  name="student_id"
                  value={formData.student_id}
                  onChange={handleInputChange}
                  required
                  className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-3 text-sm outline-none ring-primary transition focus:border-primary focus:ring-2"
                  placeholder="2021-1-60-001"
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
              disabled={submitting || !hall}
              className="w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {submitting ? 'Signing in...' : 'Login'}
            </button>

            {errorMessage && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {errorMessage}
              </p>
            )}
          </form>

          <p className="mt-5 text-center text-sm text-slate-500">
            <Link to="/halls" className="font-medium text-secondary hover:underline">
              Forgot Password? Contact Hall Office
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}