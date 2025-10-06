import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/shared/lib/prisma'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const shiftId = resolvedParams.id;
    const { newEmployeeId } = await req.json()
    
    console.log(`Attempting to exchange shift ${shiftId} to employee ${newEmployeeId}`)

    const newEmployee = await prisma.employee.findUnique({
      where: { id: newEmployeeId }
    })
    if (!newEmployee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }

    const shift = await prisma.shift.findUnique({
      where: { id: shiftId },
      include: { employee: true }
    })
    if (!shift || !shift.employeeId) {
      return NextResponse.json({ error: 'Shift or current employee not found' }, { status: 404 })
    }
    
    const existingShifts = await prisma.shift.findMany({
      where: {
        employeeId: newEmployeeId,
        date: {
          equals: shift.date
        },
        id: {
          not: shiftId
        }
      }
    })
    
    for (const existingShift of existingShifts) {
      const getMinutes = (timeStr: string) => {
        const [hours, minutes] = timeStr.split(':').map(Number)
        return hours * 60 + minutes
      }
      
      const newShiftStart = getMinutes(shift.startTime)
      const newShiftEnd = getMinutes(shift.endTime)
      const existingShiftStart = getMinutes(existingShift.startTime)
      const existingShiftEnd = getMinutes(existingShift.endTime)
      
      if (
        (newShiftStart >= existingShiftStart && newShiftStart < existingShiftEnd) ||
        (newShiftEnd > existingShiftStart && newShiftEnd <= existingShiftEnd) ||
        (newShiftStart <= existingShiftStart && newShiftEnd >= existingShiftEnd)
      ) {
        return NextResponse.json(
          { 
            error: 'This employee already has a shift at the same time', 
            conflict: {
              shiftId: existingShift.id,
              time: `${existingShift.startTime} - ${existingShift.endTime}`
            } 
          }, 
          { status: 409 }
        )
      }
    }

    const exchange = await prisma.shiftExchange.create({
      data: {
        shiftId,
        fromEmployeeId: shift.employeeId,
        toEmployeeId: newEmployee.id,
        exchangedAt: new Date(),
      }
    })
    
    console.log('Created shift exchange record:', exchange.id)

    await prisma.shift.update({
      where: { id: shiftId },
      data: { employeeId: newEmployee.id }
    })

    return NextResponse.json({ success: true, exchangeId: exchange.id })
  } catch (error) {
    console.error('Error in shift exchange:', error)
    return NextResponse.json({ 
      error: 'Failed to exchange shift', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}