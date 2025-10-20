import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/shared/lib/auth'
import { prisma } from '@/shared/lib/prisma'
import { getBaseHourlyRate } from '@/shared/lib/salary-calculator'

interface PowerOfficeRow {
  employeeNo: string
  payItemCode: string
  rate: number
  amount: number
  quantity: number
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const payrollPeriodId = searchParams.get('payrollPeriodId')
    const status = searchParams.get('status') || 'APPROVED'

    if (!payrollPeriodId) {
      return NextResponse.json(
        { error: 'Payroll period ID is required' },
        { status: 400 }
      )
    }

    // Get payroll period with business check
    const payrollPeriod = await prisma.payrollPeriod.findFirst({
      where: {
        id: payrollPeriodId,
        businessId: user.businessId,
      },
    })

    if (!payrollPeriod) {
      return NextResponse.json(
        { error: 'Payroll period not found' },
        { status: 404 }
      )
    }

    // Get all payroll entries for this period
    const whereClause: any = {
      payrollPeriodId,
    }

    if (status !== 'all') {
      whereClause.status = status
    }

    const payrollEntries = await prisma.payrollEntry.findMany({
      where: whereClause,
      include: {
        employee: {
          include: {
            employeeGroup: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    const powerOfficeRows: PowerOfficeRow[] = []

    for (const entry of payrollEntries) {
      // Fetch attendances for this employee in the payroll period
      const attendances = await prisma.attendance.findMany({
        where: {
          employeeId: entry.employeeId,
          punchInTime: {
            gte: payrollPeriod.startDate,
            lte: payrollPeriod.endDate,
          },
          approved: true,
          punchOutTime: {
            not: null,
          },
        },
        include: {
          shift: {
            include: {
              shiftTypeConfig: true,
            },
          },
        },
      })

      // Get employee's base salary rate
      const baseRate = getBaseHourlyRate(entry.employee)

      // Group attendances by salary code
      const salaryCodeGroups = new Map<string, {
        hours: number
        salaryCode: string
      }>()

      let totalAttendanceHours = 0

      for (const attendance of attendances) {
        if (!attendance.punchInTime || !attendance.punchOutTime) {
          continue
        }

        const punchIn = new Date(attendance.punchInTime)
        const punchOut = new Date(attendance.punchOutTime)
        const hours = (punchOut.getTime() - punchIn.getTime()) / (1000 * 60 * 60)

        totalAttendanceHours += hours

        // Determine salary code
        let salaryCode = 'SALARY' // Default salary code

        // Check if attendance has a shift with shift type config
        if (attendance.shift?.shiftTypeConfig?.salaryCode) {
          salaryCode = attendance.shift.shiftTypeConfig.salaryCode
        }

        // Accumulate hours per salary code
        if (salaryCodeGroups.has(salaryCode)) {
          const existing = salaryCodeGroups.get(salaryCode)!
          existing.hours += hours
        } else {
          salaryCodeGroups.set(salaryCode, {
            hours,
            salaryCode,
          })
        }
      }

      // Create one row per salary code
      if (salaryCodeGroups.size > 0) {
        // Calculate the proportion of gross pay for each salary code based on hours
        for (const [salaryCode, data] of salaryCodeGroups) {
          // Calculate amount as proportional share of gross pay
          const proportionOfTotalHours = totalAttendanceHours > 0 ? data.hours / totalAttendanceHours : 1
          const amount = entry.grossPay * proportionOfTotalHours

          powerOfficeRows.push({
            employeeNo: entry.employee.employeeNo || '',
            payItemCode: salaryCode,
            rate: parseFloat(baseRate.toFixed(2)),
            amount: parseFloat(amount.toFixed(2)),
            quantity: parseFloat(data.hours.toFixed(2)),
          })
        }
      } else {
        // If no attendances with shift types, create a single row with default values
        if ((entry.regularHours + entry.overtimeHours) > 0) {
          const totalHours = entry.regularHours + entry.overtimeHours
          
          powerOfficeRows.push({
            employeeNo: entry.employee.employeeNo || '',
            payItemCode: 'SALARY',
            rate: parseFloat(baseRate.toFixed(2)),
            amount: parseFloat(entry.grossPay.toFixed(2)),
            quantity: parseFloat(totalHours.toFixed(2)),
          })
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: powerOfficeRows,
      period: {
        name: payrollPeriod.name,
        startDate: payrollPeriod.startDate,
        endDate: payrollPeriod.endDate,
      },
    })

  } catch (error) {
    console.error('Error generating Power Office export:', error)
    return NextResponse.json(
      { error: 'Failed to generate Power Office export' },
      { status: 500 }
    )
  }
}
