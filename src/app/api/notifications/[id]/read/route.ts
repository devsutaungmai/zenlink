import { NextRequest, NextResponse } from 'next/server'
import { NotificationService } from '@/shared/lib/notifications'
import { getCurrentUserOrEmployee } from '@/shared/lib/auth'
import { prisma } from '@/shared/lib/prisma'

interface RouteContext {
  params: { id: string }
}

// PATCH /api/notifications/[id]/read - Mark notification as read
export async function PATCH(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const auth = await getCurrentUserOrEmployee()
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let recipientId: string
    
    if (auth.type === 'user') {
      // For admin users, find their employee record if they have one
      const user = auth.data
      const employee = await prisma.employee.findFirst({
        where: { userId: user.id }
      })
      
      if (!employee) {
        return NextResponse.json({ error: 'Employee record not found' }, { status: 404 })
      }
      
      recipientId = employee.id
    } else {
      // For employee authentication
      recipientId = auth.data.id
    }

    // Verify the notification belongs to the current user/employee
    const notification = await prisma.notification.findFirst({
      where: {
        id: params.id,
        recipientId: recipientId,
      },
    })

    if (!notification) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 })
    }

    const updatedNotification = await NotificationService.markAsRead(params.id)
    return NextResponse.json(updatedNotification)
  } catch (error) {
    console.error('Error marking notification as read:', error)
    return NextResponse.json(
      { error: 'Failed to mark notification as read' },
      { status: 500 }
    )
  }
}
