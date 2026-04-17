import { prisma } from '@/shared/lib/prisma'

interface AttendanceCalculationInput {
  employeeId: string
  payrollPeriodId: string
}

interface AttendanceCalculationResult {
  totalHours: number
  totalShifts: number
  regularHours: number
  overtimeHours: number
  regularRate: number
  overtimeRate: number
  attendanceDetails: Array<{
    id: string
    date: string
    punchInTime: string
    punchOutTime: string | null
    duration: number
    isApproved: boolean
    /** 'attendance' = came from a punch record; 'shift' = calculated from approved shift schedule */
    source?: 'attendance' | 'shift'
    shift?: {
      id: string
      startTime: string
      endTime: string | null
      breakStart: string | null
      breakEnd: string | null
      breakPaid: boolean
      shiftTypeId: string | null
      wage: number | null
      shiftTypeConfig: {
        id: string
        name: string
        payCalculationType: string
        payCalculationValue: any
      } | null
    }
  }>
  wageCalculationMethod: string
  unapprovedHours: number
  approvedHours: number
}

export class AttendanceBasedCalculator {
  private roundHours(value: number, precision: number = 4): number {
    const factor = Math.pow(10, precision)
    return Math.round(value * factor) / factor
  }

  private calculateBreakHours(
    breakStart: Date | null | undefined,
    breakEnd: Date | null | undefined,
    breakPaid: boolean | null | undefined
  ): number {
    if (!breakStart || !breakEnd || breakPaid) {
      return 0
    }

    const durationMs = breakEnd.getTime() - breakStart.getTime()
    if (!Number.isFinite(durationMs) || durationMs <= 0) {
      return 0
    }

    return durationMs / (1000 * 60 * 60)
  }

