import { format } from 'date-fns'

import { MEAL_TYPES } from '../../constants'
import { getMealStateForDate } from '../../utils/mealUtils'

const LABELS = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
}

export default function MealTogglePanel({
  selectedDate,
  mealRecords = [],
  hallClosures = [],
  onToggleMeal,
  savingMeal,
}) {
  if (!selectedDate) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-soft">
        <h2 className="text-lg font-semibold text-slate-900">Meal Toggle Panel</h2>
        <p className="mt-2 text-sm text-slate-500">Select a date on the calendar to manage meals.</p>
      </div>
    )
  }

  const mealState = getMealStateForDate(selectedDate, mealRecords, hallClosures)

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-soft">
      <h2 className="text-lg font-semibold text-slate-900">{format(new Date(selectedDate), 'EEEE, dd MMMM yyyy')}</h2>

      {mealState.disabled ? (
        <div className="mt-4 rounded-xl border border-pink-200 bg-pink-50 px-4 py-4 text-sm text-pink-800">
          Hall is officially closed on this date. Meals cannot be changed.
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {MEAL_TYPES.map((mealType) => {
            const enabled = Boolean(mealState[mealType])
            const isSaving = savingMeal === mealType

            return (
              <button
                key={mealType}
                type="button"
                onClick={() => onToggleMeal?.(mealType, !enabled)}
                disabled={isSaving}
                className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left transition hover:border-primary disabled:cursor-not-allowed disabled:opacity-70"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-900">{LABELS[mealType]}</p>
                  <p className="text-xs text-slate-500">{enabled ? 'Meal is ON' : 'Meal is OFF'}</p>
                </div>
                <span
                  className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                    enabled ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {isSaving ? 'Saving...' : enabled ? 'On' : 'Off'}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}