import { format } from 'date-fns'
import { Coffee, Soup, UtensilsCrossed } from 'lucide-react'

import { MEAL_TYPES } from '../../constants'
import { OrangeToggle } from '../ui/toggle'
import { getMealEditLockReason, getMealStateForDate, isMealDateEditable } from '../../utils/mealUtils'

const LABELS = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
}

const ICONS = {
  breakfast: Coffee,
  lunch: Soup,
  dinner: UtensilsCrossed,
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
  const canEditMeals = isMealDateEditable(selectedDate)
  const lockReason = canEditMeals ? '' : getMealEditLockReason(selectedDate)

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-soft">
      <h2 className="text-lg font-semibold text-slate-900">{format(new Date(selectedDate), 'EEEE, dd MMMM yyyy')}</h2>

      {mealState.disabled ? (
        <div className="mt-4 rounded-xl border border-pink-200 bg-pink-50 px-4 py-4 text-sm text-pink-800">
          Hall is officially closed on this date. Meals cannot be changed.
        </div>
      ) : !canEditMeals ? (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-800">
          {lockReason}
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {MEAL_TYPES.map((mealType) => {
            const enabled = Boolean(mealState[mealType])
            const isSaving = savingMeal === mealType
            const Icon = ICONS[mealType]

            return (
              <div
                key={mealType}
                className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left transition hover:border-primary"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`inline-flex h-10 w-10 items-center justify-center rounded-full ${
                      enabled ? 'bg-orange-100 text-orange-700' : 'bg-slate-200 text-slate-500'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{LABELS[mealType]}</p>
                    <p className="text-xs text-slate-500">{isSaving ? 'Saving...' : enabled ? 'Meal is ON' : 'Meal is OFF'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`text-xs font-semibold uppercase tracking-wide ${
                      enabled ? 'text-orange-700' : 'text-slate-500'
                    }`}
                  >
                    {enabled ? 'On' : 'Off'}
                  </span>
                  <OrangeToggle
                    checked={enabled}
                    onChange={() => onToggleMeal?.(mealType, !enabled)}
                    disabled={isSaving}
                    aria-label={`${LABELS[mealType]} toggle for ${selectedDate}`}
                    className="disabled:cursor-not-allowed disabled:opacity-60"
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}