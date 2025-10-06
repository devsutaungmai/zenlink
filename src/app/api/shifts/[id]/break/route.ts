import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/shared/lib/prisma'

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    
    const now = new Date()
    
    const shift = await prisma.shift.update({
      where: { id },
      data: {
        breakStart: now,
      },
      include: {
        employee: true,
        employeeGroup: true,
      },
    })

    if (!shift) {
      return NextResponse.json({ error: 'Shift not found' }, { status: 404 })
    }

    return NextResponse.json(shift)
  } catch (error) {
    console.error('Error starting break:', error)
    return NextResponse.json(
      { error: 'Failed to start break' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    
    const now = new Date()
   
    const shift = await prisma.shift.update({
      where: { id },
      data: {
        breakEnd: now,
      },
      include: {
        employee: true,
        employeeGroup: true,
      },
    })

    if (!shift) {
      return NextResponse.json({ error: 'Shift not found' }, { status: 404 })
    }

    return NextResponse.json(shift)
  } catch (error) {
    console.error('Error ending break:', error)
    return NextResponse.json(
      { error: 'Failed to end break' },
      { status: 500 }
    )
  }
}
