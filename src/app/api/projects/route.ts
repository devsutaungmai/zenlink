import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/shared/lib/prisma'
import { getCurrentUserOrEmployee, requireAuth } from '@/shared/lib/auth'
import { de } from 'date-fns/locale'

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
      include: {
        customer: true,
        category: true
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
    let userDepartmentId: string | null = null
    
    if (auth.type === 'user') {
      businessId = (auth.data as any).businessId
      userDepartmentId = (auth.data as any).departmentId ?? null
    } else {
      // For employees, get businessId and departmentId from their department
      businessId = (auth.data as any).department.businessId
      userDepartmentId = (auth.data as any).departmentId ?? null
    }

    const formData = await request.json()
    const { name, projectNumber, customerId, categoryId, startDate, endDate,active ,defaultProjectNumber,sequence,year} = formData

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

     if (!defaultProjectNumber && !projectNumber) {
      return NextResponse.json({ error: 'Project Number is required' }, { status: 400 })
    }

    const refinedCustomerId = customerId || null
    let departmentIdForProject: string | null = null

    if (customerId) {
      // If customer is provided, use the customer's department
      const customer = await prisma.customer.findFirst({
        where: {
          id: customerId,
          businessId: businessId
        }
      })

      if (!customer) {
        return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
      }

      departmentIdForProject = customer.departmentId ?? null
    } else if (userDepartmentId) {
      // If no customer but user has a department, use that
      departmentIdForProject = userDepartmentId
    } else {
      // Try to get a default department for this business
      const defaultDepartment = await prisma.department.findFirst({
        where: { businessId }
      })
      
      departmentIdForProject = defaultDepartment?.id ?? null
    }

    const project = await prisma.project.create({
      data: {
        name,
        projectNumber: defaultProjectNumber ? defaultProjectNumber : projectNumber,
        businessId,
        categoryId: categoryId || null,
        customerId: refinedCustomerId,
        departmentId: departmentIdForProject,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        active: active,
        sequence: sequence || 0,
        year: year || new Date().getFullYear()
      }
    })

    return NextResponse.json(project, { status: 201 })

  } catch (error: any) {
    console.error('Error creating project:', error)

     if (error.code === 'P2002') {
      const target = error.meta?.target
      const targets = Array.isArray(target) ? target.map(String).join(',').toLowerCase() : String(target || '').toLowerCase()

      if (targets.includes('projectnumber') || targets.includes('project_number')) {
      return NextResponse.json({ error: 'Project number already exists!' }, { status: 409 })
      }
      if (targets.includes('projectname') || targets.includes('project_name')) {
      return NextResponse.json({ error: 'Project name already exists!' }, { status: 409 })
      }

      return NextResponse.json({ error: 'Unique constraint failed' }, { status: 409 })
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
