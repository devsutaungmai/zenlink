import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/shared/lib/prisma'
import { getCurrentUserOrEmployee } from '@/shared/lib/auth'
import { captureApiError } from '@/shared/lib/sentry'

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

export async function POST(request: NextRequest) {
  try {
    const { employeeId, businessId, shiftId, punchInTime, punchOutTime, punchClockProfileId } = await request.json()

    const auth = await getCurrentUserOrEmployee()
    const isAdmin = auth?.type === 'user' && (auth.data as any)?.role === 'ADMIN'

    if (!employeeId || !businessId) {
      return NextResponse.json({ error: 'Employee ID and Business ID are required' }, { status: 400 })
    }

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        departments: {
          select: { departmentId: true }
        }
      }
    })

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }

    if (punchClockProfileId) {
      const profile = await prisma.punchClockProfile.findFirst({
        where: {
          id: punchClockProfileId,
          businessId,
          isActive: true
        },
        include: {
          departments: {
            select: { departmentId: true }
          }
        }
      })

      if (!profile) {
        return NextResponse.json({ 
          error: 'Invalid punch clock profile' 
        }, { status: 400 })
      }

      const profileDepartmentIds = profile.departments.map(d => d.departmentId)
      const employeeDepartmentIds = employee.departments.map(d => d.departmentId)
      const hasMatchingDepartment = employeeDepartmentIds.some(deptId => 
        profileDepartmentIds.includes(deptId)
      )

      if (profileDepartmentIds.length > 0 && !hasMatchingDepartment) {
        return NextResponse.json({ 
          error: 'Employee is not assigned to any department linked to this punch clock profile' 
        }, { status: 403 })
      }
    }

    // If a shiftId is provided, check for an existing open attendance for that exact shift first
    if (shiftId) {
      const existingForShift = await prisma.attendance.findFirst({
        where: { employeeId, shiftId, punchOutTime: null },
        include: {
          employee: { select: { firstName: true, lastName: true, employeeNo: true } },
          shift: true
        }
      })
      if (existingForShift) {
        return NextResponse.json({ message: 'Punched in successfully', attendance: existingForShift })
      }
    }

    // Check for any other open attendance (no punch out)
    const existingAttendance = await prisma.attendance.findFirst({
      where: { employeeId, punchOutTime: null }
    })

    if (existingAttendance) {
      return NextResponse.json({ 
        error: 'Employee is already punched in. Please punch out first.' 
      }, { status: 400 })
    }

    const attendance = await prisma.attendance.create({
      data: {
        employeeId,
        businessId,
        shiftId: shiftId || null,
        punchClockProfileId: punchClockProfileId || null,
        punchInTime: punchInTime ? new Date(punchInTime) : new Date(),
        punchOutTime: punchOutTime ? new Date(punchOutTime) : null,
        approved: shiftId ? true : (isAdmin ? true : false),
        approvedAt: (shiftId || isAdmin) ? new Date() : null,
        approvedBy: (shiftId || isAdmin) ? (isAdmin ? ((auth.data as any).id) : 'system') : null
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

    // If there's a shift, update its status based on whether punchOutTime is provided
    if (shiftId) {
      await prisma.shift.update({
        where: { id: shiftId },
        data: { status: punchOutTime ? 'COMPLETED' : 'WORKING' }
      })
    }

    return NextResponse.json({ 
      message: 'Punched in successfully',
      attendance 
    })

  } catch (error) {
    captureApiError(error, { route: '/api/attendance', method: 'POST' })
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

    // Get accessible departments for the user
    const accessibleDepartmentIds = await getAccessibleDepartmentIds(auth)

    if (auth.type === 'employee') {
      whereClause.employeeId = enforcedEmployeeId
    } else {
      // For users, apply department filtering if they have restricted access
      if (accessibleDepartmentIds !== null && accessibleDepartmentIds.length > 0) {
        whereClause.employee = {
          departmentId: { in: accessibleDepartmentIds }
        }
      } else if (accessibleDepartmentIds !== null && accessibleDepartmentIds.length === 0) {
        // User has role but no departments assigned - return empty
        return NextResponse.json({ 
          attendances: [], 
          pagination: {
            total: 0,
            page: 1,
            pageSize: 25,
            totalPages: 0
          }
        })
      }
      
      // Apply specific employee filter if requested
      if (requestedEmployeeId) {
        if (whereClause.employee) {
          whereClause.employee.id = requestedEmployeeId
        } else {
          whereClause.employeeId = requestedEmployeeId
        }
      }
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
      // Build search conditions - need to merge with any existing employee filter (department restriction)
      const searchConditions = [
        {
          employee: {
            is: {
              firstName: {
                contains: trimmedSearch,
                mode: 'insensitive'
              },
              ...(accessibleDepartmentIds !== null && accessibleDepartmentIds.length > 0 
                ? { departmentId: { in: accessibleDepartmentIds } } 
                : {})
            }
          }
        },
        {
          employee: {
            is: {
              lastName: {
                contains: trimmedSearch,
                mode: 'insensitive'
              },
              ...(accessibleDepartmentIds !== null && accessibleDepartmentIds.length > 0 
                ? { departmentId: { in: accessibleDepartmentIds } } 
                : {})
            }
          }
        },
        {
          employee: {
            is: {
              employeeNo: {
                contains: trimmedSearch,
                mode: 'insensitive'
              },
              ...(accessibleDepartmentIds !== null && accessibleDepartmentIds.length > 0 
                ? { departmentId: { in: accessibleDepartmentIds } } 
                : {})
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
              },
              ...(accessibleDepartmentIds !== null && accessibleDepartmentIds.length > 0 
                ? { departmentId: { in: accessibleDepartmentIds } } 
                : {})
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
              },
              ...(accessibleDepartmentIds !== null && accessibleDepartmentIds.length > 0 
                ? { departmentId: { in: accessibleDepartmentIds } } 
                : {})
            }
          }
        }
      ]
      
      whereClause.OR = searchConditions
      // Remove standalone employee filter since it's now embedded in search conditions
      delete whereClause.employee
    }

    const attendances = await prisma.attendance.findMany({
      where: whereClause,
      select: {
        id: true,
        punchInTime: true,
        punchOutTime: true,
        approved: true,
        approvedBy: true,
        approvedAt: true,
        employeeId: true,
        businessId: true,
        shiftId: true,
        punchClockProfileId: true,
        createdAt: true,
        updatedAt: true,
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
            approved: true,
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
        punchInTime: 'desc' as const
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
    captureApiError(error, { route: '/api/attendance', method: 'GET' })
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
    captureApiError(error, { route: '/api/attendance', method: 'PATCH' })
    console.error('Error updating attendance approval:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
