import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/shared/lib/prisma'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { status } = body

    console.log('🔍 Sell shift request:', { id, status, body })

    // Validate status
    if (status !== 'FOR_SALE') {
      console.log('❌ Invalid status:', status)
      return NextResponse.json(
        { error: 'Invalid status. Only FOR_SALE is supported' },
        { status: 400 }
      )
    }

    // Check if shift exists
    const shift = await prisma.shift.findUnique({
      where: { id },
      include: { employee: true }
    })

    if (!shift) {
      console.log('❌ Shift not found:', id)
      return NextResponse.json(
        { error: 'Shift not found' },
        { status: 404 }
      )
    }

    console.log('📅 Shift date validation:', {
      shiftDate: shift.date,
      shiftDateParsed: new Date(shift.date),
      now: new Date(),
      comparison: new Date(shift.date) > new Date()
    })

    // Check if shift is in the future (more flexible date comparison)
    const shiftDate = new Date(shift.date)
    const today = new Date()
    today.setHours(0, 0, 0, 0) // Reset time to start of day
    
    if (shiftDate < today) {
      console.log('❌ Shift is in the past:', { shiftDate, today })
      return NextResponse.json(
        { error: 'Cannot mark past shifts for sale' },
        { status: 400 }
      )
    }

    // Check if shift is already completed or cancelled
    if (shift.status === 'COMPLETED' || shift.status === 'CANCELLED') {
      console.log('❌ Shift already completed or cancelled:', shift.status)
      return NextResponse.json(
        { error: 'Cannot mark completed or cancelled shifts for sale' },
        { status: 400 }
      )
    }

    // Check if shift is already marked for sale
    if (shift.note && shift.note.includes('[FOR SALE]')) {
      console.log('❌ Shift already for sale:', shift.note)
      return NextResponse.json(
        { error: 'Shift is already marked for sale' },
        { status: 400 }
      )
    }

    const updatedShift = await prisma.shift.update({
      where: { id },
      data: {
        note: shift.note 
          ? `${shift.note} [FOR SALE]`
          : '[FOR SALE]'
      },
      include: {
        employee: {
          include: {
            department: true,
            employeeGroup: true
          }
        },
        employeeGroup: true
      }
    })

    console.log('✅ Shift marked for sale successfully:', updatedShift.id)
    return NextResponse.json(updatedShift)
  } catch (error) {
    console.error('❌ Error marking shift for sale:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
