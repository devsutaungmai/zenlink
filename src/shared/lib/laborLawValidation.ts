// Labor Law Validation Rules
// This module handles validation of shifts against local labor laws

export interface LaborLawRules {
  maxHoursPerDay: number
  minRestHoursBetweenShifts: number
  maxConsecutiveDays: number
  maxHoursPerWeek: number
  minBreakForLongShifts: number // minutes
  longShiftThreshold: number // hours that trigger mandatory break
  overtimeThreshold: number // hours after which overtime rules apply
  maxOvertimePerDay: number
  maxOvertimePerWeek: number
}

export interface ValidationResult {
  isValid: boolean
  violations: LaborLawViolation[]
  warnings: LaborLawWarning[]
}

export interface LaborLawViolation {
  type: 'MAX_HOURS_PER_DAY' | 'MIN_REST_BETWEEN_SHIFTS' | 'MAX_CONSECUTIVE_DAYS' | 'MAX_HOURS_PER_WEEK' | 'MISSING_BREAK' | 'MAX_OVERTIME_PER_DAY' | 'MAX_OVERTIME_PER_WEEK'
  message: string
  severity: 'ERROR' | 'WARNING'
  currentValue: number
  allowedValue: number
  affectedDate?: string
  overridable?: boolean // For violations that can be overridden with admin confirmation
}

export interface LaborLawWarning {
  type: 'APPROACHING_LIMIT' | 'LONG_SHIFT' | 'CONSECUTIVE_DAYS'
  message: string
  currentValue: number
  limitValue: number
}

export interface ShiftData {
  id?: string
  date: string | Date
  startTime: string
  endTime: string
  breakStart?: string
  breakEnd?: string
  employeeId: string
}

export const DEFAULT_LABOR_RULES: LaborLawRules = {
  maxHoursPerDay: 9,
  minRestHoursBetweenShifts: 11,
  maxConsecutiveDays: 6,
  maxHoursPerWeek: 40,
  minBreakForLongShifts: 30,
  longShiftThreshold: 5.5,
  overtimeThreshold: 9,
  maxOvertimePerDay: 4,
  maxOvertimePerWeek: 10
}

export const COUNTRY_RULES: Record<string, LaborLawRules> = {
  'NO': {
    maxHoursPerDay: 9,
    overtimeThreshold: 9,
    maxOvertimePerDay: 4,
    maxHoursPerWeek: 40,
    maxOvertimePerWeek: 10,
    maxConsecutiveDays: 6,
    minRestHoursBetweenShifts: 11,
    minBreakForLongShifts: 30,
    longShiftThreshold: 5.5
  },
  'TH': {
    maxHoursPerDay: 8,
    minRestHoursBetweenShifts: 11,
    maxConsecutiveDays: 6,
    maxHoursPerWeek: 48,
    minBreakForLongShifts: 60, // 1 hour break
    longShiftThreshold: 5,
    overtimeThreshold: 8,
    maxOvertimePerDay: 4,
    maxOvertimePerWeek: 36
  },
  'US': {
    maxHoursPerDay: 12,
    minRestHoursBetweenShifts: 8,
    maxConsecutiveDays: 7,
    maxHoursPerWeek: 60,
    minBreakForLongShifts: 30,
    longShiftThreshold: 6,
    overtimeThreshold: 8,
    maxOvertimePerDay: 8,
    maxOvertimePerWeek: 20
  },
  'GB': {
    maxHoursPerDay: 11,
    minRestHoursBetweenShifts: 11,
    maxConsecutiveDays: 6,
    maxHoursPerWeek: 48,
    minBreakForLongShifts: 20,
    longShiftThreshold: 6,
    overtimeThreshold: 8,
    maxOvertimePerDay: 6,
    maxOvertimePerWeek: 16
  },
  'DE': {
    maxHoursPerDay: 10,
    minRestHoursBetweenShifts: 11,
    maxConsecutiveDays: 6,
    maxHoursPerWeek: 48,
    minBreakForLongShifts: 30,
    longShiftThreshold: 6,
    overtimeThreshold: 8,
    maxOvertimePerDay: 4,
    maxOvertimePerWeek: 10
  }
}

export class LaborLawValidator {
  private rules: LaborLawRules

