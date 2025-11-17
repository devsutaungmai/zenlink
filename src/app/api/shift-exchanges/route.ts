import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/shared/lib/prisma'
import { ShiftExchangeNotifications } from '@/shared/lib/notifications'
import { getCurrentUser, getCurrentUserOrEmployee } from '@/shared/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const session = await getCurrentUserOrEmployee()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const businessId =
      session.type === 'user'
        ? session.data.businessId
        : session.data.department?.businessId

    if (!businessId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const requestingEmployeeId = session.type === 'employee' ? session.data.id : null

    const body = await request.json()
    const { fromShiftId, toEmployeeId, type, requestReason } = body

    // Validate required fields
    if (!fromShiftId || !toEmployeeId || !type) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate type
    if (!['SWAP', 'HANDOVER'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid exchange type. Must be SWAP or HANDOVER' },
        { status: 400 }
      )
    }

    const shift = await prisma.shift.findUnique({
      where: { id: fromShiftId },
      include: { 
        employee: true
      }
    })

    if (!shift) {
      return NextResponse.json(
        { error: 'Shift not found' },
        { status: 404 }
      )
    }

    if (!shift.employee) {
      return NextResponse.json(
        { error: 'Shift employee not found' },
        { status: 404 }
      )
    }

    const shiftEmployeeDept = await prisma.department.findUnique({
      where: { id: shift.employee.departmentId }
    })

    if (!shiftEmployeeDept || shiftEmployeeDept.businessId !== businessId) {
      return NextResponse.json(
        { error: 'Shift not found or access denied' },
        { status: 404 }
      )
    }

    if (requestingEmployeeId && shift.employeeId !== requestingEmployeeId) {
      return NextResponse.json(
        { error: 'You can only request exchanges for your own shifts' },
        { status: 403 }
      )
    }

    const toEmployee = await prisma.employee.findFirst({ 
      where: { 
        id: toEmployeeId,
        department: {
          businessId
        }
      }
    })

    if (!toEmployee) {
      return NextResponse.json(
        { error: 'Target employee not found or access denied' },
        { status: 404 }
      )
    }

    // Check for existing pending exchange for the same shift
    const existingExchange = await prisma.shiftExchange.findFirst({
      where: {
        shiftId: fromShiftId,
        status: {
          in: ['EMPLOYEE_PENDING', 'EMPLOYEE_ACCEPTED', 'ADMIN_PENDING']
        }
      }
    })

    if (existingExchange) {
      return NextResponse.json(
        { error: 'There is already a pending exchange request for this shift' },
        { status: 409 }
      )
    }

    // Create the shift exchange
    const shiftExchange = await prisma.shiftExchange.create({
      data: {
        shiftId: fromShiftId,
        fromEmployeeId: shift.employeeId!,
        toEmployeeId,
        type,
        status: 'EMPLOYEE_PENDING',
        reason: requestReason || `${type} request`,
        requestedAt: new Date()
      },
      include: {
        shift: {
          include: { employee: true }
        },
        fromEmployee: true,
        toEmployee: true
      }
    })

    // Send notification to target employee
    try {
      await ShiftExchangeNotifications.notifyShiftExchangeRequest(shiftExchange.id)
    } catch (notificationError) {
      console.error('Failed to send notification:', notificationError)
      // Don't fail the request if notification fails
    }

    return NextResponse.json(shiftExchange, { status: 201 })
  } catch (error) {
    console.error('Error creating shift exchange:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const employeeId = searchParams.get('employeeId')
    const status = searchParams.get('status')

    let whereClause: any = {
      // Filter by business ID - both fromEmployee and toEmployee must belong to the same business through department
      AND: [
        {
          fromEmployee: {
            department: {
              businessId: user.businessId
            }
          }
        },
        {
          toEmployee: {
            department: {
              businessId: user.businessId
            }
          }
        }
      ]
    }

    if (employeeId) {
      whereClause.OR = [
        { fromEmployeeId: employeeId },
        { toEmployeeId: employeeId }
      ]
    }

    if (status) {
      if (status === 'PENDING') {
        // For backward compatibility, map PENDING to EMPLOYEE_PENDING
        whereClause.status = 'EMPLOYEE_PENDING'
      } else {
        whereClause.status = status
      }
    }

    const exchanges = await prisma.shiftExchange.findMany({
      where: whereClause,
      include: {
        shift: {
          include: { 
            employee: {
              include: {
                department: true
              }
            }
          }
        },
        fromEmployee: {
          include: {
            department: true
          }
        },
        toEmployee: {
          include: {
            department: true
          }
        }
      },
      orderBy: {
        requestedAt: 'desc'
      }
    })

    return NextResponse.json(exchanges)
  } catch (error) {
    console.error('Error fetching shift exchanges:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
