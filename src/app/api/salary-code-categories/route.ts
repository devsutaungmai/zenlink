import { NextResponse } from 'next/server'
import { prisma } from '@/shared/lib/prisma'
import { requireAdmin } from '@/shared/lib/auth'

export async function GET() {
  try {
    const categories = await prisma.salaryCodeCategory.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' }
    })
    
    return NextResponse.json(categories)
  } catch (error) {
    console.error('Error fetching salary code categories:', error)
    return NextResponse.json(
      { error: 'Failed to fetch salary code categories' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin()

    const body = await request.json()
    const { code, name, description, icon, color, sortOrder } = body

    if (!code || !name) {
      return NextResponse.json(
        { error: 'Code and name are required' },
        { status: 400 }
      )
    }

    const existing = await prisma.salaryCodeCategory.findUnique({
      where: { code }
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Category with this code already exists' },
        { status: 400 }
      )
    }

    const category = await prisma.salaryCodeCategory.create({
      data: {
        code,
        name,
        description,
        icon,
        color,
        sortOrder: sortOrder || 0
      }
    })

    return NextResponse.json(category, { status: 201 })
  } catch (error) {
    console.error('Error creating salary code category:', error)
    return NextResponse.json(
      { error: 'Failed to create salary code category' },
      { status: 500 }
    )
  }
}
