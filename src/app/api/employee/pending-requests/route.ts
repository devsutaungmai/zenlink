import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/app/lib/prisma'
import { getCurrentEmployee } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const employee = await getCurrentEmployee()
    
    if (!employee) {
      return NextResponse.json(
        { error: 'Employee not found or not authenticated' },
        { status: 401 }
      )
    }

    // Get all exchanges where this employee is the target (toEmployee) and status is EMPLOYEE_PENDING or EMPLOYEE_ACCEPTED
    const pendingRequests = await prisma.shiftExchange.findMany({
      where: {
        toEmployeeId: employee.id,
        status: {
          in: ['EMPLOYEE_PENDING', 'EMPLOYEE_ACCEPTED']
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

    return NextResponse.json(pendingRequests)
  } catch (error) {
    console.error('Error fetching pending requests for employee:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
