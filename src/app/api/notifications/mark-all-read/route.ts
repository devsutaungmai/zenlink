import { NextRequest, NextResponse } from 'next/server'
import { NotificationService } from '@/lib/notifications'
import { getCurrentUserOrEmployee } from '@/lib/auth'
import { prisma } from '@/app/lib/prisma'

// POST /api/notifications/mark-all-read - Mark all notifications as read
export async function POST() {
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

    const result = await NotificationService.markAllAsRead(recipientId)
    return NextResponse.json({ 
      message: 'All notifications marked as read',
      count: result.count 
    })
  } catch (error) {
    console.error('Error marking all notifications as read:', error)
    return NextResponse.json(
      { error: 'Failed to mark all notifications as read' },
      { status: 500 }
    )
  }
}
