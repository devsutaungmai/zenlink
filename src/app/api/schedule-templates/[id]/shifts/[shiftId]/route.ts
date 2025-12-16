import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/shared/lib/prisma'
import { getCurrentUserOrEmployee } from '@/shared/lib/auth'
import { hasAnyServerPermission } from '@/shared/lib/serverPermissions'
import { PERMISSIONS } from '@/shared/lib/permissions'

interface RouteParams {
  params: Promise<{ id: string; shiftId: string }>
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
    const { dayIndex, startTime, endTime, employeeId, employeeGroupId, functionId, departmentId, categoryId, note, breakMinutes, breakPaid } = body

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
        ...(functionId !== undefined && { functionId: functionId || null }),
        ...(departmentId !== undefined && { departmentId: departmentId || null }),
        ...(categoryId !== undefined && { categoryId: categoryId || null }),
        ...(note !== undefined && { note: note || null }),
        ...(breakMinutes !== undefined && { breakMinutes: breakMinutes || null }),
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
