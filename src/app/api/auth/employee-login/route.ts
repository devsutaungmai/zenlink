import { NextResponse } from 'next/server'
import { prisma } from '@/shared/lib/prisma'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'

export async function POST(req: Request) {
  try {
    const { employeeId, pin, businessName } = await req.json()

    const employeeNo = String(employeeId ?? '').trim()
    const pinValue = String(pin ?? '').trim()

    const businessNameValue = String(businessName ?? '').trim()

    if (!employeeNo || !pinValue) {
      return NextResponse.json(
        { error: 'Employee ID and PIN are required' },
        { status: 400 }
      )
    }

    if (!/^\d{6}$/.test(pinValue)) {
      return NextResponse.json(
        { error: 'PIN must be exactly 6 digits' },
        { status: 400 }
      )
    }

    let businessId: string | null = null
    if (businessNameValue) {
      const business = await prisma.business.findFirst({
        where: {
          name: {
            equals: businessNameValue,
            mode: 'insensitive',
          },
        },
        select: { id: true },
      })
      businessId = business?.id ?? null
    }

    const employees = await prisma.employee.findMany({
      where: {
        employeeNo,
        ...(businessId
          ? {
              user: {
                businessId,
              },
            }
          : {}),
      },
      include: {
        user: true,
        department: true,
        employeeGroup: true,
      },
      take: 25,
    })

    if (employees.length === 0) {
      return NextResponse.json(
        { error: 'Invalid employee ID or PIN' },
        { status: 401 }
      )
    }

    const candidatesWithPin = employees.filter((e) => !!e.user?.pin)
    if (candidatesWithPin.length === 0) {
      return NextResponse.json(
        { error: 'PIN not set. Please contact your administrator.' },
        { status: 401 }
      )
    }

    const matchedEmployees: (typeof employees) = []
    for (const candidate of candidatesWithPin) {
      if (!candidate.user || candidate.userId !== candidate.user.id) continue

      const ok = await bcrypt.compare(pinValue, candidate.user.pin as string)
      if (ok) {
        matchedEmployees.push(candidate)
      }
    }

    if (matchedEmployees.length === 0) {
      return NextResponse.json(
        { error: 'Invalid employee ID or PIN' },
        { status: 401 }
      )
    }

    if (matchedEmployees.length > 1) {
      return NextResponse.json(
        {
          error:
            'Multiple employees matched this Employee ID and PIN. Please login from the Time Tracking portal (select your business) or contact your administrator.',
        },
        { status: 401 }
      )
    }

    const employee = matchedEmployees[0]

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
