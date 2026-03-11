import { NextResponse } from 'next/server'
import { prisma } from '@/shared/lib/prisma'
import { getCurrentUser } from '@/shared/lib/auth'
import { captureApiError } from '@/shared/lib/sentry'
import jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const employeeIdParam = searchParams.get('employeeId')

    const currentUser = await getCurrentUser()
    const cookieStore = await cookies()
    const employeeToken = cookieStore.get('employee_token')?.value

    let employeeId: string | null = null

    if (employeeIdParam && currentUser) {
      employeeId = employeeIdParam
    } else if (employeeToken) {
      try {
        const decoded = jwt.verify(employeeToken, process.env.JWT_SECRET!) as {
          employeeId: string
          type: string
        }
        if (decoded.type === 'employee') {
          employeeId = decoded.employeeId
        }
      } catch (error) {
        console.error('Error verifying employee token:', error)
      }
    }

    if (!employeeId) {
      return NextResponse.json(
        { error: 'Unauthorized or missing employee ID' },
        { status: 401 }
      )
    }

    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]
    const nextWeek = new Date(today)
    nextWeek.setDate(today.getDate() + 7)
    const tomorrow = new Date(today)
    tomorrow.setDate(today.getDate() + 1)
    const tomorrowStr = tomorrow.toISOString().split('T')[0]

    const [
      employee,
      activeShift,
      todayShifts,
      upcomingShifts,
      pendingExchanges,
      pendingRequestsCount,
      currentAttendance,
      openShifts,
      myShiftRequests
    ] = await Promise.all([
      prisma.employee.findUnique({
        where: { id: employeeId},
        select: {
          id: true,
          firstName: true,
          lastName: true,
          employeeNo: true,
          departmentId: true,
          employeeGroupId: true,
          department: {
            select: {
              id: true,
              name: true,
              businessId: true
            }
          },
          employeeGroup: {
            select: {
              id: true,
              name: true
            }
          }
        }
      }),

      prisma.shift.findFirst({
        where: {
          employeeId,
          status: 'WORKING',
          isPublished: true
        },
        include: {
          employee: {
            select: {
              firstName: true,
              lastName: true
            }
          },
          employeeGroup: {
            select: { name: true }
          },
          department: {
            select: { name: true }
          }
        }
      }),

      prisma.shift.findMany({
        where: {
          employeeId,
          date: {
            gte: new Date(todayStr),
            lt: new Date(new Date(todayStr).getTime() + 24 * 60 * 60 * 1000)
          },
          isPublished: true
        },
        include: {
          employee: {
            select: {
              firstName: true,
              lastName: true
            }
          },
          employeeGroup: {
            select: { name: true }
          },
          department: {
            select: { name: true }
          },
          function: {
            select: { id: true, name: true, color: true }
          },
          shiftExchanges: {
            where: { status: { in: ['EMPLOYEE_PENDING', 'ADMIN_PENDING'] } },
            include: {
              fromEmployee: {
                select: {
                  firstName: true,
                  lastName: true,
                  department: { select: { name: true } }
                }
              },
              toEmployee: {
                select: {
                  firstName: true,
                  lastName: true,
                  department: { select: { name: true } }
                }
              }
            }
          }
        }
      }),

      prisma.shift.findMany({
        where: {
          employeeId,
          date: {
            gte: new Date(tomorrowStr),
            lte: nextWeek
          },
          isPublished: true
        },
        include: {
          employee: {
            select: {
              firstName: true,
              lastName: true
            }
          },
          employeeGroup: {
            select: { name: true }
          },
          department: {
            select: { name: true }
          },
          function: {
            select: { id: true, name: true, color: true }
          },
          shiftExchanges: {
            where: { status: { in: ['EMPLOYEE_PENDING', 'ADMIN_PENDING'] } },
            include: {
              fromEmployee: {
                select: {
                  firstName: true,
                  lastName: true,
                  department: { select: { name: true } }
                }
              },
              toEmployee: {
                select: {
                  firstName: true,
                  lastName: true,
                  department: { select: { name: true } }
                }
              }
            }
          }
        },
        orderBy: { date: 'asc' }
      }),

      prisma.shiftExchange.findMany({
        where: {
          OR: [
            { fromEmployeeId: employeeId },
            { toEmployeeId: employeeId }
          ],
          status: { in: ['EMPLOYEE_PENDING', 'ADMIN_PENDING'] }
        },
        include: {
          shift: true,
          fromEmployee: {
            select: {
              firstName: true,
              lastName: true,
              department: { select: { name: true } }
            }
          },
          toEmployee: {
            select: {
              firstName: true,
              lastName: true,
              department: { select: { name: true } }
            }
          }
        }
      }),

      prisma.shiftExchange.count({
        where: {
          toEmployeeId: employeeId,
          status: {
            in: ['EMPLOYEE_PENDING', 'EMPLOYEE_ACCEPTED']
          }
        }
      }),

      prisma.attendance.findFirst({
        where: {
          employeeId,
          punchInTime: {
            gte: new Date(todayStr),
            lt: new Date(new Date(todayStr).getTime() + 24 * 60 * 60 * 1000)
          },
          punchOutTime: null
        },
        include: {
          shift: true
        }
      }),

      // Open shifts available for request
      prisma.shift.findMany({
        where: {
          status: 'OPEN',
          employeeId: null,
          date: {
            gte: new Date(todayStr)
          }
        },
        include: {
          function: {
            select: { id: true, name: true, color: true }
          },
          department: {
            select: { id: true, name: true }
          },
          employeeGroup: {
            select: { id: true, name: true }
          },
          shiftRequests: {
            where: { employeeId: employeeId! },
            select: { id: true, status: true }
          }
        },
        orderBy: { date: 'asc' },
        take: 20
      }),

      // My shift requests
      prisma.shiftRequest.findMany({
        where: {
          employeeId: employeeId!,
          status: 'PENDING'
        },
        include: {
          shift: {
            include: {
              function: { select: { id: true, name: true, color: true } },
              department: { select: { id: true, name: true } },
              employeeGroup: { select: { id: true, name: true } },
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      })
    ])

    if (!employee) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      )
    }

    const todayShift = todayShifts[0] || null

    return NextResponse.json({
      employee,
      activeShift,
      todayShift,
      upcomingShifts,
      pendingExchanges,
      pendingRequestsCount,
      currentAttendance,
      openShifts,
      myShiftRequests
    })

  } catch (error) {
    captureApiError(error, { route: '/api/employee/dashboard', method: 'GET' })
    console.error('Error fetching employee dashboard data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    )
  }
}