  constructor(countryCode?: string, customRules?: Partial<LaborLawRules>) {
    // Use country-specific rules or defaults
    const baseRules = countryCode && COUNTRY_RULES[countryCode] 
      ? COUNTRY_RULES[countryCode] 
      : DEFAULT_LABOR_RULES

    // Apply any custom rule overrides
    this.rules = { ...baseRules, ...customRules }
  }

  /**
   * Calculate shift duration in hours
   */
  private calculateShiftHours(shift: ShiftData): number {
    const startTime = this.parseTime(shift.startTime)
    const endTime = this.parseTime(shift.endTime)
    
    let hours = endTime - startTime
    if (hours < 0) {
      hours += 24 // Handle overnight shifts
    }

    // Subtract break time if provided
    if (shift.breakStart && shift.breakEnd) {
      const breakStart = this.parseTime(shift.breakStart)
      const breakEnd = this.parseTime(shift.breakEnd)
      let breakHours = breakEnd - breakStart
      if (breakHours < 0) {
        breakHours += 24
      }
      hours -= breakHours
    }

    return hours
  }

  /**
   * Parse time string (HH:MM) to decimal hours
   */
  private parseTime(timeStr: string): number {
    const [hours, minutes] = timeStr.split(':').map(Number)
    return hours + (minutes / 60)
  }

  /**
   * Calculate rest time between two shifts in hours
   */
  private calculateRestTime(shift1: ShiftData, shift2: ShiftData): number {
    const prev = this.getShiftDateTimes(shift1)
    const curr = this.getShiftDateTimes(shift2)

    const diffMs = curr.start.getTime() - prev.end.getTime()
    return diffMs / (1000 * 60 * 60)
  }

  private getShiftDateTimes(shift: ShiftData) {
    const baseDate = new Date(shift.date)

    const [startHour, startMinute] = shift.startTime.split(':').map(Number)
    const start = new Date(baseDate)
    start.setHours(startHour, startMinute, 0, 0)

    const [endHour, endMinute] = shift.endTime.split(':').map(Number)
    const end = new Date(baseDate)
    end.setHours(endHour, endMinute, 0, 0)

    if (end <= start) {
      end.setDate(end.getDate() + 1)
    }

    return { start, end }
  }

  private normalizeDateOnly(value: string | Date) {
    const date = value instanceof Date ? new Date(value) : new Date(value)
    date.setHours(0, 0, 0, 0)
    return date
  }

  private isNextCalendarDay(prev: string | Date, next: string | Date) {
    const prevDate = this.normalizeDateOnly(prev)
    const nextDate = this.normalizeDateOnly(next)
    const diffDays = (nextDate.getTime() - prevDate.getTime()) / (24 * 60 * 60 * 1000)
    return diffDays === 1
  }

  private mergeSplitOvernightShifts(shifts: ShiftData[]): ShiftData[] {
    if (shifts.length < 2) return shifts

    const sorted = [...shifts].sort((a, b) => {
      const aStart = this.getShiftDateTimes(a).start.getTime()
      const bStart = this.getShiftDateTimes(b).start.getTime()
      return aStart - bStart
    })

    const merged: ShiftData[] = []
    let index = 0

    while (index < sorted.length) {
      const current = sorted[index]
      const next = sorted[index + 1]

      const looksLikeSplit =
        next &&
        current.employeeId === next.employeeId &&
        this.isNextCalendarDay(current.date, next.date) &&
        current.endTime === '23:59' &&
        (next.startTime === '01:00' || next.startTime === '00:00')

      if (looksLikeSplit) {
        merged.push({
          ...current,
          endTime: next.endTime,
          breakStart: current.breakStart ?? next.breakStart,
          breakEnd: next.breakEnd ?? current.breakEnd,
        })
        index += 2
        continue
      }

      merged.push(current)
      index += 1
    }

    return merged
  }

