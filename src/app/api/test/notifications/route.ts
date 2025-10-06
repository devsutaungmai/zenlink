import { NextRequest, NextResponse } from 'next/server'
import { ShiftExchangeNotifications } from '@/shared/lib/notifications'
import { prisma } from '@/shared/lib/prisma'

// Test endpoint to create notifications
export async function POST(request: NextRequest) {
  try {
    const { type, shiftExchangeId } = await request.json()

    if (!shiftExchangeId) {
      return NextResponse.json({ error: 'shiftExchangeId required' }, { status: 400 })
    }

    let result
    switch (type) {
      case 'request':
        result = await ShiftExchangeNotifications.notifyShiftExchangeRequest(shiftExchangeId)
        break
      case 'accepted':
        result = await ShiftExchangeNotifications.notifyShiftExchangeAccepted(shiftExchangeId)
        break
      case 'rejected':
        result = await ShiftExchangeNotifications.notifyShiftExchangeRejected(shiftExchangeId)
        break
      case 'approved':
        result = await ShiftExchangeNotifications.notifyShiftExchangeApproved(shiftExchangeId)
        break
      case 'admin':
        result = await ShiftExchangeNotifications.notifyAdminForApproval(shiftExchangeId)
        break
      default:
        return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
    }

    return NextResponse.json({ 
      success: true, 
      message: `${type} notification sent`,
      result 
    })
  } catch (error) {
    console.error('Test notification error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send notification' },
      { status: 500 }
    )
  }
}
