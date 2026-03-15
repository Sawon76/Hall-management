import { Eye, EyeOff, LockKeyhole } from 'lucide-react'
import { useState } from 'react'
import toast from 'react-hot-toast'

import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabaseClient'
import { useAuthStore } from '../../store/authStore'

const INITIAL_FORM = {
  current_password: '',
  new_password: '',
  confirm_password: '',
}

export default function ChangePassword() {
  const studentSession = useAuthStore((state) => state.studentSession)
  const setStudentSession = useAuthStore((state) => state.setStudentSession)
  const { logout } = useAuth()

  const [formData, setFormData] = useState(INITIAL_FORM)
  const [showPasswords, setShowPasswords] = useState({
    current_password: false,
    new_password: false,
    confirm_password: false,
  })
  const [fieldErrors, setFieldErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  const validate = () => {
    const nextErrors = {}

    if (!formData.current_password) {
      nextErrors.current_password = 'Current password is required'
    }

    if (!formData.new_password) {
      nextErrors.new_password = 'New password is required'
    } else if (formData.new_password.length < 8 || !/\d/.test(formData.new_password)) {
      nextErrors.new_password = 'New password must be at least 8 characters and include a number'
    }

    if (formData.confirm_password !== formData.new_password) {
      nextErrors.confirm_password = 'Confirm password must match the new password'
    }

    setFieldErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!validate() || !studentSession?.id) {
      return
    }

    setSubmitting(true)

    const { data, error } = await supabase.rpc('student_change_password', {
      p_student_uuid: studentSession.id,
      p_current_password: formData.current_password,
      p_new_password: formData.new_password,
    })

    const updatedStudent = Array.isArray(data) ? data[0] : data

    if (error) {
      toast.error(error?.message || 'Failed to change password')
      setSubmitting(false)
      return
    }

    if (!updatedStudent) {
      setFieldErrors({ current_password: 'Current password is incorrect' })
      setSubmitting(false)
      return
    }

    setStudentSession({
      id: updatedStudent.id,
      student_id: updatedStudent.student_id,
      name: updatedStudent.name,
      hall_id: updatedStudent.hall_id,
      category: updatedStudent.category,
    })

    toast.success('Password updated successfully. You will be redirected to login.')
    setSubmitting(false)
    setTimeout(() => {
      void logout()
    }, 800)
  }

  return (
    <section className="mx-auto max-w-2xl space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-soft">
        <h1 className="text-2xl font-bold text-slate-900">Change Password</h1>
        <p className="mt-1 text-sm text-slate-600">Update your student password securely.</p>
      </div>

      <form onSubmit={handleSubmit} className="rounded-xl border border-slate-200 bg-white p-6 shadow-soft">
        <div className="space-y-4">
          {[
            ['current_password', 'Current Password'],
            ['new_password', 'New Password'],
            ['confirm_password', 'Confirm New Password'],
          ].map(([name, label]) => (
            <label key={name} className="block space-y-1.5">
              <span className="text-sm font-medium text-slate-700">{label}</span>
              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPasswords[name] ? 'text' : 'password'}
                  value={formData[name]}
                  onChange={(event) => {
                    setFormData((previous) => ({ ...previous, [name]: event.target.value }))
                    setFieldErrors((previous) => ({ ...previous, [name]: '' }))
                  }}
                  className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-10 text-sm outline-none ring-primary focus:border-primary focus:ring-2"
                />
                <button
                  type="button"
                  onClick={() =>
                    setShowPasswords((previous) => ({ ...previous, [name]: !previous[name] }))
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                >
                  {showPasswords[name] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {fieldErrors[name] ? <p className="text-xs text-red-600">{fieldErrors[name]}</p> : null}
            </label>
          ))}
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="mt-6 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {submitting ? 'Updating...' : 'Update Password'}
        </button>
      </form>
    </section>
  )
}