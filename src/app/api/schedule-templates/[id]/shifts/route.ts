import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/shared/lib/prisma'
import { getCurrentUserOrEmployee } from '@/shared/lib/auth'
import { hasAnyServerPermission } from '@/shared/lib/serverPermissions'
import { PERMISSIONS } from '@/shared/lib/permissions'

interface RouteParams {
  params: Promise<{ id: string }>
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

export async function POST(request: NextRequest, { params }: RouteParams) {
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

    const { id: templateId } = await params
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

    if (dayIndex === undefined || dayIndex < 0 || (template.length === 'week' && dayIndex > 6) || (template.length === 'day' && dayIndex > 0)) {
      return NextResponse.json({ error: 'Invalid day index' }, { status: 400 })
    }

    if (!startTime) {
      return NextResponse.json({ error: 'Start time is required' }, { status: 400 })
    }

    const shift = await prisma.scheduleTemplateShift.create({
      data: {
        templateId,
        dayIndex,
        startTime,
        endTime: endTime || null,
        employeeId: employeeId || null,
        employeeGroupId: employeeGroupId || null,
        shiftTypeId: shiftTypeId || null,
        functionId: functionId || null,
        departmentId: departmentId || null,
        categoryId: categoryId || null,
        wage: wage !== undefined ? Number(wage) : 0,
        wageType: wageType || 'HOURLY',
        note: note || null,
        breakStart: breakStart || null,
        breakEnd: breakEnd || null,
        breakMinutes: breakMinutes ?? calculateBreakMinutes(breakStart, breakEnd),
        breakPaid: breakPaid || false
      }
    })

    await prisma.scheduleTemplate.update({
      where: { id: templateId },
      data: { updatedAt: new Date() }
    })

    return NextResponse.json(shift, { status: 201 })
  } catch (error) {
    console.error('Error creating template shift:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: 'Failed to create shift', details: errorMessage }, { status: 500 })
  }
}
