import { NextResponse } from 'next/server'
import { prisma } from '@/shared/lib/prisma'
import { getCurrentUserOrEmployee } from '@/shared/lib/auth'

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

// Get accessible department IDs based on user's role
async function getAccessibleDepartmentIds(auth: any): Promise<string[] | null> {
  if (auth.type === 'user') {
    const user = auth.data as any

    if (user.role === 'ADMIN') {
      return null // Admins can see all
    }

    if (user.roleId) {
      const userWithRole = await prisma.user.findUnique({
        where: { id: user.id },
        include: {
          assignedRole: {
            include: {
              departments: {
                select: { departmentId: true }
              }
            }
          }
        }
      })

      if (userWithRole?.assignedRole?.departments.length) {
        return userWithRole.assignedRole.departments.map(d => d.departmentId)
      }
    }
    
    return null
  } else {
    const employee = auth.data as any
    
    const employeeRoles = await prisma.employeeRole.findMany({
      where: { employeeId: employee.id },
      include: {
        role: {
          include: {
            departments: {
              select: { departmentId: true }
            }
          }
        }
      }
    })

    const departmentSet = new Set<string>()
    let hasUnrestrictedRole = false

    for (const er of employeeRoles) {
      if (er.role.departments.length === 0) {
        hasUnrestrictedRole = true
        break
      }
      for (const d of er.role.departments) {
        departmentSet.add(d.departmentId)
      }
    }

    return hasUnrestrictedRole ? null : Array.from(departmentSet)
  }
}

export async function GET() {
  try {
    const auth = await getCurrentUserOrEmployee()

    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let businessId: string
    let isEmployee = false
    
    if (auth.type === 'user') {
      const user = auth.data as any
      if (user.role === 'EMPLOYEE') {
        isEmployee = true
      }
      businessId = user.businessId
    } else {
      isEmployee = true
      businessId = (auth.data as any).user.businessId
    }

    // Employees without admin dashboard permission shouldn't see stats
    if (isEmployee) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get accessible department IDs
    const accessibleDepartmentIds = await getAccessibleDepartmentIds(auth)

    const now = new Date()
    const todayStart = startOfUtcDay(now)
    const todayEnd = endOfUtcDay(now)
    const weekStart = startOfCurrentUtcWeek(now)
    const weekEnd = endOfCurrentUtcWeek(weekStart)

    // Build department filter for employees
    const employeeDepartmentFilter = accessibleDepartmentIds !== null && accessibleDepartmentIds.length > 0
      ? {
          OR: [
            { departmentId: { in: accessibleDepartmentIds } },
            { departments: { some: { departmentId: { in: accessibleDepartmentIds } } } }
          ]
        }
      : {}

    // Build shift business scope with department filtering
    const shiftBusinessScope: any = {
      OR: [
        { department: { businessId } },
        { employeeGroup: { businessId } },
        { employee: { user: { businessId } } },
      ],
    }

    // Add department filter if user has restrictions
    if (accessibleDepartmentIds !== null && accessibleDepartmentIds.length > 0) {
      shiftBusinessScope.employee = {
        OR: [
          { departmentId: { in: accessibleDepartmentIds } },
          { departments: { some: { departmentId: { in: accessibleDepartmentIds } } } }
        ]
      }
    }

    const weekShiftWhere = {
      ...shiftBusinessScope,
      date: {
        gte: weekStart,
        lte: weekEnd,
      },
    }

    // Build attendance filter with department restrictions
    const attendanceWhereBase: any = { businessId }
    if (accessibleDepartmentIds !== null && accessibleDepartmentIds.length > 0) {
      attendanceWhereBase.employee = {
        OR: [
          { departmentId: { in: accessibleDepartmentIds } },
          { departments: { some: { departmentId: { in: accessibleDepartmentIds } } } }
        ]
      }
    }

    const [activeEmployees, shiftsInProgress, pendingApprovals, weeklyAttendances, weeklyShiftStatusCounts] = await Promise.all([
      prisma.attendance.count({
        where: {
          ...attendanceWhereBase,
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
          ...attendanceWhereBase,
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
          employeeId: true,
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              profilePhoto: true,
              employeeGroup: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      }),
      prisma.shift.groupBy({
        by: ['status'],
        where: weekShiftWhere,
        _count: {
          _all: true,
        },
      }),
    ])

    const employeeHoursMap = new Map<string, {
      hours: number
      employee: {
        id: string
        firstName: string | null
        lastName: string | null
        profilePhoto: string | null
        employeeGroupName: string | null
      }
    }>()

    const hoursWorkedThisWeekRaw = weeklyAttendances.reduce((total, attendance) => {
      const punchIn = new Date(attendance.punchInTime).getTime()
      const punchOut = attendance.punchOutTime ? new Date(attendance.punchOutTime).getTime() : punchIn
      if (punchOut <= punchIn) {
        return total
      }
      const duration = punchOut - punchIn

      if (attendance.employeeId && attendance.employee) {
        const existing = employeeHoursMap.get(attendance.employeeId) || {
          hours: 0,
          employee: {
            id: attendance.employee.id,
            firstName: attendance.employee.firstName ?? null,
            lastName: attendance.employee.lastName ?? null,
            profilePhoto: attendance.employee.profilePhoto ?? null,
            employeeGroupName: attendance.employee.employeeGroup?.name ?? null,
          },
        }

        existing.hours += duration / HOURS_IN_MS
        employeeHoursMap.set(attendance.employeeId, existing)
      }

      return total + duration
    }, 0)

    const hoursWorkedThisWeek = hoursWorkedThisWeekRaw / HOURS_IN_MS

    let mostActiveEmployee: {
      id: string
      firstName: string | null
      lastName: string | null
      employeeGroup?: string | null
      hoursWorked: number
      completedShifts: number
    } | null = null

    if (employeeHoursMap.size > 0) {
      const [topEmployeeId, topData] = Array.from(employeeHoursMap.entries()).sort((a, b) => b[1].hours - a[1].hours)[0]
      if (topEmployeeId && topData) {
        const completedShifts = await prisma.shift.count({
          where: {
            ...weekShiftWhere,
            status: 'COMPLETED',
            employeeId: topEmployeeId,
          },
        })

        mostActiveEmployee = {
          id: topEmployeeId,
          firstName: topData.employee.firstName,
          lastName: topData.employee.lastName,
          employeeGroup: topData.employee.employeeGroupName,
          hoursWorked: Number(topData.hours.toFixed(2)),
          completedShifts,
        }
      }
    }

    const assignedStatuses = new Set(['SCHEDULED', 'WORKING', 'COMPLETED'])
    const shiftCompletion = weeklyShiftStatusCounts.reduce(
      (acc, record) => {
        const count = record._count._all
        if (assignedStatuses.has(record.status)) {
          acc.assigned += count
        }
        if (record.status === 'COMPLETED') {
          acc.completed = count
        }
        return acc
      },
      { assigned: 0, completed: 0 }
    )

    return NextResponse.json({
      activeEmployees,
      shiftsInProgress,
      pendingApprovals,
      hoursWorkedThisWeek,
      mostActiveEmployee,
      shiftCompletion,
    })
  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
