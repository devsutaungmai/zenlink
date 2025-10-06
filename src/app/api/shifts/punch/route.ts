import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/shared/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const { shiftId, action, time } = await request.json()

    if (!shiftId || !action || !time) {
      return NextResponse.json(
        { success: false, error: 'Shift ID, action, and time are required' },
        { status: 400 }
      )
    }

    if (!['in', 'out'].includes(action)) {
      return NextResponse.json(
        { success: false, error: 'Action must be either "in" or "out"' },
        { status: 400 }
      )
    }

    // Find the shift
    const shift = await prisma.shift.findUnique({
      where: { id: shiftId },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeNo: true
          }
        }
      }
    })

    if (!shift) {
      return NextResponse.json(
        { success: false, error: 'Shift not found' },
        { status: 404 }
      )
    }

    if (action === 'in') {
      // Punch In - Update start time
      if (shift.endTime !== null) {
        return NextResponse.json(
          { success: false, error: 'This shift has already been completed' },
          { status: 400 }
        )
      }

      const updatedShift = await prisma.shift.update({
        where: { id: shiftId },
        data: {
          startTime: time,
          // Reset endTime to null if it was set (in case of re-punch in)
          endTime: null
        }
      })

      return NextResponse.json({
        success: true,
        message: 'Successfully punched in',
        shift: updatedShift
      })

    } else if (action === 'out') {
      // Punch Out - Update end time
      if (shift.endTime !== null) {
        return NextResponse.json(
          { success: false, error: 'You have already punched out of this shift' },
          { status: 400 }
        )
      }

      const updatedShift = await prisma.shift.update({
        where: { id: shiftId },
        data: {
          endTime: time
        }
      })

      return NextResponse.json({
        success: true,
        message: 'Successfully punched out',
        shift: updatedShift
      })
    }

  } catch (error) {
    console.error('Error processing punch action:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
