import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/shared/lib/prisma'
import { getCurrentUserOrEmployee } from '@/shared/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const { employeeId, businessId, shiftId, punchInTime } = await request.json()

    if (!employeeId || !businessId) {
      return NextResponse.json({ error: 'Employee ID and Business ID are required' }, { status: 400 })
    }

    // Check if employee exists
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId }
    })

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }

    // Check if there's already an active attendance record (punched in but not out)
    const existingAttendance = await prisma.attendance.findFirst({
      where: {
        employeeId,
        punchOutTime: null
      }
    })

    if (existingAttendance) {
      return NextResponse.json({ 
        error: 'Employee is already punched in. Please punch out first.' 
      }, { status: 400 })
    }

    // Create attendance record
    const attendance = await prisma.attendance.create({
      data: {
        employeeId,
        businessId,
        shiftId: shiftId || null,
        punchInTime: punchInTime ? new Date(punchInTime) : new Date(),
        // For unscheduled work (no shiftId), require admin approval
        approved: shiftId ? true : false
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

    // If there's a shift, update its status to WORKING
    if (shiftId) {
      await prisma.shift.update({
        where: { id: shiftId },
        data: { status: 'WORKING' }
      })
    }

    return NextResponse.json({ 
      message: 'Punched in successfully',
      attendance 
    })

  } catch (error) {
    console.error('Error creating attendance:', error)
    return NextResponse.json({ 
      error: 'Failed to punch in' 
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await getCurrentUserOrEmployee()

    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let businessId: string | null = null
    let enforcedEmployeeId: string | null = null

    if (auth.type === 'user') {
      businessId = (auth.data as any)?.businessId || null
    } else {
      const employeeData = auth.data as any
      businessId = employeeData?.department?.businessId 
        ?? employeeData?.employeeGroup?.businessId
        ?? null
      enforcedEmployeeId = employeeData?.id || null
    }

    if (!businessId) {
      return NextResponse.json({ error: 'Business context not found' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const requestedEmployeeId = searchParams.get('employeeId')
    const requestedBusinessId = searchParams.get('businessId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const date = searchParams.get('date')
    const limitParam = searchParams.get('limit')
    const pageParam = searchParams.get('page')
    const pageSizeParam = searchParams.get('pageSize')
    const searchParam = searchParams.get('search')
    const statusParam = searchParams.get('status')

    let limit: number | undefined
    if (limitParam) {
      const parsedLimit = parseInt(limitParam, 10)
      if (!Number.isNaN(parsedLimit)) {
        limit = Math.max(1, Math.min(parsedLimit, 50))
      }
    }

    const isPaginated = !!(pageParam || pageSizeParam)
    let page = Math.max(1, parseInt(pageParam || '1', 10) || 1)
    let pageSize = Math.max(1, Math.min(parseInt(pageSizeParam || '25', 10) || 25, 100))

    const whereClause: any = {
      businessId
    }

    if (requestedBusinessId && requestedBusinessId !== businessId) {
      return NextResponse.json({ error: 'Unauthorized business scope' }, { status: 403 })
    }

    if (auth.type === 'employee') {
      whereClause.employeeId = enforcedEmployeeId
    } else if (requestedEmployeeId) {
      whereClause.employeeId = requestedEmployeeId
    }

    if (statusParam === 'working') {
      whereClause.punchOutTime = null
    } else if (statusParam === 'completed') {
      whereClause.punchOutTime = {
        not: null
      }
    }

    // Handle date filtering - priority: startDate/endDate, then single date
    if (startDate && endDate) {
      const start = new Date(startDate)
      start.setUTCHours(0, 0, 0, 0)
      const end = new Date(endDate)
      end.setUTCHours(23, 59, 59, 999)

      whereClause.punchInTime = {
        gte: start,
        lte: end
      }
    } else if (date) {
      const startOfDay = new Date(date)
      startOfDay.setUTCHours(0, 0, 0, 0)
      const endOfDay = new Date(date)
      endOfDay.setUTCHours(23, 59, 59, 999)

      whereClause.punchInTime = {
        gte: startOfDay,
        lte: endOfDay
      }
    }

    const trimmedSearch = searchParam?.trim()
    if (trimmedSearch) {
      whereClause.OR = [
        {
          employee: {
            is: {
              firstName: {
                contains: trimmedSearch,
                mode: 'insensitive'
              }
            }
          }
        },
        {
          employee: {
            is: {
              lastName: {
                contains: trimmedSearch,
                mode: 'insensitive'
              }
            }
          }
        },
        {
          employee: {
            is: {
              employeeNo: {
                contains: trimmedSearch,
                mode: 'insensitive'
              }
            }
          }
        },
        {
          employee: {
            is: {
              department: {
                is: {
                  name: {
                    contains: trimmedSearch,
                    mode: 'insensitive'
                  }
                }
              }
            }
          }
        },
        {
          employee: {
            is: {
              employeeGroup: {
                is: {
                  name: {
                    contains: trimmedSearch,
                    mode: 'insensitive'
                  }
                }
              }
            }
          }
        }
      ]
    }

    const attendances = await prisma.attendance.findMany({
      where: whereClause,
      include: {
        employee: {
          select: {
            firstName: true,
            lastName: true,
            employeeNo: true,
            profilePhoto: true,
            department: {
              select: {
                name: true
              }
            },
            employeeGroup: {
              select: {
                name: true
              }
            }
          }
        },
        shift: {
          select: {
            id: true,
            date: true,
            startTime: true,
            endTime: true,
            shiftType: true,
            status: true,
            employeeGroup: {
              select: {
                name: true
              }
            },
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
      },
      ...(isPaginated
        ? {
            skip: (page - 1) * pageSize,
            take: pageSize
          }
        : limit
          ? { take: limit }
          : {})
    })

    if (isPaginated) {
      const totalCount = await prisma.attendance.count({ where: whereClause })
      const totalPages = Math.max(1, Math.ceil(totalCount / pageSize) || 1)

      return NextResponse.json({
        data: attendances,
        pagination: {
          page,
          pageSize,
          totalCount,
          totalPages
        }
      })
    }

    return NextResponse.json(attendances)

  } catch (error) {
    console.error('Error fetching attendance:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch attendance records' 
    }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { attendanceIds, approved, approvalNote } = body

    if (!attendanceIds || !Array.isArray(attendanceIds)) {
      return NextResponse.json(
        { error: 'Attendance IDs are required' },
        { status: 400 }
      )
    }

    if (typeof approved !== 'boolean') {
      return NextResponse.json(
        { error: 'Approval status must be a boolean' },
        { status: 400 }
      )
    }

    const updateData: any = {
      approved,
      approvedAt: approved ? new Date() : null,
      approvedBy: approved ? 'admin' : null
    }

    const updatedAttendances = await prisma.attendance.updateMany({
      where: {
        id: { in: attendanceIds }
      },
      data: updateData
    })

    return NextResponse.json({
      message: `${updatedAttendances.count} attendance records ${approved ? 'approved' : 'unapproved'}`,
      updatedCount: updatedAttendances.count
    })
  } catch (error) {
    console.error('Error updating attendance approval:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
