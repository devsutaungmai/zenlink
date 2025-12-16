import { NextResponse } from 'next/server'
import { prisma } from '@/shared/lib/prisma'
import { requireAuth, getCurrentUserOrEmployee } from '@/shared/lib/auth'

async function getAccessibleDepartmentIds(auth: any): Promise<string[] | null> {
  if (auth.type === 'user') {
    const user = auth.data as any

    if (user.role === 'ADMIN') {
      return null
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
      businessId = (auth.data as any).department.businessId
    }

    // Get accessible departments for the user
    const accessibleDepartmentIds = await getAccessibleDepartmentIds(auth)

    // Build where clause with department filtering
    const whereClause: any = {
      businessId: businessId
    }

    // If user has department restrictions, filter by those departments
    if (accessibleDepartmentIds !== null) {
      if (accessibleDepartmentIds.length === 0) {
        // User has role but no departments assigned - return empty
        return NextResponse.json([])
      }
      whereClause.id = { in: accessibleDepartmentIds }
    }
    
    const departments = await prisma.department.findMany({
      where: whereClause,
      include: {
        _count: {
          select: { employees: true }
        }
      }
    })
    return NextResponse.json(departments)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch departments' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    console.log('Starting department creation...')
    
    const user = await requireAuth()
    console.log('User authenticated:', user?.id, 'businessId:', user?.businessId)
    
    if (!user.businessId) {
      return NextResponse.json({ 
        error: 'User has no business ID' 
      }, { status: 400 })
    }
    
    const data = await req.json()
    console.log('Request data:', data)
    
    if (!data.name || !data.address || !data.city || !data.phone || !data.country) {
      return NextResponse.json({ 
        error: 'Missing required fields: name, address, city, phone, country' 
      }, { status: 400 })
    }
    
    const departmentData = {
      name: data.name,
      number: data.number || null,
      address: data.address,
      address2: data.address2 || null,
      postCode: data.postCode || null,
      city: data.city,
      phone: data.phone,
      country: data.country,
      businessId: user.businessId
    }
    
    console.log('Creating department with:', departmentData)
    
    const department = await prisma.department.create({
      data: departmentData
    })
    
    console.log('Department created successfully:', department.id)
    return NextResponse.json(department)
  } catch (error) {
    console.error('Error creating department:', error)
    
    // Handle Prisma specific errors
    if (error && typeof error === 'object' && 'code' in error) {
      const prismaError = error as any
      if (prismaError.code === 'P2002') {
        return NextResponse.json({ 
          error: 'A department with this information already exists' 
        }, { status: 400 })
      }
    }
    
    return NextResponse.json({ 
      error: 'Failed to create department',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
