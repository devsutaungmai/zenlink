import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/shared/lib/auth'
import { prisma } from '@/shared/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { employeeId } = body

    if (!employeeId) {
      return NextResponse.json(
        { error: 'Employee ID is required' },
        { status: 400 }
      )
    }

    // Verify employee belongs to this business
    const employee = await prisma.employee.findFirst({
      where: {
        id: employeeId,
        department: {
          businessId: user.businessId,
        },
      },
    })

    if (!employee) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      )
    }

    // Calculate 3-month period (end today, start 3 months ago)
    const calculationDate = new Date()
    const basePeriodEnd = new Date(calculationDate)
    const basePeriodStart = new Date(calculationDate)
    basePeriodStart.setMonth(basePeriodStart.getMonth() - 3)

    // Get all payroll entries for the employee in the last 3 months
    const payrollEntries = await prisma.payrollEntry.findMany({
      where: {
        employeeId,
        payrollPeriod: {
          endDate: {
            gte: basePeriodStart,
            lte: basePeriodEnd,
          },
          businessId: user.businessId,
        },
        status: 'PAID', // Only count paid entries
      },
      include: {
        payrollPeriod: true,
      },
      orderBy: {
        payrollPeriod: {
          endDate: 'desc',
        },
      },
    })

    if (payrollEntries.length === 0) {
      return NextResponse.json(
        { error: 'No paid payroll entries found for the last 3 months' },
        { status: 400 }
      )
    }

    // Calculate totals
    const totalHours = payrollEntries.reduce((sum, entry) => 
      sum + entry.regularHours + entry.overtimeHours, 0
    )
    
    const totalPay = payrollEntries.reduce((sum, entry) => 
      sum + entry.netPay, 0
    )

    if (totalHours === 0) {
      return NextResponse.json(
        { error: 'No work hours found for calculation' },
        { status: 400 }
      )
    }

    // Calculate rates
    const hourlyRate = totalPay / totalHours
    const dailyRate = hourlyRate * 8 // Assuming 8-hour work day
    const threeMonthAverage = dailyRate

    // Check if calculation already exists for today
    const existingCalculation = await prisma.sickPayCalculation.findUnique({
      where: {
        employeeId_calculationDate: {
          employeeId,
          calculationDate: new Date(calculationDate.toDateString()),
        },
      },
    })

    let sickPayCalculation

    if (existingCalculation) {
      // Update existing calculation
      sickPayCalculation = await prisma.sickPayCalculation.update({
        where: { id: existingCalculation.id },
        data: {
          threeMonthAverage,
          basePeriodStart,
          basePeriodEnd,
          totalHours,
          totalPay,
          dailyRate,
          hourlyRate,
        },
        include: {
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              employeeNo: true,
            },
          },
        },
      })
    } else {
      // Create new calculation
      sickPayCalculation = await prisma.sickPayCalculation.create({
        data: {
          employeeId,
          calculationDate: new Date(calculationDate.toDateString()),
          threeMonthAverage,
          basePeriodStart,
          basePeriodEnd,
          totalHours,
          totalPay,
          dailyRate,
          hourlyRate,
        },
        include: {
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              employeeNo: true,
            },
          },
        },
      })
    }

    return NextResponse.json({
      calculation: sickPayCalculation,
      payrollEntriesUsed: payrollEntries.length,
      calculationPeriod: {
        start: basePeriodStart,
        end: basePeriodEnd,
      },
    })
  } catch (error) {
    console.error('Error calculating sick pay:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const employeeId = searchParams.get('employeeId')

    const where: any = {
      employee: {
        department: {
          businessId: user.businessId,
        },
      },
    }

    if (employeeId) {
      where.employeeId = employeeId
    }

    const calculations = await prisma.sickPayCalculation.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeNo: true,
          },
        },
      },
      orderBy: [
        { calculationDate: 'desc' },
        { employee: { firstName: 'asc' } },
      ],
    })

    return NextResponse.json(calculations)
  } catch (error) {
    console.error('Error fetching sick pay calculations:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
