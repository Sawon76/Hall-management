import { differenceInCalendarDays, format } from 'date-fns'
import { Pencil, PlusCircle, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'

import { supabase } from '../../lib/supabaseClient'
import { useAuthStore } from '../../store/authStore'

const INITIAL_FORM = {
  from_date: '',
  to_date: '',
  reason: '',
}

export default function HallClosureSchedule({ portalLabel = 'Provost' }) {
  const user = useAuthStore((state) => state.user)

  const [formData, setFormData] = useState(INITIAL_FORM)
  const [closures, setClosures] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingClosure, setEditingClosure] = useState(null)

  const loadClosures = async () => {
    if (!user?.hall_id) {
      setLoading(false)
      return
    }

    setLoading(true)
    const { data, error } = await supabase
      .from('hall_closures')
      .select('*')
      .eq('hall_id', user.hall_id)
      .order('from_date', { ascending: false })

    if (error) {
      toast.error(error.message || 'Failed to load hall closures')
      setClosures([])
    } else {
      setClosures(data ?? [])
    }

    setLoading(false)
  }

  useEffect(() => {
    loadClosures()
  }, [user?.hall_id])

  const validateDates = (fromDate, toDate) => {
    if (!fromDate || !toDate) {
      toast.error('Both dates are required')
      return false
    }

    if (new Date(toDate) < new Date(fromDate)) {
      toast.error('To Date must be greater than or equal to From Date')
      return false
    }

    return true
  }

  const submitNewClosure = async (event) => {
    event.preventDefault()
    if (!validateDates(formData.from_date, formData.to_date)) {
      return
    }

    const { error } = await supabase.from('hall_closures').insert({
      hall_id: user.hall_id,
      from_date: formData.from_date,
      to_date: formData.to_date,
      reason: formData.reason.trim(),
      created_by: user.id,
    })

    if (error) {
      toast.error(error.message || 'Failed to add closure')
      return
    }

    toast.success('Hall closure added')
    setFormData(INITIAL_FORM)
    loadClosures()
  }

  const saveEdit = async (event) => {
    event.preventDefault()
    if (!editingClosure || !validateDates(editingClosure.from_date, editingClosure.to_date)) {
      return
    }

    const { error } = await supabase
      .from('hall_closures')
      .update({
        from_date: editingClosure.from_date,
        to_date: editingClosure.to_date,
        reason: editingClosure.reason,
      })
      .eq('id', editingClosure.id)

    if (error) {
      toast.error(error.message || 'Failed to update closure')
      return
    }

    toast.success('Hall closure updated')
    setEditingClosure(null)
    loadClosures()
  }

  const deleteClosure = async (closureId) => {
    const confirmed = window.confirm('Delete this hall closure?')
    if (!confirmed) {
      return
    }

    const { error } = await supabase.from('hall_closures').delete().eq('id', closureId)

    if (error) {
      toast.error(error.message || 'Failed to delete closure')
      return
    }

    toast.success('Hall closure deleted')
    loadClosures()
  }

  return (
    <section className="space-y-6">
      <header className="rounded-xl border border-slate-200 bg-white p-6 shadow-soft">
        <h1 className="text-2xl font-bold text-slate-900">Hall Closure Schedule</h1>
        <p className="mt-1 text-sm text-slate-600">{portalLabel} can define and manage closure date ranges for this hall.</p>
      </header>

      <form onSubmit={submitNewClosure} className="rounded-xl border border-slate-200 bg-white p-6 shadow-soft">
        <div className="mb-4 flex items-center gap-2 text-slate-800">
          <PlusCircle className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Add Closure</h2>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Field label="From Date">
            <input
              type="date"
              value={formData.from_date}
              onChange={(event) => setFormData((previous) => ({ ...previous, from_date: event.target.value }))}
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none ring-primary focus:border-primary focus:ring-2"
            />
          </Field>

          <Field label="To Date">
            <input
              type="date"
              value={formData.to_date}
              onChange={(event) => setFormData((previous) => ({ ...previous, to_date: event.target.value }))}
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none ring-primary focus:border-primary focus:ring-2"
            />
          </Field>

          <Field label="Reason (optional)">
            <textarea
              value={formData.reason}
              onChange={(event) => setFormData((previous) => ({ ...previous, reason: event.target.value }))}
              rows={2}
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none ring-primary focus:border-primary focus:ring-2"
            />
          </Field>
        </div>

        <button
          type="submit"
          className="mt-5 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Save Closure
        </button>
      </form>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-soft">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              {['From Date', 'To Date', 'Duration (days)', 'Reason', 'Created By', 'Actions'].map((heading) => (
                <th key={heading} className="px-4 py-3 font-semibold whitespace-nowrap">{heading}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-slate-500">Loading hall closures...</td>
              </tr>
            ) : closures.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-slate-500">No hall closures scheduled yet.</td>
              </tr>
            ) : (
              closures.map((closure) => (
                <tr key={closure.id} className="border-t border-slate-100">
                  <td className="px-4 py-3">{format(new Date(closure.from_date), 'dd MMM yyyy')}</td>
                  <td className="px-4 py-3">{format(new Date(closure.to_date), 'dd MMM yyyy')}</td>
                  <td className="px-4 py-3">{differenceInCalendarDays(new Date(closure.to_date), new Date(closure.from_date)) + 1}</td>
                  <td className="px-4 py-3">{closure.reason || '-'}</td>
                  <td className="px-4 py-3">{closure.created_by || '-'}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingClosure({ ...closure })}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                      >
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteClosure(closure.id)}
                        className="inline-flex items-center gap-1 rounded-lg border border-red-300 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {editingClosure && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Edit Hall Closure</h3>
              <button type="button" onClick={() => setEditingClosure(null)} className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100">Close</button>
            </div>
            <form onSubmit={saveEdit} className="space-y-4">
              <Field label="From Date">
                <input
                  type="date"
                  value={editingClosure.from_date}
                  onChange={(event) => setEditingClosure((previous) => ({ ...previous, from_date: event.target.value }))}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none ring-primary focus:border-primary focus:ring-2"
                />
              </Field>
              <Field label="To Date">
                <input
                  type="date"
                  value={editingClosure.to_date}
                  onChange={(event) => setEditingClosure((previous) => ({ ...previous, to_date: event.target.value }))}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none ring-primary focus:border-primary focus:ring-2"
                />
              </Field>
              <Field label="Reason">
                <textarea
                  rows={3}
                  value={editingClosure.reason || ''}
                  onChange={(event) => setEditingClosure((previous) => ({ ...previous, reason: event.target.value }))}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none ring-primary focus:border-primary focus:ring-2"
                />
              </Field>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setEditingClosure(null)} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">Cancel</button>
                <button type="submit" className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  )
}

function Field({ label, children }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  )
}