import { endOfMonth, format, startOfMonth, subMonths } from 'date-fns'
import { Check, Download, Eye, FileSpreadsheet } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'

import PaymentSlipTemplate from '../../components/payment/PaymentSlipTemplate'
import {
  downloadPaymentSlipPDF,
  openPaymentSlipPDF,
} from '../../components/payment/PDFSlipGenerator'
import { supabase } from '../../lib/supabaseClient'
import { useAuthStore } from '../../store/authStore'
import { formatMoney, generateAllSlips } from '../../utils/paymentUtils'

const INITIAL_FORM = {
  billing_month: format(subMonths(new Date(), 1), 'yyyy-MM'),
  breakfast_meal_charge: '',
  lunch_meal_charge: '',
  dinner_meal_charge: '',
  other_bills: '0',
  fuel_and_spices: '0',
  svc_charge: '0',
  hall_rent: '0',
}

const numberFields = [
  'breakfast_meal_charge',
  'lunch_meal_charge',
  'dinner_meal_charge',
  'other_bills',
  'fuel_and_spices',
  'svc_charge',
  'hall_rent',
]

const getBillingFieldLabel = (fieldName) => {
  if (fieldName === 'breakfast_meal_charge') {
    return 'Breakfast Meal Charge Per Meal'
  }

  if (fieldName === 'lunch_meal_charge') {
    return 'Lunch Meal Charge Per Meal'
  }

  if (fieldName === 'dinner_meal_charge') {
    return 'Dinner Meal Charge Per Meal'
  }

  return fieldName.replaceAll('_', ' ').replace(/\b\w/g, (character) => character.toUpperCase())
}

