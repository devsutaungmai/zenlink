import { NextResponse } from 'next/server'
import { prisma } from '@/shared/lib/prisma'
import { getCurrentUser } from '@/shared/lib/auth'

export async function GET() {
  try {
    const currentUser = await getCurrentUser()
    
    if (!currentUser || currentUser.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 401 }
      )
    }

    const employees = await prisma.employee.findMany({
      where: {
        user: {
          businessId: currentUser.businessId
        }
      },
      select: {
        employeeNo: true
      }
    })

    let highestNumber = 0
    employees.forEach(emp => {
      const num = parseInt(emp.employeeNo || '', 10)
      if (!isNaN(num) && num > highestNumber) {
        highestNumber = num
      }
    })

    const nextNumber = (highestNumber + 1).toString()

    return NextResponse.json({ nextEmployeeNumber: nextNumber })

  } catch (error) {
    console.error('Error getting next employee number:', error)
    return NextResponse.json(
      { error: 'Failed to get next employee number' },
      { status: 500 }
    )
  }
}
