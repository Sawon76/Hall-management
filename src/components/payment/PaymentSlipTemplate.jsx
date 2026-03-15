import { format } from 'date-fns'

import { formatMoney, parseBillingMonth } from '../../utils/paymentUtils'

export default function PaymentSlipTemplate({ slip, student, hall }) {
  if (!slip || !student) {
    return null
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-soft">
      <div className="border-b border-slate-100 pb-4">
        <h3 className="text-lg font-bold text-slate-900">Payment Slip Summary</h3>
        <p className="mt-1 text-sm text-slate-600">
          {hall?.university_name || 'University'} | {hall?.name || 'Hall'}
        </p>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
        <Info label="Student ID" value={student.student_id} />
        <Info label="Name" value={student.name} />
        <Info label="Department" value={student.department} />
        <Info label="Batch" value={student.batch} />
        <Info label="Month" value={format(parseBillingMonth(slip.billing_month), 'MMMM yyyy')} />
        <Info label="Status" value={slip.status} />
      </div>

      <div className="mt-5 overflow-hidden rounded-xl border border-slate-200">
        <table className="min-w-full text-sm">
          <tbody>
            {[
              ['No of Meals', slip.no_of_meals],
              ['Meal Charge', formatMoney(slip.meal_charge)],
              ['Other Bills', formatMoney(slip.other_bills)],
              ['Fuel & Spices', formatMoney(slip.fuel_and_spices)],
              ['SVC Charge', formatMoney(slip.svc_charge)],
              ['Hall Rent', formatMoney(slip.hall_rent)],
              ['Total', formatMoney(slip.total)],
              ['Dues', formatMoney(slip.dues)],
              ['Grand Total', formatMoney(slip.grand_total)],
            ].map(([label, value]) => (
              <tr key={label} className="border-t border-slate-100 first:border-t-0">
                <td className="bg-slate-50 px-4 py-2 font-medium text-slate-700">{label}</td>
                <td className="px-4 py-2 text-right text-slate-900">{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Info({ label, value }) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 font-medium text-slate-800">{value || '-'}</p>
    </div>
  )
}