import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/shared/lib/prisma'
import { getCurrentUser } from '@/shared/lib/auth'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await getCurrentUser()
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const attendanceId = id
    if (!attendanceId) {
      return NextResponse.json({ error: 'Attendance ID is required' }, { status: 400 })
    }

    const { approved } = await request.json()
    if (typeof approved !== 'boolean') {
      return NextResponse.json({ error: 'Approval status must be boolean' }, { status: 400 })
    }

    const attendance = await prisma.attendance.findUnique({
      where: { id: attendanceId },
      include: {
        employee: true,
      },
    })

    if (!attendance) {
      return NextResponse.json({ error: 'Attendance record not found' }, { status: 404 })
    }

    if (attendance.businessId !== user.businessId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const updatedAttendance = await prisma.attendance.update({
      where: { id: attendanceId },
      data: {
        approved,
        approvedBy: user.id,
        approvedAt: approved ? new Date() : null,
        punchOutTime: approved ? attendance.punchOutTime : new Date(),
      },
      include: {
        employee: {
          select: {
            firstName: true,
            lastName: true,
            employeeNo: true,
            department: {
              select: { name: true }
            },
            employeeGroup: {
              select: { name: true }
            }
          }
        },
        shift: true,
      },
    })

    return NextResponse.json(updatedAttendance)
  } catch (error) {
    console.error('Error updating attendance approval:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}