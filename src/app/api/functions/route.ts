import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/shared/lib/prisma'
import { getCurrentUserOrEmployee } from '@/shared/lib/auth'

// GET /api/functions - Get all functions for the business
export async function GET(request: NextRequest) {
  try {
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

    const functions = await prisma.departmentFunction.findMany({
      where: {
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
      },
      orderBy: {
        name: 'asc'
      }
    })

    return NextResponse.json(functions)
  } catch (error) {
    console.error('Error fetching functions:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/functions - Create a new function
export async function POST(request: NextRequest) {
  try {
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

    console.log('Creating function with data:', { name, color, categoryId, businessId })

    if (!name || !categoryId) {
      return NextResponse.json({ error: 'Name and category are required' }, { status: 400 })
    }

    const category = await prisma.departmentCategory.findFirst({
      where: {
        id: categoryId,
        businessId: businessId
      }
    })

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }

    const functionItem = await prisma.departmentFunction.create({
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

    return NextResponse.json(functionItem, { status: 201 })
  } catch (error: any) {
    console.error('Error creating function:', error)
    
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Function name already exists in this category' }, { status: 409 })
    }
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
