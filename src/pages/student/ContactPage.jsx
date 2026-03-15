import { Clock3, Mail, Phone } from 'lucide-react'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'

import { supabase } from '../../lib/supabaseClient'
import { useAuthStore } from '../../store/authStore'

const INITIAL_FORM = {
  subject: '',
  message: '',
}

export default function ContactPage() {
  const studentSession = useAuthStore((state) => state.studentSession)
  const [hallInfo, setHallInfo] = useState(null)
  const [formData, setFormData] = useState(INITIAL_FORM)
  const [fieldErrors, setFieldErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let mounted = true

    const loadHallInfo = async () => {
      if (!studentSession?.hall_id) {
        return
      }

      const { data } = await supabase
        .from('halls')
        .select('name, university_name')
        .eq('id', studentSession.hall_id)
        .single()

      if (mounted) {
        setHallInfo(data ?? null)
      }
    }

    loadHallInfo()
    return () => {
      mounted = false
    }
  }, [studentSession?.hall_id])

  const handleSubmit = async (event) => {
    event.preventDefault()

    const nextErrors = {}
    if (!formData.subject.trim()) {
      nextErrors.subject = 'Subject is required'
    }
    if (!formData.message.trim()) {
      nextErrors.message = 'Message is required'
    }

    setFieldErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0 || !studentSession?.id) {
      return
    }

    setSubmitting(true)
    const { error } = await supabase.from('contact_messages').insert({
      student_id: studentSession.id,
      subject: formData.subject.trim(),
      message: formData.message.trim(),
    })

    if (error) {
      toast.error(error.message || 'Failed to send your message')
      setSubmitting(false)
      return
    }

    toast.success('Message sent to the hall office')
    setFormData(INITIAL_FORM)
    setFieldErrors({})
    setSubmitting(false)
  }

  return (
    <section className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-soft">
        <h1 className="text-2xl font-bold text-slate-900">Contact Hall Office</h1>
        <p className="mt-1 text-sm text-slate-600">Reach the hall office for support, password resets, or billing questions.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr,1.1fr]">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-soft">
          <h2 className="text-lg font-semibold text-slate-900">Hall Office Info</h2>
          <div className="mt-4 space-y-4 text-sm text-slate-600">
            <div>
              <p className="font-medium text-slate-900">{hallInfo?.name || 'Hall Office'}</p>
              <p>{hallInfo?.university_name || 'University Residential Hall'}</p>
            </div>
            <InfoRow icon={Phone} label="Phone" value="+880-2-0000-0000" />
            <InfoRow icon={Mail} label="Email" value="hall.office@university.edu" />
            <InfoRow icon={Clock3} label="Office Hours" value="Sunday - Thursday, 9:00 AM - 5:00 PM" />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="rounded-xl border border-slate-200 bg-white p-6 shadow-soft">
          <h2 className="text-lg font-semibold text-slate-900">Contact Form</h2>
          <div className="mt-4 space-y-4">
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-slate-700">Subject</span>
              <input
                value={formData.subject}
                onChange={(event) => {
                  setFormData((previous) => ({ ...previous, subject: event.target.value }))
                  setFieldErrors((previous) => ({ ...previous, subject: '' }))
                }}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none ring-primary focus:border-primary focus:ring-2"
              />
              {fieldErrors.subject ? <p className="text-xs text-red-600">{fieldErrors.subject}</p> : null}
            </label>

            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-slate-700">Message</span>
              <textarea
                rows={6}
                value={formData.message}
                onChange={(event) => {
                  setFormData((previous) => ({ ...previous, message: event.target.value }))
                  setFieldErrors((previous) => ({ ...previous, message: '' }))
                }}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none ring-primary focus:border-primary focus:ring-2"
              />
              {fieldErrors.message ? <p className="text-xs text-red-600">{fieldErrors.message}</p> : null}
            </label>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="mt-6 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {submitting ? 'Sending...' : 'Send Message'}
          </button>
        </form>
      </div>
    </section>
  )
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3 rounded-lg bg-slate-50 px-4 py-3">
      <Icon className="mt-0.5 h-4 w-4 text-primary" />
      <div>
        <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
        <p className="mt-1 font-medium text-slate-800">{value}</p>
      </div>
    </div>
  )
}