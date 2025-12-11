import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/shared/lib/prisma'
import { requireAuth, getCurrentUserOrEmployee } from '@/shared/lib/auth'
import { hasAnyServerPermission } from '@/shared/lib/serverPermissions'
import { PERMISSIONS } from '@/shared/lib/permissions'

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

    if (user.role === 'EMPLOYEE') {
      const employee = await prisma.employee.findFirst({
        where: { userId: user.id }
      })
      if (!employee || existingSickLeave.employeeId !== employee.id) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      }

      if (existingSickLeave.approved) {
        return NextResponse.json(
          { error: 'Cannot modify approved sick leave' },
          { status: 403 }
        )
      }
    } else if (user.role === 'ADMIN' || user.role === 'MANAGER') {
      if (existingSickLeave.employee.user.businessId !== user.businessId) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      }
    }

    const updatedSickLeave = await prisma.sickLeave.update({
      where: { id },
      data: {
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
        reason: data.reason,
        document: data.document,
        approved: data.approved !== undefined ? data.approved : undefined,
      },
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

    if (user.role === 'EMPLOYEE') {
      const employee = await prisma.employee.findFirst({
        where: { userId: user.id }
      })
      if (!employee || existingSickLeave.employeeId !== employee.id) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      }
      if (existingSickLeave.approved) {
        return NextResponse.json(
          { error: 'Cannot delete approved sick leave' },
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
