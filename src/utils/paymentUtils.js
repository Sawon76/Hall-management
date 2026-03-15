import { compareAsc, format, parse } from 'date-fns'

import { calculateMealsForMonth } from './mealUtils'

export const parseBillingMonth = (billingMonth) => parse(billingMonth, 'yyyy-MM', new Date())

const toNumber = (value) => Number(value ?? 0)
const roundMoney = (value) => Number(toNumber(value).toFixed(2))

export const calculateDues = (studentId, billingMonth, allSlips = []) => {
  const cutoff = parseBillingMonth(billingMonth)
  const currentBillMonth = new Date(cutoff.getFullYear(), cutoff.getMonth() - 1, 1)

  const dueSlips = allSlips
    .filter(
      (slip) =>
        slip.student_id === studentId &&
        slip.status !== 'paid' &&
        compareAsc(parseBillingMonth(slip.billing_month), currentBillMonth) < 0,
    )
    .sort((firstSlip, secondSlip) =>
      compareAsc(parseBillingMonth(firstSlip.billing_month), parseBillingMonth(secondSlip.billing_month)),
    )

  return {
    duesAmount: dueSlips.reduce((sum, slip) => sum + Number(slip.grand_total ?? slip.total ?? 0), 0),
    duesMonths: dueSlips.map((slip) => format(parseBillingMonth(slip.billing_month), 'MMMM yyyy')),
  }
}

export const generateAllSlips = (
  billingConfig,
  students = [],
  allMealRecords = [],
  allHallClosures = [],
  allExistingSlips = [],
  generatedBy,
) => {
  const [year, month] = billingConfig.billing_month.split('-').map(Number)
  const monthIndex = month - 1

  const studentMealsMap = new Map(
    students.map((student) => {
      const studentMealRecords = allMealRecords.filter((record) => record.student_id === student.id)
      const noOfMeals = calculateMealsForMonth(
        year,
        monthIndex,
        studentMealRecords,
        allHallClosures,
        student.category,
      )

      return [student.id, noOfMeals]
    }),
  )

  const totalMealsForHall = students.reduce(
    (sum, student) => sum + Number(studentMealsMap.get(student.id) || 0),
    0,
  )

  const totalMealCharge = toNumber(billingConfig.total_meal_charge)
  const perMealRate = totalMealsForHall > 0 ? totalMealCharge / totalMealsForHall : 0

  return students.map((student) => {
    const noOfMeals = Number(studentMealsMap.get(student.id) || 0)
    const mealCharge = roundMoney(noOfMeals * perMealRate)
    const otherBills = toNumber(billingConfig.other_bills)
    const fuelAndSpices = toNumber(billingConfig.fuel_and_spices)
    const svcCharge = toNumber(billingConfig.svc_charge)
    const hallRent = toNumber(billingConfig.hall_rent)
    const total = roundMoney(mealCharge + otherBills + fuelAndSpices + svcCharge + hallRent)

    const { duesAmount, duesMonths } = calculateDues(student.id, billingConfig.billing_month, allExistingSlips)
    const grandTotal = roundMoney(total + duesAmount)

    return {
      student_id: student.id,
      hall_id: billingConfig.hall_id,
      billing_month: billingConfig.billing_month,
      no_of_meals: noOfMeals,
      meal_charge: mealCharge,
      other_bills: otherBills,
      fuel_and_spices: fuelAndSpices,
      svc_charge: svcCharge,
      hall_rent: hallRent,
      total,
      dues: duesAmount,
      grand_total: grandTotal,
      status: duesAmount > 0 ? 'dues' : 'unpaid',
      generated_by: generatedBy,
      dues_months: duesMonths,
    }
  })
}

export const formatMoney = (value) => toNumber(value).toFixed(2)