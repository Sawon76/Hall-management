import { format } from 'date-fns'
import { CalendarDays, Save } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'

import DatePickerField from '../../components/ui/date-picker-field'
import { createDefaultWeeklyMenuRows, normalizeWeeklyMenuRows } from '../../constants/weeklyMenu'
import { supabase } from '../../lib/supabaseClient'
import { useAuthStore } from '../../store/authStore'
import { formatMoney } from '../../utils/paymentUtils'

const INITIAL_PRICE_FORM = {
  breakfast_price: '',
  lunch_price: '',
  dinner_price: '',
}

export default function WeeklyMenuManager() {
  const user = useAuthStore((state) => state.user)

  const [menuRows, setMenuRows] = useState(createDefaultWeeklyMenuRows())
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [priceForm, setPriceForm] = useState(INITIAL_PRICE_FORM)
  const [loadingMenu, setLoadingMenu] = useState(true)
  const [loadingPrices, setLoadingPrices] = useState(true)
  const [savingMenu, setSavingMenu] = useState(false)
  const [savingPrices, setSavingPrices] = useState(false)

  const hasAnyMenu = useMemo(
    () => menuRows.some((row) => row.breakfast || row.lunch || row.dinner),
    [menuRows],
  )

  const loadWeeklyMenu = async () => {
    if (!user?.hall_id) {
      setLoadingMenu(false)
      return
    }

    setLoadingMenu(true)
    const { data, error } = await supabase
      .from('weekly_menus')
      .select('day_of_week, day_name, breakfast, lunch, dinner')
      .eq('hall_id', user.hall_id)
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

  const loadPricesForDate = async (date) => {
    if (!user?.hall_id || !date) {
      setLoadingPrices(false)
      return
    }

    setLoadingPrices(true)
    const { data, error } = await supabase
      .from('meal_daily_prices')
      .select('breakfast_price, lunch_price, dinner_price')
      .eq('hall_id', user.hall_id)
      .eq('date', date)
      .maybeSingle()

    if (error) {
      toast.error(error.message || 'Failed to load meal prices')
      setPriceForm(INITIAL_PRICE_FORM)
      setLoadingPrices(false)
      return
    }

    setPriceForm({
      breakfast_price: String(data?.breakfast_price ?? ''),
      lunch_price: String(data?.lunch_price ?? ''),
      dinner_price: String(data?.dinner_price ?? ''),
    })
    setLoadingPrices(false)
  }

  useEffect(() => {
    loadWeeklyMenu()
  }, [user?.hall_id])

  useEffect(() => {
    loadPricesForDate(selectedDate)
  }, [selectedDate, user?.hall_id])

  const handleMenuChange = (dayOfWeek, fieldName, value) => {
    setMenuRows((previous) =>
      previous.map((row) =>
        row.day_of_week === dayOfWeek
          ? {
              ...row,
              [fieldName]: value,
            }
          : row,
      ),
    )
  }

  const saveWeeklyMenu = async () => {
    if (!user?.hall_id) {
      return
    }

    setSavingMenu(true)
    const payload = menuRows.map((row) => ({
      hall_id: user.hall_id,
      day_of_week: row.day_of_week,
      day_name: row.day_name,
      breakfast: row.breakfast?.trim() || '',
      lunch: row.lunch?.trim() || '',
      dinner: row.dinner?.trim() || '',
      updated_by: user.id,
    }))

    const { error } = await supabase
      .from('weekly_menus')
      .upsert(payload, { onConflict: 'hall_id,day_of_week' })

    if (error) {
      toast.error(error.message || 'Failed to save weekly menu')
      setSavingMenu(false)
      return
    }

    toast.success('Weekly menu updated')
    setSavingMenu(false)
    await loadWeeklyMenu()
  }

  const saveMealPrices = async () => {
    if (!user?.hall_id || !selectedDate) {
      return
    }

    const breakfastPrice = Number(priceForm.breakfast_price || 0)
    const lunchPrice = Number(priceForm.lunch_price || 0)
    const dinnerPrice = Number(priceForm.dinner_price || 0)

    if ([breakfastPrice, lunchPrice, dinnerPrice].some(Number.isNaN)) {
      toast.error('Please enter valid numeric prices')
      return
    }

    setSavingPrices(true)
    const { error } = await supabase.from('meal_daily_prices').upsert(
      {
        hall_id: user.hall_id,
        date: selectedDate,
        breakfast_price: breakfastPrice,
        lunch_price: lunchPrice,
        dinner_price: dinnerPrice,
        updated_by: user.id,
      },
      { onConflict: 'hall_id,date' },
    )

    if (error) {
      toast.error(error.message || 'Failed to save meal prices')
      setSavingPrices(false)
      return
    }

    toast.success('Meal prices updated')
    setSavingPrices(false)
    await loadPricesForDate(selectedDate)
  }

  return (
    <section className="space-y-6">
      <header className="rounded-xl border border-slate-200 bg-white p-6 shadow-soft">
        <h1 className="text-2xl font-bold text-slate-900">Weekly Menu Creator</h1>
        <p className="mt-1 text-sm text-slate-600">
          Staff can update the 7-day menu anytime. The latest menu applies for every week until changed.
        </p>
      </header>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-soft">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Weekly Menu Table</h2>
          <button
            type="button"
            onClick={saveWeeklyMenu}
            disabled={savingMenu || loadingMenu}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
          >
            <Save className="h-4 w-4" />
            {savingMenu ? 'Saving...' : 'Save Weekly Menu'}
          </button>
        </div>

        <div className="overflow-x-auto">
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
              ) : (
                menuRows.map((row) => (
                  <tr key={row.day_of_week} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-semibold text-slate-800">{row.day_name}</td>
                    {['breakfast', 'lunch', 'dinner'].map((fieldName) => (
                      <td key={`${row.day_of_week}-${fieldName}`} className="px-4 py-3">
                        <input
                          value={row[fieldName]}
                          onChange={(event) =>
                            handleMenuChange(row.day_of_week, fieldName, event.target.value)
                          }
                          placeholder={`Add ${fieldName} menu`}
                          className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none ring-primary focus:border-primary focus:ring-2"
                        />
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!loadingMenu && !hasAnyMenu && (
          <p className="mt-3 text-sm text-slate-500">Menu is empty. Add meals and click Save Weekly Menu.</p>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-soft">
        <div className="mb-3 flex items-center gap-2 text-slate-800">
          <CalendarDays className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Meal Prices By Date</h2>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <DatePickerField
            label="Price Date"
            value={selectedDate}
            onChange={setSelectedDate}
          />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              ['breakfast_price', 'Breakfast'],
              ['lunch_price', 'Lunch'],
              ['dinner_price', 'Dinner'],
            ].map(([fieldName, label]) => (
              <label key={fieldName} className="block space-y-1">
                <span className="text-sm font-medium text-slate-700">{label}</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={priceForm[fieldName]}
                  onChange={(event) =>
                    setPriceForm((previous) => ({
                      ...previous,
                      [fieldName]: event.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none ring-primary focus:border-primary focus:ring-2"
                />
              </label>
            ))}
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-slate-600">
            {loadingPrices
              ? 'Loading current prices...'
              : `Current prices: B ${formatMoney(priceForm.breakfast_price || 0)} | L ${formatMoney(priceForm.lunch_price || 0)} | D ${formatMoney(priceForm.dinner_price || 0)}`}
          </p>
          <button
            type="button"
            onClick={saveMealPrices}
            disabled={savingPrices || loadingPrices}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
          >
            <Save className="h-4 w-4" />
            {savingPrices ? 'Saving...' : 'Save Date Prices'}
          </button>
        </div>
      </div>
    </section>
  )
}