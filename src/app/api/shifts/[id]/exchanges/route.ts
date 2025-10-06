import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/shared/lib/prisma'
import { requireAuth } from '@/shared/lib/auth'

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const user = await requireAuth()
    
    const exchanges = await prisma.shiftExchange.findMany({
      where: { shiftId: params.id },
      include: {
        fromEmployee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeNo: true,
          }
        },
        toEmployee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeNo: true,
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
    
    return NextResponse.json(exchanges)
  } catch (error) {
    console.error('Error fetching shift exchanges:', error)
    return NextResponse.json(
      { error: 'Failed to fetch shift exchanges' },
      { status: 500 }
    )
  }
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const user = await requireAuth()
    const { toEmployeeId, reason } = await req.json()

    if (!toEmployeeId) {
      return NextResponse.json(
        { error: 'To employee ID is required' },
        { status: 400 }
      )
    }

    const shift = await prisma.shift.findUnique({
      where: { id: params.id },
      include: { employee: true },
    })

    if (!shift) {
      return NextResponse.json(
        { error: 'Shift not found' },
        { status: 404 }
      )
    }

    if (!shift.employeeId) {
      return NextResponse.json(
        { error: 'Shift has no assigned employee' },
        { status: 400 }
      )
    }

    const existingExchange = await prisma.shiftExchange.findFirst({
      where: {
        shiftId: params.id,
        status: 'PENDING',
      },
    })

    if (existingExchange) {
      return NextResponse.json(
        { error: 'There is already a pending exchange request for this shift' },
        { status: 400 }
      )
    }

    const exchange = await prisma.shiftExchange.create({
      data: {
        shiftId: params.id,
        fromEmployeeId: shift.employeeId,
        toEmployeeId,
        type: 'SWAP',
        reason: reason || null,
        status: 'PENDING',
      },
      include: {
        fromEmployee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeNo: true,
          },
        },
        toEmployee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeNo: true,
          },
        },
      },
    })

    return NextResponse.json(exchange)
  } catch (error) {
    console.error('Error creating shift exchange:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}