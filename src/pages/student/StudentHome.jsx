import { endOfMonth, format, startOfMonth } from 'date-fns'
import { CalendarDays, Info, Save } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'

import CalendarComponent from '../../components/calendar/CalendarComponent'
import MealPriceCalendar from '../../components/menu/MealPriceCalendar'
import MealTogglePanel from '../../components/calendar/MealTogglePanel'
import DatePickerField from '../../components/ui/date-picker-field'
import LoadingSpinner from '../../components/shared/LoadingSpinner'
import { STUDENT_CATEGORIES } from '../../constants'
import { createDefaultWeeklyMenuRows, normalizeWeeklyMenuRows } from '../../constants/weeklyMenu'
import { supabase } from '../../lib/supabaseClient'
import { useAuthStore } from '../../store/authStore'
import { getDatesInRange } from '../../utils/dateUtils'
import {
  calculateMealsForMonth,
  getMealEditLockReason,
  getMealEditWindow,
  getDateKey,
  getMealRecordForDate,
  getMealStateForDate,
  isHallClosedOnDate,
  isMealDateEditable,
} from '../../utils/mealUtils'

const getMealCutoffHourForHall = (hallName = '') => {
  const normalized = hallName.toLowerCase()
  const isGirlsAnnex = normalized.includes('girls') && normalized.includes('annex')
  const isTaramonBibi = normalized.includes('bir pratik taramon bibi')

  return isGirlsAnnex || isTaramonBibi ? 15 : 19
}

const formatCutoffHourLabel = (hour) => {
  if (hour === 15) {
    return '3:00 PM'
  }

  return '7:00 PM'
}

