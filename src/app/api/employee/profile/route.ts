import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/app/lib/prisma'
import { getCurrentEmployee, getCurrentUserOrEmployee } from '@/lib/auth'

export async function GET() {
  try {
    const auth = await getCurrentUserOrEmployee()
    
    if (!auth) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    let employeeProfile

    if (auth.type === 'employee') {
      // Employee authenticated via PIN
      employeeProfile = await prisma.employee.findUnique({
        where: { id: auth.data.id },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              role: true
            }
          },
          department: {
            select: {
              id: true,
              name: true
            }
          },
          employeeGroup: {
            select: {
              id: true,
              name: true
            }
          }
        }
      })
    } else {
      // Admin user - get their employee record if they have one
      const user = auth.data
      employeeProfile = await prisma.employee.findFirst({
        where: { userId: user.id },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              role: true
            }
          },
          department: {
            select: {
              id: true,
              name: true
            }
          },
          employeeGroup: {
            select: {
              id: true,
              name: true
            }
          }
        }
      })
    }

    if (!employeeProfile) {
      return NextResponse.json(
        { error: 'Employee profile not found' },
        { status: 404 }
      )
    }

    // Remove sensitive information for security
    const { user, ...employee } = employeeProfile
    const safeProfile = {
      ...employee,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role
      }
    }

    return NextResponse.json(safeProfile)
  } catch (error) {
    console.error('Error fetching employee profile:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await getCurrentUserOrEmployee()
    
    if (!auth) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const data = await request.json()
    const { 
      firstName, 
      lastName, 
      email, 
      mobile, 
      address, 
      birthday 
    } = data

    // Validate required fields
    if (!firstName || !lastName) {
      return NextResponse.json(
        { error: 'First name and last name are required' },
        { status: 400 }
      )
    }

    let employeeId: string

    if (auth.type === 'employee') {
      // Employee authenticated via PIN
      employeeId = auth.data.id
    } else {
      // Admin user - get their employee record
      const user = auth.data
      const employee = await prisma.employee.findFirst({
        where: { userId: user.id }
      })

      if (!employee) {
        return NextResponse.json(
          { error: 'Employee record not found' },
          { status: 404 }
        )
      }

      employeeId = employee.id
    }

    // Get current employee data
    const currentEmployee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: { user: true }
    })

    if (!currentEmployee) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      )
    }

    // Check if email is already in use by another user (if email is being changed)
    if (email && email !== currentEmployee.user.email) {
      const existingUser = await prisma.user.findUnique({
        where: { email }
      })

      if (existingUser && existingUser.id !== currentEmployee.userId) {
        return NextResponse.json(
          { error: 'Email is already in use' },
          { status: 400 }
        )
      }
    }

    // Update employee data
    const employeeUpdateData: any = {
      firstName,
      lastName,
      mobile,
      address
    }

    if (birthday) {
      employeeUpdateData.birthday = new Date(birthday)
    }

    if (email) {
      employeeUpdateData.email = email
    }

    // Update user data if email, firstName, or lastName changed
    const userUpdateData: any = {}
    if (email && email !== currentEmployee.user.email) {
      userUpdateData.email = email
    }
    if (firstName !== currentEmployee.user.firstName) {
      userUpdateData.firstName = firstName
    }
    if (lastName !== currentEmployee.user.lastName) {
      userUpdateData.lastName = lastName
    }

    // Perform updates in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update employee record
      const updatedEmployee = await tx.employee.update({
        where: { id: employeeId },
        data: employeeUpdateData,
        include: {
          department: {
            select: {
              id: true,
              name: true
            }
          },
          employeeGroup: {
            select: {
              id: true,
              name: true
            }
          }
        }
      })

      // Update user record if needed
      let updatedUser = currentEmployee.user
      if (Object.keys(userUpdateData).length > 0) {
        updatedUser = await tx.user.update({
          where: { id: currentEmployee.userId },
          data: userUpdateData,
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true
          }
        })
      }

      return {
        employee: updatedEmployee,
        user: updatedUser
      }
    })

    const safeProfile = {
      ...result.employee,
      user: {
        id: result.user.id,
        email: result.user.email,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
        role: result.user.role
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      profile: safeProfile
    })
  } catch (error: any) {
    console.error('Error updating employee profile:', error)
    
    if (error.code === 'P2002') {
      if (error.meta?.target?.includes('email')) {
        return NextResponse.json(
          { error: 'Email is already in use' },
          { status: 400 }
        )
      }
      if (error.meta?.target?.includes('mobile')) {
        return NextResponse.json(
          { error: 'Mobile number is already in use' },
          { status: 400 }
        )
      }
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
