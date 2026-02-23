import { NextRequest, NextResponse } from 'next/server'
import { NotificationService } from '@/shared/lib/notifications'
import { getCurrentUserOrEmployee } from '@/shared/lib/auth'
import { prisma } from '@/shared/lib/prisma'

interface RouteContext {
  params: Promise<{ id: string }>
}

// PATCH /api/notifications/[id]/read - Mark notification as read
export async function PATCH(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const { id } = await params
    const auth = await getCurrentUserOrEmployee()
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const orConditions: Array<{ recipientId?: string; recipientUserId?: string }> = []

    if (auth.type === 'user') {
      const user = auth.data
      orConditions.push({ recipientUserId: user.id })
      const employee = await prisma.employee.findFirst({ where: { userId: user.id } })
      if (employee) {
        orConditions.push({ recipientId: employee.id })
      }
    } else {
      orConditions.push({ recipientId: auth.data.id })
    }

    // Verify the notification belongs to the current user/employee
    const notification = await prisma.notification.findFirst({
      where: { id, OR: orConditions },
    })

    if (!notification) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 })
    }

    const updatedNotification = await NotificationService.markAsRead(id)
    return NextResponse.json(updatedNotification)
  } catch (error) {
    console.error('Error marking notification as read:', error)
    return NextResponse.json(
      { error: 'Failed to mark notification as read' },
      { status: 500 }
    )
  }
}
