import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/shared/lib/prisma'
import { getCurrentUserOrEmployee } from '@/shared/lib/auth'

// GET /api/categories/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const auth = await getCurrentUserOrEmployee()

    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let businessId: string
    if (auth.type === 'user') {
      businessId = (auth.data as any).businessId
    } else {
      businessId = (auth.data as any).department.businessId
    }

    const category = await prisma.departmentCategory.findFirst({
      where: {
        id: id,
        businessId: businessId
      },
      include: {
        department: {
          select: {
            id: true,
            name: true
          }
        },
        departments: {
          include: {
            department: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        functions: {
          select: {
            id: true,
            name: true,
            color: true
          }
        }
      }
    })

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }

    return NextResponse.json(category)
  } catch (error) {
    console.error('Error fetching category:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/categories/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const auth = await getCurrentUserOrEmployee()

    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let businessId: string
    if (auth.type === 'user') {
      businessId = (auth.data as any).businessId
    } else {
      businessId = (auth.data as any).department.businessId
    }

    const body = await request.json()
    const { name, description, color, departmentIds } = body // Changed from departmentId to departmentIds (array)

    const existingCategory = await prisma.departmentCategory.findFirst({
      where: {
        id: id,
        businessId: businessId
      },
      include: {
        departments: true
      }
    })

    if (!existingCategory) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }

    if (departmentIds && departmentIds.length > 0) {
      const departments = await prisma.department.findMany({
        where: {
          id: { in: departmentIds },
          businessId: businessId
        }
      })

      if (departments.length !== departmentIds.length) {
        return NextResponse.json({ error: 'One or more departments not found' }, { status: 404 })
      }
    }

    const category = await prisma.departmentCategory.update({
      where: { id: id },
      data: {
        name,
        description,
        color,
        departments: {
          deleteMany: {},
          create: departmentIds && departmentIds.length > 0 ? departmentIds.map((deptId: string) => ({
            department: {
              connect: { id: deptId }
            }
          })) : []
        }
      },
      include: {
        department: true,
        departments: {
          include: {
            department: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        functions: true
      }
    })

    return NextResponse.json(category)
  } catch (error: any) {
    console.error('Error updating category:', error)

    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Category name already exists in this business' }, { status: 409 })
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/categories/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const auth = await getCurrentUserOrEmployee()

    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let businessId: string
    if (auth.type === 'user') {
      businessId = (auth.data as any).businessId
    } else {
      businessId = (auth.data as any).department.businessId
    }

    const category = await prisma.departmentCategory.findFirst({
      where: {
        id: id,
        businessId: businessId
      },
      include: {
        _count: {
          select: { functions: true }
        }
      }
    })

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }

    // Delete the category (cascade will delete functions)
    await prisma.departmentCategory.delete({
      where: { id: id }
    })

    return NextResponse.json({ message: 'Category deleted successfully' })
  } catch (error) {
    console.error('Error deleting category:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
