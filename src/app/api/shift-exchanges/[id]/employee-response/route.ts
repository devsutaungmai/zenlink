import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/shared/lib/prisma'
import { getCurrentUserOrEmployee } from '@/shared/lib/auth'
import { ShiftExchangeNotifications } from '@/shared/lib/notifications'

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const auth = await getCurrentUserOrEmployee()
    const { action } = await request.json()

    if (!auth) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    let employeeId: string | null = null
    if (auth.type === 'employee') {
      employeeId = auth.data.id
    } else {
      const emp = await prisma.employee.findFirst({ where: { userId: auth.data.id } })
      employeeId = emp?.id ?? null
    }

    if (!employeeId) {
      return NextResponse.json(
        { error: 'No employee record found for this user' },
        { status: 403 }
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
      where: { id },
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
    if (exchange.toEmployeeId !== employeeId) {
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
      where: { id },
      data: {
        status: newStatus,
        employeeResponseAt: new Date(),
        employeeResponseBy: employeeId,
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
        // Notify admins to review and approve
        await ShiftExchangeNotifications.notifyAdminForApproval(updatedExchange.id)
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
