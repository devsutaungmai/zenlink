import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/shared/lib/prisma'
import { getCurrentUserOrEmployee } from '@/shared/lib/auth'

// GET /api/categories - Get all categories for the business
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

    const categories = await prisma.departmentCategory.findMany({
      where: {
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
      },
      orderBy: {
        name: 'asc'
      }
    })

    return NextResponse.json(categories)
  } catch (error) {
    console.error('Error fetching categories:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/categories - Create a new category
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
    const { name, description, color, departmentIds } = body

    console.log('Creating category with data:', { name, description, color, departmentIds, businessId })

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
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

    // Create category with departments
    const category = await prisma.departmentCategory.create({
      data: {
        name,
        description,
        color,
        businessId,
        departments: departmentIds && departmentIds.length > 0 ? {
          create: departmentIds.map((deptId: string) => ({
            department: {
              connect: { id: deptId }
            }
          }))
        } : undefined
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

    return NextResponse.json(category, { status: 201 })
  } catch (error: any) {
    console.error('Error creating category:', error)
    
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Category name already exists in this business' }, { status: 409 })
    }
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
