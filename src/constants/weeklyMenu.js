export const WEEK_DAYS = [
  { day_of_week: 0, day_name: 'Sunday' },
  { day_of_week: 1, day_name: 'Monday' },
  { day_of_week: 2, day_name: 'Tuesday' },
  { day_of_week: 3, day_name: 'Wednesday' },
  { day_of_week: 4, day_name: 'Thursday' },
  { day_of_week: 5, day_name: 'Friday' },
  { day_of_week: 6, day_name: 'Saturday' },
]

export const createDefaultWeeklyMenuRows = () =>
  WEEK_DAYS.map((day) => ({
    ...day,
    breakfast: '',
    lunch: '',
    dinner: '',
  }))

export const normalizeWeeklyMenuRows = (rows = []) => {
  const byDay = new Map(rows.map((row) => [Number(row.day_of_week), row]))

  return WEEK_DAYS.map((day) => {
    const row = byDay.get(day.day_of_week)
    return {
      ...day,
      breakfast: row?.breakfast || '',
      lunch: row?.lunch || '',
      dinner: row?.dinner || '',
    }
  })
}