import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/shared/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')

    if (!businessId) {
      return NextResponse.json({ error: 'Business ID is required' }, { status: 400 })
    }

    // Fetch pending attendance records (unscheduled punch-ins)
    const pendingAttendance = await prisma.attendance.findMany({
      where: {
        businessId,
        approved: false,
        shiftId: null, // Only unscheduled work
        punchOutTime: null // Only active sessions
      },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeNo: true,
            department: {
              select: {
                name: true
              }
            }
          }
        }
      },
      orderBy: {
        punchInTime: 'desc'
      }
    })

    return NextResponse.json(pendingAttendance)
  } catch (error) {
    console.error('Error fetching pending attendance:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { attendanceId, approved, adminId } = await request.json()

    if (!attendanceId || approved === undefined) {
      return NextResponse.json({ error: 'Attendance ID and approval status are required' }, { status: 400 })
    }

    // Update attendance record
    const updatedAttendance = await prisma.attendance.update({
      where: { id: attendanceId },
      data: {
        approved,
        updatedAt: new Date()
      },
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

    if (updatedAttendance.shiftId) {
      const approvalActionTime = new Date()
      await prisma.shift.update({
        where: { id: updatedAttendance.shiftId },
        data: {
          approved,
          approvedAt: approved ? new Date() : null,
          approvedBy: approved ? adminId || null : null,
          ...(approved ? {} : {
            status: 'COMPLETED',
            endTime: updatedAttendance.shift?.endTime || approvalActionTime.toTimeString().substring(0, 5)
          })
        }
      })
    }

    // If rejected, also punch out the employee
    if (!approved) {
      await prisma.attendance.update({
        where: { id: attendanceId },
        data: {
          punchOutTime: new Date()
        }
      })
    }

    return NextResponse.json(updatedAttendance)
  } catch (error) {
    console.error('Error updating attendance approval:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