  /**
   * Calculate hours worked based on approved attendance records
   */
  async calculateAttendanceHours(input: AttendanceCalculationInput): Promise<AttendanceCalculationResult> {
    const { employeeId, payrollPeriodId } = input

    // Get employee with pay rules
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        employeeGroup: {
          include: {
            employeeGroupPayRules: {
              where: { isDefault: true },
              include: {
                payRule: {
                  include: {
                    salaryCode: true,
                    overtimeRule: true
                  }
                }
              }
            }
          }
        },
        employeePayRules: {
          where: {
            isActive: true,
            OR: [
              { effectiveTo: null },
              { effectiveTo: { gte: new Date() } }
            ]
          },
          include: {
            payRule: {
              include: {
                salaryCode: true,
                overtimeRule: true
              }
            }
          }
        }
      }
    })

    if (!employee) {
      throw new Error('Employee not found')
    }

    // Get payroll period
    const payrollPeriod = await prisma.payrollPeriod.findUnique({
      where: { id: payrollPeriodId }
    })

    if (!payrollPeriod) {
      throw new Error('Payroll period not found')
    }

    // Get attendance records for the payroll period
    // Extend endDate to end-of-day so records on the last day are included
    const periodEnd = new Date(payrollPeriod.endDate)
    periodEnd.setHours(23, 59, 59, 999)

    const attendances = await prisma.attendance.findMany({
      where: {
        employeeId,
        punchInTime: {
          gte: new Date(payrollPeriod.startDate),
          lte: periodEnd
        }
      },
      include: {
        shift: {
          select: {
            id: true,
            startTime: true,
            endTime: true,
            breakStart: true,
            breakEnd: true,
            breakPaid: true,
            shiftTypeId: true,
            wage: true,
            shiftTypeConfig: {
              select: {
                id: true,
                name: true,
                payCalculationType: true,
                payCalculationValue: true
              }
            }
          }
        }
      },
      orderBy: {
        punchInTime: 'asc'
      }
    })

    let totalHours = 0
    let approvedHours = 0
    let unapprovedHours = 0
    const attendanceDetails: AttendanceCalculationResult['attendanceDetails'] = []

    // Process each attendance record
    for (const attendance of attendances) {
      if (!attendance.punchOutTime) {
        // Skip incomplete attendance records
        continue
      }

      const punchIn = new Date(attendance.punchInTime)
      const punchOut = new Date(attendance.punchOutTime)
      const durationMs = punchOut.getTime() - punchIn.getTime()
      const rawDurationHours = durationMs / (1000 * 60 * 60)
      const breakHours = this.calculateBreakHours(
        attendance.shift?.breakStart,
        attendance.shift?.breakEnd,
        attendance.shift?.breakPaid
      )
      const durationHours = Math.max(0, rawDurationHours - breakHours)

      totalHours += durationHours

      if (attendance.approved) {
        approvedHours += durationHours
      } else {
        unapprovedHours += durationHours
      }

      attendanceDetails.push({
        id: attendance.id,
        date: punchIn.toISOString().split('T')[0],
        punchInTime: punchIn.toISOString(),
        punchOutTime: punchOut.toISOString(),
        duration: this.roundHours(durationHours),
        isApproved: attendance.approved,
        shift: attendance.shift ? {
          id: attendance.shift.id,
          startTime: attendance.shift.startTime,
          endTime: attendance.shift.endTime,
          breakStart: attendance.shift.breakStart ? attendance.shift.breakStart.toISOString() : null,
          breakEnd: attendance.shift.breakEnd ? attendance.shift.breakEnd.toISOString() : null,
          breakPaid: attendance.shift.breakPaid ?? false,
          shiftTypeId: attendance.shift.shiftTypeId ?? null,
          wage: attendance.shift.wage ?? null,
          shiftTypeConfig: attendance.shift.shiftTypeConfig ? {
            id: attendance.shift.shiftTypeConfig.id,
            name: attendance.shift.shiftTypeConfig.name,
            payCalculationType: attendance.shift.shiftTypeConfig.payCalculationType as string,
            payCalculationValue: attendance.shift.shiftTypeConfig.payCalculationValue
              ? Number(attendance.shift.shiftTypeConfig.payCalculationValue)
              : null
          } : null
        } : undefined
      })
    }

    const excludeShiftIds = attendances.map(a => a.shiftId).filter(Boolean) as string[]
    const excludeDates = new Set(
      attendances
        .filter(a => !!a.punchOutTime)
        .map(a => new Date(a.punchInTime).toISOString().split('T')[0])
    )
    const shiftDetails = await this.calculateShiftBasedHours({
      employeeId,
      payrollPeriodId,
      excludeShiftIds,
      excludeDates
    })

    for (const sd of shiftDetails) {
      totalHours += sd.duration
      approvedHours += sd.duration
      attendanceDetails.push(sd)
    }

    const { regularHours, overtimeHours } = this.calculateOvertimeFromAttendance(
      attendanceDetails.filter(a => a.isApproved),
      employee
    )

    // Calculate rates
    const { regularRate, overtimeRate } = this.calculateRates(employee, attendanceDetails)

    return {
      totalHours: this.roundHours(totalHours),
      totalShifts: attendanceDetails.length,
      regularHours: this.roundHours(regularHours),
      overtimeHours: this.roundHours(overtimeHours),
      regularRate,
      overtimeRate,
      attendanceDetails,
      wageCalculationMethod: 'attendance',
      unapprovedHours: this.roundHours(unapprovedHours),
      approvedHours: this.roundHours(approvedHours)
    }
  }

  /**
   * Calculate hours directly from approved shifts that have no punch records.
   * Hours = endTime - startTime (minus unpaid break if set).
   */
  async calculateShiftBasedHours({
    employeeId,
    payrollPeriodId,
    excludeShiftIds = [],
    excludeDates = new Set()
  }: {
    employeeId: string
    payrollPeriodId: string
    excludeShiftIds?: string[]
    excludeDates?: Set<string>
  }): Promise<AttendanceCalculationResult['attendanceDetails']> {
    const payrollPeriod = await prisma.payrollPeriod.findUnique({
      where: { id: payrollPeriodId }
    })
    if (!payrollPeriod) return []

    const periodStart = new Date(payrollPeriod.startDate)
    const periodEnd = new Date(payrollPeriod.endDate)
    periodEnd.setHours(23, 59, 59, 999)

    const approvedShifts = await prisma.shift.findMany({
      where: {
        employeeId,
        approved: true,
        endTime: { not: null },
        date: { gte: periodStart, lte: periodEnd },
        ...(excludeShiftIds.length > 0 ? { id: { notIn: excludeShiftIds } } : {})
      },
      select: {
        id: true,
        date: true,
        startTime: true,
        endTime: true,
        breakStart: true,
        breakEnd: true,
        breakPaid: true,
        shiftTypeId: true,
        wage: true,
        shiftTypeConfig: {
          select: {
            id: true,
            name: true,
            payCalculationType: true,
            payCalculationValue: true
          }
        }
      }
    })

    const details: AttendanceCalculationResult['attendanceDetails'] = []

    for (const shift of approvedShifts) {
      if (!shift.startTime || !shift.endTime) continue

      const datePart = new Date(shift.date).toISOString().split('T')[0]
      if (excludeDates.has(datePart)) continue

      const parseShiftTime = (hhmm: string) => new Date(`${datePart}T${hhmm.length === 5 ? hhmm : `${hhmm}:00`}:00`)
      const startDate = parseShiftTime(shift.startTime)
      const endDate = parseShiftTime(shift.endTime)

      if (endDate <= startDate) endDate.setDate(endDate.getDate() + 1)

      const rawHours = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60)
      const breakHours = this.calculateBreakHours(shift.breakStart, shift.breakEnd, shift.breakPaid)
      const durationHours = this.roundHours(Math.max(0, rawHours - breakHours))

      if (durationHours <= 0) continue

      details.push({
        id: `shift-${shift.id}`,
        date: datePart,
        punchInTime: startDate.toISOString(),
        punchOutTime: endDate.toISOString(),
        duration: durationHours,
        isApproved: true,
        source: 'shift',
        shift: {
          id: shift.id,
          startTime: shift.startTime,
          endTime: shift.endTime,
          breakStart: shift.breakStart ? shift.breakStart.toISOString() : null,
          breakEnd: shift.breakEnd ? shift.breakEnd.toISOString() : null,
          breakPaid: shift.breakPaid ?? false,
          shiftTypeId: shift.shiftTypeId ?? null,
          wage: shift.wage != null ? Number(shift.wage) : null,
          shiftTypeConfig: shift.shiftTypeConfig ? {
            id: shift.shiftTypeConfig.id,
            name: shift.shiftTypeConfig.name,
            payCalculationType: shift.shiftTypeConfig.payCalculationType as string,
            payCalculationValue: shift.shiftTypeConfig.payCalculationValue
              ? Number(shift.shiftTypeConfig.payCalculationValue)
              : null
          } : null
        }
      })
    }

    return details
  }

  /**
   * Calculate overtime based on attendance records
   */
  private calculateOvertimeFromAttendance(approvedAttendances: any[], employee: any) {
    const applicableRules = this.getApplicablePayRules(employee)
    const overtimeRule = applicableRules.find(r => r.rule.ruleType === 'OVERTIME')
    
    let totalRegularHours = 0
    let totalOvertimeHours = 0

    if (!overtimeRule?.rule.overtimeRule) {
      totalRegularHours = approvedAttendances.reduce((sum, att) => sum + att.duration, 0)
      return { regularHours: totalRegularHours, overtimeHours: 0 }
    }

    const overtimeConfig = overtimeRule.rule.overtimeRule
    const triggerHours = Number(overtimeConfig.triggerAfterHours)
    const isDaily = overtimeConfig.isDaily

    if (isDaily) {
      // Daily overtime calculation - group by date
      const dailyAttendances = this.groupAttendancesByDate(approvedAttendances)
      
      for (const [date, attendances] of dailyAttendances.entries()) {
        const dailyHours = attendances.reduce((sum, att) => sum + att.duration, 0)
        
        if (dailyHours <= triggerHours) {
          totalRegularHours += dailyHours
        } else {
          totalRegularHours += triggerHours
          totalOvertimeHours += (dailyHours - triggerHours)
        }
      }
    } else {
      // Weekly overtime calculation
      const totalApprovedHours = approvedAttendances.reduce((sum, att) => sum + att.duration, 0)
      
      if (totalApprovedHours <= triggerHours) {
        totalRegularHours = totalApprovedHours
      } else {
        totalRegularHours = triggerHours
        totalOvertimeHours = totalApprovedHours - triggerHours
      }
    }

    return {
      regularHours: totalRegularHours,
      overtimeHours: totalOvertimeHours
    }
  }

  /**
   * Group attendance records by date
   */
  private groupAttendancesByDate(attendances: any[]) {
    const grouped = new Map<string, any[]>()
    
    for (const attendance of attendances) {
      const date = attendance.date
      if (!grouped.has(date)) {
        grouped.set(date, [])
      }
      grouped.get(date)!.push(attendance)
    }
    
    return grouped
  }

  /**
   * Get applicable pay rules for an employee (employee-specific rules override group rules)
   */
  private getApplicablePayRules(employee: any) {
    const rules = new Map()

    // First, add group rules as defaults
    if (employee.employeeGroup?.employeeGroupPayRules) {
      for (const groupRule of employee.employeeGroup.employeeGroupPayRules) {
        rules.set(groupRule.payRule.ruleType, {
          source: 'group',
          rule: groupRule.payRule,
          rate: Number(groupRule.baseRate)
        })
      }
    }

    // Then, override with employee-specific rules
    if (employee.employeePayRules) {
      for (const empRule of employee.employeePayRules) {
        rules.set(empRule.payRule.ruleType, {
          source: 'employee',
          rule: empRule.payRule,
          rate: Number(empRule.customRate)
        })
      }
    }

    return Array.from(rules.values())
  }

  /**
   * Calculate hourly rates from pay rules or employee group
   */
  private calculateRates(employee: any, attendanceDetails: any[] = []) {
    const applicableRules = this.getApplicablePayRules(employee)
    
    let regularRate = 0
    let overtimeRate = 0

    const shiftWithWage = attendanceDetails.find(
      attendance => attendance.isApproved && attendance.shift?.wage && attendance.shift.wage > 0
    )

    // Find regular rate rule
    const regularRule = applicableRules.find(r => r.rule.ruleType === 'REGULAR')
    if (shiftWithWage) {
      regularRate = shiftWithWage.shift.wage
    } else if (regularRule) {
      regularRate = regularRule.rate
    } else if (employee.salaryRate && employee.salaryRate > 0) {
      regularRate = employee.salaryRate
    } else {
      // Fall back to employee group hourly wage
      regularRate = employee.employeeGroup?.hourlyWage || 0
    }

    // Find overtime rule and calculate overtime rate
    const overtimeRule = applicableRules.find(r => r.rule.ruleType === 'OVERTIME')
    if (overtimeRule?.rule.overtimeRule) {
      const multiplier = Number(overtimeRule.rule.overtimeRule.rateMultiplier)
      overtimeRate = regularRate * multiplier
    } else {
      // Default 1.5x overtime rate
      overtimeRate = regularRate * 1.5
    }

    return { regularRate, overtimeRate }
  }

  /**
   * Get attendance summary for an employee in a period
   */
  async getAttendanceSummary(employeeId: string, payrollPeriodId: string) {
    const payrollPeriod = await prisma.payrollPeriod.findUnique({
      where: { id: payrollPeriodId }
    })

    if (!payrollPeriod) {
      throw new Error('Payroll period not found')
    }

    const summaryEnd = new Date(payrollPeriod.endDate)
    summaryEnd.setHours(23, 59, 59, 999)

    const attendances = await prisma.attendance.findMany({
      where: {
        employeeId,
        punchInTime: {
          gte: new Date(payrollPeriod.startDate),
          lte: summaryEnd
        }
      }
    })

    const total = attendances.length
    const completed = attendances.filter(a => a.punchOutTime).length
    const approved = attendances.filter(a => a.approved && a.punchOutTime).length
    const pending = attendances.filter(a => !a.approved && a.punchOutTime).length
    const active = attendances.filter(a => !a.punchOutTime).length

    return {
      total,
      completed,
      approved,
      pending,
      active,
      pendingApprovalList: attendances
        .filter(a => !a.approved && a.punchOutTime)
        .map(a => ({
          id: a.id,
          punchInTime: a.punchInTime,
          punchOutTime: a.punchOutTime
        }))
    }
  }
}

export const attendanceCalculator = new AttendanceBasedCalculator()
