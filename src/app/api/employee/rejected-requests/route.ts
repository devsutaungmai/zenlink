import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/shared/lib/prisma'
import { getCurrentEmployee, getCurrentUser } from '@/shared/lib/auth'

export async function GET(request: NextRequest) {
  try {
    // Try employee_token first — this is an employee-facing endpoint
    const employee = await getCurrentEmployee()
    let employeeId: string | null = employee?.id ?? null

    // Fall back to user token: look up the user's linked employee record
    if (!employeeId) {
      const user = await getCurrentUser()
      if (user) {
        const emp = await prisma.employee.findFirst({ where: { userId: user.id } })
        employeeId = emp?.id ?? null
      }
    }

    if (!employeeId) {
      return NextResponse.json(
        { error: 'Not authenticated or no employee record found' },
        { status: 401 }
      )
    }

    // Get all exchanges where this employee is the target (toEmployee) and status is EMPLOYEE_REJECTED or REJECTED
    const rejectedRequests = await prisma.shiftExchange.findMany({
      where: {
        toEmployeeId: employeeId,
        status: {
          in: ['EMPLOYEE_REJECTED', 'REJECTED']
        }
      },
      include: {
        shift: {
          include: {
            employee: {
              include: {
                department: true
              }
            }
          }
        },
        fromEmployee: {
          include: {
            department: true
          }
        },
        toEmployee: {
          include: {
            department: true
          }
        }
      },
      orderBy: {
        requestedAt: 'desc'
      }
    })

    return NextResponse.json(rejectedRequests)
  } catch (error) {
    console.error('Error fetching rejected requests for employee:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}