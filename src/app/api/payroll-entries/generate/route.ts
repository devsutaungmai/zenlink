import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/shared/lib/auth'
import { prisma } from '@/shared/lib/prisma'
import { payRulesEngine } from '@/shared/lib/pay-rules-engine'
import { attendanceCalculator } from '@/shared/lib/attendance-calculator'
import { getEmployeeContractInfo, ContractValidator } from '@/shared/lib/contractValidation'
import { calculateShiftTypeAdjustment } from '@/shared/lib/salary-calculator'
import { captureApiError } from '@/shared/lib/sentry'

export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    
    const { 
      startDate, 
      endDate, 
      employeeIds = [], 
      departmentIds = [], 
      employeeGroupIds = [],
      payrollPeriodId 
    } = await request.json()

    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'Start date and end date are required' }, { status: 400 })
    }

    if (!payrollPeriodId) {
      return NextResponse.json({ error: 'Payroll period is required' }, { status: 400 })
    }

    let employeeWhere: any = {
      user: {
        businessId: user.businessId
      }
    }

    if (employeeIds.length > 0) {
      employeeWhere.id = { in: employeeIds }
    }

    if (departmentIds.length > 0) {
      employeeWhere.departmentId = { in: departmentIds }
    }

    if (employeeGroupIds.length > 0) {
      employeeWhere.employeeGroupId = { in: employeeGroupIds }
    }

    const employees = await prisma.employee.findMany({
      where: employeeWhere,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        employeeNo: true,
        ftePercent: true,
        contractType: {
          include: {
            laborLawProfile: {
              include: {
                laborLawSettings: true
              }
            }
          }
        },
        employeeRoles: {
          select: {
            roleId: true
          }
        }
      }
    })

    const payrollPeriod = await prisma.payrollPeriod.findFirst({
      where: {
        id: payrollPeriodId,
        businessId: user.businessId
      }
    })

    if (!payrollPeriod) {
      return NextResponse.json({ error: 'Invalid payroll period' }, { status: 400 })
    }

    const createdEntries = []
    const skippedEmployees = []

    for (const employee of employees) {
      const existingEntry = await prisma.payrollEntry.findFirst({
        where: {
          employeeId: employee.id,
          payrollPeriodId: payrollPeriodId
        }
      })

      if (existingEntry) {
        skippedEmployees.push({
          id: employee.id,
          name: `${employee.firstName} ${employee.lastName}`,
          reason: 'Payroll entry already exists'
        })
        continue
      }

      // Use attendanceCalculator (same as recalculate flow)
      const attendanceCalc = await attendanceCalculator.calculateAttendanceHours({
        employeeId: employee.id,
        payrollPeriodId
      })

      if (attendanceCalc.approvedHours === 0) {
        skippedEmployees.push({
          id: employee.id,
          name: `${employee.firstName} ${employee.lastName}`,
          reason: 'No approved attendance records or approved shifts found'
        })
        continue
      }

      const shiftDetails = attendanceCalc.attendanceDetails
        .filter(att => att.isApproved && att.punchOutTime)
        .map(att => ({
          date: att.date,
          startTime: new Date(att.punchInTime).toTimeString().substring(0, 5),
          endTime: att.punchOutTime ? new Date(att.punchOutTime).toTimeString().substring(0, 5) : '',
          hours: att.duration,
          breakDuration: 0,
          breakPaid: false
        }))

      const payCalc = await payRulesEngine.calculatePay({
        employeeId: employee.id,
        payrollPeriodId,
        totalHours: attendanceCalc.approvedHours,
        regularHours: attendanceCalc.regularHours,
        shiftDetails
      })

      let isOvertimeEligible = true
      let overtimeExemptReason: string | null = null

      if (employee.contractType) {
        const employeeRoleIds = employee.employeeRoles.map(er => er.roleId)
        const contractValidator = new ContractValidator(
          employee.contractType,
          employee.ftePercent,
          employeeRoleIds
        )
        isOvertimeEligible = contractValidator.isOvertimeEligible()
        overtimeExemptReason = contractValidator.getOvertimeExemptReason()
      }

      let finalOvertimeHours = payCalc.overtimeHours

      if (!isOvertimeEligible) {
        finalOvertimeHours = 0
      }

      // --- Per-attendance/shift pay calculation with shift type adjustments ---
      const approvedDetails = attendanceCalc.attendanceDetails
        .filter(att => att.isApproved && att.punchOutTime)

      const hasShiftTypeAdjustments = approvedDetails.some(
        att => att.shift?.shiftTypeConfig && att.shift.shiftTypeConfig.payCalculationType !== 'UNPAID'
      )

      // Build date -> regular/overtime ratio from payCalc daily breakdown
      const dateOvertimeMap = new Map<string, { regularHours: number; overtimeHours: number; totalHours: number }>()
      for (const day of payCalc.overtimeCalculations) {
        const total = day.regularHours + day.overtimeHours
        dateOvertimeMap.set(day.date, {
          regularHours: day.regularHours,
          overtimeHours: day.overtimeHours,
          totalHours: total
        })
      }

      const overtimeMultiplier = payCalc.regularRate > 0
        ? payCalc.overtimeRate / payCalc.regularRate
        : 1.5

      const entryBaseRate = approvedDetails.find(
        att => att.shift?.wage !== null && att.shift?.wage !== undefined && att.shift.wage > 0
      )?.shift?.wage ?? payCalc.regularRate
      const entryOvertimeRate = entryBaseRate * overtimeMultiplier

      let totalRegularPay = 0
      let totalOvertimePay = 0
      const shiftTypeNotes: string[] = []

      for (const att of approvedDetails) {
        const dayInfo = dateOvertimeMap.get(att.date)
        let attRegularHours = att.duration
        let attOvertimeHours = 0

        if (dayInfo && dayInfo.totalHours > 0) {
          const regularRatio = dayInfo.regularHours / dayInfo.totalHours
          const overtimeRatio = dayInfo.overtimeHours / dayInfo.totalHours
          attRegularHours = att.duration * regularRatio
          attOvertimeHours = att.duration * overtimeRatio
        }

        if (!isOvertimeEligible) {
          attRegularHours = att.duration
          attOvertimeHours = 0
        }

        const shiftWage = att.shift?.wage
        const baseRate = (shiftWage !== null && shiftWage !== undefined && shiftWage > 0)
          ? shiftWage
          : payCalc.regularRate

        const shiftTypeConfig = att.shift?.shiftTypeConfig || null
        const effectiveRegularRate = calculateShiftTypeAdjustment(baseRate, shiftTypeConfig as any)
        const effectiveOvertimeRate = effectiveRegularRate * overtimeMultiplier

        totalRegularPay += attRegularHours * effectiveRegularRate
        totalOvertimePay += attOvertimeHours * effectiveOvertimeRate

        if (shiftWage !== null && shiftWage !== undefined && shiftWage > 0) {
          shiftTypeNotes.push(
            `${att.date}: Shift wage – ${att.duration}h @ ${effectiveRegularRate.toFixed(2)}/hr`
          )
        } else if (shiftTypeConfig && effectiveRegularRate !== payCalc.regularRate) {
          shiftTypeNotes.push(
            `${att.date}: ${shiftTypeConfig.name} – ${att.duration}h @ ${effectiveRegularRate.toFixed(2)}/hr`
          )
        }
      }

      const grossPay = totalRegularPay + totalOvertimePay + payCalc.bonuses
      const netPay = grossPay - payCalc.deductions

      let notes = ''
      if (payCalc.appliedRules.length > 0) {
        notes = 'Applied Pay Rules:\n' +
          payCalc.appliedRules.map(rule =>
            `- ${rule.ruleName} (${rule.salaryCode}): ${rule.amount >= 0 ? '+' : ''}${rule.amount.toFixed(2)}`
          ).join('\n')
      }

      if (shiftTypeNotes.length > 0) {
        notes += (notes ? '\n\n' : '') + 'Shift Type Adjustments:\n' +
          shiftTypeNotes.map(n => `- ${n}`).join('\n')
      }

      if (!isOvertimeEligible && overtimeExemptReason) {
        notes += (notes ? '\n\n' : '') + `Overtime Exempt: ${overtimeExemptReason}`
      }

      const payrollEntry = await prisma.payrollEntry.create({
        data: {
          employeeId: employee.id,
          payrollPeriodId: payrollPeriodId,
          regularHours: payCalc.regularHours,
          overtimeHours: finalOvertimeHours,
          regularRate: entryBaseRate,
          overtimeRate: entryOvertimeRate,
          grossPay: grossPay,
          deductions: payCalc.deductions,
          netPay: netPay,
          bonuses: payCalc.bonuses,
          status: 'DRAFT',
          notes: notes || undefined
        },
        include: {
          employee: {
            include: {
              department: true,
              employeeGroup: true
            }
          },
          payrollPeriod: true
        }
      })

      createdEntries.push(payrollEntry)
    }

    return NextResponse.json({
      success: true,
      created: createdEntries.length,
      skipped: skippedEmployees.length,
      createdEntries,
      skippedEmployees,
      message: `Successfully created ${createdEntries.length} payroll entries. ${skippedEmployees.length} employees were skipped.`
    })

  } catch (error) {
    console.error('Error generating payroll entries:', error)
    captureApiError(error, { route: '/api/payroll-entries/generate', method: 'POST' })
    return NextResponse.json(
      { error: 'Failed to generate payroll entries' },
      { status: 500 }
    )
  }
}