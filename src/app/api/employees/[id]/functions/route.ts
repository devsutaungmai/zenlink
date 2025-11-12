import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/shared/lib/prisma'
import { getCurrentUserOrEmployee } from '@/shared/lib/auth'

// GET /api/employees/[id]/functions - Get all functions for an employee
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

    const employee = await prisma.employee.findFirst({
      where: {
        id,
        department: {
          businessId: businessId
        }
      }
    })

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }

    const employeeFunctions = await prisma.employeeFunction.findMany({
      where: {
        employeeId: id
      },
      include: {
        function: {
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
        }
      }
    })

    return NextResponse.json(employeeFunctions)
  } catch (error) {
    console.error('Error fetching employee functions:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/employees/[id]/functions - Assign a function to an employee
export async function POST(
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
    const { functionId } = body

    if (!functionId) {
      return NextResponse.json({ error: 'Function ID is required' }, { status: 400 })
    }

    const employee = await prisma.employee.findFirst({
      where: {
        id,
        department: {
          businessId: businessId
        }
      }
    })

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }

    const functionItem = await prisma.departmentFunction.findFirst({
      where: {
        id: functionId,
        category: {
          department: {
            businessId: businessId
          }
        }
      }
    })

    if (!functionItem) {
      return NextResponse.json({ error: 'Function not found' }, { status: 404 })
    }

    const employeeFunction = await prisma.employeeFunction.create({
      data: {
        employeeId: id,
        functionId
      },
      include: {
        function: {
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
        }
      }
    })

    return NextResponse.json(employeeFunction, { status: 201 })
  } catch (error: any) {
    console.error('Error assigning function to employee:', error)
    
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Employee already has this function' }, { status: 409 })
    }
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/employees/[id]/functions - Remove a function from an employee
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

    const { searchParams } = new URL(request.url)
    const functionId = searchParams.get('functionId')

    if (!functionId) {
      return NextResponse.json({ error: 'Function ID is required' }, { status: 400 })
    }

    const employee = await prisma.employee.findFirst({
      where: {
        id,
        department: {
          businessId: businessId
        }
      }
    })

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }

    const employeeFunction = await prisma.employeeFunction.findFirst({
      where: {
        employeeId: id,
        functionId
      }
    })

    if (!employeeFunction) {
      return NextResponse.json({ error: 'Employee function assignment not found' }, { status: 404 })
    }

    await prisma.employeeFunction.delete({
      where: {
        id: employeeFunction.id
      }
    })

    return NextResponse.json({ message: 'Function removed from employee successfully' })
  } catch (error) {
    console.error('Error removing function from employee:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
