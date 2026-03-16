import {
  addMonths,
  eachDayOfInterval,
  endOfWeek,
  format,
  isBefore,
  isSameMonth,
  isToday,
  startOfDay,
  startOfWeek,
  subMonths,
} from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export default function MealPriceCalendar({ month, onMonthChange, priceByDate = {}, loading = false }) {
  const todayStart = startOfDay(new Date())
  const monthStart = new Date(month.getFullYear(), month.getMonth(), 1)
  const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0)
  const gridStart = startOfWeek(monthStart)
  const gridEnd = endOfWeek(monthEnd)
  const calendarDays = eachDayOfInterval({ start: gridStart, end: gridEnd })

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-soft">
      <div className="mb-4 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => onMonthChange?.(subMonths(month, 1))}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:border-primary hover:text-primary"
          aria-label="Previous month"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <h3 className="text-base font-semibold text-slate-900">Meal Prices: {format(month, 'MMMM yyyy')}</h3>

        <button
          type="button"
          onClick={() => onMonthChange?.(addMonths(month, 1))}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:border-primary hover:text-primary"
          aria-label="Next month"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div key={day} className="py-1">{day}</div>
        ))}
      </div>

      <div className="mt-2 grid grid-cols-7 gap-2">
        {calendarDays.map((date) => {
          const dateKey = format(date, 'yyyy-MM-dd')
          const priceLabel = priceByDate[dateKey] || '0|0|0'
          const displayPriceLabel = priceLabel.split('|').join(' | ')
          const inMonth = isSameMonth(date, month)
          const pastDate = isBefore(startOfDay(date), todayStart)
          const today = isToday(date)

          const cellClassName = !inMonth
            ? 'border-slate-100 bg-slate-50/60 opacity-45'
            : today
              ? 'border-blue-300 bg-blue-50 ring-2 ring-blue-200'
              : pastDate
                ? 'border-slate-200 bg-slate-100 text-slate-400'
                : 'border-slate-200 bg-slate-50'

          return (
            <div
              key={dateKey}
              className={`min-h-20 rounded-xl border p-2 transition ${cellClassName}`}
            >
              <p className={`text-xs font-semibold ${today ? 'text-blue-700' : 'text-slate-700'}`}>{format(date, 'd')}</p>
              <p className={`mt-2 text-[12px] font-bold ${pastDate && inMonth ? 'text-slate-500' : 'text-slate-900'}`}>
                {loading ? '...' : displayPriceLabel}
              </p>
              <p className={`mt-1 text-[10px] font-bold tracking-[0.12em] ${pastDate && inMonth ? 'text-slate-400' : 'text-slate-600'}`}>
                B | L | D
              </p>
            </div>
          )
        })}
      </div>

      <p className="mt-3 text-xs text-slate-500">Prices are shown as Breakfast|Lunch|Dinner for each date.</p>
    </div>
  )
}