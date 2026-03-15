import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { format, isValid, parse } from 'date-fns'
import { AlertTriangle, Download } from 'lucide-react'
import toast from 'react-hot-toast'

import { createPaymentSlipBlobUrl, downloadPaymentSlipPDF } from '../../components/payment/PDFSlipGenerator'
import LoadingSpinner from '../../components/shared/LoadingSpinner'
import { DEFAULT_UNIVERSITY_LOGO } from '../../constants'
import { supabase } from '../../lib/supabaseClient'
import { useAuthStore } from '../../store/authStore'
import { formatMoney } from '../../utils/paymentUtils'

const parseBillingMonth = (value) => parse(value, 'yyyy-MM', new Date())
const PDFViewer = lazy(() => import('../../components/payment/PDFViewer'))

const formatBillingMonthLabel = (billingMonth) => {
  if (!billingMonth || typeof billingMonth !== 'string') {
    return '-'
  }

  const parsed = parseBillingMonth(billingMonth)
  if (!isValid(parsed)) {
    return billingMonth
  }

  return format(parsed, 'MMMM yyyy')
}

export default function StudentPayments() {
  const studentSession = useAuthStore((state) => state.studentSession)

  const [slips, setSlips] = useState([])
  const [studentInfo, setStudentInfo] = useState(null)
  const [hallInfo, setHallInfo] = useState(null)
  const [selectedMonth, setSelectedMonth] = useState('')
  const [pdfUrl, setPdfUrl] = useState('')
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    if (!studentSession?.id || !studentSession?.hall_id) {
      setLoading(false)
      return
    }

    setLoading(true)
    const [slipsRes, studentRes] = await Promise.all([
      supabase
        .from('payment_slips')
        .select('*')
        .eq('student_id', studentSession.id)
        .order('billing_month', { ascending: false }),
      supabase.rpc('get_student_profile', {
        p_student_uuid: studentSession.id,
      }),
    ])

    const studentProfile = Array.isArray(studentRes.data) ? studentRes.data[0] : studentRes.data

    if (slipsRes.error) {
      toast.error(slipsRes.error.message || 'Failed to load payment slips')
    }

    if (studentRes.error) {
      toast.error(studentRes.error.message || 'Failed to load student profile')
    }

    setSlips(slipsRes.data ?? [])
    setStudentInfo(
      studentProfile
        ? {
            id: studentProfile.id,
            student_id: studentProfile.student_id,
            name: studentProfile.name,
            department: studentProfile.department,
            batch: studentProfile.batch,
          }
        : null,
    )
    setHallInfo(
      studentProfile
        ? {
            id: studentProfile.hall_id,
            name: studentProfile.hall_name,
            university_name: studentProfile.university_name,
            university_logo_url: studentProfile.university_logo_url || DEFAULT_UNIVERSITY_LOGO,
          }
        : null,
    )
    setSelectedMonth((current) => current || slipsRes.data?.[0]?.billing_month || '')
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [studentSession?.hall_id, studentSession?.id])

  const selectedSlip = slips.find((slip) => slip.billing_month === selectedMonth) ?? slips[0] ?? null

  useEffect(() => {
    let active = true
    let previousUrl = ''

    const buildPdfUrl = async () => {
      if (!selectedSlip || !studentInfo || !hallInfo) {
        setPdfUrl('')
        return
      }

      const nextUrl = await createPaymentSlipBlobUrl(selectedSlip, studentInfo, hallInfo)
      if (!active) {
        URL.revokeObjectURL(nextUrl)
        return
      }

      previousUrl = nextUrl
      setPdfUrl(nextUrl)
    }

    void buildPdfUrl()

    return () => {
      active = false
      if (previousUrl) {
        URL.revokeObjectURL(previousUrl)
      }
    }
  }, [hallInfo, selectedSlip, studentInfo])

  const dueMonths = useMemo(
    () =>
      slips
        .filter((slip) => slip.status !== 'paid' || Number(slip.dues || 0) > 0)
        .map((slip) => formatBillingMonthLabel(slip.billing_month)),
    [slips],
  )

  if (loading) {
    return <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-soft">Loading payment details...</div>
  }

  return (
    <section className="space-y-6">
      {dueMonths.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-amber-800 shadow-soft">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0" />
            <p className="text-sm font-medium">
              You have outstanding dues for: {dueMonths.join(', ')}. Please pay at the hall office.
            </p>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-soft">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <label className="block max-w-sm flex-1 space-y-1.5">
            <span className="text-sm font-medium text-slate-700">Select Billing Month</span>
            <select
              value={selectedMonth}
              onChange={(event) => setSelectedMonth(event.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none ring-primary focus:border-primary focus:ring-2"
            >
              {slips.map((slip) => (
                <option key={slip.id} value={slip.billing_month}>
                  {formatBillingMonthLabel(slip.billing_month)}
                </option>
              ))}
            </select>
          </label>

          {selectedSlip && (
            <button
              type="button"
              onClick={() => downloadPaymentSlipPDF(selectedSlip, studentInfo, hallInfo)}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              <Download className="h-4 w-4" /> Download PDF
            </button>
          )}
        </div>
      </div>

      <Suspense fallback={<LoadingSpinner variant="inline" label="Loading PDF viewer..." />}>
        <PDFViewer fileUrl={pdfUrl} height="60vh" />
      </Suspense>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-soft">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              {['Month', 'No of Meals', 'Meal Charge', 'Other Bills', 'Fuel & Spices', 'SVC', 'Hall Rent', 'Total', 'Dues', 'G/Total', 'Status', 'Actions'].map((heading) => (
                <th key={heading} className="px-4 py-3 font-semibold whitespace-nowrap">{heading}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {slips.length === 0 ? (
              <tr>
                <td colSpan={12} className="px-4 py-10 text-center text-slate-500">No payment slips available yet.</td>
              </tr>
            ) : (
              slips.map((slip) => (
                <tr key={slip.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-medium text-slate-800">{formatBillingMonthLabel(slip.billing_month)}</td>
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
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedMonth(slip.billing_month)}
                        className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                      >
                        View Slip
                      </button>
                      <button
                        type="button"
                        onClick={() => downloadPaymentSlipPDF(slip, studentInfo, hallInfo)}
                        className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                      >
                        Download
                      </button>
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