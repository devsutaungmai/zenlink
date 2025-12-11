import { NextResponse } from 'next/server'
import { prisma } from '@/shared/lib/prisma'
import { getCurrentUser } from '@/shared/lib/auth'
import jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser()
    const cookieStore = await cookies()
    const employeeToken = cookieStore.get('employee_token')?.value

    let isAuthorized = false
    let currentEmployeeId = null

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
        console.error('Invalid employee token:', error)
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        )
      }
    }

    if (!isAuthorized) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id } = await params
    const shiftId = id
    const body = await request.json()
    
    let endTime = body.endTime
    if (!endTime) {
      const now = new Date()
      endTime = now.toTimeString().split(' ')[0].substring(0, 5) // HH:MM format
    }

    if (currentEmployeeId && !currentUser) {
      const shift = await prisma.shift.findUnique({
        where: { id: shiftId },
        select: { employeeId: true }
      })

      if (!shift || shift.employeeId !== currentEmployeeId) {
        return NextResponse.json(
          { error: 'Forbidden - You can only end your own shifts' },
          { status: 403 }
        )
      }
    }

    const updatedShift = await prisma.shift.update({
      where: {
        id: shiftId
      },
      data: {
        endTime: endTime
      },
      include: {
        employee: {
          select: {
            firstName: true,
            lastName: true
          }
        },
        employeeGroup: {
          select: {
            name: true
          }
        }
      }
    })

    return NextResponse.json(updatedShift)
  } catch (error) {
    console.error('Failed to end shift:', error)
    return NextResponse.json(
      { error: 'Failed to end shift' },
      { status: 500 }
    )
  }
}
