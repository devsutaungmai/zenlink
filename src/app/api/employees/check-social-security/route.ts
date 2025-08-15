import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/app/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser()
    
    if (!currentUser || currentUser.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 401 }
      )
    }

    const { socialSecurityNo, excludeEmployeeId } = await request.json()

    if (!socialSecurityNo) {
      return NextResponse.json(
        { error: 'Social security number is required' },
        { status: 400 }
      )
    }

    // Check if social security number already exists in the same business
    const existingEmployee = await prisma.employee.findFirst({
      where: {
        socialSecurityNo,
        user: {
          businessId: currentUser.businessId
        },
        // Exclude the current employee if editing
        ...(excludeEmployeeId && { id: { not: excludeEmployeeId } })
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        employeeNo: true
      }
    })

    return NextResponse.json({
      available: !existingEmployee,
      existingEmployee: existingEmployee ? {
        name: `${existingEmployee.firstName} ${existingEmployee.lastName}`,
        employeeNo: existingEmployee.employeeNo
      } : null
    })

  } catch (error) {
    console.error('Error checking social security number:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
