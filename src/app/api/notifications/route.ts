import { NextRequest, NextResponse } from 'next/server'
import { NotificationService } from '@/lib/notifications'
import { getCurrentUserOrEmployee } from '@/lib/auth'
import { prisma } from '@/app/lib/prisma'

// GET /api/notifications - Get notifications for current user/employee
export async function GET(request: NextRequest) {
  try {
    const auth = await getCurrentUserOrEmployee()
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let recipientId: string
    
    if (auth.type === 'user') {
      // For admin users, we need to find their employee record if they have one
      const user = auth.data
      const employee = await prisma.employee.findFirst({
        where: { userId: user.id }
      })
      
      if (!employee) {
        // Admin doesn't have employee record, return empty notifications for now
        return NextResponse.json([])
      }
      
      recipientId = employee.id
    } else {
      // For employee authentication
      recipientId = auth.data.id
    }

    const { searchParams } = new URL(request.url)
    const unreadOnly = searchParams.get('unreadOnly') === 'true'
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    if (unreadOnly) {
      const notifications = await NotificationService.getUnreadNotifications(recipientId)
      return NextResponse.json(notifications)
    }

    // Get all notifications with pagination
    const notifications = await prisma.notification.findMany({
      where: {
        recipientId: recipientId,
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
