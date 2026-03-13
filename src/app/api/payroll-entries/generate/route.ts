import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/shared/lib/auth'
import { prisma } from '@/shared/lib/prisma'
import { payRulesEngine } from '@/shared/lib/pay-rules-engine'
import { attendanceCalculator } from '@/shared/lib/attendance-calculator'
import { getEmployeeContractInfo, ContractValidator } from '@/shared/lib/contractValidation'

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
          reason: 'No approved attendance records found'
        })
        continue
      }

      // Build shift details for pay rules engine
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

      // Use payRulesEngine (same as recalculate flow)
      const payCalc = await payRulesEngine.calculatePay({
        employeeId: employee.id,
        payrollPeriodId,
        totalHours: attendanceCalc.approvedHours,
        regularHours: attendanceCalc.regularHours,
        shiftDetails
      })

      // Check contract rules for overtime eligibility
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
      let finalOvertimePay = finalOvertimeHours * payCalc.overtimeRate

      if (!isOvertimeEligible) {
        finalOvertimeHours = 0
        finalOvertimePay = 0
      }

      const regularPay = payCalc.regularHours * payCalc.regularRate
      const grossPay = regularPay + finalOvertimePay + payCalc.bonuses
      const netPay = grossPay - payCalc.deductions

      let notes = ''
      if (payCalc.appliedRules.length > 0) {
        notes = 'Applied Pay Rules:\n' +
          payCalc.appliedRules.map(rule =>
            `- ${rule.ruleName} (${rule.salaryCode}): ${rule.amount >= 0 ? '+' : ''}${rule.amount.toFixed(2)}`
          ).join('\n')
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
          regularRate: payCalc.regularRate,
          overtimeRate: payCalc.overtimeRate,
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
    return NextResponse.json(
      { error: 'Failed to generate payroll entries' },
      { status: 500 }
    )
  }
}