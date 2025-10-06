import { NextResponse } from 'next/server'
import { prisma } from '@/shared/lib/prisma'
import { getCurrentUser } from '@/shared/lib/auth'

export async function GET() {
  try {
    const currentUser = await getCurrentUser()
    
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get all employees in the business
    const allEmployees = await prisma.employee.findMany({
      where: {
        user: {
          businessId: currentUser.businessId
        }
      },
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

    const contractsExpiringThisMonth = await prisma.contract.findMany({
      where: {
        businessId: currentUser.businessId,
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
        businessId: currentUser.businessId,
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
