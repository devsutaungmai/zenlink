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

    const { employeeNo, excludeEmployeeId } = await request.json()

    if (!employeeNo || employeeNo.trim() === '') {
      return NextResponse.json({
        available: true
      })
    }

    const existingEmployee = await prisma.employee.findFirst({
      where: {
        employeeNo: employeeNo.trim(),
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

    const response = {
      available: !existingEmployee,
      ...(existingEmployee && {
        existingEmployee: {
          name: `${existingEmployee.firstName} ${existingEmployee.lastName}`,
          employeeNo: existingEmployee.employeeNo
        }
      })
    }

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, max-age=30, stale-while-revalidate=60'
      }
    })

  } catch (error) {
    console.error('Check employee number error:', error)
    return NextResponse.json(
      { error: 'Failed to check employee number availability' },
      { status: 500 }
    )
  }
}
