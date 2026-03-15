import { Building2, LogIn } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import LoadingSpinner from '../../components/shared/LoadingSpinner'
import { DEFAULT_UNIVERSITY_LOGO } from '../../constants'
import { supabase } from '../../lib/supabaseClient'
import { useHallStore } from '../../store/hallStore'

export default function HallMasterPage() {
  const halls = useHallStore((state) => state.halls)
  const setHalls = useHallStore((state) => state.setHalls)

  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    let mounted = true

    const loadHalls = async () => {
      setLoading(true)
      const { data, error } = await supabase.from('halls').select('*').order('name')

      if (!mounted) {
        return
      }

      if (error) {
        setErrorMessage(error.message || 'Unable to load halls right now.')
      } else {
        setHalls(data ?? [])
      }

      setLoading(false)
    }

    loadHalls()

    return () => {
      mounted = false
    }
  }, [setHalls])

  const universityContext = useMemo(() => {
    if (!halls.length) {
      return {
        universityName: 'University Hall Administration',
        universityLogo: DEFAULT_UNIVERSITY_LOGO,
      }
    }

    return {
      universityName: halls[0].university_name,
      universityLogo: halls[0].university_logo_url || DEFAULT_UNIVERSITY_LOGO,
    }
  }, [halls])

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-blue-50 to-slate-100 px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <header className="mb-10 rounded-xl border border-slate-200 bg-white px-6 py-8 text-center shadow-soft">
          <img
            src={universityContext.universityLogo}
            alt={`${universityContext.universityName} logo`}
            className="mx-auto mb-4 h-16 w-16 rounded-full border border-slate-200 object-cover"
          />

          <h1 className="text-2xl font-bold text-primary sm:text-3xl">
            {universityContext.universityName}
          </h1>
          <p className="mt-2 text-sm text-slate-600 sm:text-base">
            Student Hall Management Portal
          </p>
          <div className="mx-auto mt-5 h-[3px] w-24 rounded-full bg-accent" />
        </header>

        {loading ? (
          <LoadingSpinner variant="inline" label="Loading halls..." />
        ) : errorMessage ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </p>
        ) : halls.length === 0 ? (
          <p className="rounded-xl border border-slate-200 bg-white px-4 py-5 text-center text-slate-500 shadow-soft">
            No halls are available yet. Please contact administration.
          </p>
        ) : (
          <section className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {halls.map((hall) => (
              <article
                key={hall.id}
                className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-md transition hover:-translate-y-0.5 hover:shadow-xl"
              >
                {hall.image_url ? (
                  <img
                    src={hall.image_url}
                    alt={hall.name}
                    className="h-44 w-full object-cover"
                  />
                ) : (
                  <div className="flex h-44 w-full items-center justify-center bg-slate-100 text-slate-400">
                    <Building2 className="h-12 w-12" />
                  </div>
                )}

                <div className="space-y-2 p-5">
                  <h2 className="text-lg font-bold text-slate-900">{hall.name}</h2>
                  <p className="text-sm text-slate-500">{hall.university_name}</p>
                  <Link
                    to={`/hall/${hall.id}/login`}
                    className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    <LogIn className="h-4 w-4" />
                    Student Login
                  </Link>
                </div>
              </article>
            ))}
          </section>
        )}

        <footer className="mt-8 text-center text-xs text-slate-500">
          <Link to="/staff/login" className="font-medium text-secondary hover:underline">
            Staff Login
          </Link>
          <span className="mx-2">|</span>
          <Link to="/admin/login" className="font-medium text-secondary hover:underline">
            Provost Login
          </Link>
        </footer>
      </div>
    </main>
  )
}