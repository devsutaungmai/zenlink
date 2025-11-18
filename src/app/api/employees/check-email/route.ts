import { NextResponse } from 'next/server'
import { prisma } from '@/shared/lib/prisma'
import { getCurrentUser } from '@/shared/lib/auth'

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { email, excludeEmployeeId, scope } = await request.json()

    if (!email || email.trim() === '') {
      return NextResponse.json({
        available: true
      })
    }

    const employeeWhere: any = {
      email: email.trim(),
      ...(excludeEmployeeId && { id: { not: excludeEmployeeId } })
    }

    if (scope !== 'global') {
      employeeWhere.user = {
        businessId: currentUser.businessId
      }
    }

    const existingEmployee = await prisma.employee.findFirst({
      where: employeeWhere,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        employeeNo: true
      }
    })

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
    }, {
      headers: {
        'Cache-Control': 'private, no-cache, no-store, must-revalidate'
      }
    })

  } catch (error) {
    console.error('Check email error:', error)
    return NextResponse.json(
      { error: 'Failed to check email availability' },
      { status: 500 }
    )
  }
}
