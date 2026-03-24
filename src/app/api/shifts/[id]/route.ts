import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/shared/lib/prisma'
import { getCurrentUser } from '@/shared/lib/auth'
import { hasAnyServerPermission } from '@/shared/lib/serverPermissions'
import { PERMISSIONS } from '@/shared/lib/permissions'
import { ShiftType, WageType } from '@prisma/client'
import {
  validateShiftCombined,
  getEmployeeShiftsForValidation,
  formatCombinedValidationSummary
} from '@/shared/lib/shiftValidation'
import { shiftWithRelationsInclude } from '@/shared/lib/shiftIncludes'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id } = await context.params
    const shift = await prisma.shift.findFirst({
      where: { 
        id,
        employee: {
          user: {
            businessId: currentUser.businessId
          }
        }
      },
      include: {
        employee: true,
        employeeGroup: true,
        department: {
          select: {
            id: true,
            name: true
          }
        },
        function: {
          select: {
            id: true,
            name: true,
            categoryId: true,
            category: {
              select: {
                id: true,
                name: true,
                departmentId: true
              }
            }
          }
        }
      }
    })

    console.log('Fetched shift:', shift)
    
    if (!shift) {
      return NextResponse.json(
        { error: 'Shift not found' }, 
        { status: 404 }
      )
    }
    
    return NextResponse.json(shift)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch shift' }, 
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Check permission to edit shifts
    const canEdit = await hasAnyServerPermission([
      PERMISSIONS.SCHEDULE_EDIT,
      PERMISSIONS.SHIFTS_EDIT
    ])
    
    if (!canEdit) {
      return NextResponse.json(
        { error: 'You do not have permission to edit shifts' },
        { status: 403 }
      )
    }

    const { id } = await context.params
    const extraRawData = await request.json()
    const {
      autoBreakType,
      autoBreakValue,
      categoryId,
      ...rawData
    } = extraRawData

    const convertTimeToDateTime = (timeStr: string, baseDate: string): Date => {
      const [hours, minutes] = timeStr.split(':').map(Number);
      const date = new Date(baseDate);
      date.setHours(hours, minutes, 0, 0);
      return date;
    };

    const data = {
      date: rawData.date ? new Date(rawData.date) : undefined,
      startTime: rawData.startTime,
      endTime: rawData.endTime,
      employeeId: rawData.employeeId || null,
      employeeGroupId: rawData.employeeGroupId || null,
      departmentId: rawData.departmentId || null,
      functionId: rawData.functionId || null,
      shiftType: rawData.shiftType as ShiftType,
      shiftTypeId: rawData.shiftTypeId || null,
      breakStart: rawData.breakStart ? convertTimeToDateTime(rawData.breakStart, rawData.date) : null,
      breakEnd: rawData.breakEnd ? convertTimeToDateTime(rawData.breakEnd, rawData.date) : null,
      wage: rawData.wage !== undefined ? parseFloat(rawData.wage) : undefined,
      wageType: rawData.wageType as WageType,
      note: rawData.note !== undefined ? rawData.note : null,
      isPublished: rawData.isPublished !== undefined ? Boolean(rawData.isPublished) : undefined,
      approved: rawData.approved !== undefined ? Boolean(rawData.approved) : undefined,
      breakPaid: rawData.breakPaid !== undefined ? Boolean(rawData.breakPaid) : undefined
    }

    // Validate against labour law / contract rules when assigning employee to an open shift
    if (rawData.employeeId && rawData.endTime && rawData.date) {
      const existingShift = await prisma.shift.findUnique({ where: { id }, select: { employeeId: true, status: true } })
      const isAssigningToOpenShift = existingShift && !existingShift.employeeId && rawData.employeeId

      if (isAssigningToOpenShift) {
        const shiftDate = new Date(rawData.date)
        const weekStart = new Date(shiftDate)
        weekStart.setDate(weekStart.getDate() - weekStart.getDay() + (weekStart.getDay() === 0 ? -6 : 1))
        const weekEnd = new Date(weekStart)
        weekEnd.setDate(weekEnd.getDate() + 13)

        const existingShifts = await getEmployeeShiftsForValidation(
          rawData.employeeId,
          weekStart,
          weekEnd,
          id
        )

        const shiftDateStr = shiftDate.toISOString().split('T')[0]
        const validationResult = await validateShiftCombined(
          {
            id,
            date: shiftDateStr,
            startTime: rawData.startTime,
            endTime: rawData.endTime,
            breakStart: rawData.breakStart || null,
            breakEnd: rawData.breakEnd || null,
            employeeId: rawData.employeeId,
          },
          existingShifts
        )

        const { redWarnings, yellowWarnings } = formatCombinedValidationSummary(validationResult)

        const hasBlockingViolations = validationResult.laborLaw.violations.some(v => !v.overridable)
        const contractBlocksScheduling = validationResult.contract?.hasDeviations && !validationResult.canSchedule

        if (hasBlockingViolations || contractBlocksScheduling) {
          return NextResponse.json(
            {
              error: 'Cannot assign employee: shift violates rules',
              violations: redWarnings,
              warnings: yellowWarnings,
              validationResult,
            },
            { status: 422 }
          )
        }

        if (validationResult.requiresOverride && !rawData._forceAssign) {
          return NextResponse.json(
            {
              error: 'Assignment requires confirmation due to rule violations',
              requiresConfirmation: true,
              violations: redWarnings,
              warnings: yellowWarnings,
              validationResult,
            },
            { status: 409 }
          )
        }
      }
    }
    
    const currentUser = await getCurrentUser()

    const shift = await prisma.shift.update({
      where: { id },
      data,
      include: shiftWithRelationsInclude
    })

    if (rawData.approved !== undefined) {
      const isApproved = Boolean(rawData.approved)
      await prisma.attendance.updateMany({
        where: { shiftId: id },
        data: {
          approved: isApproved,
          approvedAt: isApproved ? new Date() : null,
          approvedBy: isApproved ? (currentUser?.id ?? null) : null
        }
      })
    }
    
    return NextResponse.json(shift)
  } catch (error:any) {
     console.error('Update error:', error.message)
    if (error.code) console.error('Prisma code:', error.code)
    if (error.meta) console.error('Prisma meta:', error.meta)
    return NextResponse.json(
      { error: error.message || 'Failed to update shift' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Check permission to delete shifts
    const canDelete = await hasAnyServerPermission([
      PERMISSIONS.SCHEDULE_DELETE,
      PERMISSIONS.SHIFTS_DELETE
    ])
    
    if (!canDelete) {
      return NextResponse.json(
        { error: 'You do not have permission to delete shifts' },
        { status: 403 }
      )
    }

    const { id } = await context.params
    await prisma.shift.delete({
      where: { id }
    })
    return NextResponse.json(
      { message: 'Shift deleted successfully' }
    )
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to delete shift' }, 
      { status: 500 }
    )
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  try {
    const canEdit = await hasAnyServerPermission([
      PERMISSIONS.SCHEDULE_EDIT,
      PERMISSIONS.SHIFTS_EDIT,
      PERMISSIONS.SCHEDULE_PUBLISH
    ])

    if (!canEdit) {
      return NextResponse.json(
        { error: 'You do not have permission to update shifts' },
        { status: 403 }
      )
    }

    const body = await req.json().catch(() => ({}))
    const action = body.action as string | undefined

    const currentUser = await getCurrentUser()

    let updateData: any

    if (action === 'publish') {
      updateData = { isPublished: true }
    } else if (action === 'unpublish') {
      updateData = { isPublished: false }
    } else if (action === 'approve') {
      updateData = {
        approved: true,
        approvedAt: new Date(),
        approvedBy: currentUser?.id ?? null,
      }
    } else if (action === 'unapprove') {
      updateData = { approved: false, approvedAt: null, approvedBy: null }
    } else {
      // Legacy: default to approve for backwards compatibility
      updateData = { approved: true }
    }

    const shift = await prisma.shift.update({
      where: { id },
      data: updateData,
      include: { attendances: { select: { id: true } } }
    })

    if (action === 'approve' && shift.attendances.length > 0) {
      await prisma.attendance.updateMany({
        where: { shiftId: id },
        data: {
          approved: true,
          approvedAt: new Date(),
          approvedBy: currentUser?.id ?? null
        }
      })
    } else if (action === 'unapprove' && shift.attendances.length > 0) {
      await prisma.attendance.updateMany({
        where: { shiftId: id },
        data: {
          approved: false,
          approvedAt: null,
          approvedBy: null
        }
      })
    }

    return NextResponse.json(shift)
  } catch (error) {
    console.error('Failed to update shift:', error)
    return NextResponse.json(
      { error: 'Failed to update shift' },
      { status: 500 }
    )
  }
}
