import { NextRequest, NextResponse } from 'next/server'
import { SMSService } from '@/shared/lib/notifications'
import { prisma } from '@/shared/lib/prisma'

// Test endpoint to send SMS notifications
export async function POST(request: NextRequest) {
  try {
    const { phoneNumber, message, employeeId } = await request.json()

    if (!phoneNumber && !employeeId) {
      return NextResponse.json({ error: 'Phone number or employee ID required' }, { status: 400 })
    }

    let targetPhoneNumber = phoneNumber

    // If employeeId is provided, get the employee's mobile number
    if (employeeId && !phoneNumber) {
      const employee = await prisma.employee.findUnique({
        where: { id: employeeId },
        select: { mobile: true, firstName: true, lastName: true }
      })

      if (!employee) {
        return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
      }

      if (!employee.mobile) {
        return NextResponse.json({ error: 'Employee has no mobile number' }, { status: 400 })
      }

      targetPhoneNumber = employee.mobile
    }

    // Default test message if none provided
    const testMessage = message || 'Test SMS from Zenlink: Your SMS notifications are working!'

    // Send SMS
    const result = await SMSService.sendSMS(targetPhoneNumber, testMessage)

    if (result.success) {
      return NextResponse.json({ 
        success: true, 
        message: 'SMS sent successfully',
        phoneNumber: targetPhoneNumber 
      })
    } else {
      return NextResponse.json({ 
        success: false, 
        error: result.error 
      }, { status: 500 })
    }
  } catch (error) {
    console.error('Test SMS error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send SMS' },
      { status: 500 }
    )
  }
}

// Get endpoint to list employees with mobile numbers for testing
export async function GET() {
  try {
    const employees = await prisma.employee.findMany({
      where: {
        mobile: {
          not: null
        }
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        mobile: true,
        email: true
      },
      take: 10 // Limit to first 10 employees
    })

    return NextResponse.json({
      success: true,
      employees: employees.map(emp => ({
        id: emp.id,
        name: `${emp.firstName} ${emp.lastName}`,
        mobile: emp.mobile,
        email: emp.email
      }))
    })
  } catch (error) {
    console.error('Error fetching employees:', error)
    return NextResponse.json(
      { error: 'Failed to fetch employees' },
      { status: 500 }
    )
  }
}
