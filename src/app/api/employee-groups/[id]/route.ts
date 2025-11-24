import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/shared/lib/prisma'
import { requireAuth } from '@/shared/lib/auth'

export async function GET(request: NextRequest, context: { params: { id: string } }) {
  try {
    const user = await requireAuth()
    const { id } = context.params
    
    const employeeGroup = await prisma.employeeGroup.findUnique({
      where: { 
        id,
        businessId: user.businessId
      },
      include: {
        employees: true,
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
    
    if (!employeeGroup) {
      return NextResponse.json(
        { error: 'Employee group not found' }, 
        { status: 404 }
      )
    }
    
    return NextResponse.json(employeeGroup)
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
  context: { params: { id: string } }
) {
  try {
    const user = await requireAuth()
    const { id } = context.params
    const rawData = await request.json()

    if (!rawData.name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      )
    }

    if (!rawData.functionId) {
      return NextResponse.json(
        { error: 'Function is required' },
        { status: 400 }
      )
    }

    const targetFunction = await prisma.departmentFunction.findFirst({
      where: {
        id: rawData.functionId,
        category: {
          businessId: user.businessId
        }
      },
      include: {
        category: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    if (!targetFunction) {
      return NextResponse.json(
        { error: 'Function not found for this business' },
        { status: 404 }
      )
    }

    const data = {
      name: rawData.name,
      hourlyWage: parseFloat(rawData.hourlyWage) || 0,
      wagePerShift: parseFloat(rawData.wagePerShift) || 0,
      defaultWageType: rawData.defaultWageType,
      salaryCode: rawData.salaryCode || null,
      function: {
        connect: { id: rawData.functionId }
      }
    }
    
    const employeeGroup = await prisma.employeeGroup.update({
      where: { 
        id,
        businessId: user.businessId
      },
      data,
      include: {
        employees: true,
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
    
    return NextResponse.json(employeeGroup)
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
  context: { params: { id: string } }
) {
  try {
    const user = await requireAuth()
    const { id } = context.params
    
    // Check if employee group has any employees first
    const employeeGroup = await prisma.employeeGroup.findUnique({
      where: { 
        id,
        businessId: user.businessId
      },
      include: {
        _count: {
          select: { employees: true }
        }
      }
    })
    
    if (!employeeGroup) {
      return NextResponse.json(
        { error: 'Employee group not found' },
        { status: 404 }
      )
    }
    
    if (employeeGroup._count.employees > 0) {
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
