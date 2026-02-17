import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/shared/lib/prisma'
import { getCurrentUser } from '@/shared/lib/auth'
import { hasAnyServerPermission } from '@/shared/lib/serverPermissions'
import { PERMISSIONS } from '@/shared/lib/permissions'

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const canEdit = await hasAnyServerPermission([
      PERMISSIONS.SCHEDULE_EDIT,
      PERMISSIONS.SHIFTS_EDIT
    ])
    if (!canEdit) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    const { id } = await context.params
    const body = await request.json()
    const { date, employeeId, employeeGroupId, functionId, departmentId } = body

    const shift = await prisma.shift.findFirst({
      where: {
        id,
        OR: [
          { employee: { user: { businessId: currentUser.businessId } } },
          { department: { businessId: currentUser.businessId } },
          { employeeId: null }
        ]
      }
    })

    if (!shift) {
      return NextResponse.json({ error: 'Shift not found' }, { status: 404 })
    }

    const updateData: any = {}

    if (date !== undefined) {
      updateData.date = new Date(date)
    }

    if (employeeId !== undefined) {
      if (employeeId === null) {
        updateData.employeeId = null
        updateData.status = 'OPEN'
      } else {
        updateData.employee = { connect: { id: employeeId } }
        if (shift.status === 'OPEN') {
          updateData.status = 'SCHEDULED'
        }
      }
    }

    if (employeeGroupId !== undefined) {
      if (employeeGroupId === null) {
        updateData.employeeGroupId = null
      } else {
        updateData.employeeGroup = { connect: { id: employeeGroupId } }
      }
    }

    if (functionId !== undefined) {
      if (functionId === null) {
        updateData.functionId = null
      } else {
        updateData.function = { connect: { id: functionId } }
      }
    }

    if (departmentId !== undefined) {
      if (departmentId === null) {
        updateData.departmentId = null
      } else {
        updateData.department = { connect: { id: departmentId } }
      }
    }

    const updated = await prisma.shift.update({
      where: { id },
      data: updateData,
      include: {
        employee: {
          select: { firstName: true, lastName: true }
        },
        function: {
          select: { id: true, name: true, color: true }
        }
      }
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Failed to move shift:', error)
    return NextResponse.json({ error: 'Failed to move shift' }, { status: 500 })
  }
}
