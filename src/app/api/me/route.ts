import { getCurrentUser } from '@/shared/lib/auth'
import { NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'
import { prisma } from '@/shared/lib/prisma'

async function getEmployeeFromToken(employeeToken: string) {
  try {
    const decoded = jwt.verify(employeeToken, process.env.JWT_SECRET!) as {
      id: string
      userId: string
      employeeId: string
      role: string
      type: string
    }
    
    if (decoded.type !== 'employee') return null
    
    const employee = await prisma.employee.findUnique({
      where: { id: decoded.employeeId },
      include: {
        user: true,
        department: true,
        employeeGroup: true,
      },
    })
    
    if (!employee) return null
    
    return {
      id: employee.user.id,
      email: employee.user.email,
      firstName: employee.user.firstName,
      lastName: employee.user.lastName,
      role: employee.user.role,
      businessId: employee.user.businessId,
      employee: {
        id: employee.id,
        employeeNo: employee.employeeNo,
        department: employee.department?.name,
        departmentId: employee.departmentId,
        employeeGroup: employee.employeeGroup?.name,
        employeeGroupId: employee.employeeGroupId,
      }
    }
  } catch (error) {
    console.error('Employee token verification failed:', error)
    return null
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const preferEmployee = searchParams.get('preferEmployee') === 'true'
    
    const cookieStore = await cookies()
    const employeeToken = cookieStore.get('employee_token')?.value

    if (preferEmployee && employeeToken) {
      const employeeResult = await getEmployeeFromToken(employeeToken)
      if (employeeResult) return NextResponse.json(employeeResult)
    }
  
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
