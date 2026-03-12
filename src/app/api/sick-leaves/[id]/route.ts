import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/shared/lib/prisma'
import { requireAuth, getCurrentUserOrEmployee } from '@/shared/lib/auth'
import { hasAnyServerPermission } from '@/shared/lib/serverPermissions'
import { PERMISSIONS } from '@/shared/lib/permissions'
import { NotificationService } from '@/shared/lib/notifications'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const auth = await getCurrentUserOrEmployee()
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sickLeave = await prisma.sickLeave.findUnique({
      where: { id },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeNo: true,
            user: {
              select: {
                businessId: true
              }
            }
          }
        }
      }
    })

    if (!sickLeave) {
      return NextResponse.json({ error: 'Sick leave not found' }, { status: 404 })
    }

    if (auth.type === 'employee') {
      // Employee can only view their own sick leaves
      if (sickLeave.employeeId !== auth.data.id) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      }
    } else {
      // Admin/Manager user
      const user = auth.data as any
      if (user.role === 'EMPLOYEE') {
        const employee = await prisma.employee.findFirst({
          where: { userId: user.id }
        })
        if (!employee || sickLeave.employeeId !== employee.id) {
          return NextResponse.json({ error: 'Access denied' }, { status: 403 })
        }
      } else if (user.role === 'ADMIN' || user.role === 'MANAGER') {
        if (sickLeave.employee.user.businessId !== user.businessId) {
          return NextResponse.json({ error: 'Access denied' }, { status: 403 })
        }
      }
    }

    return NextResponse.json(sickLeave)
  } catch (error) {
    console.error('Error fetching sick leave:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const user = await requireAuth()
    const data = await request.json()

    // If approving, check approval permission
    if (data.approved !== undefined) {
      const canApprove = await hasAnyServerPermission([
        PERMISSIONS.SICK_LEAVE_APPROVE
      ])
      
      if (!canApprove) {
        return NextResponse.json(
          { error: 'You do not have permission to approve sick leaves' },
          { status: 403 }
        )
      }
    }

    const existingSickLeave = await prisma.sickLeave.findUnique({
      where: { id },
      include: {
        employee: {
          select: {
            user: {
              select: {
                businessId: true
              }
            }
          }
        }
      }
    })

    if (!existingSickLeave) {
      return NextResponse.json({ error: 'Sick leave not found' }, { status: 404 })
    }

    const existingStatus = ((existingSickLeave as any).status as 'PENDING' | 'APPROVED' | 'REJECTED' | undefined)
      ?? (existingSickLeave.approved ? 'APPROVED' : 'PENDING')

    if (user.role === 'EMPLOYEE') {
      const employee = await prisma.employee.findFirst({
        where: { userId: user.id }
      })
      if (!employee || existingSickLeave.employeeId !== employee.id) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      }

      if (existingStatus !== 'PENDING') {
        return NextResponse.json(
          { error: 'Cannot modify reviewed sick leave' },
          { status: 403 }
        )
      }
    } else if (user.role === 'ADMIN' || user.role === 'MANAGER') {
      if (existingSickLeave.employee.user.businessId !== user.businessId) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      }
    }

    const updateData: any = {
      startDate: data.startDate ? new Date(data.startDate) : undefined,
      endDate: data.endDate ? new Date(data.endDate) : undefined,
      reason: data.reason,
      document: data.document,
      approved: data.approved !== undefined ? data.approved : undefined,
    }

    if (data.approved === true) {
      updateData.status = 'APPROVED'
    } else if (data.approved === false) {
      updateData.status = 'REJECTED'
    }

    const updatedSickLeave = await prisma.sickLeave.update({
      where: { id },
      data: updateData,
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeNo: true,
          }
        }
      }
    })

    const didReviewDecisionChange = data.approved === true
      ? existingStatus !== 'APPROVED'
      : data.approved === false
        ? existingStatus !== 'REJECTED'
        : false

    if (didReviewDecisionChange) {
      const startLabel = updatedSickLeave.startDate.toLocaleDateString()
      const endLabel = updatedSickLeave.endDate.toLocaleDateString()
      const approved = Boolean(data.approved)

      await NotificationService.createNotification({
        type: 'SYSTEM_ANNOUNCEMENT',
        recipientId: updatedSickLeave.employee.id,
        title: approved ? 'Sick leave approved' : 'Sick leave rejected',
        message: approved
          ? `Your sick leave request (${startLabel} - ${endLabel}) has been approved.`
          : `Your sick leave request (${startLabel} - ${endLabel}) has been rejected.`,
        data: {
          category: 'SICK_LEAVE_DECISION',
          sickLeaveId: updatedSickLeave.id,
          status: approved ? 'APPROVED' : 'REJECTED',
          startDate: updatedSickLeave.startDate,
          endDate: updatedSickLeave.endDate
        }
      })
    }

    return NextResponse.json(updatedSickLeave)
  } catch (error) {
    console.error('Error updating sick leave:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const user = await requireAuth()

    const existingSickLeave = await prisma.sickLeave.findUnique({
      where: { id },
      include: {
        employee: {
          select: {
            user: {
              select: {
                businessId: true
              }
            }
          }
        }
      }
    })

    if (!existingSickLeave) {
      return NextResponse.json({ error: 'Sick leave not found' }, { status: 404 })
    }

    const existingStatus = ((existingSickLeave as any).status as 'PENDING' | 'APPROVED' | 'REJECTED' | undefined)
      ?? (existingSickLeave.approved ? 'APPROVED' : 'PENDING')

    if (user.role === 'EMPLOYEE') {
      const employee = await prisma.employee.findFirst({
        where: { userId: user.id }
      })
      if (!employee || existingSickLeave.employeeId !== employee.id) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      }
      if (existingStatus !== 'PENDING') {
        return NextResponse.json(
          { error: 'Cannot delete reviewed sick leave' },
          { status: 403 }
        )
      }
    } else if (user.role === 'ADMIN' || user.role === 'MANAGER') {
      if (existingSickLeave.employee.user.businessId !== user.businessId) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      }
    }

    await prisma.sickLeave.delete({
      where: { id }
    })

    return NextResponse.json({ message: 'Sick leave deleted successfully' })
  } catch (error) {
    console.error('Error deleting sick leave:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
