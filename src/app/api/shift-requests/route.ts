import { NextResponse } from 'next/server'
import { prisma } from '@/shared/lib/prisma'
import { getCurrentUser } from '@/shared/lib/auth'
import jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'
import { ShiftRequestNotifications } from '@/shared/lib/notifications'

export async function GET(request: Request) {
  try {
    const currentUser = await getCurrentUser()
    const cookieStore = await cookies()
    const employeeToken = cookieStore.get('employee_token')?.value

    let isAuthorized = false
    let currentEmployeeId: string | null = null
    let businessId: string | null = null

    if (currentUser) {
      isAuthorized = true
      businessId = currentUser.businessId
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

    const { searchParams } = new URL(request.url)
    const shiftId = searchParams.get('shiftId')
    const status = searchParams.get('status')
    const employeeId = searchParams.get('employeeId')

    const where: any = {}

    if (shiftId) where.shiftId = shiftId
    if (status) where.status = status
    if (employeeId) where.employeeId = employeeId

    // Employees can only see their own requests
    if (currentEmployeeId && !currentUser) {
      where.employeeId = currentEmployeeId
    }

    const requests = await prisma.shiftRequest.findMany({
      where,
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
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(requests)
  } catch (error) {
    console.error('Failed to fetch shift requests:', error)
    return NextResponse.json({ error: 'Failed to fetch shift requests' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
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
    const { shiftId, employeeId, note } = body

    // Determine the requesting employee
    const requestingEmployeeId = employeeId || currentEmployeeId

    if (!shiftId || !requestingEmployeeId) {
      return NextResponse.json(
        { error: 'shiftId and employeeId are required' },
        { status: 400 }
      )
    }

    // Verify the shift exists and is OPEN
    const shift = await prisma.shift.findUnique({
      where: { id: shiftId },
      include: {
        function: {
          include: {
            category: {
              include: {
                departments: { select: { departmentId: true } }
              }
            }
          }
        },
        employeeGroup: true,
      }
    })

    if (!shift) {
      return NextResponse.json({ error: 'Shift not found' }, { status: 404 })
    }

    if (shift.status !== 'OPEN' || shift.employeeId) {
      return NextResponse.json(
        { error: 'This shift is not available for requests' },
        { status: 400 }
      )
    }

    // Check for existing pending request from this employee
    const existingRequest = await prisma.shiftRequest.findFirst({
      where: {
        shiftId,
        employeeId: requestingEmployeeId
      }
    })

    if (existingRequest) {
      if (existingRequest.status === 'PENDING') {
        return NextResponse.json(
          { error: 'You already have a pending request for this shift' },
          { status: 400 }
        )
      }
      // If previously rejected/cancelled, allow re-request by updating
      const updatedRequest = await prisma.shiftRequest.update({
        where: { id: existingRequest.id },
        data: {
          status: 'PENDING',
          note: note || null,
          respondedAt: null,
          respondedBy: null,
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

      // Notify admin about the shift request
      ShiftRequestNotifications.notifyAdminNewShiftRequest(updatedRequest.id).catch(err =>
        console.error('Failed to send shift request notification:', err)
      )

      return NextResponse.json(updatedRequest, { status: 201 })
    }

    const shiftRequest = await prisma.shiftRequest.create({
      data: {
        shiftId,
        employeeId: requestingEmployeeId,
        note: note || null,
        status: 'PENDING'
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

    // Notify admin about the new shift request
    ShiftRequestNotifications.notifyAdminNewShiftRequest(shiftRequest.id).catch(err =>
      console.error('Failed to send shift request notification:', err)
    )

    return NextResponse.json(shiftRequest, { status: 201 })
  } catch (error) {
    console.error('Failed to create shift request:', error)
    return NextResponse.json({ error: 'Failed to create shift request' }, { status: 500 })
  }
}
