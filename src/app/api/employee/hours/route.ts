import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/shared/lib/prisma'
import { getCurrentUserOrEmployee } from '@/shared/lib/auth'

const formatDuration = (minutes: number) => {
  const hrs = Math.floor(minutes / 60)
  const mins = Math.max(0, minutes % 60)

  if (hrs > 0 && mins > 0) {
    return `${hrs}h ${mins}m`
  }

  if (hrs > 0) {
    return `${hrs}h`
  }

  return `${mins}m`
}

export async function GET(request: NextRequest) {
  try {
    const auth = await getCurrentUserOrEmployee()
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const today = new Date()
    const defaultStartDate = new Date(today)
    defaultStartDate.setHours(0, 0, 0, 0)
    const defaultEndDate = new Date(today)
    defaultEndDate.setHours(23, 59, 59, 999)

    const start = startDate ? new Date(startDate) : defaultStartDate
    const end = endDate ? new Date(endDate) : defaultEndDate

    start.setHours(0, 0, 0, 0)
    end.setHours(23, 59, 59, 999)

    let employeeId: string
    if (auth.type === 'user') {
      const employee = await prisma.employee.findFirst({
        where: { userId: auth.data.id }
      })
      if (!employee) {
        return NextResponse.json({ error: 'Employee record not found' }, { status: 404 })
      }
      employeeId = employee.id
    } else {
      employeeId = auth.data.id
    }

    const attendances = await prisma.attendance.findMany({
      where: {
        employeeId,
        punchInTime: {
          gte: start,
          lte: end
        }
      },
      include: {
        shift: {
          select: {
            id: true,
            date: true,
            startTime: true,
            endTime: true,
            approved: true,
            status: true
          }
        }
      },
      orderBy: {
        punchInTime: 'desc'
      }
    })

    const shifts = await prisma.shift.findMany({
      where: {
        employeeId,
        date: {
          gte: start,
          lte: end
        }
      },
      select: {
        id: true,
        date: true,
        startTime: true,
        endTime: true,
        approved: true,
        status: true,
        breakStart: true,
        breakEnd: true,
        breakPaid: true
      }
    })

    let totalHours = 0
    let totalMinutes = 0
    
    for (const attendance of attendances) {
      if (attendance.punchOutTime) {
        const punchIn = new Date(attendance.punchInTime)
        const punchOut = new Date(attendance.punchOutTime)
        const diffMs = punchOut.getTime() - punchIn.getTime()
        const hours = diffMs / (1000 * 60 * 60)
        totalHours += hours
      }
    }

    const wholeHours = Math.floor(totalHours)
    const remainingMinutes = Math.round((totalHours - wholeHours) * 60)
    totalMinutes = remainingMinutes

    const approvedShifts = shifts.filter(shift => shift.approved).length
    const scheduledShifts = shifts.length
    const completedAttendances = attendances.filter(att => att.punchOutTime).length
    const activeAttendances = attendances.filter(att => !att.punchOutTime).length

    let approvedShiftHours = 0
    const calculateShiftHours = (startTime: string, endTime: string | null, breakStart: Date | null, breakEnd: Date | null, breakPaid: boolean = false): number => {
      if (!endTime) return 0

      const [startHour, startMin] = startTime.split(':').map(Number)
      const [endHour, endMin] = endTime.split(':').map(Number)
      
      const startTotalMinutes = startHour * 60 + startMin
      const endTotalMinutes = endHour * 60 + endMin
      
      let totalMinutes = endTotalMinutes - startTotalMinutes

      if (totalMinutes < 0) {
        totalMinutes += 24 * 60
      }

      if (breakStart && breakEnd && !breakPaid) {
        const breakDuration = breakEnd.getTime() - breakStart.getTime()
        const breakMinutes = breakDuration / (1000 * 60)
        totalMinutes -= breakMinutes
      }
      
      return totalMinutes / 60
    }

    for (const shift of shifts.filter(s => s.approved)) {
      if (shift.endTime) {
        const shiftHours = calculateShiftHours(
          shift.startTime, 
          shift.endTime, 
          shift.breakStart, 
          shift.breakEnd, 
          shift.breakPaid || false
        )
        approvedShiftHours += shiftHours
      }
    }

    const approvedShiftWholeHours = Math.floor(approvedShiftHours)
    const approvedShiftMinutes = Math.round((approvedShiftHours - approvedShiftWholeHours) * 60)

    const attendanceEntries = attendances.map(att => {
      const punchIn = new Date(att.punchInTime)
      const punchOut = att.punchOutTime ? new Date(att.punchOutTime) : null
      const durationMinutes = punchOut
        ? Math.max(0, Math.round((punchOut.getTime() - punchIn.getTime()) / (1000 * 60)))
        : null

      return {
        id: att.id,
        punchInTime: att.punchInTime,
        punchOutTime: att.punchOutTime,
        approved: att.approved,
        durationMinutes,
        durationFormatted: durationMinutes !== null ? formatDuration(durationMinutes) : null,
        shift: att.shift
          ? {
              id: att.shift.id,
              date: att.shift.date,
              startTime: att.shift.startTime,
              endTime: att.shift.endTime,
              approved: att.shift.approved,
              status: att.shift.status
            }
          : null
      }
    })

    const shiftDetails = shifts.map(shift => {
      const shiftHours = shift.endTime
        ? calculateShiftHours(
            shift.startTime,
            shift.endTime,
            shift.breakStart,
            shift.breakEnd,
            shift.breakPaid || false
          )
        : 0
      const durationMinutes = Math.round(shiftHours * 60)

      return {
        id: shift.id,
        date: shift.date,
        startTime: shift.startTime,
        endTime: shift.endTime,
        approved: shift.approved,
        status: shift.status,
        durationMinutes,
        durationFormatted: durationMinutes > 0 ? formatDuration(durationMinutes) : null
      }
    })

    return NextResponse.json({
      dateRange: {
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0]
      },
      totalHours: {
        hours: wholeHours,
        minutes: totalMinutes,
        total: totalHours,
        formatted: `${wholeHours}h ${totalMinutes}m`
      },
      approvedShiftHours: {
        hours: approvedShiftWholeHours,
        minutes: approvedShiftMinutes,
        total: approvedShiftHours,
        formatted: `${approvedShiftWholeHours}h ${approvedShiftMinutes}m`
      },
      shifts: {
        approved: approvedShifts,
        scheduled: scheduledShifts,
        completed: completedAttendances,
        active: activeAttendances
      },
      attendanceRecords: attendances.length,
      summary: {
        workingSessions: attendances.length,
        completedSessions: completedAttendances,
        activeSessions: activeAttendances
      },
      attendanceEntries,
      shiftDetails
    })

  } catch (error) {
    console.error('Error fetching employee hours:', error)
    return NextResponse.json(
      { error: 'Failed to fetch employee hours' },
      { status: 500 }
    )
  }
}
