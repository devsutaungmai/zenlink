import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/shared/lib/auth'
import { prisma } from '@/shared/lib/prisma'
import { calculatePayroll } from '@/shared/lib/salary-calculator'
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
      include: {
        department: true,
        employeeGroup: true,
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
        },
        attendances: {
          where: {
            punchInTime: {
              gte: new Date(startDate),
              lte: new Date(endDate)
            },
            approved: true,
            punchOutTime: {
              not: null
            }
          }
        }
      }
    })

    const shiftIds = employees
      .flatMap(emp => emp.attendances.map(att => att.shiftId))
      .filter((id): id is string => id !== null)

    const shiftsData = await prisma.shift.findMany({
      where: {
        id: { in: shiftIds }
      },
      include: {
        shiftTypeConfig: true
      }
    })

    const shiftsMap = new Map(shiftsData.map(shift => [shift.id, shift]))

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

      let isOvertimeEligible = true
      let overtimeExemptReason = null

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

      const payrollCalc = calculatePayroll({
        employee,
        shifts: shiftsMap,
        regularHoursPerDay: 8,
        overtimeMultiplier: 1.5
      })

      let adjustedOvertimeHours = payrollCalc.overtimeHours
      let adjustedOvertimePay = payrollCalc.overtimePay
      
      if (!isOvertimeEligible) {
        adjustedOvertimeHours = 0
        adjustedOvertimePay = 0
      }

      const adjustedGrossPay = payrollCalc.regularPay + adjustedOvertimePay

      if (payrollCalc.regularHours === 0 && adjustedOvertimeHours === 0) {
        skippedEmployees.push({
          id: employee.id,
          name: `${employee.firstName} ${employee.lastName}`,
          reason: 'No approved attendance records found'
        })
        continue
      }

      const deductions = 0
      const netPay = adjustedGrossPay - deductions

      let notes = ''
      if (payrollCalc.adjustments.length > 0) {
        notes = 'Shift Type Adjustments:\n' + 
          payrollCalc.adjustments.map(adj => 
            `- ${adj.shiftTypeName}: ${adj.adjustment >= 0 ? '+' : ''}${adj.adjustment.toFixed(2)}`
          ).join('\n')
      }

      if (!isOvertimeEligible && overtimeExemptReason) {
        notes += (notes ? '\n\n' : '') + `Overtime Exempt: ${overtimeExemptReason}`
      }

      const payrollEntry = await prisma.payrollEntry.create({
        data: {
          employeeId: employee.id,
          payrollPeriodId: payrollPeriodId,
          regularHours: payrollCalc.regularHours,
          overtimeHours: adjustedOvertimeHours,
          regularRate: payrollCalc.regularRate,
          overtimeRate: payrollCalc.overtimeRate,
          grossPay: adjustedGrossPay,
          deductions: deductions,
          netPay: netPay,
          bonuses: 0,
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