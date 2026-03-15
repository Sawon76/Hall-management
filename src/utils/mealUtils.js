import { endOfMonth, eachDayOfInterval, format, isWithinInterval, startOfMonth } from 'date-fns'

import { CALENDAR_STATUS, MEAL_TYPES } from '../constants'

export const getDateKey = (date) => format(new Date(date), 'yyyy-MM-dd')

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