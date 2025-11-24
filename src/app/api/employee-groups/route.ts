import { NextResponse } from 'next/server'
import { prisma } from '@/shared/lib/prisma'
import { requireAuth, getCurrentUserOrEmployee } from '@/shared/lib/auth'

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
    
    const employeeGroups = await prisma.employeeGroup.findMany({
      where: {
        businessId: businessId
      },
      include: {
        function: {
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
          select: { employees: true }
        }
      }
    })
    return NextResponse.json(employeeGroups)
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

    if (!data.functionId) {
      return NextResponse.json(
        { error: 'Function is required' },
        { status: 400 }
      )
    }

    const targetFunction = await prisma.departmentFunction.findFirst({
      where: {
        id: data.functionId,
        category: {
          businessId: user.businessId
        }
      },
      include: {
        category: {
          select: { id: true, name: true }
        }
      }
    })

    if (!targetFunction) {
      return NextResponse.json(
        { error: 'Function not found for this business' },
        { status: 404 }
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
        },
        function: {
          connect: { id: data.functionId }
        }
      },
      include: {
        function: {
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
    return NextResponse.json(
      { error: 'Failed to create employee group', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
