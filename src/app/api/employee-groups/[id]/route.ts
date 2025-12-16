import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/shared/lib/prisma'
import { requireAuth } from '@/shared/lib/auth'

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth()
    const { id } = await context.params
    
    const employeeGroup = await prisma.employeeGroup.findUnique({
      where: { 
        id,
        businessId: user.businessId
      },
      include: {
        employees: true,
        employeesMulti: {
          include: {
            employee: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                employeeNo: true,
                email: true
              }
            }
          }
        },
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
    
    if (!employeeGroup) {
      return NextResponse.json(
        { error: 'Employee group not found' }, 
        { status: 404 }
      )
    }
    
    // Transform the response to use consistent _count.employees key
    const transformedGroup = {
      ...employeeGroup,
      _count: {
        employees: employeeGroup._count.employeesMulti
      }
    }
    
    return NextResponse.json(transformedGroup)
  } catch (error) {
    console.error('GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch employee group' }, 
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const { id } = await context.params
    const rawData = await request.json()

    if (!rawData.name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      )
    }

    const data: any = {
      name: rawData.name,
      hourlyWage: parseFloat(rawData.hourlyWage) || 0,
      wagePerShift: parseFloat(rawData.wagePerShift) || 0,
      defaultWageType: rawData.defaultWageType,
      salaryCode: rawData.salaryCode || null,
    }

    // function linkage is now managed via the functions <-> employee groups junction table
    
    const employeeGroup = await prisma.employeeGroup.update({
      where: { 
        id,
        businessId: user.businessId
      },
      data,
      include: {
        employees: true,
        employeesMulti: {
          include: {
            employee: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                employeeNo: true,
                email: true
              }
            }
          }
        },
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
    
    // Transform the response to use consistent _count.employees key
    const transformedGroup = {
      ...employeeGroup,
      _count: {
        employees: employeeGroup._count.employeesMulti
      }
    }
    
    return NextResponse.json(transformedGroup)
  } catch (error: any) {
    console.error('Update error:', error)
    
    // Handle unique constraint violations
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Employee group with this name already exists' },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to update employee group' }, 
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const { id } = await context.params
    
    // Check if employee group has any employees first (check both old and new relations)
    const employeeGroup = await prisma.employeeGroup.findUnique({
      where: { 
        id,
        businessId: user.businessId
      },
      include: {
        _count: {
          select: { employees: true, employeesMulti: true }
        }
      }
    })
    
    if (!employeeGroup) {
      return NextResponse.json(
        { error: 'Employee group not found' },
        { status: 404 }
      )
    }
    
    // Check both old and new relations for assigned employees
    if (employeeGroup._count.employees > 0 || employeeGroup._count.employeesMulti > 0) {
      return NextResponse.json(
        { error: 'Cannot delete employee group with assigned employees' },
        { status: 400 }
      )
    }
    
    await prisma.employeeGroup.delete({
      where: { 
        id,
        businessId: user.businessId
      }
    })
    
    return NextResponse.json(
      { message: 'Employee group deleted successfully' }
    )
  } catch (error: any) {
    console.error('Delete error:', error)
    
    // Handle foreign key constraint violations
    if (error.code === 'P2003') {
      return NextResponse.json(
        { error: 'Cannot delete employee group with assigned employees' },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to delete employee group' }, 
      { status: 500 }
    )
  }
}
