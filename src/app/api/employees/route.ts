import { NextResponse } from 'next/server'
import { prisma } from '@/shared/lib/prisma'
import { getCurrentUserOrEmployee, getCurrentUser } from '@/shared/lib/auth'

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

export async function GET(request: Request) {
  try {
    const auth = await getCurrentUserOrEmployee()
    if (!auth) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const search = searchParams.get('search')

    let businessId: string
    if (auth.type === 'user') {
      businessId = (auth.data as any).businessId
    } else {
      businessId = (auth.data as any).user.businessId
    }

    const accessibleDepartmentIds = await getAccessibleDepartmentIds(auth)

    const whereClause: any = {
      user: {
        businessId: businessId
      }
    }

    if (accessibleDepartmentIds !== null && accessibleDepartmentIds.length > 0) {
      whereClause.OR = [
        { departmentId: { in: accessibleDepartmentIds } },
        { departments: { some: { departmentId: { in: accessibleDepartmentIds } } } }
      ]
    }

    if (userId) {
      whereClause.userId = userId
    }

    if (search && search.trim()) {
      const searchConditions = [
        { firstName: { contains: search.trim(), mode: 'insensitive' } },
        { lastName: { contains: search.trim(), mode: 'insensitive' } },
        { employeeNo: { contains: search.trim(), mode: 'insensitive' } },
        { email: { contains: search.trim(), mode: 'insensitive' } }
      ]

      if (whereClause.OR) {
        whereClause.AND = [
          { OR: whereClause.OR },
          { OR: searchConditions }
        ]
        delete whereClause.OR
      } else {
        whereClause.OR = searchConditions
      }
    }

    const skip = (page - 1) * limit

    const totalCount = await prisma.employee.count({ where: whereClause })

    const employees = await prisma.employee.findMany({
      where: whereClause,
      select: {
        id: true,
        userId: true,
        firstName: true,
        lastName: true,
        employeeNo: true,
        email: true,
        mobile: true,
        isTeamLeader: true,
        dateOfHire: true,
        createdAt: true,
        profilePhoto: true,
        salaryRate: true,
        employeeGroupId: true,
        departmentId: true,
        department: {
          select: {
            id: true,
            name: true,
            businessId: true
          }
        },
        employeeGroup: {
          select: {
            id: true,
            name: true
          }
        },
        departments: {
          select: {
            departmentId: true,
            isPrimary: true,
            department: {
              select: {
                id: true,
                name: true
              }
            }
          },
          orderBy: {
            isPrimary: 'desc'
          }
        },
        employeeGroups: {
          select: {
            employeeGroupId: true,
            isPrimary: true,
            employeeGroup: {
              select: {
                id: true,
                name: true
              }
            }
          },
          orderBy: {
            isPrimary: 'desc'
          }
        },
        employeeRoles: {
          select: {
            roleId: true,
            role: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip,
      take: limit
    })

    return NextResponse.json(employees, {
      headers: {
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
        'X-Total-Count': totalCount.toString(),
        'X-Page': page.toString(),
        'X-Per-Page': limit.toString(),
        'X-Total-Pages': Math.ceil(totalCount / limit).toString()
      }
    })
  } catch (error) {
    console.error('Failed to fetch employees:', error)
    return NextResponse.json(
      { error: 'Failed to fetch employees' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser()
    
    if (!currentUser || currentUser.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 401 }
      )
    }

    const data = await request.json()
    const requiredFields = ['firstName', 'lastName', 'departmentId']
    const missingFields = requiredFields.filter(field => !data[field])
    
    if (missingFields.length > 0) {
      return NextResponse.json(
        { 
          error: 'Missing required fields',
          missingFields 
        },
        { status: 400 }
      )
    }

    // Generate employee number if not provided
    let employeeNo = data.employeeNo
    if (!employeeNo) {
      const employeeCount = await prisma.employee.count({
        where: {
          user: {
            businessId: currentUser.businessId
          }
        }
      })

      let nextNumber = employeeCount + 1
      employeeNo = nextNumber.toString()

      let attempts = 0
      while (attempts < 100) {
        const existingEmployee = await prisma.employee.findFirst({
          where: {
            employeeNo,
            user: {
              businessId: currentUser.businessId
            }
          }
        })

        if (!existingEmployee) {
          break
        }

        nextNumber++
        employeeNo = nextNumber.toString()
        attempts++
      }

      if (attempts >= 100) {
        return NextResponse.json(
          { error: 'Unable to generate unique employee number' },
          { status: 500 }
        )
      }
    }

    let userEmail = `employee.${employeeNo}@company.local`
    let emailSuffix = 0
    
    while (true) {
      const existingUser = await prisma.user.findUnique({
        where: { email: userEmail }
      })
      
      if (!existingUser) break
      
      emailSuffix++
      userEmail = `employee.${employeeNo}.${emailSuffix}@company.local`
    }

    let roleIdsToAssign = data.roleIds
    if (!roleIdsToAssign || !Array.isArray(roleIdsToAssign) || roleIdsToAssign.length === 0) {
      const defaultEmployeeRole = await prisma.role.findFirst({
        where: {
          businessId: currentUser.businessId,
          name: 'Employee',
          isDefault: true
        }
      })
      
      if (defaultEmployeeRole) {
        roleIdsToAssign = [defaultEmployeeRole.id]
      }
    }

    const employeeUser = await prisma.user.create({
      data: {
        email: userEmail,
        password: '',
        firstName: data.firstName,
        lastName: data.lastName,
        role: 'EMPLOYEE',
        businessId: currentUser.businessId,
        pin: null, // No PIN set initially
      }
    })

    const employee = await prisma.employee.create({
      data: {
        userId: employeeUser.id, // Use the new employee user ID
        firstName: data.firstName,
        lastName: data.lastName,
        birthday: new Date(data.birthday),
        dateOfHire: new Date(data.dateOfHire),
        socialSecurityNo: data.socialSecurityNo,
        address: data.address,
        mobile: data.mobile,
        sex: data.sex,
        employeeNo: employeeNo,
        bankAccount: data.bankAccount,
        hoursPerMonth: parseFloat(data.hoursPerMonth) || 0,
        isTeamLeader: Boolean(data.isTeamLeader),
        departmentId: Array.isArray(data.departmentIds) ? data.departmentIds[0] : data.departmentId,
        employeeGroupId: Array.isArray(data.employeeGroupIds) ? data.employeeGroupIds[0] : (data.employeeGroupId || null),
        email: (!data.email || data.email === '') ? null : data.email, // Convert empty emails to null
        profilePhoto: data.profilePhoto || null,
        salaryRate: data.salaryRate ? parseFloat(data.salaryRate) : null,
        departments: {
          create: Array.isArray(data.departmentIds) 
            ? data.departmentIds.map((deptId: string, index: number) => ({
                departmentId: deptId,
                isPrimary: index === 0
              }))
            : [{ departmentId: data.departmentId, isPrimary: true }]
        },
        employeeGroups: data.employeeGroupIds && Array.isArray(data.employeeGroupIds) && data.employeeGroupIds.length > 0
          ? {
              create: data.employeeGroupIds.map((groupId: string, index: number) => ({
                employeeGroupId: groupId,
                isPrimary: index === 0
              }))
            }
          : data.employeeGroupId 
            ? { create: [{ employeeGroupId: data.employeeGroupId, isPrimary: true }] }
            : undefined,
        employeeRoles: roleIdsToAssign && Array.isArray(roleIdsToAssign) && roleIdsToAssign.length > 0
          ? {
              create: roleIdsToAssign.map((roleId: string, index: number) => ({
                roleId: roleId,
                isPrimary: index === 0
              }))
            }
          : undefined
      },
      include: {
        department: true,
        employeeGroup: true,
        departments: {
          include: {
            department: true
          }
        },
        employeeGroups: {
          include: {
            employeeGroup: true
          }
        },
        employeeRoles: {
          include: {
            role: true
          }
        }
      }
    })

    return NextResponse.json(employee, { status: 201 })

  } catch (error: any) {
    console.error('Create employee error:', error)
    console.error('Error details:', {
      code: error.code,
      meta: error.meta,
      message: error.message
    })
    
    if (error.code === 'P2002') {
      let errorMessage = 'Validation error'
      if (error.meta?.target?.includes('employeeNo')) {
        errorMessage = 'Employee number already exists'
      } else if (error.meta?.target?.includes('socialSecurityNo')) {
        errorMessage = 'Social security number already in use'
      } else if (error.meta?.target?.includes('email')) {
        // Check if it's User table or Employee table
        if (error.meta?.modelName === 'User') {
          errorMessage = 'Internal system email conflict (this should not happen - please contact support)'
        } else {
          errorMessage = 'Email address already in use'
        }
      }
      
      return NextResponse.json(
        { error: errorMessage },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to create employee',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}
