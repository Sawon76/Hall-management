import { format } from 'date-fns'
import { CalendarDays } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'

import DatePickerField from '../ui/date-picker-field'
import { supabase } from '../../lib/supabaseClient'
import { formatMoney } from '../../utils/paymentUtils'
import { createDefaultWeeklyMenuRows, normalizeWeeklyMenuRows } from '../../constants/weeklyMenu'

const INITIAL_PRICES = {
  breakfast_price: 0,
  lunch_price: 0,
  dinner_price: 0,
}

export default function WeeklyMenuReadOnly({ hallId, portalLabel = 'Portal' }) {
  const [menuRows, setMenuRows] = useState(createDefaultWeeklyMenuRows())
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [prices, setPrices] = useState(INITIAL_PRICES)
  const [loadingMenu, setLoadingMenu] = useState(true)
  const [loadingPrices, setLoadingPrices] = useState(true)

  const hasAnyMenu = useMemo(
    () => menuRows.some((row) => row.breakfast || row.lunch || row.dinner),
    [menuRows],
  )

  const loadMenu = async () => {
    if (!hallId) {
      setLoadingMenu(false)
      return
    }

    setLoadingMenu(true)
    const { data, error } = await supabase
      .from('weekly_menus')
      .select('day_of_week, day_name, breakfast, lunch, dinner')
      .eq('hall_id', hallId)
      .order('day_of_week', { ascending: true })

    if (error) {
      toast.error(error.message || 'Failed to load weekly menu')
      setMenuRows(createDefaultWeeklyMenuRows())
      setLoadingMenu(false)
      return
    }

    setMenuRows(normalizeWeeklyMenuRows(data ?? []))
    setLoadingMenu(false)
  }

  const loadPrices = async (date) => {
    if (!hallId || !date) {
      setLoadingPrices(false)
      return
    }

    setLoadingPrices(true)
    const { data, error } = await supabase
      .from('meal_daily_prices')
      .select('breakfast_price, lunch_price, dinner_price')
      .eq('hall_id', hallId)
      .eq('date', date)
      .maybeSingle()

    if (error) {
      toast.error(error.message || 'Failed to load meal prices')
      setPrices(INITIAL_PRICES)
      setLoadingPrices(false)
      return
    }

    setPrices({
      breakfast_price: Number(data?.breakfast_price || 0),
      lunch_price: Number(data?.lunch_price || 0),
      dinner_price: Number(data?.dinner_price || 0),
    })
    setLoadingPrices(false)
  }

  useEffect(() => {
    loadMenu()
  }, [hallId])

  useEffect(() => {
    loadPrices(selectedDate)
  }, [hallId, selectedDate])

  return (
    <section className="space-y-6">
      <header className="rounded-xl border border-slate-200 bg-white p-6 shadow-soft">
        <h1 className="text-2xl font-bold text-slate-900">Weekly Menu</h1>
        <p className="mt-1 text-sm text-slate-600">
          {portalLabel} view. Menu stays active every week until staff updates it.
        </p>
      </header>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-soft">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-700">
            <tr>
              {['Day', 'Breakfast', 'Lunch', 'Dinner'].map((heading) => (
                <th key={heading} className="px-4 py-3 font-semibold whitespace-nowrap">{heading}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loadingMenu ? (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-slate-500">Loading weekly menu...</td>
              </tr>
            ) : !hasAnyMenu ? (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-slate-500">No weekly menu configured yet by staff.</td>
              </tr>
            ) : (
              menuRows.map((row) => (
                <tr key={row.day_of_week} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-semibold text-slate-800">{row.day_name}</td>
                  <td className="px-4 py-3">{row.breakfast || '-'}</td>
                  <td className="px-4 py-3">{row.lunch || '-'}</td>
                  <td className="px-4 py-3">{row.dinner || '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-soft">
        <div className="mb-3 flex items-center gap-2 text-slate-800">
          <CalendarDays className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Meal Prices By Date</h2>
        </div>

        <div className="max-w-sm">
          <DatePickerField
            label="Select Date"
            value={selectedDate}
            onChange={setSelectedDate}
          />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          {[
            { key: 'breakfast_price', label: 'Breakfast Price' },
            { key: 'lunch_price', label: 'Lunch Price' },
            { key: 'dinner_price', label: 'Dinner Price' },
          ].map((item) => (
            <div key={item.key} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{item.label}</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">
                {loadingPrices ? 'Loading...' : formatMoney(prices[item.key])}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}