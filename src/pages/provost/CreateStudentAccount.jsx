import { Copy, RefreshCw } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'

import CustomDropdown from '../../components/shared/CustomDropdown'
import { STUDENT_CATEGORIES } from '../../constants'
import { supabase } from '../../lib/supabaseClient'
import { useAuthStore } from '../../store/authStore'
import { hashPassword } from '../../utils/hashUtils'

const makeRandomPassword = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'
  const seed = `${Date.now()}${Math.random()}`.replace('.', '')
  let password = ''

  for (let i = 0; i < 8; i += 1) {
    const index = Number(seed[(i * 2) % seed.length] || i)
    password += chars[(index + i * 7 + Math.floor(Math.random() * chars.length)) % chars.length]
  }

  return password
}

const INITIAL_FORM = {
  student_id: '',
  name: '',
  department: '',
  batch: '',
  hall_id: '',
  category: STUDENT_CATEGORIES[0].value,
}

export default function CreateStudentAccount({ portalLabel }) {
  const user = useAuthStore((state) => state.user)

  const [halls, setHalls] = useState([])
  const [loadingHalls, setLoadingHalls] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState(INITIAL_FORM)
  const [generatedPassword, setGeneratedPassword] = useState(makeRandomPassword())
  const [fieldErrors, setFieldErrors] = useState({})
  const [lastCreated, setLastCreated] = useState(null)

  const actorLabel = useMemo(
    () => portalLabel || (user?.role === 'staff' ? 'Staff' : 'Provost'),
    [portalLabel, user?.role],
  )

  const isHallLocked = Boolean(user?.hall_id)

  useEffect(() => {
    let mounted = true

    const loadHalls = async () => {
      const { data, error } = await supabase.from('halls').select('id, name').order('name')

      if (!mounted) {
        return
      }

      if (error) {
        toast.error(error.message || 'Failed to load halls')
      } else {
        setHalls(data ?? [])
        setFormData((previous) => ({
          ...previous,
          hall_id: user?.hall_id || previous.hall_id || data?.[0]?.id || '',
        }))
      }

      setLoadingHalls(false)
    }

    loadHalls()

    return () => {
      mounted = false
    }
  }, [user?.hall_id])

  const hallOptions = useMemo(() => {
    const options = halls.map((hall) => ({ value: hall.id, label: hall.name }))
    if (!user?.hall_id) {
      return options
    }

    const ownHallOption = options.find((hall) => hall.value === user.hall_id)
    return ownHallOption ? [ownHallOption] : []
  }, [halls, user?.hall_id])

  const validateForm = () => {
    const nextErrors = {}
    const requiredFields = ['student_id', 'name', 'department', 'batch', 'category']

    if (!isHallLocked && !String(formData.hall_id || '').trim()) {
      nextErrors.hall_id = 'This field is required'
    }

    requiredFields.forEach((fieldName) => {
      if (!String(formData[fieldName] || '').trim()) {
        nextErrors[fieldName] = 'This field is required'
      }
    })

    setFieldErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleChange = (event) => {
    const { name, value } = event.target
    setFormData((previous) => ({ ...previous, [name]: value }))
    setFieldErrors((previous) => ({ ...previous, [name]: '' }))
  }

  const handleCopyPassword = async () => {
    try {
      await navigator.clipboard.writeText(generatedPassword)
      toast.success('Password copied')
    } catch {
      toast.error('Copy failed')
    }
  }

  const resetForm = () => {
    const nextPassword = makeRandomPassword()
    setGeneratedPassword(nextPassword)
    setFieldErrors({})
    setLastCreated(null)
    setFormData({
      ...INITIAL_FORM,
      hall_id: user?.hall_id || halls[0]?.id || '',
      category: STUDENT_CATEGORIES[0].value,
    })
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!validateForm()) {
      return
    }

    if (!user?.id) {
      toast.error('Logged in user was not found')
      return
    }

    const effectiveHallId = user?.hall_id || formData.hall_id
    if (!effectiveHallId) {
      toast.error('Your hall assignment is missing. Please contact admin.')
      return
    }

    setSubmitting(true)

    const payload = {
      student_id: formData.student_id.trim(),
      name: formData.name.trim(),
      department: formData.department.trim(),
      batch: formData.batch.trim(),
      hall_id: effectiveHallId,
      category: formData.category,
      password_plain: generatedPassword,
      password_hash: hashPassword(generatedPassword),
      created_by: user.id,
    }

    const { data, error } = await supabase.from('students').insert(payload).select('id, student_id').single()

    if (error) {
      if (error.code === '23505') {
        toast.error('Student ID already exists. Please use a unique ID.')
      } else {
        toast.error(error.message || 'Failed to create account')
      }
      setSubmitting(false)
      return
    }

    setLastCreated({ id: data.student_id, password: generatedPassword })
    toast.success(`Account created: ${data.student_id} | Password: ${generatedPassword}`)
    setSubmitting(false)
  }

  return (
    <section className="mx-auto max-w-3xl space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-soft">
        <h1 className="text-2xl font-bold text-slate-900">Create Student Account</h1>
        <p className="mt-1 text-sm text-slate-600">{actorLabel} portal account creation form</p>
      </div>

      <form onSubmit={handleSubmit} className="rounded-xl border border-slate-200 bg-white p-6 shadow-soft">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Full Student ID" error={fieldErrors.student_id}>
            <input
              name="student_id"
              value={formData.student_id}
              onChange={handleChange}
              placeholder="2021-1-60-001"
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none ring-primary focus:border-primary focus:ring-2"
            />
          </Field>

          <Field label="Full Name" error={fieldErrors.name}>
            <input
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none ring-primary focus:border-primary focus:ring-2"
            />
          </Field>

          <Field label="Department" error={fieldErrors.department}>
            <input
              name="department"
              value={formData.department}
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none ring-primary focus:border-primary focus:ring-2"
            />
          </Field>

          <Field label="Batch (e.g. 2022)" error={fieldErrors.batch}>
            <input
              name="batch"
              value={formData.batch}
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none ring-primary focus:border-primary focus:ring-2"
            />
          </Field>

          <Field label="Allocated Hall" error={fieldErrors.hall_id}>
            <CustomDropdown
              options={hallOptions}
              value={user?.hall_id || formData.hall_id}
              onChange={(nextValue) => {
                if (isHallLocked) {
                  return
                }
                setFormData((previous) => ({ ...previous, hall_id: nextValue }))
                setFieldErrors((previous) => ({ ...previous, hall_id: '' }))
              }}
              placeholder={loadingHalls ? 'Loading halls...' : 'Select hall'}
              searchable
              disabled={loadingHalls || isHallLocked}
            />
          </Field>

          <Field label="Student Category" error={fieldErrors.category}>
            <CustomDropdown
              options={STUDENT_CATEGORIES}
              value={formData.category}
              onChange={(nextValue) => {
                setFormData((previous) => ({ ...previous, category: nextValue }))
                setFieldErrors((previous) => ({ ...previous, category: '' }))
              }}
              placeholder="Select category"
              searchable
            />
          </Field>
        </div>

        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-medium text-slate-700">Generated Password</p>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <input
              value={generatedPassword}
              readOnly
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm"
            />
            <button
              type="button"
              onClick={() => setGeneratedPassword(makeRandomPassword())}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              <RefreshCw className="h-4 w-4" /> Regenerate
            </button>
            <button
              type="button"
              onClick={handleCopyPassword}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              <Copy className="h-4 w-4" /> Copy
            </button>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={submitting || loadingHalls}
            className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {submitting ? 'Creating...' : 'Create Account'}
          </button>

          <button
            type="button"
            onClick={resetForm}
            className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            Create Another
          </button>
        </div>

        {lastCreated && (
          <p className="mt-4 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
            Success. Student ID: {lastCreated.id}, Password: {lastCreated.password}
          </p>
        )}
      </form>
    </section>
  )
}

function Field({ label, error, children }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {children}
      {error ? <span className="text-xs text-red-600">{error}</span> : null}
    </label>
  )
}