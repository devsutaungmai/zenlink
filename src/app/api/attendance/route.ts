import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/app/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const { employeeId, businessId, shiftId, punchInTime } = await request.json()

    if (!employeeId || !businessId) {
      return NextResponse.json({ error: 'Employee ID and Business ID are required' }, { status: 400 })
    }

    // Check if employee exists
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId }
    })

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }

    // Check if there's already an active attendance record (punched in but not out)
    const existingAttendance = await prisma.attendance.findFirst({
      where: {
        employeeId,
        punchOutTime: null
      }
    })

    if (existingAttendance) {
      return NextResponse.json({ 
        error: 'Employee is already punched in. Please punch out first.' 
      }, { status: 400 })
    }

    // Create attendance record
    const attendance = await prisma.attendance.create({
      data: {
        employeeId,
        businessId,
        shiftId: shiftId || null,
        punchInTime: punchInTime ? new Date(punchInTime) : new Date(),
        // For unscheduled work (no shiftId), require admin approval
        approved: shiftId ? true : false
      },
      include: {
        employee: {
          select: {
            firstName: true,
            lastName: true,
            employeeNo: true
          }
        },
        shift: true
      }
    })

    // If there's a shift, update its status to WORKING
    if (shiftId) {
      await prisma.shift.update({
        where: { id: shiftId },
        data: { status: 'WORKING' }
      })
    }

    return NextResponse.json({ 
      message: 'Punched in successfully',
      attendance 
    })

  } catch (error) {
    console.error('Error creating attendance:', error)
    return NextResponse.json({ 
      error: 'Failed to punch in' 
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const employeeId = searchParams.get('employeeId')
    const businessId = searchParams.get('businessId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const date = searchParams.get('date')

    const whereClause: any = {}

    if (businessId) {
      whereClause.businessId = businessId
    }

    if (employeeId) {
      whereClause.employeeId = employeeId
    }

    // Handle date filtering - priority: startDate/endDate, then single date
    if (startDate && endDate) {
      const start = new Date(startDate)
      start.setHours(0, 0, 0, 0)
      const end = new Date(endDate)
      end.setHours(23, 59, 59, 999)

      whereClause.punchInTime = {
        gte: start,
        lte: end
      }
    } else if (date) {
      const startOfDay = new Date(date)
      startOfDay.setHours(0, 0, 0, 0)
      const endOfDay = new Date(date)
      endOfDay.setHours(23, 59, 59, 999)

      whereClause.punchInTime = {
        gte: startOfDay,
        lte: endOfDay
      }
    }

    const attendances = await prisma.attendance.findMany({
      where: whereClause,
      include: {
        employee: {
          select: {
            firstName: true,
            lastName: true,
            employeeNo: true,
            department: {
              select: {
                name: true
              }
            },
            employeeGroup: {
              select: {
                name: true
              }
            }
          }
        },
        shift: {
          select: {
            id: true,
            date: true,
            startTime: true,
            endTime: true,
            shiftType: true,
            status: true
          }
        }
      },
      orderBy: {
        punchInTime: 'desc'
      }
    })

    return NextResponse.json(attendances)

  } catch (error) {
    console.error('Error fetching attendance:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch attendance records' 
    }, { status: 500 })
  }
}
