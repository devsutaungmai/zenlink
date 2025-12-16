import { NextResponse } from 'next/server'
import { prisma } from '@/shared/lib/prisma'
import { requireAuth, getCurrentUserOrEmployee } from '@/shared/lib/auth'

async function getAccessibleEmployeeGroupIds(auth: any): Promise<string[] | null> {
  if (auth.type === 'user') {
    const user = auth.data as any

    if (user.role === 'ADMIN') {
      return null // Admins can see all
    }

    const employee = await prisma.employee.findFirst({
      where: { userId: user.id },
      include: {
        employeeGroups: {
          select: { employeeGroupId: true }
        }
      }
    })

    if (employee?.employeeGroups.length) {
      return employee.employeeGroups.map(eg => eg.employeeGroupId)
    }
    
    // If user has no employee or no employee groups assigned, they can see all
    return null
  } else {
    // For employees, get their assigned employee groups
    const employee = auth.data as any
    
    const employeeWithGroups = await prisma.employee.findUnique({
      where: { id: employee.id },
      include: {
        employeeGroups: {
          select: { employeeGroupId: true }
        }
      }
    })

    if (employeeWithGroups?.employeeGroups.length) {
      return employeeWithGroups.employeeGroups.map(eg => eg.employeeGroupId)
    }

    // If employee has no groups assigned, return empty (they shouldn't see any)
    return []
  }
}

export async function GET() {
  try {
    const auth = await getCurrentUserOrEmployee()
    if (!auth) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    let businessId: string
    if (auth.type === 'user') {
      businessId = (auth.data as any).businessId
    } else {
      // For employees, get businessId from their department
      businessId = (auth.data as any).department.businessId
    }

    // Get accessible employee groups for the user
    const accessibleEmployeeGroupIds = await getAccessibleEmployeeGroupIds(auth)

    // Build where clause
    const whereClause: any = {
      businessId: businessId
    }

    // If user has employee group restrictions, filter by those groups
    if (accessibleEmployeeGroupIds !== null) {
      if (accessibleEmployeeGroupIds.length === 0) {
        // User/Employee has no employee groups assigned - return empty
        return NextResponse.json([])
      }
      whereClause.id = { in: accessibleEmployeeGroupIds }
    }
    
    const employeeGroups = await prisma.employeeGroup.findMany({
      where: whereClause,
      include: {
        functions: {
          select: {
            id: true,
            name: true,
            color: true,
            category: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        _count: {
          select: { employeesMulti: true }
        }
      }
    })
    
    // Transform the response to use a consistent _count.employees key
    const transformedGroups = employeeGroups.map(group => ({
      ...group,
      _count: {
        employees: group._count.employeesMulti
      }
    }))
    
    return NextResponse.json(transformedGroups)
  } catch (error: any) {
    console.error('Detailed error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch employee groups',
        details: error.message,
        code: error.code
      },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth()
    const data = await request.json()
    
    if (!data.name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      )
    }

    const employeeGroup = await prisma.employeeGroup.create({
      data: {
        name: data.name,
        hourlyWage: data.hourlyWage || 0,
        wagePerShift: data.wagePerShift || 0,
        defaultWageType: data.defaultWageType || 'HOURLY',
        salaryCode: data.salaryCode || null,
        business: {
          connect: { id: user.businessId }
        }
      },
      include: {
        functions: {
          select: {
            id: true,
            name: true,
            color: true,
            category: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    })

    return NextResponse.json(employeeGroup)
  } catch (error) {
    console.error('Failed to create employee group:', error)
    return NextResponse.json(
      { error: 'Failed to create employee group', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
