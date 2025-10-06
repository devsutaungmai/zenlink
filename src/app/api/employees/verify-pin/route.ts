import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/shared/lib/prisma'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    const { employeeId, pin } = await request.json()

    if (!employeeId || !pin) {
      return NextResponse.json(
        { success: false, error: 'Employee ID and PIN are required' },
        { status: 400 }
      )
    }

    // Find the employee by ID and include their specific User record
    const employee = await prisma.employee.findUnique({
      where: {
        id: employeeId
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        employeeNo: true,
        userId: true,
        user: {
          select: {
            id: true,
            pin: true,
            role: true
          }
        }
      }
    })

    console.log('Found employee:', employee ? 'Yes' : 'No')
    if (employee) {
      console.log('Employee user data:', {
        hasPin: !!employee.user.pin,
        role: employee.user.role,
        userId: employee.user.id,
        employeeUserId: employee.userId
      })
    }

    if (!employee) {
      return NextResponse.json(
        { success: false, error: 'Employee not found' },
        { status: 404 }
      )
    }

    // Ensure this employee has their own User record with a PIN
    if (!employee.user.pin) {
      return NextResponse.json(
        { success: false, error: 'PIN not set for this employee. Contact your manager to set up your PIN.' },
        { status: 400 }
      )
    }

    // Verify that the User record belongs to this specific employee
    if (employee.userId !== employee.user.id) {
      return NextResponse.json(
        { success: false, error: 'User record mismatch. Please contact your administrator.' },
        { status: 400 }
      )
    }

    // Verify PIN against this employee's specific User record
    const isPinValid = await bcrypt.compare(pin, employee.user.pin)

    if (!isPinValid) {
      return NextResponse.json(
        { success: false, error: 'Invalid PIN' },
        { status: 401 }
      )
    }

    // Return success with employee info (without PIN)
    return NextResponse.json({
      success: true,
      employee: {
        id: employee.id,
        firstName: employee.firstName,
        lastName: employee.lastName,
        employeeNo: employee.employeeNo
      }
    })

  } catch (error) {
    console.error('Error verifying PIN:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
