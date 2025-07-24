import { NextResponse } from 'next/server'
import { prisma } from '@/app/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { ShiftExchangeNotifications } from '@/lib/notifications'

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const user = await requireAuth()
    const { status } = await request.json()

    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      )
    }

    // Get the exchange to check current status
    const existingExchange = await prisma.shiftExchange.findUnique({
      where: { id: params.id }
    })

    if (!existingExchange) {
      return NextResponse.json(
        { error: 'Exchange request not found' },
        { status: 404 }
      )
    }

    // Only allow admin approval if employee has already accepted
    if (existingExchange.status !== 'EMPLOYEE_ACCEPTED' && existingExchange.status !== 'ADMIN_PENDING') {
      return NextResponse.json(
        { error: 'Exchange request must be accepted by employee first' },
        { status: 400 }
      )
    }

    const exchange = await prisma.shiftExchange.update({
      where: { id: params.id },
      data: {
        status,
        approvedAt: new Date(),
        approvedBy: user.id,
      },
      include: {
        shift: true,
        fromEmployee: true,
        toEmployee: true,
      },
    })


    if (status === 'APPROVED') {
      await prisma.shift.update({
        where: { id: exchange.shiftId },
        data: {
          employeeId: exchange.toEmployeeId,
        },
      })
    }

    // Send notifications to both employees about admin decision
    try {
      if (status === 'APPROVED') {
        await ShiftExchangeNotifications.notifyShiftExchangeApproved(exchange.id)
      } else {
        await ShiftExchangeNotifications.notifyShiftExchangeRejected(exchange.id)
      }
    } catch (notificationError) {
      console.error('Failed to send notification:', notificationError)
      // Don't fail the request if notification fails
    }

    return NextResponse.json(exchange)
  } catch (error) {
    console.error('Error updating shift exchange:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params

    // Check if the exchange exists and is pending
    const exchange = await prisma.shiftExchange.findUnique({
      where: { id: params.id },
      include: { fromEmployee: true }
    })

    if (!exchange) {
      return NextResponse.json(
        { error: 'Exchange request not found' },
        { status: 404 }
      )
    }

    if (!['EMPLOYEE_PENDING', 'EMPLOYEE_REJECTED'].includes(exchange.status)) {
      return NextResponse.json(
        { error: 'Can only cancel pending or rejected exchange requests' },
        { status: 400 }
      )
    }

    // Delete the exchange request
    await prisma.shiftExchange.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ message: 'Exchange request cancelled successfully' })
  } catch (error) {
    console.error('Error cancelling shift exchange:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
