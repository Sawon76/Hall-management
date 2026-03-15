import { format, parse } from 'date-fns'
import { Check, Download, Eye, RotateCcw, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'

import { downloadPaymentSlipPDF, openPaymentSlipPDF } from '../../components/payment/PDFSlipGenerator'
import { supabase } from '../../lib/supabaseClient'
import { useAuthStore } from '../../store/authStore'
import { formatMoney } from '../../utils/paymentUtils'

const parseBillingMonth = (value) => parse(value, 'yyyy-MM', new Date())

export default function PaymentHistory({ portalLabel = 'Provost' }) {
  const user = useAuthStore((state) => state.user)

  const [slips, setSlips] = useState([])
  const [hallInfo, setHallInfo] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [monthFilter, setMonthFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [loading, setLoading] = useState(true)

  const loadHistory = async () => {
    if (!user?.hall_id) {
      setLoading(false)
      return
    }

    setLoading(true)
    const [slipsRes, hallRes] = await Promise.all([
      supabase
        .from('payment_slips')
        .select('*, students(student_id, name, department, batch)')
        .eq('hall_id', user.hall_id)
        .order('billing_month', { ascending: false }),
      supabase.from('halls').select('*').eq('id', user.hall_id).single(),
    ])

    if (slipsRes.error) {
      toast.error(slipsRes.error.message || 'Failed to load payment history')
      setSlips([])
    } else {
      setSlips(slipsRes.data ?? [])
    }

    setHallInfo(hallRes.data ?? null)
    setLoading(false)
  }

  useEffect(() => {
    loadHistory()
  }, [user?.hall_id])

  const monthOptions = useMemo(
    () => ['all', ...new Set(slips.map((slip) => slip.billing_month))],
    [slips],
  )

  const filteredSlips = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase()
    return slips.filter((slip) => {
      const studentId = slip.students?.student_id?.toLowerCase() || ''
      const studentName = slip.students?.name?.toLowerCase() || ''
      const matchesSearch = !normalizedSearch || studentId.includes(normalizedSearch) || studentName.includes(normalizedSearch)
      const matchesMonth = monthFilter === 'all' || slip.billing_month === monthFilter
      const matchesStatus = statusFilter === 'all' || slip.status === statusFilter
      return matchesSearch && matchesMonth && matchesStatus
    })
  }, [monthFilter, searchTerm, slips, statusFilter])

  const updateStatus = async (slip, nextStatus) => {
    const updates = nextStatus === 'paid'
      ? { status: 'paid', paid_at: new Date().toISOString() }
      : { status: 'unpaid', paid_at: null }

    const { error } = await supabase.from('payment_slips').update(updates).eq('id', slip.id)
    if (error) {
      toast.error(error.message || 'Failed to update slip status')
      return
    }

    toast.success(`Slip marked as ${nextStatus}`)
    loadHistory()
  }

  const exportFilteredResults = () => {
    if (!filteredSlips.length) {
      toast.error('No results to export')
      return
    }

    void (async () => {
      const XLSX = await import('xlsx')
      const rows = filteredSlips.map((slip) => ({
        'Student ID': slip.students?.student_id || '-',
        Name: slip.students?.name || '-',
        Month: slip.billing_month,
        Meals: slip.no_of_meals,
        'Meal Charge': Number(slip.meal_charge || 0),
        'Other Bills': Number(slip.other_bills || 0),
        'Fuel & Spices': Number(slip.fuel_and_spices || 0),
        SVC: Number(slip.svc_charge || 0),
        'Hall Rent': Number(slip.hall_rent || 0),
        Total: Number(slip.total || 0),
        Dues: Number(slip.dues || 0),
        'Grand Total': Number(slip.grand_total || 0),
        Status: slip.status,
        'Paid On': slip.paid_at ? format(new Date(slip.paid_at), 'dd MMM yyyy') : '-',
      }))

      const worksheet = XLSX.utils.json_to_sheet(rows)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Payment History')
      XLSX.writeFile(workbook, `payment-history-${portalLabel.toLowerCase()}.xlsx`)
    })().catch(() => {
      toast.error('Failed to export payment history')
    })
  }

  return (
    <section className="space-y-6">
      <header className="rounded-xl border border-slate-200 bg-white p-6 shadow-soft">
        <h1 className="text-2xl font-bold text-slate-900">Payment History</h1>
        <p className="mt-1 text-sm text-slate-600">{portalLabel} view of all student payment slips for this hall.</p>
      </header>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-soft">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
          <label className="relative lg:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search by student ID or name"
              className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-3 text-sm outline-none ring-primary focus:border-primary focus:ring-2"
            />
          </label>
          <select
            value={monthFilter}
            onChange={(event) => setMonthFilter(event.target.value)}
            className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none ring-primary focus:border-primary focus:ring-2"
          >
            {monthOptions.map((month) => (
              <option key={month} value={month}>
                {month === 'all' ? 'All Months' : format(parseBillingMonth(month), 'MMMM yyyy')}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none ring-primary focus:border-primary focus:ring-2"
          >
            <option value="all">All Statuses</option>
            <option value="paid">Paid</option>
            <option value="unpaid">Unpaid</option>
            <option value="dues">Dues</option>
          </select>
        </div>

        <button
          type="button"
          onClick={exportFilteredResults}
          className="mt-4 rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
        >
          Export Filtered Results
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-soft">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              {['Student ID', 'Name', 'Month', 'Meals', 'Meal Charge', 'Other Bills', 'Fuel & Spices', 'SVC', 'Hall Rent', 'Total', 'Dues', 'G/Total', 'Status', 'Paid On', 'Actions'].map((heading) => (
                <th key={heading} className="px-4 py-3 font-semibold whitespace-nowrap">{heading}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={15} className="px-4 py-10 text-center text-slate-500">Loading payment history...</td>
              </tr>
            ) : filteredSlips.length === 0 ? (
              <tr>
                <td colSpan={15} className="px-4 py-10 text-center text-slate-500">No payment history found for the selected filters.</td>
              </tr>
            ) : (
              filteredSlips.map((slip) => (
                <tr key={slip.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-medium text-slate-800">{slip.students?.student_id || '-'}</td>
                  <td className="px-4 py-3">{slip.students?.name || '-'}</td>
                  <td className="px-4 py-3">{format(parseBillingMonth(slip.billing_month), 'MMMM yyyy')}</td>
                  <td className="px-4 py-3">{slip.no_of_meals}</td>
                  <td className="px-4 py-3">{formatMoney(slip.meal_charge)}</td>
                  <td className="px-4 py-3">{formatMoney(slip.other_bills)}</td>
                  <td className="px-4 py-3">{formatMoney(slip.fuel_and_spices)}</td>
                  <td className="px-4 py-3">{formatMoney(slip.svc_charge)}</td>
                  <td className="px-4 py-3">{formatMoney(slip.hall_rent)}</td>
                  <td className="px-4 py-3">{formatMoney(slip.total)}</td>
                  <td className="px-4 py-3">{formatMoney(slip.dues)}</td>
                  <td className="px-4 py-3 font-semibold text-slate-900">{formatMoney(slip.grand_total)}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ${
                      slip.status === 'paid' ? 'bg-green-100 text-green-800' : slip.status === 'dues' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-700'
                    }`}>
                      {slip.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">{slip.paid_at ? format(new Date(slip.paid_at), 'dd MMM yyyy') : '-'}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => openPaymentSlipPDF(slip, slip.students, hallInfo)}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                      >
                        <Eye className="h-3.5 w-3.5" /> View PDF
                      </button>
                      <button
                        type="button"
                        onClick={() => downloadPaymentSlipPDF(slip, slip.students, hallInfo)}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                      >
                        <Download className="h-3.5 w-3.5" /> Download
                      </button>
                      {slip.status !== 'paid' ? (
                        <button
                          type="button"
                          onClick={() => updateStatus(slip, 'paid')}
                          className="inline-flex items-center gap-1 rounded-lg border border-green-300 px-2.5 py-1 text-xs font-medium text-green-700 hover:bg-green-50"
                        >
                          <Check className="h-3.5 w-3.5" /> Mark Paid
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => updateStatus(slip, 'unpaid')}
                          className="inline-flex items-center gap-1 rounded-lg border border-amber-300 px-2.5 py-1 text-xs font-medium text-amber-700 hover:bg-amber-50"
                        >
                          <RotateCcw className="h-3.5 w-3.5" /> Mark Unpaid
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}