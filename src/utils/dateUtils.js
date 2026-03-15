import {
  addDays,
  eachDayOfInterval,
  endOfMonth,
  format,
  isSameDay as isSameCalendarDay,
  startOfMonth,
} from 'date-fns'

export const getDatesInRange = (startDate, endDate) => {
  if (!startDate || !endDate) {
    return []
  }

  const start = new Date(startDate)
  const end = new Date(endDate)

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
    return []
  }

  return eachDayOfInterval({ start, end })
}

export const formatMonth = (dateInput) => format(new Date(dateInput), 'MMMM yyyy')

export const isSameDay = (firstDate, secondDate) => {
  if (!firstDate || !secondDate) {
    return false
  }

  return isSameCalendarDay(new Date(firstDate), new Date(secondDate))
}

export const getDaysInMonth = (year, month) => {
  const monthStart = startOfMonth(new Date(year, month))
  const monthEnd = endOfMonth(monthStart)

  return eachDayOfInterval({ start: monthStart, end: monthEnd })
}

export const addOneDay = (dateInput) => addDays(new Date(dateInput), 1)