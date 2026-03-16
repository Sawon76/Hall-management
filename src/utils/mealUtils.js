import {
  addDays,
  endOfMonth,
  eachDayOfInterval,
  format,
  isAfter,
  isBefore,
  isSameMonth,
  isWithinInterval,
  startOfDay,
  startOfMonth,
} from 'date-fns'

import { CALENDAR_STATUS, MEAL_TYPES } from '../constants'

export const getDateKey = (date) => format(new Date(date), 'yyyy-MM-dd')

const formatCutoffHourLabel = (cutoffHour) => {
  if (cutoffHour === 0) {
    return '12:00 AM'
  }

  if (cutoffHour < 12) {
    return `${cutoffHour}:00 AM`
  }

  if (cutoffHour === 12) {
    return '12:00 PM'
  }

  return `${cutoffHour - 12}:00 PM`
}

export const getMealEditWindow = (now = new Date(), cutoffHour = 19) => {
  const currentDateTime = new Date(now)
  const startOfToday = startOfDay(currentDateTime)
  const cutoff = new Date(startOfToday)
  cutoff.setHours(cutoffHour, 0, 0, 0)

  const firstEditableDate = addDays(startOfToday, isBefore(currentDateTime, cutoff) ? 1 : 2)
  const lastEditableDate = endOfMonth(currentDateTime)

  return {
    firstEditableDate,
    lastEditableDate,
    hasEditableDates: !isAfter(firstEditableDate, lastEditableDate),
  }
}

export const isMealDateEditable = (date, now = new Date(), cutoffHour = 19) => {
  if (!date) {
    return false
  }

  const targetDate = startOfDay(new Date(date))
  const currentDateTime = new Date(now)
  const { firstEditableDate, lastEditableDate, hasEditableDates } = getMealEditWindow(currentDateTime, cutoffHour)

  if (!hasEditableDates) {
    return false
  }

  return (
    isSameMonth(targetDate, currentDateTime) &&
    !isBefore(targetDate, firstEditableDate) &&
    !isAfter(targetDate, lastEditableDate)
  )
}

export const getMealEditLockReason = (date, now = new Date(), cutoffHour = 19) => {
  if (!date) {
    return 'Select a date to manage meals.'
  }

  const targetDate = startOfDay(new Date(date))
  const currentDateTime = new Date(now)
  const currentMonthStart = startOfMonth(currentDateTime)
  const currentMonthEnd = endOfMonth(currentDateTime)
  const { firstEditableDate, hasEditableDates } = getMealEditWindow(currentDateTime, cutoffHour)

  if (!hasEditableDates) {
    return 'No meal changes are available for the rest of this month.'
  }

  if (isBefore(targetDate, currentMonthStart) || isAfter(targetDate, currentMonthEnd)) {
    return 'Meals can only be changed for dates in the current month.'
  }

  if (isBefore(targetDate, firstEditableDate)) {
    const tomorrowKey = getDateKey(addDays(startOfDay(currentDateTime), 1))

    if (getDateKey(targetDate) === tomorrowKey) {
      return `Next-day meal changes close at ${formatCutoffHourLabel(cutoffHour)} on the previous day.`
    }

    return 'Past and same-day meals cannot be changed.'
  }

  return ''
}

export const getMealRecordForDate = (date, mealRecords = []) => {
  const currentDate = getDateKey(date)

  return mealRecords.find((record) => record.date === currentDate) ?? null
}

export const isHallClosedOnDate = (date, hallClosures = []) => {
  const targetDate = new Date(date)

  return hallClosures.some((closure) =>
    isWithinInterval(targetDate, {
      start: new Date(closure.from_date),
      end: new Date(closure.to_date),
    }),
  )
}

export const getDateStatus = (date, mealRecords = [], hallClosures = []) => {
  if (isHallClosedOnDate(date, hallClosures)) {
    return CALENDAR_STATUS.HALL_CLOSED
  }

  const mealRecord = getMealRecordForDate(date, mealRecords)

  if (!mealRecord) {
    return CALENDAR_STATUS.MEAL_ON
  }

  const enabledMealCount = MEAL_TYPES.filter((mealType) => mealRecord[mealType] !== false).length

  return enabledMealCount > 0 ? CALENDAR_STATUS.MEAL_ON : CALENDAR_STATUS.MEAL_OFF
}

export const getMealsCountForDate = (date, mealRecord, hallClosures = []) => {
  if (isHallClosedOnDate(date, hallClosures)) {
    return 0
  }

  if (!mealRecord) {
    return 3
  }

  return MEAL_TYPES.filter((mealType) => mealRecord[mealType] !== false).length
}

export const calculateMealsForMonth = (
  year,
  month,
  mealRecords = [],
  hallClosures = [],
  studentCategory = 'staying_meal_on',
) => {
  if (studentCategory === 'attach_meal_off') {
    return 0
  }

  const monthStart = startOfMonth(new Date(year, month))
  const monthEnd = endOfMonth(monthStart)

  return eachDayOfInterval({ start: monthStart, end: monthEnd }).reduce((totalMeals, date) => {
    const mealRecord = getMealRecordForDate(date, mealRecords)
    return totalMeals + getMealsCountForDate(date, mealRecord, hallClosures)
  }, 0)
}

export const calculateMealBreakdownForMonth = (
  year,
  month,
  mealRecords = [],
  hallClosures = [],
  studentCategory = 'staying_meal_on',
) => {
  if (studentCategory === 'attach_meal_off') {
    return {
      breakfast: 0,
      lunch: 0,
      dinner: 0,
      total: 0,
    }
  }

  const monthStart = startOfMonth(new Date(year, month))
  const monthEnd = endOfMonth(monthStart)

  return eachDayOfInterval({ start: monthStart, end: monthEnd }).reduce(
    (accumulator, date) => {
      if (isHallClosedOnDate(date, hallClosures)) {
        return accumulator
      }

      const mealRecord = getMealRecordForDate(date, mealRecords)
      const breakfastOn = mealRecord ? mealRecord.breakfast !== false : true
      const lunchOn = mealRecord ? mealRecord.lunch !== false : true
      const dinnerOn = mealRecord ? mealRecord.dinner !== false : true

      return {
        breakfast: accumulator.breakfast + (breakfastOn ? 1 : 0),
        lunch: accumulator.lunch + (lunchOn ? 1 : 0),
        dinner: accumulator.dinner + (dinnerOn ? 1 : 0),
        total:
          accumulator.total +
          (breakfastOn ? 1 : 0) +
          (lunchOn ? 1 : 0) +
          (dinnerOn ? 1 : 0),
      }
    },
    {
      breakfast: 0,
      lunch: 0,
      dinner: 0,
      total: 0,
    },
  )
}

export const getDefaultMealState = () => ({
  breakfast: true,
  lunch: true,
  dinner: true,
})

export const getMealStateForDate = (date, mealRecords = [], hallClosures = []) => {
  if (isHallClosedOnDate(date, hallClosures)) {
    return {
      breakfast: false,
      lunch: false,
      dinner: false,
      disabled: true,
    }
  }

  const mealRecord = getMealRecordForDate(date, mealRecords)
  return {
    ...getDefaultMealState(),
    ...mealRecord,
    disabled: false,
  }
}