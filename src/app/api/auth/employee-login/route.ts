import { NextResponse } from 'next/server'
import { prisma } from '@/shared/lib/prisma'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'

export async function POST(req: Request) {
  try {
    const { employeeId, pin } = await req.json()

    if (!employeeId || !pin) {
      return NextResponse.json(
        { error: 'Employee ID and PIN are required' },
        { status: 400 }
      )
    }

    if (!/^\d{6}$/.test(pin)) {
      return NextResponse.json(
        { error: 'PIN must be exactly 6 digits' },
        { status: 400 }
      )
    }

    const employee = await prisma.employee.findFirst({
      where: { employeeNo: employeeId },
      include: {
        user: true,
        department: true,
        employeeGroup: true,
      },
    })

    console.log('Employee login attempt:', {
      employeeId,
      employeeFound: !!employee,
      hasUser: !!employee?.user,
      hasPin: !!employee?.user?.pin,
      pinLength: employee?.user?.pin?.length,
      userIdMatch: employee?.userId === employee?.user?.id
    })

    if (!employee) {
      console.log('Employee not found for employeeNo:', employeeId)
      return NextResponse.json(
        { error: 'Invalid employee ID or PIN' },
        { status: 401 }
      )
    }

    // Ensure this employee has their own User record with a PIN
    if (!employee.user.pin) {
      return NextResponse.json(
        { error: 'PIN not set. Please contact your administrator.' },
        { status: 401 }
      )
    }

    // Verify that the User record belongs to this specific employee
    if (employee.userId !== employee.user.id) {
      return NextResponse.json(
        { error: 'User record mismatch. Please contact your administrator.' },
        { status: 401 }
      )
    }

    // Use bcrypt to compare the PIN
    const isPinValid = await bcrypt.compare(pin, employee.user.pin)
    
    if (!isPinValid) {
      return NextResponse.json(
        { error: 'Invalid employee ID or PIN' },
        { status: 401 }
      )
    }

    const token = jwt.sign(
      {
        id: employee.id,
        userId: employee.userId,
        employeeId: employee.id,
        role: 'EMPLOYEE',
        type: 'employee'
      },
      process.env.JWT_SECRET!,
      { expiresIn: '12h' }
    )

    const res = NextResponse.json({
      success: true,
      employee: {
        id: employee.id,
        firstName: employee.firstName,
        lastName: employee.lastName,
        employeeNo: employee.employeeNo,
        department: employee.department.name,
        employeeGroup: employee.employeeGroup?.name,
      },
    })

    res.cookies.set('employee_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 12, // 12 hours
      path: '/',
      sameSite: 'strict',
    })

    // Clear any existing admin session to ensure employee session takes precedence
    res.cookies.set('token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 0, // Expire immediately
      path: '/',
      sameSite: 'strict',
    })

    return res
  } catch (error: any) {
    console.error('Employee login error:', error)
    return NextResponse.json(
      { error: 'Login failed' },
      { status: 500 }
    )
  }
}
