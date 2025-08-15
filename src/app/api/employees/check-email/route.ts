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

    if (existingEmployee) {
      return NextResponse.json({
        available: false,
        existingEmployee: {
          name: `${existingEmployee.firstName} ${existingEmployee.lastName}`,
          employeeNo: existingEmployee.employeeNo
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