  /**
   * Get all shifts for an employee within a date range
   */
  private async getEmployeeShifts(employeeId: string, startDate: Date, endDate: Date): Promise<ShiftData[]> {
    try {
      const start = startDate.toISOString().split('T')[0]
      const end = endDate.toISOString().split('T')[0]
      
      const response = await fetch(`/api/shifts?employeeId=${employeeId}&startDate=${start}&endDate=${end}`)
      if (!response.ok) {
        throw new Error('Failed to fetch shifts')
      }
      
      const shifts = await response.json()
      return shifts.map((shift: any) => ({
        id: shift.id,
        date: shift.date,
        startTime: shift.startTime,
        endTime: shift.endTime,
        breakStart: shift.breakStart,
        breakEnd: shift.breakEnd,
        employeeId: shift.employeeId
      }))
    } catch (error) {
      console.error('Error fetching employee shifts:', error)
      return []
    }
  }

  /**
   * Validate a single shift against daily rules
   */
  validateShiftDaily(shift: ShiftData): ValidationResult {
    const violations: LaborLawViolation[] = []
    const warnings: LaborLawWarning[] = []

    const shiftHours = this.calculateShiftHours(shift)
    
    // Check maximum hours per day
    if (shiftHours > this.rules.maxHoursPerDay) {
      violations.push({
        type: 'MAX_HOURS_PER_DAY',
        message: `Shift exceeds maximum daily hours (${shiftHours.toFixed(1)}h > ${this.rules.maxHoursPerDay}h)`,
        severity: 'ERROR',
        currentValue: shiftHours,
        allowedValue: this.rules.maxHoursPerDay,
        affectedDate: typeof shift.date === 'string' ? shift.date : shift.date.toISOString().split('T')[0],
        overridable: true // Allow admin to override with confirmation
      })
    }

    // Check if long shift has required break
    if (shiftHours >= this.rules.longShiftThreshold) {
      if (!shift.breakStart || !shift.breakEnd) {
        violations.push({
          type: 'MISSING_BREAK',
          message: `Shifts of ${this.rules.longShiftThreshold}+ hours require a break of at least ${this.rules.minBreakForLongShifts} minutes`,
          severity: 'ERROR',
          currentValue: 0,
          allowedValue: this.rules.minBreakForLongShifts,
          affectedDate: typeof shift.date === 'string' ? shift.date : shift.date.toISOString().split('T')[0],
          overridable: true // Allow admin to override with confirmation
        })
      } else {
        const breakStart = this.parseTime(shift.breakStart)
        const breakEnd = this.parseTime(shift.breakEnd)
        let breakMinutes = (breakEnd - breakStart) * 60
        if (breakMinutes < 0) {
          breakMinutes += 24 * 60
        }
        const normalizedBreakMinutes = Math.round(breakMinutes)
        
        if (normalizedBreakMinutes < this.rules.minBreakForLongShifts) {
          violations.push({
            type: 'MISSING_BREAK',
            message: `Break duration (${normalizedBreakMinutes} min) is less than required (${this.rules.minBreakForLongShifts} min)`,
            severity: 'ERROR',
            currentValue: normalizedBreakMinutes,
            allowedValue: this.rules.minBreakForLongShifts,
            affectedDate: typeof shift.date === 'string' ? shift.date : shift.date.toISOString().split('T')[0],
            overridable: true // Allow admin to override with confirmation
          })
        }
      }
    }

    // Check overtime limits
    const overtimeHours = Math.max(0, shiftHours - this.rules.overtimeThreshold)
    if (overtimeHours > this.rules.maxOvertimePerDay) {
      violations.push({
        type: 'MAX_OVERTIME_PER_DAY',
        message: `Daily overtime exceeds limit (${overtimeHours.toFixed(1)}h > ${this.rules.maxOvertimePerDay}h)`,
        severity: 'ERROR',
        currentValue: overtimeHours,
        allowedValue: this.rules.maxOvertimePerDay,
        affectedDate: typeof shift.date === 'string' ? shift.date : shift.date.toISOString().split('T')[0],
        overridable: true // Allow admin to override with confirmation
      })
    }

    // Warnings for approaching limits
    if (shiftHours > this.rules.maxHoursPerDay * 0.9) {
      warnings.push({
        type: 'APPROACHING_LIMIT',
        message: `Shift duration approaching daily limit (${shiftHours.toFixed(1)}h / ${this.rules.maxHoursPerDay}h)`,
        currentValue: shiftHours,
        limitValue: this.rules.maxHoursPerDay
      })
    }

    if (shiftHours >= this.rules.longShiftThreshold) {
      warnings.push({
        type: 'LONG_SHIFT',
        message: `Long shift detected (${shiftHours.toFixed(1)}h). Ensure proper breaks are scheduled.`,
        currentValue: shiftHours,
        limitValue: this.rules.longShiftThreshold
      })
    }

    return {
      isValid: violations.length === 0,
      violations,
      warnings
    }
  }

