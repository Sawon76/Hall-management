import { addDays, format, subMonths } from 'date-fns'
import { AlertTriangle, CalendarClock, FileSpreadsheet, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { supabase } from '../../lib/supabaseClient'
import { useAuthStore } from '../../store/authStore'

export default function StaffDashboard() {
  const user = useAuthStore((state) => state.user)

  const [stats, setStats] = useState({
    pendingPayments: 0,
    pendingPaymentsMonthLabel: format(subMonths(new Date(), 1), 'MMMM yyyy'),
    studentsWithDues: 0,
    closuresThisWeek: [],
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    const loadDashboard = async () => {
      if (!user?.hall_id) {
        setLoading(false)
        return
      }

      const now = new Date()
      const latestCompletedMonth = subMonths(now, 1)
      const pendingPaymentsMonth = format(latestCompletedMonth, 'yyyy-MM')
      const pendingPaymentsMonthLabel = format(latestCompletedMonth, 'MMMM yyyy')
      const today = format(now, 'yyyy-MM-dd')
      const weekAhead = format(addDays(now, 7), 'yyyy-MM-dd')

      const [pendingRes, closuresRes, slipsRes] = await Promise.all([
        supabase
          .from('payment_slips')
          .select('id', { count: 'exact', head: true })
          .eq('hall_id', user.hall_id)
          .eq('billing_month', pendingPaymentsMonth)
          .eq('status', 'unpaid'),
        supabase
          .from('hall_closures')
          .select('id, from_date, to_date, reason')
          .eq('hall_id', user.hall_id)
          .gte('from_date', today)
          .lte('from_date', weekAhead)
          .order('from_date', { ascending: true }),
        supabase
          .from('payment_slips')
          .select('student_id, dues, billing_month')
          .eq('hall_id', user.hall_id)
          .order('student_id', { ascending: true })
          .order('billing_month', { ascending: false }),
      ])

      if (!mounted) {
        return
      }

      const latestSlipByStudent = new Map()
      ;(slipsRes.data ?? []).forEach((slip) => {
        if (!latestSlipByStudent.has(slip.student_id)) {
          latestSlipByStudent.set(slip.student_id, slip)
        }
      })

      const studentsWithDues = [...latestSlipByStudent.values()].filter(
        (slip) => Number(slip.dues || 0) > 0,
      ).length

      setStats({
        pendingPayments: pendingRes.count ?? 0,
        pendingPaymentsMonthLabel,
        studentsWithDues,
        closuresThisWeek: closuresRes.data ?? [],
      })
      setLoading(false)
    }

    loadDashboard()

    return () => {
      mounted = false
    }
  }, [user?.hall_id])

  return (
    <section className="space-y-6">
      <header className="rounded-xl border border-slate-200 bg-white p-6 shadow-soft">
        <h1 className="text-2xl font-bold text-slate-900">Staff Dashboard</h1>
        <p className="mt-1 text-sm text-slate-600">Monthly payment and dues monitoring panel.</p>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <DashboardCard
          title={`Pending Payments (${stats.pendingPaymentsMonthLabel})`}
          icon={FileSpreadsheet}
          value={loading ? '...' : stats.pendingPayments}
          color="bg-red-50 text-red-700"
        />
        <DashboardCard
          title="Students with 3+ Month Dues"
          icon={AlertTriangle}
          value={loading ? '...' : stats.studentsWithDues}
          color="bg-amber-50 text-amber-700"
        />
        <DashboardCard
          title="Hall Closure This Week"
          icon={CalendarClock}
          value={loading ? '...' : stats.closuresThisWeek.length}
          color="bg-blue-50 text-blue-700"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-soft">
          <h2 className="text-lg font-semibold text-slate-900">Hall Closure This Week</h2>
          <div className="mt-3 space-y-3">
            {stats.closuresThisWeek.length === 0 ? (
              <p className="text-sm text-slate-500">No closure in the next 7 days.</p>
            ) : (
              stats.closuresThisWeek.map((closure) => (
                <div key={closure.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
                  <p className="font-medium text-slate-800">
                    {format(new Date(closure.from_date), 'dd MMM yyyy')} -{' '}
                    {format(new Date(closure.to_date), 'dd MMM yyyy')}
                  </p>
                  <p className="mt-1 text-slate-600">{closure.reason || 'No reason provided'}</p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-soft">
          <h2 className="text-lg font-semibold text-slate-900">Quick Links</h2>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {[
              { to: '/staff/payment-generator', label: 'Payment Generator', icon: FileSpreadsheet },
              { to: '/staff/create-account', label: 'Create Account', icon: Users },
              { to: '/staff/hall-closure', label: 'Hall Closure', icon: CalendarClock },
            ].map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-primary hover:text-primary"
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function DashboardCard({ title, icon: Icon, value, color }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-soft">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-600">{title}</p>
        <span className={`rounded-lg p-2 ${color}`}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-3 text-3xl font-bold text-slate-900">{value}</p>
    </div>
  )
}