import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/shared/lib/auth'
import { prisma } from '@/shared/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const isActive = searchParams.get('isActive')

    const where: any = {
      businessId: user.businessId,
    }

    if (category) {
      where.category = category
    }

    if (isActive !== null) {
      where.isActive = isActive === 'true'
    }

    const salaryCodes = await prisma.salaryCode.findMany({
      where,
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        category: true,
        isActive: true,
      },
      orderBy: {
        code: 'asc',
      },
    })

    return NextResponse.json({ salaryCodes })
  } catch (error) {
    console.error('Error fetching salary codes:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { code, name, description, category } = body

    if (!code || !name || !category) {
      return NextResponse.json(
        { error: 'Code, name, and category are required' },
        { status: 400 }
      )
    }

    const existingCode = await prisma.salaryCode.findUnique({
      where: {
        code_businessId: {
          code,
          businessId: user.businessId,
        },
      },
    })

    if (existingCode) {
      return NextResponse.json(
        { error: 'Salary code already exists' },
        { status: 400 }
      )
    }

    const salaryCode = await prisma.salaryCode.create({
      data: {
        code,
        name,
        description,
        category,
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

    return NextResponse.json(salaryCode, { status: 201 })
  } catch (error) {
    console.error('Error creating salary code:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
