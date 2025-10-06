import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/shared/lib/prisma'
import { getCurrentEmployee } from '@/shared/lib/auth'
import { ShiftExchangeNotifications } from '@/shared/lib/notifications'

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const employee = await getCurrentEmployee()
    const { action } = await request.json()

    if (!employee) {
      return NextResponse.json(
        { error: 'Employee not found or not authenticated' },
        { status: 401 }
      )
    }

    if (!['accept', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "accept" or "reject"' },
        { status: 400 }
      )
    }

    // Get the exchange request
    const exchange = await prisma.shiftExchange.findUnique({
      where: { id: params.id },
      include: {
        shift: true,
        fromEmployee: true,
        toEmployee: true,
      },
    })

    if (!exchange) {
      return NextResponse.json(
        { error: 'Exchange request not found' },
        { status: 404 }
      )
    }

    // Verify that the current employee is the target employee (toEmployee)
    if (exchange.toEmployeeId !== employee.id) {
      return NextResponse.json(
        { error: 'You are not authorized to respond to this request' },
        { status: 403 }
      )
    }

    // Verify the exchange is in EMPLOYEE_PENDING status
    if (exchange.status !== 'EMPLOYEE_PENDING') {
      return NextResponse.json(
        { error: 'This request is no longer pending employee response' },
        { status: 400 }
      )
    }

    // Update the exchange with employee response
    const newStatus = action === 'accept' ? 'EMPLOYEE_ACCEPTED' : 'EMPLOYEE_REJECTED'
    
    const updatedExchange = await prisma.shiftExchange.update({
      where: { id: params.id },
      data: {
        status: newStatus,
        employeeResponseAt: new Date(),
        employeeResponseBy: employee.id,
      },
      include: {
        shift: true,
        fromEmployee: true,
        toEmployee: true,
      },
    })

    // Send notifications based on employee response
    try {
      if (action === 'accept') {
        // Notify original requester that their request was accepted
        await ShiftExchangeNotifications.notifyShiftExchangeAccepted(updatedExchange.id)
        
        // If it's a HANDOVER that was accepted, notify admins for approval
        if (exchange.type === 'HANDOVER') {
          await ShiftExchangeNotifications.notifyAdminForApproval(updatedExchange.id)
        }
      } else if (action === 'reject') {
        // Notify original requester that their request was rejected
        await ShiftExchangeNotifications.notifyShiftExchangeRejected(updatedExchange.id)
      }
    } catch (notificationError) {
      console.error('Failed to send notification:', notificationError)
      // Don't fail the request if notification fails
    }

    return NextResponse.json(updatedExchange)
  } catch (error) {
    console.error('Error responding to shift exchange:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
