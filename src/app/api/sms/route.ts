import { NextRequest, NextResponse } from 'next/server'
import { SMSService } from '@/lib/notifications'
import { prisma } from '@/app/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const { employeeId, message, type } = await request.json()

    if (!employeeId || !message) {
      return NextResponse.json(
        { error: 'Employee ID and message are required' },
        { status: 400 }
      )
    }

    // Get employee with mobile number
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        mobile: true
      }
    })

    if (!employee) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      )
    }

    if (!employee.mobile) {
      return NextResponse.json(
        { error: 'Employee has no mobile number' },
        { status: 400 }
      )
    }

    // Send SMS
    const result = await SMSService.sendSMS(employee.mobile, message)

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'SMS sent successfully',
        recipient: `${employee.firstName} ${employee.lastName}`,
        mobile: employee.mobile
      })
    } else {
      return NextResponse.json(
        { error: result.error || 'Failed to send SMS' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('SMS API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
