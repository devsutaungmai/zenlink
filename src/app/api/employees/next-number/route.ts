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

    // Find the highest existing employee number for this business
    const lastEmployee = await prisma.employee.findFirst({
      where: {
        user: {
          businessId: currentUser.businessId
        }
      },
      orderBy: {
        employeeNo: 'desc'
      },
      select: {
        employeeNo: true
      }
    })

    let nextNumber = '1'
    
    if (lastEmployee?.employeeNo) {
      // Try to parse the employee number as an integer
      const lastNumber = parseInt(lastEmployee.employeeNo, 10)
      
      if (!isNaN(lastNumber)) {
        // If it's a valid number, increment it
        nextNumber = (lastNumber + 1).toString()
      } else {
        // If it's not a number, find the highest numeric employee number
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
          const num = parseInt(emp.employeeNo, 10)
          if (!isNaN(num) && num > highestNumber) {
            highestNumber = num
          }
        })

        nextNumber = (highestNumber + 1).toString()
      }
    }

    return NextResponse.json({ nextEmployeeNumber: nextNumber })

  } catch (error) {
    console.error('Error getting next employee number:', error)
    return NextResponse.json(
      { error: 'Failed to get next employee number' },
      { status: 500 }
    )
  }
}