  /**
   * Validate shift against weekly and multi-day rules
   */
  async validateShiftWeekly(shift: ShiftData, existingShifts?: ShiftData[]): Promise<ValidationResult> {
    const violations: LaborLawViolation[] = []
    const warnings: LaborLawWarning[] = []

    // Get shifts for the week if not provided
    if (!existingShifts) {
      const shiftDate = new Date(shift.date)
      const weekStart = new Date(shiftDate)
      weekStart.setDate(shiftDate.getDate() - shiftDate.getDay()) // Start of week (Sunday)
      
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekStart.getDate() + 6) // End of week (Saturday)
      
      existingShifts = await this.getEmployeeShifts(shift.employeeId, weekStart, weekEnd)
    }

    // Add current shift to existing shifts for calculation
    const allShifts = [...existingShifts.filter(s => s.id !== shift.id), shift]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    const normalizedShifts = this.mergeSplitOvernightShifts(allShifts)

    // Check weekly hours
    const weeklyHours = normalizedShifts.reduce((total, s) => total + this.calculateShiftHours(s), 0)
    if (weeklyHours > this.rules.maxHoursPerWeek) {
      violations.push({
        type: 'MAX_HOURS_PER_WEEK',
        message: `Weekly hours exceed limit (${weeklyHours.toFixed(1)}h > ${this.rules.maxHoursPerWeek}h)`,
        severity: 'ERROR',
        currentValue: weeklyHours,
        allowedValue: this.rules.maxHoursPerWeek
      })
    }

    // Check weekly overtime
    const weeklyOvertime = normalizedShifts.reduce((total, s) => {
      const shiftHours = this.calculateShiftHours(s)
      return total + Math.max(0, shiftHours - this.rules.overtimeThreshold)
    }, 0)

    if (weeklyOvertime > this.rules.maxOvertimePerWeek) {
      violations.push({
        type: 'MAX_OVERTIME_PER_WEEK',
        message: `Weekly overtime exceeds limit (${weeklyOvertime.toFixed(1)}h > ${this.rules.maxOvertimePerWeek}h)`,
        severity: 'ERROR',
        currentValue: weeklyOvertime,
        allowedValue: this.rules.maxOvertimePerWeek,
        overridable: true // Allow admin to override with confirmation
      })
    }

    // Check rest time between consecutive shifts
    for (let i = 1; i < normalizedShifts.length; i++) {
      const prevShift = normalizedShifts[i - 1]
      const currentShift = normalizedShifts[i]
      
      const restTime = this.calculateRestTime(prevShift, currentShift)
      if (restTime < this.rules.minRestHoursBetweenShifts) {
        violations.push({
          type: 'MIN_REST_BETWEEN_SHIFTS',
          message: `Insufficient rest between shifts (${restTime.toFixed(1)}h < ${this.rules.minRestHoursBetweenShifts}h)`,
          severity: 'ERROR',
          currentValue: restTime,
          allowedValue: this.rules.minRestHoursBetweenShifts,
          affectedDate: typeof currentShift.date === 'string' ? currentShift.date : currentShift.date.toISOString().split('T')[0]
        })
      }
    }

    // Check consecutive working days
    let consecutiveDays = 1
    let maxConsecutive = 1
    
    for (let i = 1; i < normalizedShifts.length; i++) {
      const prevDate = new Date(normalizedShifts[i - 1].date)
      const currentDate = new Date(normalizedShifts[i].date)
      const daysDiff = Math.floor((currentDate.getTime() - prevDate.getTime()) / (24 * 60 * 60 * 1000))
      
      if (daysDiff === 1) {
        consecutiveDays++
      } else {
        maxConsecutive = Math.max(maxConsecutive, consecutiveDays)
        consecutiveDays = 1
      }
    }
    maxConsecutive = Math.max(maxConsecutive, consecutiveDays)

