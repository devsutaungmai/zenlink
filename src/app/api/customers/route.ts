import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/shared/lib/prisma'
import { getCurrentUserOrEmployee, requireAuth } from '@/shared/lib/auth'

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
      // For employees, get businessId from their department
      businessId = (auth.data as any).department.businessId
    }

    const categories = await prisma.customer.findMany({
      where: {
        businessId: businessId
      },
      orderBy: {
        customerName: 'asc',
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
    const user = await requireAuth()
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

    const formData = await request.json()
    const { customerName, customerNumber } = formData

    console.log('Creating customer with data:', JSON.stringify(formData))

    if (!customerName || !customerNumber) {
      return NextResponse.json({ error: 'CustomerName and CustomerNumber are required' }, { status: 400 })
    }

    const category = await prisma.customer.create({
      data: {
        ...formData,
        businessId
      }
    })

    return NextResponse.json(category, { status: 201 })
  } catch (error: any) {
    console.error('Error creating customer:', error)

    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Customer name already exists in this department' }, { status: 409 })
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
