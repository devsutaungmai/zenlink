import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/shared/lib/prisma'
import { getCurrentUser } from '@/shared/lib/auth'
import { hasAnyServerPermission } from '@/shared/lib/serverPermissions'
import { PERMISSIONS } from '@/shared/lib/permissions'
import { shiftWithRelationsInclude } from '@/shared/lib/shiftIncludes'

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
        const targetEmp = await prisma.employee.findUnique({
          where: { id: employeeId },
          include: { departments: { select: { departmentId: true } } }
        })

        if (targetEmp && shift.departmentId) {
          const targetDeptIds: string[] = []
          if (targetEmp.departments?.length) {
            targetEmp.departments.forEach(d => targetDeptIds.push(d.departmentId))
          } else if (targetEmp.departmentId) {
            targetDeptIds.push(targetEmp.departmentId)
          }

          if (targetDeptIds.length > 0 && !targetDeptIds.includes(shift.departmentId)) {
            return NextResponse.json(
              { error: 'Cannot move shift to an employee in a different department' },
              { status: 400 }
            )
          }
        }

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

        const targetFunction = await prisma.departmentFunction.findUnique({
          where: { id: functionId },
          include: {
            category: {
              include: {
                departments: {
                  select: { departmentId: true }
                }
              }
            }
          }
        })

        if (targetFunction?.category) {
          const targetDeptIds: string[] = []
          if (targetFunction.category.departments?.length) {
            targetFunction.category.departments.forEach(cd => targetDeptIds.push(cd.departmentId))
          } else if ((targetFunction.category as any).departmentId) {
            targetDeptIds.push((targetFunction.category as any).departmentId)
          }

          if (targetDeptIds.length > 0) {
            const empDeptIds: string[] = []
            if (shift.employeeId) {
              const emp = await prisma.employee.findUnique({
                where: { id: shift.employeeId },
                include: {
                  departments: { select: { departmentId: true } }
                }
              })
              if (emp) {
                if (emp.departments?.length) {
                  emp.departments.forEach(d => empDeptIds.push(d.departmentId))
                } else if (emp.departmentId) {
                  empDeptIds.push(emp.departmentId)
                }
              }
            } else if (shift.departmentId) {
              empDeptIds.push(shift.departmentId)
            }

            if (empDeptIds.length > 0 && !empDeptIds.some(id => targetDeptIds.includes(id))) {
              return NextResponse.json(
                { error: 'Cannot move shift to a function in a different department' },
                { status: 400 }
              )
            }

            const matchingDeptId = empDeptIds.find(id => targetDeptIds.includes(id))
            updateData.department = { connect: { id: matchingDeptId || targetDeptIds[0] } }
          } else {
            updateData.departmentId = null
          }
        }
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
      include: shiftWithRelationsInclude
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Failed to move shift:', error)
    return NextResponse.json({ error: 'Failed to move shift' }, { status: 500 })
  }
}
