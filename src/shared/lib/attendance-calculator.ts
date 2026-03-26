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
    shift?: {
      id: string
      startTime: string
      endTime: string | null
      shiftTypeId: string | null
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
            shiftTypeId: true,
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
      const durationHours = durationMs / (1000 * 60 * 60)

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
        duration: Math.round(durationHours * 100) / 100,
        isApproved: attendance.approved,
        shift: attendance.shift ? {
          id: attendance.shift.id,
          startTime: attendance.shift.startTime,
          endTime: attendance.shift.endTime,
          shiftTypeId: attendance.shift.shiftTypeId ?? null,
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

    // Calculate overtime based on approved hours only
    const { regularHours, overtimeHours } = this.calculateOvertimeFromAttendance(
      attendanceDetails.filter(a => a.isApproved),
      employee
    )

    // Calculate rates
    const { regularRate, overtimeRate } = this.calculateRates(employee)

    return {
      totalHours: Math.round(totalHours * 100) / 100,
      totalShifts: attendanceDetails.length,
      regularHours: Math.round(regularHours * 100) / 100,
      overtimeHours: Math.round(overtimeHours * 100) / 100,
      regularRate,
      overtimeRate,
      attendanceDetails,
      wageCalculationMethod: 'attendance',
      unapprovedHours: Math.round(unapprovedHours * 100) / 100,
      approvedHours: Math.round(approvedHours * 100) / 100
    }
  }

  /**
   * Calculate overtime based on attendance records
   */
  private calculateOvertimeFromAttendance(approvedAttendances: any[], employee: any) {
    // Find overtime rule from pay rules
    const applicableRules = this.getApplicablePayRules(employee)
    const overtimeRule = applicableRules.find(r => r.rule.ruleType === 'OVERTIME')
    
    let totalRegularHours = 0
    let totalOvertimeHours = 0

    if (!overtimeRule?.rule.overtimeRule) {
      // No overtime rule - all approved hours are regular
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
  private calculateRates(employee: any) {
    const applicableRules = this.getApplicablePayRules(employee)
    
    let regularRate = 0
    let overtimeRate = 0

    // Find regular rate rule
    const regularRule = applicableRules.find(r => r.rule.ruleType === 'REGULAR')
    if (regularRule) {
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
