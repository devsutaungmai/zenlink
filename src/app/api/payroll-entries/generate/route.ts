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

    // Build employee filter conditions
    let employeeWhere: any = {
      user: {
        businessId: user.businessId
      }
    }

    // Filter by specific employees if provided
    if (employeeIds.length > 0) {
      employeeWhere.id = { in: employeeIds }
    }

    // Filter by departments if provided
    if (departmentIds.length > 0) {
      employeeWhere.departmentId = { in: departmentIds }
    }

    // Filter by employee groups if provided
    if (employeeGroupIds.length > 0) {
      employeeWhere.employeeGroupId = { in: employeeGroupIds }
    }

    // Get employees based on filters
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
            approved: true, // Only count approved attendance
            punchOutTime: {
              not: null // Only completed attendance records
            }
          }
        }
      }
    })

    // Check if payroll period exists
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
      // Check if payroll entry already exists for this employee and period
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

      // Calculate attendance hours
      let totalRegularHours = 0
      let totalOvertimeHours = 0

      for (const attendance of employee.attendances) {
        if (attendance.punchInTime && attendance.punchOutTime) {
          const punchIn = new Date(attendance.punchInTime)
          const punchOut = new Date(attendance.punchOutTime)
          const workDuration = (punchOut.getTime() - punchIn.getTime()) / (1000 * 60 * 60) // Convert to hours

          // Note: Break time handling would require additional fields in Attendance model
          // For now, we'll use the raw work duration
          const netWorkHours = workDuration

          // Regular hours (up to 8 hours per day)
          const regularHours = Math.min(netWorkHours, 8)
          const overtimeHours = Math.max(0, netWorkHours - 8)

          totalRegularHours += regularHours
          totalOvertimeHours += overtimeHours
        }
      }

      // Skip if no attendance hours
      if (totalRegularHours === 0 && totalOvertimeHours === 0) {
        skippedEmployees.push({
          id: employee.id,
          name: `${employee.firstName} ${employee.lastName}`,
          reason: 'No approved attendance records found'
        })
        continue
      }

      // Get hourly rates from employee group or use defaults
      const regularRate = employee.employeeGroup?.hourlyWage || 15.00 // Default rate
      const overtimeRate = regularRate * 1.5 // Time and a half for overtime

      // Calculate pay
      const regularPay = totalRegularHours * regularRate
      const overtimePay = totalOvertimeHours * overtimeRate
      const grossPay = regularPay + overtimePay

      // Calculate deductions (simplified - could be made more complex)
      const taxRate = 0.20 // 20% tax rate
      const deductions = grossPay * taxRate
      const netPay = grossPay - deductions

      // Create payroll entry
      const payrollEntry = await prisma.payrollEntry.create({
        data: {
          employeeId: employee.id,
          payrollPeriodId: payrollPeriodId,
          regularHours: Math.round(totalRegularHours * 100) / 100, // Round to 2 decimal places
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