import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/shared/lib/prisma'
import { getCurrentUserOrEmployee } from '@/shared/lib/auth'

// Get accessible department IDs based on user's role
async function getAccessibleDepartmentIds(auth: any): Promise<string[] | null> {
  if (auth.type === 'user') {
    const user = auth.data as any

    if (user.role === 'ADMIN') {
      return null // Admins can see all
    }

    if (user.roleId) {
      const userWithRole = await prisma.user.findUnique({
        where: { id: user.id },
        include: {
          assignedRole: {
            include: {
              departments: {
                select: { departmentId: true }
              }
            }
          }
        }
      })

      if (userWithRole?.assignedRole?.departments.length) {
        return userWithRole.assignedRole.departments.map(d => d.departmentId)
      }
    }
    
    return null
  } else {
    const employee = auth.data as any
    
    const employeeRoles = await prisma.employeeRole.findMany({
      where: { employeeId: employee.id },
      include: {
        role: {
          include: {
            departments: {
              select: { departmentId: true }
            }
          }
        }
      }
    })

    const departmentSet = new Set<string>()
    let hasUnrestrictedRole = false

    for (const er of employeeRoles) {
      if (er.role.departments.length === 0) {
        hasUnrestrictedRole = true
        break
      }
      for (const d of er.role.departments) {
        departmentSet.add(d.departmentId)
      }
    }

    return hasUnrestrictedRole ? null : Array.from(departmentSet)
  }
}

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

    // Get accessible departments for the user
    const accessibleDepartmentIds = await getAccessibleDepartmentIds(auth)

    // Build where clause
    const whereClause: any = {
      category: {
        businessId: businessId
      }
    }

    // If user has department restrictions, filter functions by categories linked to those departments
    if (accessibleDepartmentIds !== null) {
      if (accessibleDepartmentIds.length === 0) {
        // User has role but no departments assigned - return empty
        return NextResponse.json([])
      }
      // Filter functions whose categories are linked to accessible departments or are business-wide
      whereClause.category.OR = [
        {
          departments: {
            some: {
              departmentId: { in: accessibleDepartmentIds }
            }
          }
        },
        {
          departments: {
            none: {}
          }
        }
      ]
    }

    const functions = await prisma.departmentFunction.findMany({
      where: whereClause,
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
        employeeGroups: {
          select: {
            id: true,
            name: true
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
    const hasEmployeeGroupPayload = Object.prototype.hasOwnProperty.call(body, 'employeeGroupIds')
    if (hasEmployeeGroupPayload && !Array.isArray(body.employeeGroupIds)) {
      return NextResponse.json({ error: 'employeeGroupIds must be an array' }, { status: 400 })
    }

    const employeeGroupIds: string[] = hasEmployeeGroupPayload
      ? (body.employeeGroupIds as string[]).filter((id) => typeof id === 'string' && id.trim().length > 0)
      : []

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

    const uniqueEmployeeGroupIds = Array.from(new Set(employeeGroupIds))

    if (uniqueEmployeeGroupIds.length > 0) {
      const validGroups = await prisma.employeeGroup.findMany({
        where: {
          id: { in: uniqueEmployeeGroupIds },
          businessId
        },
        select: { id: true }
      })

      if (validGroups.length !== uniqueEmployeeGroupIds.length) {
        return NextResponse.json({ error: 'One or more employee groups could not be found' }, { status: 404 })
      }
    }

    const functionItem = await prisma.departmentFunction.create({
      data: {
        name,
        color,
        categoryId,
        ...(uniqueEmployeeGroupIds.length > 0
          ? {
              employeeGroups: {
                connect: uniqueEmployeeGroupIds.map((groupId) => ({ id: groupId }))
              }
            }
          : {})
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
        },
        employeeGroups: {
          select: {
            id: true,
            name: true
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
