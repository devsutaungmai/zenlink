import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/shared/lib/prisma'
import { getCurrentUserOrEmployee } from '@/shared/lib/auth'
import { hasAnyServerPermission } from '@/shared/lib/serverPermissions'
import { PERMISSIONS } from '@/shared/lib/permissions'

interface RouteParams {
  params: Promise<{ id: string; shiftId: string }>
}

function calculateBreakMinutes(breakStart?: string | null, breakEnd?: string | null): number | null {
  if (!breakStart || !breakEnd) return null

  const [startHours, startMinutes] = breakStart.split(':').map(Number)
  const [endHours, endMinutes] = breakEnd.split(':').map(Number)

  const startTotalMinutes = startHours * 60 + startMinutes
  let endTotalMinutes = endHours * 60 + endMinutes

  if (endTotalMinutes <= startTotalMinutes) {
    endTotalMinutes += 24 * 60
  }

  return endTotalMinutes - startTotalMinutes
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await getCurrentUserOrEmployee()
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Check permission to use templates
    const canUseTemplates = await hasAnyServerPermission([
      PERMISSIONS.SCHEDULE_TEMPLATES
    ])
    
    if (!canUseTemplates) {
      return NextResponse.json({ error: 'You do not have permission to manage template shifts' }, { status: 403 })
    }
    
    const businessId = auth.type === 'user' ? (auth.data as any).businessId : (auth.data as any).user.businessId

    const { id: templateId, shiftId } = await params
    const body = await request.json()
    const {
      dayIndex,
      startTime,
      endTime,
      employeeId,
      employeeGroupId,
      shiftTypeId,
      functionId,
      departmentId,
      categoryId,
      wage,
      wageType,
      note,
      breakStart,
      breakEnd,
      breakMinutes,
      breakPaid
    } = body

    const template = await prisma.scheduleTemplate.findFirst({
      where: {
        id: templateId,
        businessId
      }
    })

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    const existingShift = await prisma.scheduleTemplateShift.findFirst({
      where: {
        id: shiftId,
        templateId
      }
    })

    if (!existingShift) {
      return NextResponse.json({ error: 'Shift not found' }, { status: 404 })
    }

    const shift = await prisma.scheduleTemplateShift.update({
      where: { id: shiftId },
      data: {
        ...(dayIndex !== undefined && { dayIndex }),
        ...(startTime && { startTime }),
        ...(endTime !== undefined && { endTime: endTime || null }),
        ...(employeeId !== undefined && { employeeId: employeeId || null }),
        ...(employeeGroupId !== undefined && { employeeGroupId: employeeGroupId || null }),
        ...(shiftTypeId !== undefined && { shiftTypeId: shiftTypeId || null }),
        ...(functionId !== undefined && { functionId: functionId || null }),
        ...(departmentId !== undefined && { departmentId: departmentId || null }),
        ...(categoryId !== undefined && { categoryId: categoryId || null }),
        ...(wage !== undefined && { wage: Number(wage) }),
        ...(wageType !== undefined && { wageType }),
        ...(note !== undefined && { note: note || null }),
        ...(breakStart !== undefined && { breakStart: breakStart || null }),
        ...(breakEnd !== undefined && { breakEnd: breakEnd || null }),
        ...((breakStart !== undefined || breakEnd !== undefined || breakMinutes !== undefined) && {
          breakMinutes: breakMinutes ?? calculateBreakMinutes(
            breakStart !== undefined ? breakStart : existingShift.breakStart,
            breakEnd !== undefined ? breakEnd : existingShift.breakEnd
          )
        }),
        ...(breakPaid !== undefined && { breakPaid }),
        updatedAt: new Date()
      }
    })

    await prisma.scheduleTemplate.update({
      where: { id: templateId },
      data: { updatedAt: new Date() }
    })

    return NextResponse.json(shift)
  } catch (error) {
    console.error('Error updating template shift:', error)
    return NextResponse.json({ error: 'Failed to update shift' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await getCurrentUserOrEmployee()
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Check permission to use templates
    const canUseTemplates = await hasAnyServerPermission([
      PERMISSIONS.SCHEDULE_TEMPLATES
    ])
    
    if (!canUseTemplates) {
      return NextResponse.json({ error: 'You do not have permission to manage template shifts' }, { status: 403 })
    }
    
    const businessId = auth.type === 'user' ? (auth.data as any).businessId : (auth.data as any).user.businessId

    const { id: templateId, shiftId } = await params

    const template = await prisma.scheduleTemplate.findFirst({
      where: {
        id: templateId,
        businessId
      }
    })

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    const existingShift = await prisma.scheduleTemplateShift.findFirst({
      where: {
        id: shiftId,
        templateId
      }
    })

    if (!existingShift) {
      return NextResponse.json({ error: 'Shift not found' }, { status: 404 })
    }

    await prisma.scheduleTemplateShift.delete({
      where: { id: shiftId }
    })

    await prisma.scheduleTemplate.update({
      where: { id: templateId },
      data: { updatedAt: new Date() }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting template shift:', error)
    return NextResponse.json({ error: 'Failed to delete shift' }, { status: 500 })
  }
}
