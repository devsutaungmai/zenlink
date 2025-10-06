import { NextRequest, NextResponse } from 'next/server'
import { NotificationService } from '@/shared/lib/notifications'
import { getCurrentUserOrEmployee } from '@/shared/lib/auth'
import { prisma } from '@/shared/lib/prisma'

// GET /api/notifications/count - Get notification count for current user/employee
export async function GET() {
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
        // Admin doesn't have employee record, return 0 notifications
        return NextResponse.json({ unreadCount: 0 })
      }
      
      recipientId = employee.id
    } else {
      // For employee authentication
      recipientId = auth.data.id
    }

    const count = await NotificationService.getNotificationCount(recipientId)
    return NextResponse.json(count)
  } catch (error) {
    console.error('Error fetching notification count:', error)
    return NextResponse.json(
      { error: 'Failed to fetch notification count' },
      { status: 500 }
    )
  }
}
