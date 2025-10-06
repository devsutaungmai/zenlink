import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/shared/lib/auth'
import { prisma } from '@/shared/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const salaryCode = await prisma.salaryCode.findFirst({
      where: {
        id: params.id,
        businessId: user.businessId,
      },
      include: {
        payRules: {
          include: {
            overtimeRule: true,
            employeeGroupPayRules: {
              include: {
                employeeGroup: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    })

    if (!salaryCode) {
      return NextResponse.json(
        { error: 'Salary code not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(salaryCode)
  } catch (error) {
    console.error('Error fetching salary code:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, description, category, isActive } = body

    const existingSalaryCode = await prisma.salaryCode.findFirst({
      where: {
        id: params.id,
        businessId: user.businessId,
      },
    })

    if (!existingSalaryCode) {
      return NextResponse.json(
        { error: 'Salary code not found' },
        { status: 404 }
      )
    }

    const salaryCode = await prisma.salaryCode.update({
      where: { id: params.id },
      data: {
        name,
        description,
        category,
        isActive,
      },
      include: {
        _count: {
          select: {
            payRules: true,
          },
        },
      },
    })

    return NextResponse.json(salaryCode)
  } catch (error) {
    console.error('Error updating salary code:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const existingSalaryCode = await prisma.salaryCode.findFirst({
      where: {
        id: params.id,
        businessId: user.businessId,
      },
      include: {
        _count: {
          select: {
            payRules: true,
          },
        },
      },
    })

    if (!existingSalaryCode) {
      return NextResponse.json(
        { error: 'Salary code not found' },
        { status: 404 }
      )
    }

    if (existingSalaryCode._count.payRules > 0) {
      return NextResponse.json(
        { error: 'Cannot delete salary code with associated pay rules' },
        { status: 400 }
      )
    }

    await prisma.salaryCode.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ message: 'Salary code deleted successfully' })
  } catch (error) {
    console.error('Error deleting salary code:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
