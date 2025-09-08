import { NextResponse } from 'next/server'
import { prisma } from '@/app/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { email, excludeEmployeeId } = await request.json()

    if (!email || email.trim() === '') {
      return NextResponse.json({
        available: true
      })
    }

    // Check if email is already in use by another employee in the same business
    const existingEmployee = await prisma.employee.findFirst({
      where: {
        email: email.trim(),
        user: {
          businessId: currentUser.businessId
        },
        ...(excludeEmployeeId && { id: { not: excludeEmployeeId } })
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        employeeNo: true
      }
    })

    // Also check if email exists in User table (this might be causing the conflict)
    const existingUser = await prisma.user.findUnique({
      where: { email: email.trim() },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        role: true,
        businessId: true
      }
    })

    if (existingEmployee) {
      return NextResponse.json({
        available: false,
        conflictType: 'employee',
        existingEmployee: {
          name: `${existingEmployee.firstName} ${existingEmployee.lastName}`,
          employeeNo: existingEmployee.employeeNo
        }
      })
    }

    if (existingUser) {
      return NextResponse.json({
        available: false,
        conflictType: 'user',
        existingUser: {
          name: `${existingUser.firstName} ${existingUser.lastName}`,
          role: existingUser.role,
          businessId: existingUser.businessId
        }
      })
    }

    return NextResponse.json({
      available: true
    })

  } catch (error) {
    console.error('Check email error:', error)
    return NextResponse.json(
      { error: 'Failed to check email availability' },
      { status: 500 }
    )
  }
}
