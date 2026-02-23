import { NextRequest, NextResponse } from 'next/server'
import { NotificationService } from '@/shared/lib/notifications'
import { getCurrentUserOrEmployee } from '@/shared/lib/auth'
import { prisma } from '@/shared/lib/prisma'
import { getNotificationAuthConditions } from '@/shared/lib/notificationAuth'

// GET /api/notifications - Get notifications for current user/employee
export async function GET(request: NextRequest) {
  try {
    const auth = await getCurrentUserOrEmployee()
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const authConditions = await getNotificationAuthConditions(auth)
    if (!authConditions) {
      return NextResponse.json([])
    }

    const { searchParams } = new URL(request.url)
    const unreadOnly = searchParams.get('unreadOnly') === 'true'
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    if (unreadOnly) {
      const notifications = await prisma.notification.findMany({
        where: {
          ...authConditions,
          isRead: false,
        },
        orderBy: { createdAt: 'desc' },
      })
      return NextResponse.json(notifications)
    }

    const notifications = await prisma.notification.findMany({
      where: {
        ...authConditions,
      },
      include: {
        shiftExchange: {
          include: {
            shift: true,
            fromEmployee: {
              select: { firstName: true, lastName: true },
            },
            toEmployee: {
              select: { firstName: true, lastName: true },
            },
          },
        },
        shift: {
          select: {
            date: true,
            startTime: true,
            endTime: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      skip: offset,
    })

    return NextResponse.json(notifications)
  } catch (error) {
    console.error('Error fetching notifications:', error)
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    )
  }
}
