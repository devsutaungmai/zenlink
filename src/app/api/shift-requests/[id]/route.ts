import { NextResponse } from 'next/server'
import { prisma } from '@/shared/lib/prisma'
import { getCurrentUser } from '@/shared/lib/auth'
import jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const currentUser = await getCurrentUser()

    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const shiftRequest = await prisma.shiftRequest.findUnique({
      where: { id },
      include: {
        shift: {
          include: {
            function: { select: { id: true, name: true, color: true } },
            department: { select: { id: true, name: true } },
            employeeGroup: { select: { id: true, name: true } },
          }
        },
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeNo: true,
            profilePhoto: true,
          }
        }
      }
    })

    if (!shiftRequest) {
      return NextResponse.json({ error: 'Shift request not found' }, { status: 404 })
    }

    return NextResponse.json(shiftRequest)
  } catch (error) {
    console.error('Failed to fetch shift request:', error)
    return NextResponse.json({ error: 'Failed to fetch shift request' }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const currentUser = await getCurrentUser()
    const cookieStore = await cookies()
    const employeeToken = cookieStore.get('employee_token')?.value

    let isAuthorized = false
    let currentEmployeeId: string | null = null

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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { status } = body

    if (!['APPROVED', 'REJECTED', 'CANCELLED'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be APPROVED, REJECTED, or CANCELLED' },
        { status: 400 }
      )
    }

    const shiftRequest = await prisma.shiftRequest.findUnique({
      where: { id },
      include: {
        shift: true,
        employee: { select: { id: true, firstName: true, lastName: true } }
      }
    })

    if (!shiftRequest) {
      return NextResponse.json({ error: 'Shift request not found' }, { status: 404 })
    }

    // Employees can only cancel their own requests
    if (!currentUser && currentEmployeeId) {
      if (shiftRequest.employeeId !== currentEmployeeId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      if (status !== 'CANCELLED') {
        return NextResponse.json(
          { error: 'Employees can only cancel their own requests' },
          { status: 403 }
        )
      }
    }

    if (shiftRequest.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'This request has already been processed' },
        { status: 400 }
      )
    }

    if (status === 'APPROVED') {
      // Check if shift is still open
      if (shiftRequest.shift.employeeId || shiftRequest.shift.status !== 'OPEN') {
        return NextResponse.json(
          { error: 'This shift is no longer available' },
          { status: 400 }
        )
      }

      // Use transaction: approve request, assign employee, reject other pending requests
      const result = await prisma.$transaction(async (tx) => {
        const updatedRequest = await tx.shiftRequest.update({
          where: { id },
          data: {
            status: 'APPROVED',
            respondedAt: new Date(),
            respondedBy: currentUser?.id || null
          }
        })

        await tx.shift.update({
          where: { id: shiftRequest.shiftId },
          data: {
            employeeId: shiftRequest.employeeId,
            status: 'SCHEDULED'
          }
        })

        // Reject all other pending requests for this shift
        await tx.shiftRequest.updateMany({
          where: {
            shiftId: shiftRequest.shiftId,
            id: { not: id },
            status: 'PENDING'
          },
          data: {
            status: 'REJECTED',
            respondedAt: new Date(),
            respondedBy: currentUser?.id || null
          }
        })

        return updatedRequest
      })

      const fullRequest = await prisma.shiftRequest.findUnique({
        where: { id: result.id },
        include: {
          shift: {
            include: {
              function: { select: { id: true, name: true, color: true } },
              department: { select: { id: true, name: true } },
              employeeGroup: { select: { id: true, name: true } },
              employee: { select: { id: true, firstName: true, lastName: true } },
            }
          },
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              employeeNo: true,
              profilePhoto: true,
            }
          }
        }
      })

      return NextResponse.json(fullRequest)
    }

    // For rejection or cancellation
    const updatedRequest = await prisma.shiftRequest.update({
      where: { id },
      data: {
        status,
        respondedAt: new Date(),
        respondedBy: currentUser?.id || currentEmployeeId || null
      },
      include: {
        shift: {
          include: {
            function: { select: { id: true, name: true, color: true } },
            department: { select: { id: true, name: true } },
            employeeGroup: { select: { id: true, name: true } },
          }
        },
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeNo: true,
            profilePhoto: true,
          }
        }
      }
    })

    return NextResponse.json(updatedRequest)
  } catch (error) {
    console.error('Failed to update shift request:', error)
    return NextResponse.json({ error: 'Failed to update shift request' }, { status: 500 })
  }
}
