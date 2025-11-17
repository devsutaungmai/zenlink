import { NextResponse } from 'next/server'
import { prisma } from '@/shared/lib/prisma'
import { getCurrentUser } from '@/shared/lib/auth'

const HOURS_IN_MS = 1000 * 60 * 60

const startOfUtcDay = (date: Date) => {
  const start = new Date(date)
  start.setUTCHours(0, 0, 0, 0)
  return start
}

const endOfUtcDay = (date: Date) => {
  const end = new Date(date)
  end.setUTCHours(23, 59, 59, 999)
  return end
}

const startOfCurrentUtcWeek = (date: Date) => {
  const start = startOfUtcDay(date)
  const day = start.getUTCDay()
  const diff = day === 0 ? -6 : 1 - day // Monday as first day
  start.setUTCDate(start.getUTCDate() + diff)
  return start
}

const endOfCurrentUtcWeek = (startOfWeek: Date) => {
  const end = new Date(startOfWeek)
  end.setUTCDate(end.getUTCDate() + 6)
  end.setUTCHours(23, 59, 59, 999)
  return end
}

export async function GET() {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (user.role === 'EMPLOYEE') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { businessId } = user
    const now = new Date()
    const todayStart = startOfUtcDay(now)
    const todayEnd = endOfUtcDay(now)
    const weekStart = startOfCurrentUtcWeek(now)
    const weekEnd = endOfCurrentUtcWeek(weekStart)

    const shiftBusinessScope = {
      OR: [
        { department: { businessId } },
        { employeeGroup: { businessId } },
        { employee: { user: { businessId } } },
      ],
    }

    const [activeEmployees, shiftsInProgress, pendingApprovals, weeklyAttendances] = await Promise.all([
      prisma.attendance.count({
        where: {
          businessId,
          punchOutTime: null,
        },
      }),
      prisma.shift.count({
        where: {
          status: 'WORKING',
          ...shiftBusinessScope,
          date: {
            gte: todayStart,
            lte: todayEnd,
          },
        },
      }),
      prisma.shift.count({
        where: {
          approved: false,
          status: { in: ['SCHEDULED', 'WORKING'] },
          ...shiftBusinessScope,
        },
      }),
      prisma.attendance.findMany({
        where: {
          businessId,
          punchInTime: {
            gte: weekStart,
            lte: weekEnd,
          },
          punchOutTime: {
            not: null,
          },
        },
        select: {
          punchInTime: true,
          punchOutTime: true,
        },
      }),
    ])

    const hoursWorkedThisWeekRaw = weeklyAttendances.reduce((total, attendance) => {
      const punchIn = new Date(attendance.punchInTime).getTime()
      const punchOut = attendance.punchOutTime ? new Date(attendance.punchOutTime).getTime() : punchIn
      if (punchOut <= punchIn) {
        return total
      }
      return total + (punchOut - punchIn)
    }, 0)

    const hoursWorkedThisWeek = hoursWorkedThisWeekRaw / HOURS_IN_MS

    return NextResponse.json({
      activeEmployees,
      shiftsInProgress,
      pendingApprovals,
      hoursWorkedThisWeek,
    })
  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