    if (maxConsecutive > this.rules.maxConsecutiveDays) {
      violations.push({
        type: 'MAX_CONSECUTIVE_DAYS',
        message: `Too many consecutive working days (${maxConsecutive} > ${this.rules.maxConsecutiveDays})`,
        severity: 'ERROR',
        currentValue: maxConsecutive,
        allowedValue: this.rules.maxConsecutiveDays
      })
    }

    // Warnings
    if (weeklyHours > this.rules.maxHoursPerWeek * 0.9) {
      warnings.push({
        type: 'APPROACHING_LIMIT',
        message: `Weekly hours approaching limit (${weeklyHours.toFixed(1)}h / ${this.rules.maxHoursPerWeek}h)`,
        currentValue: weeklyHours,
        limitValue: this.rules.maxHoursPerWeek
      })
    }

    if (consecutiveDays >= this.rules.maxConsecutiveDays - 1) {
      warnings.push({
        type: 'CONSECUTIVE_DAYS',
        message: `Approaching maximum consecutive working days (${consecutiveDays} / ${this.rules.maxConsecutiveDays})`,
        currentValue: consecutiveDays,
        limitValue: this.rules.maxConsecutiveDays
      })
    }

    return {
      isValid: violations.length === 0,
      violations,
      warnings
    }
  }

  /**
   * Comprehensive validation of a shift
   */
  async validateShift(shift: ShiftData, existingShifts?: ShiftData[]): Promise<ValidationResult> {
    // Validate daily rules
    const dailyValidation = this.validateShiftDaily(shift)
    
    // Validate weekly rules
    const weeklyValidation = await this.validateShiftWeekly(shift, existingShifts)
    
    // Combine results
    return {
      isValid: dailyValidation.isValid && weeklyValidation.isValid,
      violations: [...dailyValidation.violations, ...weeklyValidation.violations],
      warnings: [...dailyValidation.warnings, ...weeklyValidation.warnings]
    }
  }

  /**
   * Get current labor law rules
   */
  getRules(): LaborLawRules {
    return { ...this.rules }
  }

  /**
   * Update labor law rules
   */
  updateRules(newRules: Partial<LaborLawRules>): void {
    this.rules = { ...this.rules, ...newRules }
  }
}

// Helper function to format validation messages for UI
export function formatValidationMessage(violation: LaborLawViolation): string {
  switch (violation.type) {
    case 'MAX_HOURS_PER_DAY':
      return `Cannot create shift over ${violation.allowedValue} hours`
    case 'MIN_REST_BETWEEN_SHIFTS':
      return `Insufficient rest time: ${violation.currentValue.toFixed(1)}h / ${violation.allowedValue}h required`
    case 'MAX_CONSECUTIVE_DAYS':
      return `Too many consecutive days: ${violation.currentValue} / ${violation.allowedValue} max`
    case 'MAX_HOURS_PER_WEEK':
      return `Weekly hours exceeded: ${violation.currentValue.toFixed(1)}h / ${violation.allowedValue}h max`
    case 'MISSING_BREAK':
      return `Break required: ${violation.allowedValue} minutes minimum for long shifts`
    case 'MAX_OVERTIME_PER_DAY':
      return `Daily overtime exceeded: ${violation.currentValue.toFixed(1)}h / ${violation.allowedValue}h max`
    case 'MAX_OVERTIME_PER_WEEK':
      return `Weekly overtime exceeded: ${violation.currentValue.toFixed(1)}h / ${violation.allowedValue}h max`
    default:
      return violation.message
  }
}

// Helper function to separate overridable and non-overridable violations
export function separateViolations(violations: LaborLawViolation[]) {
  const overridable: LaborLawViolation[] = []
  const nonOverridable: LaborLawViolation[] = []
  
  violations.forEach(violation => {
    if (violation.overridable) {
      overridable.push(violation)
    } else {
      nonOverridable.push(violation)
    }
  })
  
  return { overridable, nonOverridable }
}

export const laborLawValidator = new LaborLawValidator('NO')

export function updateLaborLawValidatorRules(rules: Partial<LaborLawRules>): void {
  laborLawValidator.updateRules(rules)
}
