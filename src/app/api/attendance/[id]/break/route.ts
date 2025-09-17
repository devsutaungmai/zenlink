import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/app/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: attendanceId } = await context.params
    const currentUser = await getCurrentUser()
    
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the attendance record
    const attendance = await prisma.attendance.findUnique({
      where: { id: attendanceId },
      include: {
        employee: {
          select: {
            userId: true,
            firstName: true,
            lastName: true
          }
        },
        shift: true
      }
    })

    if (!attendance) {
      return NextResponse.json({ error: 'Attendance record not found' }, { status: 404 })
    }

    // Verify user owns this attendance record
    if (attendance.employee.userId !== currentUser.id && currentUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // If attendance already has a shift, use the existing shift break endpoint
    if (attendance.shiftId) {
      return NextResponse.json({ error: 'Use shift break endpoint for scheduled work' }, { status: 400 })
    }

    const now = new Date()
    
    // Create an automatic shift for unscheduled work to track break
    const autoShift = await prisma.shift.create({
      data: {
        date: now,
        startTime: new Date(attendance.punchInTime).toTimeString().split(' ')[0].substring(0, 5),
        endTime: null,
        employeeId: attendance.employeeId,
        shiftType: 'NORMAL',
        wage: 0,
        wageType: 'HOURLY',
        approved: false,
        breakStart: now,
        status: 'WORKING',
        note: 'Auto-created for break tracking in unscheduled work'
      },
      include: {
        employee: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      }
    })

    // Update attendance to link to this shift
    const updatedAttendance = await prisma.attendance.update({
      where: { id: attendanceId },
      data: {
        shiftId: autoShift.id
      },
      include: {
        shift: {
          include: {
            employee: true
          }
        }
      }
    })

    return NextResponse.json({ 
      message: 'Break started for unscheduled work',
      shift: autoShift,
      attendance: updatedAttendance
    })
  } catch (error) {
    console.error('Error starting break for attendance:', error)
    return NextResponse.json(
      { error: 'Failed to start break' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: attendanceId } = await context.params
    const currentUser = await getCurrentUser()
    
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the attendance record
    const attendance = await prisma.attendance.findUnique({
      where: { id: attendanceId },
      include: {
        employee: {
          select: {
            userId: true
          }
        },
        shift: true
      }
    })

    if (!attendance || !attendance.shift) {
      return NextResponse.json({ error: 'Attendance or shift not found' }, { status: 404 })
    }

    // Verify user owns this attendance record
    if (attendance.employee.userId !== currentUser.id && currentUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const now = new Date()
    
    // End break on the associated shift
    const updatedShift = await prisma.shift.update({
      where: { id: attendance.shiftId! },
      data: {
        breakEnd: now,
      },
      include: {
        employee: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      }
    })

    return NextResponse.json({ 
      message: 'Break ended',
      shift: updatedShift
    })
  } catch (error) {
    console.error('Error ending break for attendance:', error)
    return NextResponse.json(
      { error: 'Failed to end break' },
      { status: 500 }
    )
  }
}