export default function StudentHome() {
  const studentSession = useAuthStore((state) => state.studentSession)
  const currentMonth = useMemo(() => new Date(), [])
  const [hallInfo, setHallInfo] = useState(null)
  const mealCutoffHour = useMemo(() => getMealCutoffHourForHall(hallInfo?.name), [hallInfo?.name])
  const mealEditWindow = useMemo(() => getMealEditWindow(new Date(), mealCutoffHour), [mealCutoffHour])
  const initialSelectedDate = useMemo(
    () => (mealEditWindow.hasEditableDates ? mealEditWindow.firstEditableDate : currentMonth),
    [currentMonth, mealEditWindow],
  )

  const [visibleDate] = useState(currentMonth)
  const [selectedDate, setSelectedDate] = useState(initialSelectedDate)
  const [mealRecords, setMealRecords] = useState([])
  const [hallClosures, setHallClosures] = useState([])
  const [weeklyMenuRows, setWeeklyMenuRows] = useState(createDefaultWeeklyMenuRows())
  const [loadingWeeklyMenu, setLoadingWeeklyMenu] = useState(true)
  const [priceCalendarMonth, setPriceCalendarMonth] = useState(new Date())
  const [dailyPricesMap, setDailyPricesMap] = useState({})
  const [loadingDailyPrices, setLoadingDailyPrices] = useState(true)
  const [loading, setLoading] = useState(true)
  const [savingMeal, setSavingMeal] = useState('')
  const [savingRange, setSavingRange] = useState(false)
  const [rangeForm, setRangeForm] = useState({
    fromDate: format(initialSelectedDate, 'yyyy-MM-dd'),
    toDate: format(initialSelectedDate, 'yyyy-MM-dd'),
    mode: 'on',
  })

  const currentCategoryLabel = useMemo(
    () => STUDENT_CATEGORIES.find((item) => item.value === studentSession?.category)?.label || 'Student',
    [studentSession?.category],
  )

  const visibleYear = visibleDate.getFullYear()
  const visibleMonth = visibleDate.getMonth()

  const monthlyMealCount = useMemo(
    () =>
      calculateMealsForMonth(
        visibleYear,
        visibleMonth,
        mealRecords,
        hallClosures,
        studentSession?.category,
      ),
    [hallClosures, mealRecords, studentSession?.category, visibleMonth, visibleYear],
  )

  const hasAnyWeeklyMenu = useMemo(
    () => weeklyMenuRows.some((row) => row.breakfast || row.lunch || row.dinner),
    [weeklyMenuRows],
  )

  const canEditDate = (date) => isMealDateEditable(date, new Date(), mealCutoffHour)

  const loadStudentData = async () => {
    if (!studentSession?.id || !studentSession?.hall_id) {
      setLoading(false)
      return
    }

    setLoading(true)

    const monthStart = format(startOfMonth(visibleDate), 'yyyy-MM-dd')
    const monthEnd = format(endOfMonth(visibleDate), 'yyyy-MM-dd')

    setLoadingWeeklyMenu(true)

    const [mealRecordsRes, hallClosuresRes, hallRes, weeklyMenuRes] = await Promise.all([
      supabase
        .from('meal_records')
        .select('*')
        .eq('student_id', studentSession.id)
        .gte('date', monthStart)
        .lte('date', monthEnd)
        .order('date', { ascending: true }),
      supabase
        .from('hall_closures')
        .select('*')
        .eq('hall_id', studentSession.hall_id)
        .order('from_date', { ascending: true }),
      supabase
        .from('halls')
        .select('name, university_name')
        .eq('id', studentSession.hall_id)
        .single(),
      supabase
        .from('weekly_menus')
        .select('day_of_week, day_name, breakfast, lunch, dinner')
        .eq('hall_id', studentSession.hall_id)
        .order('day_of_week', { ascending: true }),
    ])

    if (mealRecordsRes.error) {
      toast.error(mealRecordsRes.error.message || 'Failed to load meal records')
    }

    if (hallClosuresRes.error) {
      toast.error(hallClosuresRes.error.message || 'Failed to load hall closure data')
    }

    if (weeklyMenuRes.error) {
      toast.error(weeklyMenuRes.error.message || 'Failed to load weekly menu')
    }

    setMealRecords(mealRecordsRes.data ?? [])
    setHallClosures(hallClosuresRes.data ?? [])
    setHallInfo(hallRes.data ?? null)
    setWeeklyMenuRows(normalizeWeeklyMenuRows(weeklyMenuRes.data ?? []))
    setLoadingWeeklyMenu(false)
    setLoading(false)
  }

  useEffect(() => {
    loadStudentData()
  }, [studentSession?.hall_id, studentSession?.id, visibleDate])

  useEffect(() => {
    const loadDailyPrices = async () => {
      if (!studentSession?.hall_id) {
        setLoadingDailyPrices(false)
        return
      }

      setLoadingDailyPrices(true)
      const monthStart = format(startOfMonth(priceCalendarMonth), 'yyyy-MM-dd')
      const monthEnd = format(endOfMonth(priceCalendarMonth), 'yyyy-MM-dd')

      const { data, error } = await supabase
        .from('meal_daily_prices')
        .select('date, breakfast_price, lunch_price, dinner_price')
        .eq('hall_id', studentSession.hall_id)
        .gte('date', monthStart)
        .lte('date', monthEnd)

      if (error) {
        toast.error(error.message || 'Failed to load daily meal prices')
        setDailyPricesMap({})
        setLoadingDailyPrices(false)
        return
      }

      const toDisplayPrice = (value) => {
        const numeric = Number(value ?? 0)
        if (Number.isNaN(numeric)) {
          return '0'
        }

        if (Number.isInteger(numeric)) {
          return String(numeric)
        }

        return numeric.toFixed(2).replace(/\.0+$/, '').replace(/(\.\d*[1-9])0+$/, '$1')
      }

      const map = Object.fromEntries(
        (data ?? []).map((row) => [
          row.date,
          `${toDisplayPrice(row.breakfast_price)}|${toDisplayPrice(row.lunch_price)}|${toDisplayPrice(row.dinner_price)}`,
        ]),
      )

      setDailyPricesMap(map)
      setLoadingDailyPrices(false)
    }

    loadDailyPrices()
  }, [priceCalendarMonth, studentSession?.hall_id])

  const upsertMealState = async (date, nextMealState) => {
    const payload = {
      student_id: studentSession.id,
      date: getDateKey(date),
      breakfast: nextMealState.breakfast,
      lunch: nextMealState.lunch,
      dinner: nextMealState.dinner,
    }

    const { error } = await supabase
      .from('meal_records')
      .upsert(payload, { onConflict: 'student_id,date' })

    if (error) {
      toast.error(error.message || 'Failed to save meal changes')
      return false
    }

    setMealRecords((previous) => {
      const nextRecords = previous.filter((record) => record.date !== payload.date)
      return [...nextRecords, payload].sort((first, second) => first.date.localeCompare(second.date))
    })

    return true
  }

  const handleToggleMeal = async (mealType, nextValue) => {
    if (!selectedDate || isHallClosedOnDate(selectedDate, hallClosures)) {
      return
    }

    if (!isMealDateEditable(selectedDate, new Date(), mealCutoffHour)) {
      toast.error(getMealEditLockReason(selectedDate, new Date(), mealCutoffHour))
      return
    }

    setSavingMeal(mealType)

    const currentState = getMealStateForDate(selectedDate, mealRecords, hallClosures)
    const success = await upsertMealState(selectedDate, {
      breakfast: currentState.breakfast,
      lunch: currentState.lunch,
      dinner: currentState.dinner,
      [mealType]: nextValue,
    })

    if (success) {
      toast.success(`${mealType[0].toUpperCase()}${mealType.slice(1)} updated`)
    }

    setSavingMeal('')
  }

  const handleRangeSave = async () => {
    if (!rangeForm.fromDate || !rangeForm.toDate) {
      toast.error('Please select both From and To dates')
      return
    }

    const dates = getDatesInRange(rangeForm.fromDate, rangeForm.toDate)
    if (!dates.length) {
      toast.error('Invalid date range')
      return
    }

    const invalidDate = dates.find((date) => !isMealDateEditable(date, new Date(), mealCutoffHour))
    if (invalidDate) {
      toast.error(getMealEditLockReason(invalidDate, new Date(), mealCutoffHour))
      return
    }

    setSavingRange(true)

    const targetValue = rangeForm.mode === 'on'
    const payload = dates
      .filter((date) => !isHallClosedOnDate(date, hallClosures))
      .map((date) => ({
        student_id: studentSession.id,
        date: getDateKey(date),
        breakfast: targetValue,
        lunch: targetValue,
        dinner: targetValue,
      }))

    if (payload.length === 0) {
      toast.error('All selected dates are hall closure dates and cannot be changed')
      setSavingRange(false)
      return
    }

    const { error } = await supabase.from('meal_records').upsert(payload, { onConflict: 'student_id,date' })

    if (error) {
      toast.error(error.message || 'Failed to update meal range')
      setSavingRange(false)
      return
    }

    toast.success('Meal range updated successfully')
    await loadStudentData()
    setSavingRange(false)
  }

  if (loading) {
    return <LoadingSpinner variant="inline" label="Loading your meal calendar..." />
  }

  return (
    <section className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-soft">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Welcome back, {studentSession?.name}!</h1>
            <p className="mt-1 text-sm text-slate-600">
              {hallInfo?.name || 'Hall'} | {hallInfo?.university_name || 'University'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-700">
              {currentCategoryLabel}
            </span>
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">
              {monthlyMealCount} meals in {format(visibleDate, 'MMMM')}
            </span>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-soft">
        <div className="mb-3 flex items-center gap-2 text-slate-800">
          <CalendarDays className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Date Range Meal Control</h2>
        </div>

        <div className="flex flex-col gap-3 xl:flex-row xl:items-end">
          <DatePickerField
            label="From"
            value={rangeForm.fromDate}
            minDate={mealEditWindow.firstEditableDate}
            maxDate={mealEditWindow.lastEditableDate}
            isDateDisabled={(date) => !canEditDate(date)}
            disabled={!mealEditWindow.hasEditableDates}
            onChange={(nextDate) =>
              setRangeForm((previous) => ({
                ...previous,
                fromDate: nextDate,
                toDate: previous.toDate && previous.toDate < nextDate ? nextDate : previous.toDate,
              }))
            }
          />

          <DatePickerField
            label="To"
            value={rangeForm.toDate}
            minDate={rangeForm.fromDate ? new Date(rangeForm.fromDate) : mealEditWindow.firstEditableDate}
            maxDate={mealEditWindow.lastEditableDate}
            isDateDisabled={(date) => !canEditDate(date)}
            disabled={!mealEditWindow.hasEditableDates}
            onChange={(nextDate) =>
              setRangeForm((previous) => ({
                ...previous,
                toDate: nextDate,
                fromDate: previous.fromDate && previous.fromDate > nextDate ? nextDate : previous.fromDate,
              }))
            }
          />

          <div className="flex-1 space-y-1">
            <span className="text-sm font-medium text-slate-700">Mode</span>
            <div className="flex h-[46px] items-center gap-4 rounded-xl border border-slate-300 px-4">
              <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="radio"
                  name="range-mode"
                  checked={rangeForm.mode === 'on'}
                  onChange={() => setRangeForm((previous) => ({ ...previous, mode: 'on' }))}
                />
                Meal On
              </label>
              <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="radio"
                  name="range-mode"
                  checked={rangeForm.mode === 'off'}
                  onChange={() => setRangeForm((previous) => ({ ...previous, mode: 'off' }))}
                />
                Meal Off
              </label>
            </div>
          </div>

          <button
            type="button"
            onClick={handleRangeSave}
            disabled={savingRange || !mealEditWindow.hasEditableDates}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
          >
            <Save className="h-4 w-4" />
            {savingRange ? 'Saving...' : 'Save'}
          </button>
        </div>

        <div className="mt-3 flex items-start gap-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-700">
          <Info className="mt-0.5 h-4 w-4 flex-shrink-0" />
          Meals can only be changed for upcoming eligible dates in this month, and next-day changes close at {formatCutoffHourLabel(mealCutoffHour)} on the previous day. Hall closure dates are skipped automatically.
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.8fr),minmax(320px,1fr)]">
        <CalendarComponent
          year={visibleYear}
          month={visibleMonth}
          mealRecords={mealRecords}
          hallClosures={hallClosures}
          selectedDate={selectedDate}
          onDateClick={setSelectedDate}
          onPrevMonth={() => {}}
          onNextMonth={() => {}}
          canPrevMonth={false}
          canNextMonth={false}
          isDateDisabled={(date) => !isMealDateEditable(date, new Date(), mealCutoffHour)}
        />

        <MealTogglePanel
          selectedDate={selectedDate}
          mealRecords={mealRecords}
          hallClosures={hallClosures}
          onToggleMeal={handleToggleMeal}
          savingMeal={savingMeal}
          cutoffHour={mealCutoffHour}
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-soft">
        <div className="border-b border-slate-200 px-4 py-3">
          <h2 className="text-lg font-semibold text-slate-900">Weekly Menu</h2>
          <p className="mt-1 text-sm text-slate-600">This menu repeats every week until staff updates it.</p>
        </div>
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-700">
            <tr>
              {['Day', 'Breakfast', 'Lunch', 'Dinner'].map((heading) => (
                <th key={heading} className="px-4 py-3 font-semibold whitespace-nowrap">{heading}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loadingWeeklyMenu ? (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-slate-500">Loading weekly menu...</td>
              </tr>
            ) : !hasAnyWeeklyMenu ? (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-slate-500">No weekly menu configured yet by staff.</td>
              </tr>
            ) : (
              weeklyMenuRows.map((row) => (
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

      <MealPriceCalendar
        month={priceCalendarMonth}
        onMonthChange={setPriceCalendarMonth}
        priceByDate={dailyPricesMap}
        loading={loadingDailyPrices}
      />
    </section>
  )
}