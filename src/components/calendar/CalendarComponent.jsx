import { ChevronLeft, ChevronRight } from 'lucide-react'
import { eachDayOfInterval, endOfWeek, format, isSameMonth, isToday, startOfWeek } from 'date-fns'

import { CALENDAR_STATUS } from '../../constants'
import { getDaysInMonth, isSameDay } from '../../utils/dateUtils'
import { getDateStatus } from '../../utils/mealUtils'

const DAY_HEADERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const STATUS_CLASSES = {
  [CALENDAR_STATUS.HALL_CLOSED]: 'bg-pink-200 text-pink-900',
  [CALENDAR_STATUS.MEAL_OFF]: 'bg-gray-200 text-gray-500',
  [CALENDAR_STATUS.MEAL_ON]: 'bg-green-100 text-green-800',
  default: 'bg-white text-slate-700 hover:bg-slate-50',
}

export default function CalendarComponent({
  year,
  month,
  mealRecords = [],
  hallClosures = [],
  selectedDate,
  onDateClick,
  onPrevMonth,
  onNextMonth,
}) {
  const monthDays = getDaysInMonth(year, month)
  const gridStart = startOfWeek(monthDays[0])
  const gridEnd = endOfWeek(monthDays[monthDays.length - 1])
  const calendarDays = eachDayOfInterval({ start: gridStart, end: gridEnd })

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-soft">
      <div className="mb-5 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onPrevMonth}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:border-primary hover:text-primary"
          aria-label="Previous month"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <h2 className="text-lg font-semibold text-slate-900">{format(new Date(year, month), 'MMMM yyyy')}</h2>

        <button
          type="button"
          onClick={onNextMonth}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:border-primary hover:text-primary"
          aria-label="Next month"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
        {DAY_HEADERS.map((day) => (
          <div key={day} className="py-2">
            {day}
          </div>
        ))}
      </div>

      <div className="mt-2 grid grid-cols-7 gap-2">
        {calendarDays.map((date) => {
          const status = getDateStatus(date, mealRecords, hallClosures)
          const isCurrentMonth = isSameMonth(date, new Date(year, month))
          const isSelected = selectedDate ? isSameDay(date, selectedDate) : false
          const baseClass = STATUS_CLASSES[status] || STATUS_CLASSES.default

          return (
            <button
              key={date.toISOString()}
              type="button"
              onClick={() => onDateClick?.(date)}
              className={`min-h-20 rounded-2xl border p-2 text-left transition ${baseClass} ${
                isCurrentMonth ? 'border-slate-200' : 'border-transparent opacity-45'
              } ${isSelected ? 'ring-2 ring-blue-500' : ''} ${isToday(date) ? 'border-2 border-blue-400 font-bold' : ''}`}
            >
              <span className="block text-sm font-semibold">{format(date, 'd')}</span>
              <span className="mt-3 block text-[11px] font-medium uppercase tracking-wide">
                {status === CALENDAR_STATUS.HALL_CLOSED
                  ? 'Closed'
                  : status === CALENDAR_STATUS.MEAL_OFF
                    ? 'Meal Off'
                    : 'Meal On'}
              </span>
            </button>
          )
        })}
      </div>

      <div className="mt-5 flex flex-wrap gap-3 text-xs text-slate-600">
        <LegendPill label="Meals On" className="bg-green-100 text-green-800" />
        <LegendPill label="Meals Off" className="bg-gray-200 text-gray-600" />
        <LegendPill label="Hall Closed" className="bg-pink-200 text-pink-800" />
      </div>
    </div>
  )
}

function LegendPill({ label, className }) {
  return <span className={`rounded-full px-3 py-1 font-medium ${className}`}>{label}</span>
}