import { NextResponse } from 'next/server'
import { prisma } from '@/shared/lib/prisma'
import { getCurrentUser, getCurrentUserOrEmployee } from '@/shared/lib/auth'
import { SMSService, NotificationService } from '@/shared/lib/notifications'
import { hasAnyServerPermission } from '@/shared/lib/serverPermissions'
import { PERMISSIONS } from '@/shared/lib/permissions'
import { canEmployeeBeScheduled } from '@/shared/lib/employeeProfileHelper'
import { validateShiftCombined, getEmployeeShiftsForValidation, getBatchEmployeeShiftsForValidation } from '@/shared/lib/shiftValidation'
import { shiftWithRelationsInclude } from '@/shared/lib/shiftIncludes'
import jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'
import { startOfWeek, endOfWeek } from 'date-fns'

async function getAccessibleDepartmentIds(auth: any): Promise<string[] | null> {
  if (auth.type === 'user') {
    const user = auth.data as any

    if (user.role === 'ADMIN') {
      return null
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

export async function GET(request: Request) {
  try {
    const currentUser = await getCurrentUser()
    const cookieStore = await cookies()
    const employeeToken = cookieStore.get('employee_token')?.value

    let isAuthorized = false
    let currentEmployeeId = null
    let businessId: string | null = null

    if (currentUser) {
      isAuthorized = true
      businessId = currentUser.businessId
    }

    if (!isAuthorized && employeeToken) {
      try {
        const decoded = jwt.verify(employeeToken, process.env.JWT_SECRET!) as {
          id: string
          employeeId: string
          type: string
        }

        if (decoded.type === 'employee') {
          isAuthorized = true
          currentEmployeeId = decoded.employeeId
        }
      } catch (error) {
        console.error('Error verifying employee token:', error)
      }
    }

    if (!isAuthorized) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    if (!businessId && currentEmployeeId) {
      const employeeRecord = await prisma.employee.findUnique({
        where: { id: currentEmployeeId },
        select: {
          department: { select: { businessId: true } },
          employeeGroup: { select: { businessId: true } },
          user: { select: { businessId: true } }
        }
      })

      businessId = employeeRecord?.department?.businessId
        ?? employeeRecord?.employeeGroup?.businessId
        ?? employeeRecord?.user?.businessId
        ?? null
    }

    if (!businessId) {
      return NextResponse.json(
        { error: 'Business context not found' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    let employeeId = searchParams.get('employeeId')

    if (currentEmployeeId && !currentUser) {
      employeeId = currentEmployeeId
    }

    let whereCondition: any = {}

    if (startDate && endDate) {
      whereCondition.date = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      }
    }

    if (employeeId) {
      whereCondition.employeeId = employeeId
    }

    // Employees can only see published shifts; admins see all
    if (!currentUser && currentEmployeeId) {
      whereCondition.isPublished = true
    }

    // Get accessible departments for the current user/employee
    let accessibleDepartmentIds: string[] | null = null

    if (currentUser) {
      const auth = { type: 'user' as const, data: currentUser }
      accessibleDepartmentIds = await getAccessibleDepartmentIds(auth)
    } else if (currentEmployeeId) {
      const employee = await prisma.employee.findUnique({
        where: { id: currentEmployeeId }
      })
      if (employee) {
        const auth = { type: 'employee' as const, data: employee }
        accessibleDepartmentIds = await getAccessibleDepartmentIds(auth)
      }
    }

    whereCondition.AND = [
      ...(whereCondition.AND || []),
      {
        OR: [
          { employee: { user: { businessId } } },
          { department: { businessId } },
          { employeeGroup: { businessId } },
          { function: { category: { businessId } } }
        ]
      }
    ]

    // Filter by accessible departments if not admin
    if (accessibleDepartmentIds !== null && accessibleDepartmentIds.length > 0) {
      whereCondition.AND.push({
        OR: [
          { departmentId: { in: accessibleDepartmentIds } },
          { employee: { departments: { some: { departmentId: { in: accessibleDepartmentIds } } } } },
          { function: { category: { departments: { some: { departmentId: { in: accessibleDepartmentIds } } } } } }
        ]
      })
    }

    const shifts = await prisma.shift.findMany({
      where: whereCondition,
      include: shiftWithRelationsInclude,
      orderBy: {
        date: 'asc'
      }
    })

    const allEmployeeIds = Array.from(new Set(shifts.filter(s => s.employeeId).map(s => s.employeeId!)))
    
    const minDate = shifts.length > 0 
      ? new Date(Math.min(...shifts.map(s => new Date(s.date).getTime())))
      : new Date()
    const maxDate = shifts.length > 0
      ? new Date(Math.max(...shifts.map(s => new Date(s.date).getTime())))
      : new Date()

    const weekStartDate = startOfWeek(minDate, { weekStartsOn: 1 })
    const weekEndDate = endOfWeek(maxDate, { weekStartsOn: 1 })

    const batchShiftsMap = await getBatchEmployeeShiftsForValidation(
      allEmployeeIds,
      weekStartDate,
      weekEndDate
    )

    const shiftsWithValidation = await Promise.all(shifts.map(async (shift) => {
      if (!shift.employeeId) {
        return { ...shift, validation: null }
      }

      try {
        const employeeShifts = batchShiftsMap.get(shift.employeeId) || []
        const existingShifts = employeeShifts.filter(s => s.id !== shift.id)

        const validationResult = await validateShiftCombined(
          {
            id: shift.id,
            date: shift.date,
            startTime: shift.startTime,
            endTime: shift.endTime || '',
            breakStart: shift.breakStart?.toISOString().split('T')[1]?.substring(0, 5) || null,
            breakEnd: shift.breakEnd?.toISOString().split('T')[1]?.substring(0, 5) || null,
            employeeId: shift.employeeId,
          },
          existingShifts
        )

        return {
          ...shift,
          validation: {
            hasLaborLawViolations: validationResult.laborLaw.violations.length > 0,
            hasContractDeviations: validationResult.contract?.hasDeviations || false,
            laborLawViolationCount: validationResult.laborLaw.violations.length,
            contractDeviationCount: validationResult.contract?.deviations.length || 0,
          }
        }
      } catch (error) {
        console.error(`Error validating shift ${shift.id}:`, error)
        return { ...shift, validation: null }
      }
    }))

    return NextResponse.json(shiftsWithValidation)
  } catch (error) {
    console.error('Failed to fetch shifts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch shifts' },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  try {
    const currentUser = await getCurrentUser()
    const cookieStore = await cookies()
    const employeeToken = cookieStore.get('employee_token')?.value

    let isAuthorized = false
    let currentEmployeeId = null

    if (currentUser) {
      isAuthorized = true
    }

    if (!isAuthorized && employeeToken) {
      try {
        const decoded = jwt.verify(employeeToken, process.env.JWT_SECRET!) as {
          id: string
          employeeId: string
          type: string
        }

        if (decoded.type === 'employee') {
          isAuthorized = true
          currentEmployeeId = decoded.employeeId
        }
      } catch (error) {
        console.error('Error verifying employee token:', error)
      }
    }

    if (!isAuthorized) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check permission to create shifts
    const canCreate = await hasAnyServerPermission([
      PERMISSIONS.SCHEDULE_CREATE,
      PERMISSIONS.SHIFTS_CREATE
    ])

    if (!canCreate) {
      return NextResponse.json(
        { error: 'You do not have permission to create shifts' },
        { status: 403 }
      )
    }

    const rawData = await req.json();

    console.log('Received shift data:', JSON.stringify(rawData, null, 2));

    if (currentUser && rawData.employeeId) {
      const employee = await prisma.employee.findFirst({
        where: {
          id: rawData.employeeId,
          user: {
            businessId: currentUser.businessId
          }
        },
        include: {
          user: {
            select: {
              id: true,
              pin: true,
              password: true
            }
          }
        }
      })

      if (!employee) {
        return NextResponse.json(
          { error: 'Employee not found or access denied' },
          { status: 403 }
        )
      }

      // Check if employee profile is complete enough for scheduling
      const schedulingCheck = await canEmployeeBeScheduled(currentUser.businessId, {
        id: employee.id,
        user: employee.user
      })

      if (!schedulingCheck.allowed) {
        return NextResponse.json(
          { error: schedulingCheck.reason || 'Employee profile incomplete' },
          { status: 400 }
        )
      }
    }

    const convertTimeToDateTime = (timeStr: string, baseDate: string): Date => {
      const [hours, minutes] = timeStr.split(':').map(Number);
      const date = new Date(baseDate);
      date.setHours(hours, minutes, 0, 0);
      return date;
    }

    const {
      autoBreakType,
      autoBreakValue,
      employeeId,
      employeeGroupId,
      shiftTypeId,
      departmentId,
      functionId,
      categoryId,
      ...shiftData
    } = rawData;

    const data = {
      ...shiftData,
      breakStart: shiftData.breakStart ? convertTimeToDateTime(shiftData.breakStart, shiftData.date) : null,
      breakEnd: shiftData.breakEnd ? convertTimeToDateTime(shiftData.breakEnd, shiftData.date) : null,
      wage: shiftData.wage !== undefined ? parseFloat(String(shiftData.wage)) : undefined,
    };

    if (shiftTypeId) {
      data.shiftType = 'NORMAL';
    }

    // Build the Prisma create input with proper relation syntax
    const createData: any = {
      ...data,
      date: new Date(data.date),
      status: employeeId ? (data.status || 'SCHEDULED') : 'OPEN',
    };

    if (employeeId) {
      createData.employee = {
        connect: { id: employeeId }
      };
    }

    if (employeeGroupId) {
      createData.employeeGroup = {
        connect: { id: employeeGroupId }
      };
    }

    if (departmentId) {
      createData.department = {
        connect: { id: departmentId }
      };
    }

    if (functionId) {
      createData.function = {
        connect: { id: functionId }
      };
    }

    if (shiftTypeId) {
      createData.shiftTypeConfig = {
        connect: { id: shiftTypeId }
      };
    }

    const shift = await prisma.shift.create({
      data: createData,
      include: shiftWithRelationsInclude
    });

    return NextResponse.json(shift);
  } catch (error) {
    console.error('Failed to create shift:', error);
    return NextResponse.json(
      { error: 'Failed to create shift' },
      { status: 500 }
    );
  }
}
