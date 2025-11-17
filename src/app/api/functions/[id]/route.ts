import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/shared/lib/prisma'
import { getCurrentUserOrEmployee } from '@/shared/lib/auth'

// GET /api/functions/[id] - Get a specific function
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
      const employeeData = auth.data as any
      if (!employeeData.department || !employeeData.department.businessId) {
        return NextResponse.json({ error: 'Employee department not found' }, { status: 404 })
      }
      businessId = employeeData.department.businessId
    }

    if (!businessId) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    const functionItem = await prisma.departmentFunction.findFirst({
      where: {
        id,
        category: {
          businessId: businessId
        }
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            color: true,
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
            }
          }
        },
        _count: {
          select: {
            employees: true,
            shifts: true
          }
        }
      }
    })

    if (!functionItem) {
      return NextResponse.json({ error: 'Function not found' }, { status: 404 })
    }

    return NextResponse.json(functionItem)
  } catch (error) {
    console.error('Error fetching function:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/functions/[id] - Update a function
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
      const employeeData = auth.data as any
      if (!employeeData.department || !employeeData.department.businessId) {
        return NextResponse.json({ error: 'Employee department not found' }, { status: 404 })
      }
      businessId = employeeData.department.businessId
    }

    if (!businessId) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    const body = await request.json()
    const { name, color, categoryId } = body

    const existingFunction = await prisma.departmentFunction.findFirst({
      where: {
        id,
        category: {
          businessId: businessId
        }
      }
    })

    if (!existingFunction) {
      return NextResponse.json({ error: 'Function not found' }, { status: 404 })
    }

    if (categoryId && categoryId !== existingFunction.categoryId) {
      const category = await prisma.departmentCategory.findFirst({
        where: {
          id: categoryId,
          businessId: businessId
        }
      })

      if (!category) {
        return NextResponse.json({ error: 'Category not found' }, { status: 404 })
      }
    }

    const functionItem = await prisma.departmentFunction.update({
      where: { id },
      data: {
        name,
        color,
        categoryId
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            color: true,
            department: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    })

    return NextResponse.json(functionItem)
  } catch (error: any) {
    console.error('Error updating function:', error)
    
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Function name already exists in this category' }, { status: 409 })
    }
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/functions/[id] - Delete a function
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
      const employeeData = auth.data as any
      if (!employeeData.department || !employeeData.department.businessId) {
        return NextResponse.json({ error: 'Employee department not found' }, { status: 404 })
      }
      businessId = employeeData.department.businessId
    }

    if (!businessId) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    const functionItem = await prisma.departmentFunction.findFirst({
      where: {
        id,
        category: {
          businessId: businessId
        }
      }
    })

    if (!functionItem) {
      return NextResponse.json({ error: 'Function not found' }, { status: 404 })
    }

    await prisma.departmentFunction.delete({
      where: { id }
    })

    return NextResponse.json({ message: 'Function deleted successfully' })
  } catch (error) {
    console.error('Error deleting function:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
