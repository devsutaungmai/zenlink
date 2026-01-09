import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/shared/lib/auth'
import { prisma } from '@/shared/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const contractType = await prisma.contractType.findFirst({
      where: {
        id,
        businessId: user.businessId,
      },
    })

    if (!contractType) {
      return NextResponse.json({ error: 'Contract type not found' }, { status: 404 })
    }

    const employees = await prisma.employee.findMany({
      where: {
        contractTypeId: id,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        ftePercent: true,
        employeeNo: true,
        department: {
          select: {
            id: true,
            name: true,
          }
        },
        employeeGroup: {
          select: {
            id: true,
            name: true,
          }
        },
      },
      orderBy: [
        { lastName: 'asc' },
        { firstName: 'asc' },
      ],
    })

    return NextResponse.json({ employees })
  } catch (error) {
    console.error('Error fetching employees for contract type:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { employeeIds, ftePercent } = body

    if (!employeeIds || !Array.isArray(employeeIds) || employeeIds.length === 0) {
      return NextResponse.json(
        { error: 'Employee IDs are required' },
        { status: 400 }
      )
    }

    const contractType = await prisma.contractType.findFirst({
      where: {
        id,
        businessId: user.businessId,
      },
    })

    if (!contractType) {
      return NextResponse.json({ error: 'Contract type not found' }, { status: 404 })
    }

    const updateResult = await prisma.employee.updateMany({
      where: {
        id: { in: employeeIds },
      },
      data: {
        contractTypeId: id,
        ftePercent: ftePercent ?? contractType.defaultFtePercent,
      },
    })

    return NextResponse.json({ 
      success: true, 
      updatedCount: updateResult.count 
    })
  } catch (error) {
    console.error('Error assigning employees to contract type:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
