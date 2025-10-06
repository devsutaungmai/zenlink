import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/shared/lib/prisma'
import { getCurrentUser } from '@/shared/lib/auth'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const { punchInTime, punchOutTime } = body

    // Check if user is admin for editing capabilities
    const currentUser = await getCurrentUser()
    const isAdmin = currentUser?.role === 'ADMIN'

    // Find the attendance record
    const attendance = await prisma.attendance.findUnique({
      where: { id },
      include: {
        shift: true,
        employee: {
          include: {
            user: true
          }
        }
      }
    })

    if (!attendance) {
      return NextResponse.json({ error: 'Attendance record not found' }, { status: 404 })
    }

    // If not admin and trying to edit punch times, only allow punch out
    if (!isAdmin && punchInTime) {
      return NextResponse.json({ 
        error: 'Only administrators can edit punch in times' 
      }, { status: 403 })
    }

    // For non-admin users, only allow punch out if not already punched out
    if (!isAdmin && attendance.punchOutTime && punchOutTime) {
      return NextResponse.json({ 
        error: 'Employee is already punched out' 
      }, { status: 400 })
    }

    // Prepare update data
    const updateData: any = {}
    
    if (punchInTime) {
      updateData.punchInTime = new Date(punchInTime)
    }
    
    if (punchOutTime !== undefined) {
      updateData.punchOutTime = punchOutTime ? new Date(punchOutTime) : null
    } else if (!isAdmin && !attendance.punchOutTime) {
      // If not admin and no punchOutTime provided, set it to now (punch out)
      updateData.punchOutTime = new Date()
    }

    // Validate that punch out is after punch in
    const finalPunchInTime = updateData.punchInTime || attendance.punchInTime
    const finalPunchOutTime = updateData.punchOutTime
    
    if (finalPunchOutTime && finalPunchInTime && finalPunchOutTime <= finalPunchInTime) {
      return NextResponse.json({
        error: 'Punch out time must be after punch in time'
      }, { status: 400 })
    }

    // Update attendance record
    const updatedAttendance = await prisma.attendance.update({
      where: { id },
      data: updateData,
      include: {
        employee: {
          select: {
            firstName: true,
            lastName: true,
            employeeNo: true
          }
        },
        shift: true
      }
    })

    // If there's a shift and we're punching out, update its status to COMPLETED
    if (updateData.punchOutTime && attendance.shiftId) {
      await prisma.shift.update({
        where: { id: attendance.shiftId },
        data: { status: 'COMPLETED' }
      })
    }

    return NextResponse.json({ 
      message: isAdmin ? 'Record updated successfully' : 'Punched out successfully',
      attendance: updatedAttendance 
    })

  } catch (error) {
    console.error('Error updating attendance:', error)
    return NextResponse.json({ 
      error: 'Failed to update attendance record' 
    }, { status: 500 })
  }
}