export default function PaymentSlipGenerator() {
  const user = useAuthStore((state) => state.user)
  const currentMonth = format(new Date(), 'yyyy-MM')
  const latestAllowedMonth = format(subMonths(new Date(), 1), 'yyyy-MM')

  const [billingForm, setBillingForm] = useState(INITIAL_FORM)
  const [hallInfo, setHallInfo] = useState(null)
  const [students, setStudents] = useState([])
  const [slips, setSlips] = useState([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [markingPaidId, setMarkingPaidId] = useState('')
  const [selectedSlipId, setSelectedSlipId] = useState('')

  const loadPageData = async (billingMonth = billingForm.billing_month) => {
    if (!user?.hall_id) {
      setLoading(false)
      return
    }

    setLoading(true)

    const [studentsRes, slipsRes, hallRes, configRes] = await Promise.all([
      supabase
        .from('students')
        .select('id, student_id, name, department, batch, category, hall_id')
        .eq('hall_id', user.hall_id)
        .order('student_id', { ascending: true }),
      supabase
        .from('payment_slips')
        .select('*, students(student_id, name, department, batch)')
        .eq('hall_id', user.hall_id)
        .eq('billing_month', billingMonth)
        .order('student_id', { ascending: true }),
      supabase
        .from('halls')
        .select('*')
        .eq('id', user.hall_id)
        .single(),
      supabase
        .from('billing_configs')
        .select('*')
        .eq('hall_id', user.hall_id)
        .eq('billing_month', billingMonth)
        .maybeSingle(),
    ])

    if (studentsRes.error) {
      toast.error(studentsRes.error.message || 'Failed to load students')
    }

    if (slipsRes.error) {
      toast.error(slipsRes.error.message || 'Failed to load slips')
    }

    setStudents(studentsRes.data ?? [])
    setSlips(slipsRes.data ?? [])
    setHallInfo(hallRes.data ?? null)

    if (configRes.data) {
      setBillingForm({
        billing_month: configRes.data.billing_month,
        breakfast_meal_charge: String(configRes.data.breakfast_meal_charge ?? configRes.data.meal_charge_per_meal ?? ''),
        lunch_meal_charge: String(configRes.data.lunch_meal_charge ?? configRes.data.meal_charge_per_meal ?? ''),
        dinner_meal_charge: String(configRes.data.dinner_meal_charge ?? configRes.data.meal_charge_per_meal ?? ''),
        other_bills: String(configRes.data.other_bills ?? 0),
        fuel_and_spices: String(configRes.data.fuel_and_spices ?? 0),
        svc_charge: String(configRes.data.svc_charge ?? 0),
        hall_rent: String(configRes.data.hall_rent ?? 0),
      })
    }

    setLoading(false)
  }

  useEffect(() => {
    loadPageData(billingForm.billing_month)
  }, [user?.hall_id])

  useEffect(() => {
    setSelectedSlipId((current) => current || slips[0]?.id || '')
  }, [slips])

  const studentsMap = useMemo(
    () => Object.fromEntries(students.map((student) => [student.id, student])),
    [students],
  )

  const selectedSlip = slips.find((slip) => slip.id === selectedSlipId) ?? slips[0] ?? null
  const selectedStudent = selectedSlip
    ? {
        ...studentsMap[selectedSlip.student_id],
        ...selectedSlip.students,
      }
    : null

  const totals = useMemo(
    () =>
      slips.reduce(
        (accumulator, slip) => ({
          no_of_meals: accumulator.no_of_meals + Number(slip.no_of_meals || 0),
          meal_charge: accumulator.meal_charge + Number(slip.meal_charge || 0),
          other_bills: accumulator.other_bills + Number(slip.other_bills || 0),
          fuel_and_spices: accumulator.fuel_and_spices + Number(slip.fuel_and_spices || 0),
          svc_charge: accumulator.svc_charge + Number(slip.svc_charge || 0),
          hall_rent: accumulator.hall_rent + Number(slip.hall_rent || 0),
          total: accumulator.total + Number(slip.total || 0),
          dues: accumulator.dues + Number(slip.dues || 0),
          grand_total: accumulator.grand_total + Number(slip.grand_total || 0),
        }),
        {
          no_of_meals: 0,
          meal_charge: 0,
          other_bills: 0,
          fuel_and_spices: 0,
          svc_charge: 0,
          hall_rent: 0,
          total: 0,
          dues: 0,
          grand_total: 0,
        },
      ),
    [slips],
  )

  const handleChange = (event) => {
    const { name, value } = event.target
    setBillingForm((previous) => ({ ...previous, [name]: value }))
  }

  const generateSlips = async (event) => {
    event.preventDefault()

    if (
      !billingForm.billing_month ||
      !billingForm.breakfast_meal_charge ||
      !billingForm.lunch_meal_charge ||
      !billingForm.dinner_meal_charge
    ) {
      toast.error('Billing month and meal charge per meal for breakfast, lunch and dinner are required')
      return
    }

    if (billingForm.billing_month >= currentMonth) {
      toast.error(`You can only generate slips up to ${latestAllowedMonth}`)
      return
    }

    if (!students.length) {
      toast.error('No students found for this hall')
      return
    }

    setGenerating(true)

    const billingConfig = {
      hall_id: user.hall_id,
      billing_month: billingForm.billing_month,
      breakfast_meal_charge: Number(billingForm.breakfast_meal_charge),
      lunch_meal_charge: Number(billingForm.lunch_meal_charge),
      dinner_meal_charge: Number(billingForm.dinner_meal_charge),
      // Backward compatibility for older DBs where total_meal_charge still exists and is NOT NULL.
      total_meal_charge:
        Number(billingForm.breakfast_meal_charge) +
        Number(billingForm.lunch_meal_charge) +
        Number(billingForm.dinner_meal_charge),
      other_bills: Number(billingForm.other_bills || 0),
      fuel_and_spices: Number(billingForm.fuel_and_spices || 0),
      svc_charge: Number(billingForm.svc_charge || 0),
      hall_rent: Number(billingForm.hall_rent || 0),
      created_by: user.id,
    }

    const configRes = await supabase
      .from('billing_configs')
      .upsert(billingConfig, { onConflict: 'hall_id,billing_month' })

    if (configRes.error) {
      toast.error(configRes.error.message || 'Failed to save billing configuration')
      setGenerating(false)
      return
    }

    const [year, month] = billingForm.billing_month.split('-').map(Number)
    const monthStart = format(startOfMonth(new Date(year, month - 1)), 'yyyy-MM-dd')
    const monthEnd = format(endOfMonth(new Date(year, month - 1)), 'yyyy-MM-dd')
    const studentIds = students.map((student) => student.id)

    const [mealRes, closuresRes, pastSlipsRes] = await Promise.all([
      supabase
        .from('meal_records')
        .select('*')
        .in('student_id', studentIds)
        .gte('date', monthStart)
        .lte('date', monthEnd),
      supabase.from('hall_closures').select('*').eq('hall_id', user.hall_id),
      supabase
        .from('payment_slips')
        .select('*')
        .eq('hall_id', user.hall_id)
        .lt('billing_month', billingForm.billing_month),
    ])

    if (mealRes.error || closuresRes.error || pastSlipsRes.error) {
      toast.error(
        mealRes.error?.message || closuresRes.error?.message || pastSlipsRes.error?.message || 'Failed to gather billing data',
      )
      setGenerating(false)
      return
    }

    const generatedSlips = generateAllSlips(
      billingConfig,
      students,
      mealRes.data ?? [],
      closuresRes.data ?? [],
      pastSlipsRes.data ?? [],
      user.id,
    ).map((slip) => ({
      ...slip,
      generated_at: new Date().toISOString(),
    }))

    const upsertRes = await supabase
      .from('payment_slips')
      .upsert(generatedSlips, { onConflict: 'student_id,billing_month' })

    if (upsertRes.error) {
      toast.error(upsertRes.error.message || 'Failed to generate slips')
      setGenerating(false)
      return
    }

    toast.success('Payment slips generated successfully')
    setGenerating(false)
    await loadPageData(billingForm.billing_month)
  }

  const markAsPaid = async (slipId) => {
    setMarkingPaidId(slipId)
    const { error } = await supabase
      .from('payment_slips')
      .update({ status: 'paid', paid_at: new Date().toISOString() })
      .eq('id', slipId)

    if (error) {
      toast.error(error.message || 'Failed to update payment status')
      setMarkingPaidId('')
      return
    }

    toast.success('Slip marked as paid')
    setMarkingPaidId('')
    await loadPageData(billingForm.billing_month)
  }

  const exportToExcel = () => {
    if (!slips.length) {
      toast.error('No slips available to export')
      return
    }

    void (async () => {
      const XLSX = await import('xlsx')

      const rows = slips.map((slip, index) => ({
        'No.': index + 1,
        'Student ID': slip.students?.student_id || studentsMap[slip.student_id]?.student_id || '-',
        Name: slip.students?.name || studentsMap[slip.student_id]?.name || '-',
        'No of Meals': slip.no_of_meals,
        'Meal Charge': Number(slip.meal_charge || 0),
        'Other Bills': Number(slip.other_bills || 0),
        'Fuel & Spices': Number(slip.fuel_and_spices || 0),
        'SVC Charge': Number(slip.svc_charge || 0),
        'Hall Rent': Number(slip.hall_rent || 0),
        'Total': Number(slip.total || 0),
        'Dues': Number(slip.dues || 0),
        'G/Total': Number(slip.grand_total || 0),
        Status: slip.status,
      }))

      const worksheet = XLSX.utils.json_to_sheet(rows)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Payment Slips')
      XLSX.writeFile(workbook, `payment-slips-${billingForm.billing_month}.xlsx`)
    })().catch(() => {
      toast.error('Failed to export Excel file')
    })
  }

  return (
    <section className="space-y-6">
      <header className="rounded-xl border border-slate-200 bg-white p-6 shadow-soft">
        <h1 className="text-2xl font-bold text-slate-900">Payment Slip Generator</h1>
        <p className="mt-1 text-sm text-slate-600">Configure monthly billing, generate slips, export data, and manage payment status.</p>
      </header>

      <form onSubmit={generateSlips} className="rounded-xl border border-slate-200 bg-white p-6 shadow-soft">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Field label="Billing Month">
            <input
              type="month"
              name="billing_month"
              value={billingForm.billing_month}
              onChange={handleChange}
              max={latestAllowedMonth}
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none ring-primary focus:border-primary focus:ring-2"
            />
          </Field>

          {numberFields.map((fieldName) => (
            <Field key={fieldName} label={getBillingFieldLabel(fieldName)}>
              <input
                type="number"
                min="0"
                step="0.01"
                name={fieldName}
                value={billingForm[fieldName]}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none ring-primary focus:border-primary focus:ring-2"
              />
            </Field>
          ))}
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={generating}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
          >
            <FileSpreadsheet className="h-4 w-4" />
            {generating ? 'Generating...' : 'Save Config & Generate Slips'}
          </button>

          <button
            type="button"
            onClick={() => loadPageData(billingForm.billing_month)}
            className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            Reload Table
          </button>
        </div>
      </form>

      {selectedSlip && selectedStudent && hallInfo ? (
        <PaymentSlipTemplate slip={selectedSlip} student={selectedStudent} hall={hallInfo} />
      ) : null}

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-soft">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Generated Slips</h2>
            <p className="text-sm text-slate-600">Billing month: {billingForm.billing_month}</p>
          </div>
          <button
            type="button"
            onClick={exportToExcel}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            <Download className="h-4 w-4" /> Export to Excel
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                {[
                  'No.',
                  'Student ID',
                  'Name',
                  'No of Meals',
                  'Meal Charge',
                  'Other Bills',
                  'Fuel & Spices',
                  'SVC Charge',
                  'Hall Rent',
                  'Total',
                  'Dues',
                  'G/Total',
                  'Status',
                  'Actions',
                ].map((heading) => (
                  <th key={heading} className="px-3 py-3 font-semibold whitespace-nowrap">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={14} className="px-4 py-10 text-center text-slate-500">
                    Loading payment slips...
                  </td>
                </tr>
              ) : slips.length === 0 ? (
                <tr>
                  <td colSpan={14} className="px-4 py-10 text-center text-slate-500">
                    No payment slips generated for this month yet.
                  </td>
                </tr>
              ) : (
                slips.map((slip, index) => {
                  const student = {
                    ...studentsMap[slip.student_id],
                    ...slip.students,
                  }

                  return (
                    <tr
                      key={slip.id}
                      className={`border-t border-slate-100 ${selectedSlipId === slip.id ? 'bg-blue-50/60' : ''}`}
                    >
                      <td className="px-3 py-3">{index + 1}</td>
                      <td className="px-3 py-3 font-medium text-slate-800">{student.student_id || '-'}</td>
                      <td className="px-3 py-3">{student.name || '-'}</td>
                      <td className="px-3 py-3">{slip.no_of_meals}</td>
                      <td className="px-3 py-3">{formatMoney(slip.meal_charge)}</td>
                      <td className="px-3 py-3">{formatMoney(slip.other_bills)}</td>
                      <td className="px-3 py-3">{formatMoney(slip.fuel_and_spices)}</td>
                      <td className="px-3 py-3">{formatMoney(slip.svc_charge)}</td>
                      <td className="px-3 py-3">{formatMoney(slip.hall_rent)}</td>
                      <td className="px-3 py-3">{formatMoney(slip.total)}</td>
                      <td className="px-3 py-3">{formatMoney(slip.dues)}</td>
                      <td className="px-3 py-3 font-semibold text-slate-900">{formatMoney(slip.grand_total)}</td>
                      <td className="px-3 py-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ${
                            slip.status === 'paid'
                              ? 'bg-green-100 text-green-800'
                              : slip.status === 'dues'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {slip.status}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={async () => {
                              setSelectedSlipId(slip.id)
                              await openPaymentSlipPDF(slip, student, hallInfo)
                            }}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                          >
                            <Eye className="h-3.5 w-3.5" /> View PDF
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              setSelectedSlipId(slip.id)
                              await downloadPaymentSlipPDF(slip, student, hallInfo)
                            }}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                          >
                            <Download className="h-3.5 w-3.5" /> Download
                          </button>
                          {slip.status !== 'paid' && (
                            <button
                              type="button"
                              onClick={() => markAsPaid(slip.id)}
                              disabled={markingPaidId === slip.id}
                              className="inline-flex items-center gap-1 rounded-lg border border-green-300 px-2.5 py-1 text-xs font-medium text-green-700 hover:bg-green-50 disabled:opacity-70"
                            >
                              <Check className="h-3.5 w-3.5" />
                              {markingPaidId === slip.id ? 'Saving...' : 'Mark as Paid'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>

            {slips.length > 0 && (
              <tfoot className="border-t-2 border-slate-200 bg-slate-50 text-sm font-semibold text-slate-800">
                <tr>
                  <td className="px-3 py-3" colSpan={3}>
                    Total
                  </td>
                  <td className="px-3 py-3">{totals.no_of_meals}</td>
                  <td className="px-3 py-3">{formatMoney(totals.meal_charge)}</td>
                  <td className="px-3 py-3">{formatMoney(totals.other_bills)}</td>
                  <td className="px-3 py-3">{formatMoney(totals.fuel_and_spices)}</td>
                  <td className="px-3 py-3">{formatMoney(totals.svc_charge)}</td>
                  <td className="px-3 py-3">{formatMoney(totals.hall_rent)}</td>
                  <td className="px-3 py-3">{formatMoney(totals.total)}</td>
                  <td className="px-3 py-3">{formatMoney(totals.dues)}</td>
                  <td className="px-3 py-3">{formatMoney(totals.grand_total)}</td>
                  <td className="px-3 py-3" colSpan={2} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
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