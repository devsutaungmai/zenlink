import { NextResponse } from 'next/server'
import { prisma } from '@/shared/lib/prisma'
import { requireAdmin } from '@/shared/lib/auth'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const category = await prisma.salaryCodeCategory.findUnique({
      where: { id },
      include: {
        _count: {
          select: { salaryCodes: true }
        }
      }
    })

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }

    return NextResponse.json(category)
  } catch (error) {
    console.error('Error fetching salary code category:', error)
    return NextResponse.json(
      { error: 'Failed to fetch category' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin()
    const { id } = await params
    const body = await request.json()
    const { code, name, description, icon, color, sortOrder, isActive } = body

    const existing = await prisma.salaryCodeCategory.findUnique({
      where: { id }
    })

    if (!existing) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }

    if (code && code !== existing.code) {
      const codeExists = await prisma.salaryCodeCategory.findUnique({
        where: { code }
      })
      if (codeExists) {
        return NextResponse.json(
          { error: 'Category with this code already exists' },
          { status: 400 }
        )
      }
    }

    const category = await prisma.salaryCodeCategory.update({
      where: { id },
      data: {
        ...(code && { code }),
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(icon !== undefined && { icon }),
        ...(color !== undefined && { color }),
        ...(sortOrder !== undefined && { sortOrder }),
        ...(isActive !== undefined && { isActive })
      }
    })

    return NextResponse.json(category)
  } catch (error) {
    console.error('Error updating salary code category:', error)
    return NextResponse.json(
      { error: 'Failed to update category' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin()
    const { id } = await params

    const category = await prisma.salaryCodeCategory.findUnique({
      where: { id },
      include: {
        _count: {
          select: { salaryCodes: true }
        }
      }
    })

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }

    if (category._count.salaryCodes > 0) {
      return NextResponse.json(
        { error: `Cannot delete category with ${category._count.salaryCodes} salary codes. Remove or reassign them first.` },
        { status: 400 }
      )
    }

    await prisma.salaryCodeCategory.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting salary code category:', error)
    return NextResponse.json(
      { error: 'Failed to delete category' },
      { status: 500 }
    )
  }
}
