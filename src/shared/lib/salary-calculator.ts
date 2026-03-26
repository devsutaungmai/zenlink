import { Decimal } from '@prisma/client/runtime/library'

interface ShiftTypeConfig {
  id: string
  name: string
  payCalculationType: 'HOURLY_PLUS_FIXED' | 'FIXED_AMOUNT' | 'PERCENTAGE' | 'UNPAID'
  payCalculationValue: Decimal | number | null
}

interface Employee {
  salaryRate?: number | null
  employeeGroup?: {
    hourlyWage: number
  } | null
}

interface Attendance {
  shiftId?: string | null
}

interface Shift {
  shiftTypeId?: string | null
  shiftTypeConfig?: ShiftTypeConfig | null
}

function toNumber(value: Decimal | number | null | undefined): number | null {
  if (value === null || value === undefined) {
    return null
  }
  if (typeof value === 'number') {
    return value
  }
  return value.toNumber()
}

export function getBaseHourlyRate(employee: Employee): number {
  if (employee.salaryRate !== null && employee.salaryRate !== undefined && employee.salaryRate > 0) {
    return employee.salaryRate
  }

  if (employee.employeeGroup?.hourlyWage !== null && 
      employee.employeeGroup?.hourlyWage !== undefined && 
      employee.employeeGroup?.hourlyWage > 0) {
    return employee.employeeGroup.hourlyWage
  }

  return 15.00
}

export function calculateShiftTypeAdjustment(
  baseRate: number,
  shiftTypeConfig: ShiftTypeConfig | null | undefined
): number {
  if (!shiftTypeConfig) {
    return baseRate
  }

  const { payCalculationType, payCalculationValue } = shiftTypeConfig

  switch (payCalculationType) {
    case 'UNPAID':
      return 0

    case 'FIXED_AMOUNT':
      // Replaces the hourly wage entirely with the fixed amount
      if (payCalculationValue !== null && payCalculationValue !== undefined) {
        return Number(payCalculationValue)
      }
      return baseRate

    case 'HOURLY_PLUS_FIXED':
      if (payCalculationValue !== null && payCalculationValue !== undefined) {
        return baseRate + Number(payCalculationValue)
      }
      return baseRate

    case 'PERCENTAGE':
      // Percentage of hourly wage: 200% = 2x base rate, 50% = 0.5x base rate
      if (payCalculationValue !== null && payCalculationValue !== undefined) {
        const percentage = Number(payCalculationValue) / 100
        return baseRate * percentage
      }
      return baseRate

    default:
      return baseRate
  }
}

export function calculateEffectiveRate(
  employee: Employee,
  shift: Shift | null | undefined
): number {
  // Step 1: Get base hourly rate (employee salary rate or group wage)
  const baseRate = getBaseHourlyRate(employee)

  // Step 2: Apply shift type adjustments if applicable
  if (shift?.shiftTypeConfig) {
    return calculateShiftTypeAdjustment(baseRate, shift.shiftTypeConfig)
  }

  return baseRate
}

/**
 * Calculate overtime rate (typically 1.5x the base rate)
 */
export function calculateOvertimeRate(baseRate: number, multiplier: number = 1.5): number {
  return baseRate * multiplier
}

/**
 * Calculate total pay for a set of hours at a given rate
 */
export function calculatePay(hours: number, rate: number): number {
  return hours * rate
}

/**
 * Round to 2 decimal places for currency
 */
export function roundCurrency(amount: number): number {
  return Math.round(amount * 100) / 100
}

/**
 * Calculate payroll for an employee based on their attendances
 */
export interface PayrollCalculationInput {
  employee: Employee & {
    attendances: Array<Attendance & {
      punchInTime: Date
      punchOutTime: Date | null
    }>
  }
  shifts: Map<string, Shift>
  regularHoursPerDay?: number
  overtimeMultiplier?: number
}

export interface PayrollCalculationResult {
  regularHours: number
  overtimeHours: number
  regularRate: number
  overtimeRate: number
  regularPay: number
  overtimePay: number
  grossPay: number
  adjustments: Array<{
    shiftId: string
    shiftTypeName: string
    adjustment: number
  }>
}

export function calculatePayroll(input: PayrollCalculationInput): PayrollCalculationResult {
  const {
    employee,
    shifts,
    regularHoursPerDay = 8,
    overtimeMultiplier = 1.5
  } = input

  let totalRegularHours = 0
  let totalOvertimeHours = 0
  let totalRegularPay = 0
  let totalOvertimePay = 0
  const adjustments: Array<{ shiftId: string; shiftTypeName: string; adjustment: number }> = []

  // Get base rate for the employee
  const baseRate = getBaseHourlyRate(employee)
  const baseOvertimeRate = calculateOvertimeRate(baseRate, overtimeMultiplier)

  for (const attendance of employee.attendances) {
    if (!attendance.punchInTime || !attendance.punchOutTime) {
      continue
    }

    const punchIn = new Date(attendance.punchInTime)
    const punchOut = new Date(attendance.punchOutTime)
    const workDuration = (punchOut.getTime() - punchIn.getTime()) / (1000 * 60 * 60)

    const shift = attendance.shiftId ? shifts.get(attendance.shiftId) : null

    // Calculate effective rate for this attendance (considering shift type)
    const effectiveRate = calculateEffectiveRate(employee, shift)
    const effectiveOvertimeRate = calculateOvertimeRate(effectiveRate, overtimeMultiplier)

    // Split into regular and overtime hours
    const regularHours = Math.min(workDuration, regularHoursPerDay)
    const overtimeHours = Math.max(0, workDuration - regularHoursPerDay)

    totalRegularHours += regularHours
    totalOvertimeHours += overtimeHours

    // Calculate pay for this attendance
    const regularPay = calculatePay(regularHours, effectiveRate)
    const overtimePay = calculatePay(overtimeHours, effectiveOvertimeRate)

    totalRegularPay += regularPay
    totalOvertimePay += overtimePay

    // Track adjustments if shift type affects pay
    if (shift?.shiftTypeConfig && effectiveRate !== baseRate) {
      const adjustment = (effectiveRate - baseRate) * workDuration
      adjustments.push({
        shiftId: shift.shiftTypeConfig.id,
        shiftTypeName: shift.shiftTypeConfig.name || 'Unnamed Shift Type',
        adjustment: roundCurrency(adjustment)
      })
    }
  }

  const grossPay = totalRegularPay + totalOvertimePay

  return {
    regularHours: roundCurrency(totalRegularHours),
    overtimeHours: roundCurrency(totalOvertimeHours),
    regularRate: roundCurrency(baseRate),
    overtimeRate: roundCurrency(baseOvertimeRate),
    regularPay: roundCurrency(totalRegularPay),
    overtimePay: roundCurrency(totalOvertimePay),
    grossPay: roundCurrency(grossPay),
    adjustments
  }
}
