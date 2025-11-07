import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/shared/lib/prisma'
import { getCurrentUser } from '@/shared/lib/auth'
import { ShiftType, WageType } from '@prisma/client'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id } = await context.params
    const shift = await prisma.shift.findFirst({
      where: { 
        id,
        employee: {
          user: {
            businessId: currentUser.businessId
          }
        }
      },
      include: {
        employee: true,
        employeeGroup: true
      }
    })
    
    if (!shift) {
      return NextResponse.json(
        { error: 'Shift not found' }, 
        { status: 404 }
      )
    }
    
    return NextResponse.json(shift)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch shift' }, 
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
    const extraRawData = await request.json()
    const {
      autoBreakType,
      autoBreakValue,
      ...rawData
    } = extraRawData

    const convertTimeToDateTime = (timeStr: string, baseDate: string): Date => {
      const [hours, minutes] = timeStr.split(':').map(Number);
      const date = new Date(baseDate);
      date.setHours(hours, minutes, 0, 0);
      return date;
    };

    const data = {
      date: rawData.date ? new Date(rawData.date) : undefined,
      startTime: rawData.startTime,
      endTime: rawData.endTime,
      employeeId: rawData.employeeId || null,
      employeeGroupId: rawData.employeeGroupId || null,
      shiftType: rawData.shiftType as ShiftType,
      shiftTypeId: rawData.shiftTypeId || null,
      breakStart: rawData.breakStart ? convertTimeToDateTime(rawData.breakStart, rawData.date) : null,
      breakEnd: rawData.breakEnd ? convertTimeToDateTime(rawData.breakEnd, rawData.date) : null,
      wage: rawData.wage !== undefined ? parseFloat(rawData.wage) : undefined,
      wageType: rawData.wageType as WageType,
      note: rawData.note !== undefined ? rawData.note : null,
      approved: rawData.approved !== undefined ? Boolean(rawData.approved) : undefined
    }
    
    const shift = await prisma.shift.update({
      where: { id },
      data,
      include: {
        employee: true,
        employeeGroup: true
      }
    })
    
    return NextResponse.json(shift)
  } catch (error:any) {
     console.error('Update error:', error.message)
    if (error.code) console.error('Prisma code:', error.code)
    if (error.meta) console.error('Prisma meta:', error.meta)
    return NextResponse.json(
      { error: error.message || 'Failed to update shift' },
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
    await prisma.shift.delete({
      where: { id }
    })
    return NextResponse.json(
      { message: 'Shift deleted successfully' }
    )
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to delete shift' }, 
      { status: 500 }
    )
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params

  try {
    const shift = await prisma.shift.update({
      where: { id },
      data: { approved: true },
    })

    return NextResponse.json(shift)
  } catch (error) {
    console.error('Failed to approve shift:', error)
    return NextResponse.json(
      { error: 'Failed to approve shift' },
      { status: 500 }
    )
  }
}
