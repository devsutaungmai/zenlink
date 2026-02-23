import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserOrEmployee } from '@/shared/lib/auth'
import { prisma } from '@/shared/lib/prisma'
import { getNotificationAuthConditions } from '@/shared/lib/notificationAuth'

// GET /api/notifications/count - Get notification count for current user/employee
export async function GET(request: NextRequest) {
  try {
    const auth = await getCurrentUserOrEmployee()
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const authConditions = await getNotificationAuthConditions(auth)
    if (!authConditions) {
      return NextResponse.json({ unreadCount: 0 })
    }

    const unreadCount = await prisma.notification.count({
      where: {
        ...authConditions,
        isRead: false,
      },
    })
    return NextResponse.json({ unreadCount })
  } catch (error) {
    console.error('Error fetching notification count:', error)
    return NextResponse.json({ error: 'Failed to fetch notification count' }, { status: 500 })
  }
}
