import { NextResponse } from 'next/server'
import { prisma } from '@/app/lib/prisma'
import { getCurrentUserOrEmployee, getCurrentUser } from '@/lib/auth'

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

    const employees = await prisma.employee.findMany({
      where: {
        user: {
          businessId: businessId
        }
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        employeeNo: true,
        email: true,
        mobile: true,
        isTeamLeader: true,
        dateOfHire: true,
        createdAt: true,
        department: {
          select: {
            id: true,
            name: true
          }
        },
        employeeGroup: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json(employees)
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
      // Find the highest existing employee number for this business
      const lastEmployee = await prisma.employee.findFirst({
        where: {
          user: {
            businessId: currentUser.businessId
          }
        },
        orderBy: {
          employeeNo: 'desc'
        },
        select: {
          employeeNo: true
        }
      })

      let nextNumber = 1
      
      if (lastEmployee?.employeeNo) {
        // Try to parse the employee number as an integer
        const lastNumber = parseInt(lastEmployee.employeeNo, 10)
        
        if (!isNaN(lastNumber)) {
          // If it's a valid number, increment it
          nextNumber = lastNumber + 1
        } else {
          // If it's not a number, find the highest numeric employee number
          const employees = await prisma.employee.findMany({
            where: {
              user: {
                businessId: currentUser.businessId
              }
            },
            select: {
              employeeNo: true
            }
          })

          let highestNumber = 0
          employees.forEach(emp => {
            if (emp.employeeNo) {
              const num = parseInt(emp.employeeNo, 10)
              if (!isNaN(num) && num > highestNumber) {
                highestNumber = num
              }
            }
          })

          nextNumber = highestNumber + 1
        }
      }

      employeeNo = nextNumber.toString()

      // Ensure the generated number is unique
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

    // Create a separate User record for the employee
    const employeeUser = await prisma.user.create({
      data: {
        email: `employee.${employeeNo}@company.local`,
        password: '', // Temporary empty password, will be set when employee registers
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
        departmentId: data.departmentId,
        employeeGroupId: data.employeeGroupId || null,
      },
      include: {
        department: true,
        employeeGroup: true
      }
    })

    return NextResponse.json(employee, { status: 201 })

  } catch (error: any) {
    console.error('Create employee error:', error)
    
    if (error.code === 'P2002') {
      let errorMessage = 'Validation error'
      if (error.meta?.target?.includes('employeeNo')) {
        errorMessage = 'Employee number already exists'
      } else if (error.meta?.target?.includes('socialSecurityNo')) {
        errorMessage = 'Social security number already in use'
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
