import { NextResponse } from 'next/server'
import { prisma } from '@/shared/lib/prisma'
import { getCurrentUserOrEmployee } from '@/shared/lib/auth'

// Get accessible department IDs based on user's role
async function getAccessibleDepartmentIds(auth: any): Promise<string[] | null> {
  if (auth.type === 'user') {
    const user = auth.data as any

    if (user.role === 'ADMIN') {
      return null // Admins can see all
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
      businessId = (auth.data as any).user.businessId
    }

    // Get accessible department IDs
    const accessibleDepartmentIds = await getAccessibleDepartmentIds(auth)

    // Build employee where clause with department filtering
    const employeeWhereClause: any = {
      user: {
        businessId: businessId
      }
    }

    // If user has department restrictions, filter employees
    if (accessibleDepartmentIds !== null && accessibleDepartmentIds.length > 0) {
      employeeWhereClause.OR = [
        { departmentId: { in: accessibleDepartmentIds } },
        { departments: { some: { departmentId: { in: accessibleDepartmentIds } } } }
      ]
    }

    // Get all employees in the business (filtered by accessible departments)
    const allEmployees = await prisma.employee.findMany({
      where: employeeWhereClause,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        employeeNo: true,
        email: true,
        department: {
          select: {
            name: true
          }
        },
        employeeGroup: {
          select: {
            name: true
          }
        },
        contracts: {
          select: {
            id: true,
            startDate: true,
            endDate: true
          }
        }
      }
    })

    const currentDate = new Date()
    const employeesWithContracts = allEmployees.filter(employee => 
      employee.contracts.length > 0
    )

    // Employees without any contracts at all
    const employeesWithoutContracts = allEmployees.filter(employee => 
      employee.contracts.length === 0
    )

    const employeesWithActiveContracts = allEmployees.filter(employee => 
      employee.contracts.some(contract => {
        const startDate = new Date(contract.startDate)
        const endDate = contract.endDate ? new Date(contract.endDate) : null

        return startDate <= currentDate && (!endDate || endDate >= currentDate)
      })
    )

    // Get contracts expiring this month
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59, 999)

    // Build contract where clause with department filtering
    const contractWhereBase: any = {
      businessId: businessId,
    }

    // If user has department restrictions, filter contracts by employee's department
    if (accessibleDepartmentIds !== null && accessibleDepartmentIds.length > 0) {
      contractWhereBase.employee = {
        OR: [
          { departmentId: { in: accessibleDepartmentIds } },
          { departments: { some: { departmentId: { in: accessibleDepartmentIds } } } }
        ]
      }
    }

    const contractsExpiringThisMonth = await prisma.contract.findMany({
      where: {
        ...contractWhereBase,
        endDate: {
          gte: startOfMonth,
          lte: endOfMonth
        }
      },
      include: {
        employee: {
          select: {
            firstName: true,
            lastName: true,
            employeeNo: true,
            department: {
              select: {
                name: true
              }
            }
          }
        },
        contractTemplate: {
          select: {
            name: true
          }
        }
      }
    })

    // Get expired contracts (ended before today)
    const expiredContracts = await prisma.contract.findMany({
      where: {
        ...contractWhereBase,
        endDate: {
          lt: currentDate
        }
      },
      include: {
        employee: {
          select: {
            firstName: true,
            lastName: true,
            employeeNo: true,
            department: {
              select: {
                name: true
              }
            }
          }
        },
        contractTemplate: {
          select: {
            name: true
          }
        }
      }
    })

    return NextResponse.json({
      totalEmployees: allEmployees.length,
      employeesWithContracts: employeesWithContracts.length,
      employeesWithActiveContracts: employeesWithActiveContracts.length,
      employeesWithoutContracts: employeesWithoutContracts.length,
      contractsExpiringThisMonth: contractsExpiringThisMonth.length,
      expiredContracts: expiredContracts.length,
      employeesMissingContracts: employeesWithoutContracts.map(emp => ({
        id: emp.id,
        firstName: emp.firstName,
        lastName: emp.lastName,
        employeeNo: emp.employeeNo,
        email: emp.email,
        department: emp.department,
        employeeGroup: emp.employeeGroup
      })),
      contractsExpiring: contractsExpiringThisMonth,
      contractsExpired: expiredContracts,
      debug: {
        allEmployeesCount: allEmployees.length,
        employeesWithAnyContract: employeesWithContracts.length,
        employeesWithActiveContract: employeesWithActiveContracts.length,
        employeesWithoutAnyContract: employeesWithoutContracts.length,
        employeeContractCounts: allEmployees.map(emp => ({
          name: `${emp.firstName} ${emp.lastName}`,
          contractCount: emp.contracts.length,
          contracts: emp.contracts.map(c => ({
            startDate: c.startDate,
            endDate: c.endDate
          }))
        }))
      }
    })
  } catch (error) {
    console.error('Failed to fetch contract statistics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch contract statistics' },
      { status: 500 }
    )
  }
}
