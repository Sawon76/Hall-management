import { addMonths, endOfMonth, format, startOfMonth, subMonths } from 'date-fns'
import { CalendarDays, Info, Save } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'

import CalendarComponent from '../../components/calendar/CalendarComponent'
import MealTogglePanel from '../../components/calendar/MealTogglePanel'
import LoadingSpinner from '../../components/shared/LoadingSpinner'
import { STUDENT_CATEGORIES } from '../../constants'
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

export default function StudentHome() {
  const studentSession = useAuthStore((state) => state.studentSession)
  const mealEditWindow = useMemo(() => getMealEditWindow(), [])
  const currentMonth = useMemo(() => new Date(), [])
  const initialSelectedDate = useMemo(
    () => (mealEditWindow.hasEditableDates ? mealEditWindow.firstEditableDate : currentMonth),
    [currentMonth, mealEditWindow],
  )

  const [visibleDate] = useState(currentMonth)
  const [selectedDate, setSelectedDate] = useState(initialSelectedDate)
  const [mealRecords, setMealRecords] = useState([])
  const [hallClosures, setHallClosures] = useState([])
  const [hallInfo, setHallInfo] = useState(null)
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

  const loadStudentData = async () => {
    if (!studentSession?.id || !studentSession?.hall_id) {
      setLoading(false)
      return
    }

    setLoading(true)

    const monthStart = format(startOfMonth(visibleDate), 'yyyy-MM-dd')
    const monthEnd = format(endOfMonth(visibleDate), 'yyyy-MM-dd')

    const [mealRecordsRes, hallClosuresRes, hallRes] = await Promise.all([
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
    ])

    if (mealRecordsRes.error) {
      toast.error(mealRecordsRes.error.message || 'Failed to load meal records')
    }

    if (hallClosuresRes.error) {
      toast.error(hallClosuresRes.error.message || 'Failed to load hall closure data')
    }

    setMealRecords(mealRecordsRes.data ?? [])
    setHallClosures(hallClosuresRes.data ?? [])
    setHallInfo(hallRes.data ?? null)
    setLoading(false)
  }

  useEffect(() => {
    loadStudentData()
  }, [studentSession?.hall_id, studentSession?.id, visibleDate])

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

    if (!isMealDateEditable(selectedDate)) {
      toast.error(getMealEditLockReason(selectedDate))
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

    const invalidDate = dates.find((date) => !isMealDateEditable(date))
    if (invalidDate) {
      toast.error(getMealEditLockReason(invalidDate))
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
          <label className="flex-1 space-y-1">
            <span className="text-sm font-medium text-slate-700">From</span>
            <input
              type="date"
              value={rangeForm.fromDate}
              min={format(mealEditWindow.firstEditableDate, 'yyyy-MM-dd')}
              max={format(mealEditWindow.lastEditableDate, 'yyyy-MM-dd')}
              onChange={(event) =>
                setRangeForm((previous) => ({ ...previous, fromDate: event.target.value }))
              }
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none ring-primary focus:border-primary focus:ring-2"
            />
          </label>

          <label className="flex-1 space-y-1">
            <span className="text-sm font-medium text-slate-700">To</span>
            <input
              type="date"
              value={rangeForm.toDate}
              min={format(mealEditWindow.firstEditableDate, 'yyyy-MM-dd')}
              max={format(mealEditWindow.lastEditableDate, 'yyyy-MM-dd')}
              onChange={(event) =>
                setRangeForm((previous) => ({ ...previous, toDate: event.target.value }))
              }
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none ring-primary focus:border-primary focus:ring-2"
            />
          </label>

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
          Meals can only be changed for upcoming eligible dates in this month, and next-day changes close at 7:00 PM on the previous day. Hall closure dates are skipped automatically.
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
          isDateDisabled={(date) => !isMealDateEditable(date)}
        />

        <MealTogglePanel
          selectedDate={selectedDate}
          mealRecords={mealRecords}
          hallClosures={hallClosures}
          onToggleMeal={handleToggleMeal}
          savingMeal={savingMeal}
        />
      </div>
    </section>
  )
}