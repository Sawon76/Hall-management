import { Building2, Copy, UserCircle2 } from 'lucide-react'
import { format } from 'date-fns'
import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'

import EmptyState from '../../components/shared/EmptyState'
import LoadingSpinner from '../../components/shared/LoadingSpinner'
import { STUDENT_CATEGORIES } from '../../constants'
import { supabase } from '../../lib/supabaseClient'
import { useAuthStore } from '../../store/authStore'

export default function StudentProfile() {
  const studentSession = useAuthStore((state) => state.studentSession)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    const loadProfile = async () => {
      if (!studentSession?.id) {
        setLoading(false)
        return
      }

      const { data, error } = await supabase.rpc('get_student_profile', {
        p_student_uuid: studentSession.id,
      })

      const profileData = Array.isArray(data) ? data[0] : data

      if (!mounted) {
        return
      }

      if (error) {
        toast.error(error.message || 'Failed to load profile')
        setProfile(null)
      } else {
        setProfile(profileData || null)
      }

      setLoading(false)
    }

    loadProfile()
    return () => {
      mounted = false
    }
  }, [studentSession?.id])

  const initials = useMemo(() => {
    if (!profile?.name) {
      return 'ST'
    }
    return profile.name
      .split(' ')
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || '')
      .join('')
  }, [profile?.name])

  const categoryLabel =
    STUDENT_CATEGORIES.find((item) => item.value === profile?.category)?.label || profile?.category || '-'

  const copyStudentId = async () => {
    if (!profile?.student_id) {
      return
    }

    try {
      await navigator.clipboard.writeText(profile.student_id)
      toast.success('Student ID copied')
    } catch {
      toast.error('Copy failed')
    }
  }

  if (loading) {
    return <LoadingSpinner variant="inline" label="Loading your profile..." />
  }

  if (!profile) {
    return (
      <EmptyState
        icon={UserCircle2}
        title="Profile unavailable"
        description="Your student profile could not be loaded right now."
      />
    )
  }

  return (
    <section className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-soft">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary text-2xl font-bold text-white">
            {initials}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Student Profile</h1>
            <p className="mt-1 text-sm text-slate-600">Read-only account and hall allocation details.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ProfileCard label="Student ID" value={profile.student_id} actionLabel="Copy" onAction={copyStudentId} />
        <ProfileCard label="Full Name" value={profile.name} />
        <ProfileCard label="Department" value={profile.department} />
        <ProfileCard label="Batch" value={profile.batch} />
        <ProfileCard label="Allocated Hall" value={profile.hall_name || '-'} icon={Building2} />
        <ProfileCard label="University" value={profile.university_name || '-'} />
        <ProfileCard label="Student Category" value={categoryLabel} />
        <ProfileCard label="Account Created" value={profile.created_at ? format(new Date(profile.created_at), 'dd MMM yyyy') : '-'} />
      </div>
    </section>
  )
}

function ProfileCard({ label, value, actionLabel, onAction, icon: Icon }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
          <p className="mt-2 text-base font-semibold text-slate-900">{value}</p>
        </div>
        {Icon ? <Icon className="h-5 w-5 text-slate-400" /> : null}
        {actionLabel && onAction ? (
          <button
            type="button"
            onClick={onAction}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
          >
            <Copy className="h-3.5 w-3.5" />
            {actionLabel}
          </button>
        ) : null}
      </div>
    </div>
  )
}