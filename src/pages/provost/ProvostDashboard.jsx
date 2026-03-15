import { AlertTriangle, CalendarClock, GraduationCap, PlusCircle } from 'lucide-react'
import { format } from 'date-fns'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { supabase } from '../../lib/supabaseClient'
import { useAuthStore } from '../../store/authStore'

export default function ProvostDashboard() {
  const user = useAuthStore((state) => state.user)

  const [stats, setStats] = useState({
    totalStudents: 0,
    studentsWithDues: 0,
    upcomingClosures: [],
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    const loadDashboard = async () => {
      if (!user?.hall_id) {
        setLoading(false)
        return
      }

      const today = format(new Date(), 'yyyy-MM-dd')

      const [studentCountRes, duesCountRes, closureRes] = await Promise.all([
        supabase.from('students').select('id', { count: 'exact', head: true }).eq('hall_id', user.hall_id),
        supabase
          .from('payment_slips')
          .select('id', { count: 'exact', head: true })
          .eq('hall_id', user.hall_id)
          .or('status.eq.dues,dues.gt.0'),
        supabase
          .from('hall_closures')
          .select('id, from_date, to_date, reason')
          .eq('hall_id', user.hall_id)
          .gte('from_date', today)
          .order('from_date', { ascending: true })
          .limit(3),
      ])

      if (!mounted) {
        return
      }

      setStats({
        totalStudents: studentCountRes.count ?? 0,
        studentsWithDues: duesCountRes.count ?? 0,
        upcomingClosures: closureRes.data ?? [],
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
        <h1 className="text-2xl font-bold text-slate-900">Provost Dashboard</h1>
        <p className="mt-1 text-sm text-slate-600">Overview of hall accounts, dues, and closure schedules.</p>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <DashboardCard
          title="Total Students"
          icon={GraduationCap}
          value={loading ? '...' : stats.totalStudents}
          color="bg-blue-50 text-blue-700"
        />
        <DashboardCard
          title="Students with Dues"
          icon={AlertTriangle}
          value={loading ? '...' : stats.studentsWithDues}
          color="bg-amber-50 text-amber-700"
        />
        <DashboardCard
          title="Upcoming Hall Closures"
          icon={CalendarClock}
          value={loading ? '...' : stats.upcomingClosures.length}
          color="bg-rose-50 text-rose-700"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-soft">
          <h2 className="text-lg font-semibold text-slate-900">Upcoming Hall Closures</h2>
          <div className="mt-3 space-y-3">
            {stats.upcomingClosures.length === 0 ? (
              <p className="text-sm text-slate-500">No upcoming closure scheduled.</p>
            ) : (
              stats.upcomingClosures.map((closure) => (
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
              { to: '/provost/create-account', label: 'Create Account' },
              { to: '/provost/accounts', label: 'View Accounts' },
              { to: '/provost/payment-history', label: 'Payment History' },
              { to: '/provost/hall-closure', label: 'Hall Closure' },
            ].map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-primary hover:text-primary"
              >
                <PlusCircle className="h-4 w-4" />
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