import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserOrEmployee } from '@/shared/lib/auth'
import { prisma } from '@/shared/lib/prisma'
import { getNotificationAuthConditions } from '@/shared/lib/notificationAuth'

// POST /api/notifications/mark-all-read - Mark all notifications as read
export async function POST(request: NextRequest) {
  try {
    const auth = await getCurrentUserOrEmployee()
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const authConditions = await getNotificationAuthConditions(auth)
    if (!authConditions) {
      return NextResponse.json({ message: 'No notifications to mark', count: 0 })
    }

    const result = await prisma.notification.updateMany({
      where: {
        ...authConditions,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    })
    return NextResponse.json({ 
      message: 'All notifications marked as read',
      count: result.count 
    })
  } catch (error) {
    console.error('Error marking notifications as read:', error)
    return NextResponse.json({ error: 'Failed to mark notifications as read' }, { status: 500 })
  }
}
