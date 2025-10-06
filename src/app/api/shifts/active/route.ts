import { NextResponse } from 'next/server'
import { prisma } from '@/shared/lib/prisma'
import { getCurrentUser } from '@/shared/lib/auth'
import jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'

export async function GET() {
  try {
    // Check for both admin user and employee authentication
    const currentUser = await getCurrentUser()
    const cookieStore = await cookies()
    const employeeToken = cookieStore.get('employee_token')?.value

    let employeeId = null

    // Check admin user authentication
    if (currentUser) {
      // Find the employee record for the current user
      const employee = await prisma.employee.findFirst({
        where: {
          userId: currentUser.id
        }
      })
      
      if (employee) {
        employeeId = employee.id
      }
    }
    
    // Check employee authentication
    if (!employeeId && employeeToken) {
      try {
        const decoded = jwt.verify(employeeToken, process.env.JWT_SECRET!) as {
          id: string
          employeeId: string
          type: string
        }

        if (decoded.type === 'employee') {
          employeeId = decoded.employeeId
        }
      } catch (error) {
        // Invalid employee token
      }
    }

    if (!employeeId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Find active shift (no end time and today's date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const activeShift = await prisma.shift.findFirst({
      where: {
        employeeId: employeeId,
        date: {
          gte: today,
          lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
        },
        endTime: null // No end time means it's still active
      },
      include: {
        employee: {
          select: {
            firstName: true,
            lastName: true
          }
        },
        employeeGroup: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json({
      activeShift: activeShift
    })
  } catch (error) {
    console.error('Failed to fetch active shift:', error)
    return NextResponse.json(
      { error: 'Failed to fetch active shift' },
      { status: 500 }
    )
  }
}
