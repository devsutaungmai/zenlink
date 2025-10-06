import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/shared/lib/prisma'
import { getCurrentEmployee } from '@/shared/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const employee = await getCurrentEmployee()
    
    if (!employee) {
      return NextResponse.json(
        { error: 'Employee not found or not authenticated' },
        { status: 401 }
      )
    }

    // Get all exchanges where this employee is the target (toEmployee) and status is EMPLOYEE_REJECTED or REJECTED
    const rejectedRequests = await prisma.shiftExchange.findMany({
      where: {
        toEmployeeId: employee.id,
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