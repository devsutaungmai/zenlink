import { NextResponse } from 'next/server'
import { prisma } from '@/shared/lib/prisma'
import { getCurrentUser } from '@/shared/lib/auth'
import { hasAnyServerPermission } from '@/shared/lib/serverPermissions'
import { PERMISSIONS } from '@/shared/lib/permissions'
import { shiftWithRelationsInclude } from '@/shared/lib/shiftIncludes'

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const canCreate = await hasAnyServerPermission([
      PERMISSIONS.SCHEDULE_CREATE,
      PERMISSIONS.SHIFTS_CREATE
    ])
    if (!canCreate) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    const body = await request.json()
    const { shiftId, targets, count } = body

    if (!shiftId) {
      return NextResponse.json({ error: 'shiftId is required' }, { status: 400 })
    }

    const sourceShift = await prisma.shift.findFirst({
      where: {
        id: shiftId,
        OR: [
          { employee: { user: { businessId: currentUser.businessId } } },
          { department: { businessId: currentUser.businessId } },
          { employeeId: null }
        ]
      }
    })

    if (!sourceShift) {
      return NextResponse.json({ error: 'Shift not found' }, { status: 404 })
    }

    const {
      id: _id,
      createdAt: _createdAt,
      updatedAt: _updatedAt,
      ...shiftTemplate
    } = sourceShift

    const shiftsToCreate: any[] = []

    if (targets && Array.isArray(targets) && targets.length > 0) {
      for (const target of targets) {
        let resolvedDeptId = target.departmentId !== undefined ? target.departmentId : shiftTemplate.departmentId
        const resolvedFunctionId = target.functionId !== undefined ? target.functionId : shiftTemplate.functionId

        if (target.functionId && target.functionId !== shiftTemplate.functionId) {
          const targetFn = await prisma.departmentFunction.findUnique({
            where: { id: target.functionId },
            include: {
              category: {
                include: {
                  departments: { select: { departmentId: true }, take: 1 }
                }
              }
            }
          })
          if (targetFn?.category) {
            resolvedDeptId = targetFn.category.departments?.[0]?.departmentId
              || (targetFn.category as any).departmentId
              || null
          }
        }

        shiftsToCreate.push({
          ...shiftTemplate,
          date: target.date ? new Date(target.date) : shiftTemplate.date,
          employeeId: target.employeeId !== undefined ? target.employeeId : shiftTemplate.employeeId,
          employeeGroupId: target.employeeGroupId !== undefined ? target.employeeGroupId : shiftTemplate.employeeGroupId,
          functionId: resolvedFunctionId,
          departmentId: resolvedDeptId,
          status: (target.employeeId !== undefined ? target.employeeId : shiftTemplate.employeeId)
            ? 'SCHEDULED'
            : 'OPEN',
          approved: false,
        })
      }
    } else {
      const copies = Math.min(Math.max(count || 1, 1), 50)
      for (let i = 0; i < copies; i++) {
        shiftsToCreate.push({
          ...shiftTemplate,
          status: shiftTemplate.employeeId ? 'SCHEDULED' : 'OPEN',
          approved: false,
        })
      }
    }

    const created = await prisma.$transaction(
      shiftsToCreate.map(data => prisma.shift.create({ data, include: shiftWithRelationsInclude }))
    )

    return NextResponse.json({
      count: created.length,
      shifts: created
    }, { status: 201 })
  } catch (error) {
    console.error('Failed to duplicate shifts:', error)
    return NextResponse.json({ error: 'Failed to duplicate shifts' }, { status: 500 })
  }
}
