import { LogOut, Menu } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import { DEFAULT_UNIVERSITY_LOGO } from '../../constants'
import { supabase } from '../../lib/supabaseClient'
import { useAuthStore } from '../../store/authStore'
import { useUiStore } from '../../store/uiStore'
import { useAuth } from '../../hooks/useAuth'

export default function TopBar({ role }) {
  const user = useAuthStore((state) => state.user)
  const studentSession = useAuthStore((state) => state.studentSession)
  const toggleSidebar = useUiStore((state) => state.toggleSidebar)

  const { logout } = useAuth()

  const [hallInfo, setHallInfo] = useState(null)

  const hallId = user?.hall_id ?? studentSession?.hall_id

  useEffect(() => {
    let mounted = true

    const loadHallInfo = async () => {
      if (!hallId) {
        setHallInfo(null)
        return
      }

      const { data } = await supabase
        .from('halls')
        .select('name, university_name, university_logo_url')
        .eq('id', hallId)
        .single()

      if (mounted) {
        setHallInfo(data ?? null)
      }
    }

    loadHallInfo()

    return () => {
      mounted = false
    }
  }, [hallId])

  const displayName = useMemo(() => user?.name ?? studentSession?.name ?? 'User', [studentSession, user])

  return (
    <header className="fixed left-0 right-0 top-0 z-30 grid h-16 grid-cols-[auto,1fr,auto] items-center bg-primary px-4 text-white shadow lg:left-64 lg:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={toggleSidebar}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/20 bg-white/10 transition hover:bg-white/20 lg:hidden"
          aria-label="Toggle sidebar"
        >
          <Menu className="h-5 w-5" />
        </button>
        <img
          src={hallInfo?.university_logo_url || DEFAULT_UNIVERSITY_LOGO}
          alt={`${hallInfo?.university_name || 'University'} logo`}
          className="h-10 w-12 rounded-md border border-white/20 bg-white/5 object-contain p-1"
        />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">{hallInfo?.university_name || 'University'}</p>
          <p className="truncate text-[11px] uppercase tracking-wider text-white/75">{role || 'portal'}</p>
        </div>
      </div>

      <p className="truncate px-4 text-center text-sm font-semibold text-white/95 sm:text-base">
        {hallInfo?.name || 'Hall'}
      </p>

      <div className="flex items-center gap-3">
        <p className="hidden max-w-[180px] truncate text-sm text-white/90 sm:block">{displayName}</p>
        <button
          type="button"
          onClick={logout}
          className="inline-flex items-center gap-2 rounded-lg border border-white/25 bg-white/10 px-3 py-1.5 text-sm font-medium transition hover:bg-white/20"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </header>
  )
}