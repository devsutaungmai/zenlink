import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/app/lib/prisma'

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

      let totalRegularHours = 0
      let totalOvertimeHours = 0

      for (const attendance of employee.attendances) {
        if (attendance.punchInTime && attendance.punchOutTime) {
          const punchIn = new Date(attendance.punchInTime)
          const punchOut = new Date(attendance.punchOutTime)
          const workDuration = (punchOut.getTime() - punchIn.getTime()) / (1000 * 60 * 60)

          const netWorkHours = workDuration

          const regularHours = Math.min(netWorkHours, 8)
          const overtimeHours = Math.max(0, netWorkHours - 8)

          totalRegularHours += regularHours
          totalOvertimeHours += overtimeHours
        }
      }

      if (totalRegularHours === 0 && totalOvertimeHours === 0) {
        skippedEmployees.push({
          id: employee.id,
          name: `${employee.firstName} ${employee.lastName}`,
          reason: 'No approved attendance records found'
        })
        continue
      }

      const regularRate = employee.employeeGroup?.hourlyWage || 15.00
      const overtimeRate = regularRate * 1.5

      const regularPay = totalRegularHours * regularRate
      const overtimePay = totalOvertimeHours * overtimeRate
      const grossPay = regularPay + overtimePay

      const deductions = 0
      const netPay = grossPay - deductions

      const payrollEntry = await prisma.payrollEntry.create({
        data: {
          employeeId: employee.id,
          payrollPeriodId: payrollPeriodId,
          regularHours: Math.round(totalRegularHours * 100) / 100,
          overtimeHours: Math.round(totalOvertimeHours * 100) / 100,
          regularRate: regularRate,
          overtimeRate: overtimeRate,
          grossPay: Math.round(grossPay * 100) / 100,
          deductions: Math.round(deductions * 100) / 100,
          netPay: Math.round(netPay * 100) / 100,
          bonuses: 0,
          status: 'DRAFT'
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