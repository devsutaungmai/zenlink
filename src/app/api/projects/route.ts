import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/shared/lib/prisma'
import { getCurrentUserOrEmployee, requireAuth } from '@/shared/lib/auth'

// GET /api/projects - Get all projects
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

    const categories = await prisma.project.findMany({
      where: {
        businessId: businessId
      },
      include:{
        customer: true,
      },
      orderBy: {
        name: 'asc',
      }
    })

    return NextResponse.json(categories)
  } catch (error) {
    console.error('Error fetching categories:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/projects - Create a new project
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
      // For employees, get businessId from their department
      businessId = (auth.data as any).department.businessId
    }

    const formData = await request.json()
    const { name, projectNumber,customerId } = formData

    console.log('Creating project with data:', JSON.stringify(formData))

    if (!name || !projectNumber) {
      return NextResponse.json({ error: 'Name and ProjectNumber are required' }, { status: 400 })
    }

    if(!customerId){
      return NextResponse.json({ error: 'CustomerId is required' }, { status: 400 })
    }
    
    const customer = await prisma.customer.findFirst({
      where: {
        id: customerId,
        businessId: businessId
      }
    })

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }
    
    const departmentIdofCustomer = customer.departmentId;

    const project = await prisma.project.create({
      data: {...formData, 
        businessId,startDate: formData.startDate ? new Date(formData.startDate): null, 
        endDate: formData.endDate ? new Date(formData.endDate) : null,
        departmentId: departmentIdofCustomer
      }
    })

    return NextResponse.json(project, { status: 201 })
    
  } catch (error: any) {
    console.error('Error creating project:', error)
    
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Project number already exists' }, { status: 409 })
    }
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
