import { getCurrentUser } from '@/shared/lib/auth'
import { NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'
import { prisma } from '@/shared/lib/prisma'

export async function GET() {
  try {
    const cookieStore = await cookies()
    const employeeToken = cookieStore.get('employee_token')?.value
    
    // If employee token exists, prioritize employee authentication
    if (employeeToken) {
      try {
        // Verify employee token
        const decoded = jwt.verify(employeeToken, process.env.JWT_SECRET!) as {
          id: string
          userId: string
          employeeId: string
          role: string
          type: string
        }
        
        if (decoded.type === 'employee') {
          // Get employee data
          const employee = await prisma.employee.findUnique({
            where: { id: decoded.employeeId },
            include: {
              user: true,
              department: true,
              employeeGroup: true,
            },
          })
          
          if (employee) {
            // Return employee data in a format similar to user data
            return NextResponse.json({
              id: employee.user.id,
              email: employee.user.email,
              firstName: employee.user.firstName,
              lastName: employee.user.lastName,
              role: employee.user.role,
              businessId: employee.user.businessId,
              // Additional employee-specific data
              employee: {
                id: employee.id,
                employeeNo: employee.employeeNo,
                department: employee.department.name,
                departmentId: employee.departmentId,
                employeeGroup: employee.employeeGroup?.name,
                employeeGroupId: employee.employeeGroupId,
              }
            })
          }
        }
      } catch (employeeError) {
        console.error('Employee token verification failed:', employeeError)
        // Continue to admin check if employee token is invalid
      }
    }
    
    // Check for admin/manager authentication if no valid employee token
    const user = await getCurrentUser()
    
    if (user) {
      // Check if this user has an associated employee record
      const employeeRecord = await prisma.employee.findFirst({
        where: { userId: user.id },
        include: {
          department: true,
          employeeGroup: true,
        },
      })
      
      return NextResponse.json({
        ...user,
        employee: employeeRecord ? {
          id: employeeRecord.id,
          employeeNo: employeeRecord.employeeNo,
          department: employeeRecord.department?.name,
          departmentId: employeeRecord.departmentId,
          employeeGroup: employeeRecord.employeeGroup?.name,
          employeeGroupId: employeeRecord.employeeGroupId,
        } : undefined
      })
    }
    
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    
  } catch (error) {
    console.error('Error in /api/me:', error)
    if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.TokenExpiredError) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      )
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
