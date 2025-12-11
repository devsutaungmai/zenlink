import { NextResponse } from 'next/server'
import { prisma } from '@/shared/lib/prisma'
import { getCurrentUser } from '@/shared/lib/auth'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const currentUser = await getCurrentUser()
    
    if (!currentUser || currentUser.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 401 }
      )
    }

    const data = await request.json()
    const requiredFields = ['firstName', 'lastName', 'employeeNo', 'departmentId']
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

    // Get current employee to check if email is being changed
    const currentEmployee = await prisma.employee.findUnique({
      where: { id },
      include: { user: true }
    })

    if (!currentEmployee) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      )
    }

    // Check if email is already in use by another user (if email is being changed)
    if (data.email && data.email !== currentEmployee.email) {
      const existingUserWithEmail = await prisma.user.findUnique({
        where: { email: data.email }
      })

      if (existingUserWithEmail && existingUserWithEmail.id !== currentEmployee.userId) {
        return NextResponse.json(
          { error: 'Email is already in use by another user' },
          { status: 400 }
        )
      }

      const existingEmployeeWithEmail = await prisma.employee.findUnique({
        where: { email: data.email }
      })

      if (existingEmployeeWithEmail && existingEmployeeWithEmail.id !== currentEmployee.id) {
        return NextResponse.json(
          { error: 'Email is already in use by another employee' },
          { status: 400 }
        )
      }
    }

    // Update employee and user in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Handle department and employee group updates
      const departmentIds = Array.isArray(data.departmentIds) ? data.departmentIds : [data.departmentId]
      const employeeGroupIds = data.employeeGroupIds && Array.isArray(data.employeeGroupIds) && data.employeeGroupIds.length > 0
        ? data.employeeGroupIds 
        : data.employeeGroupId 
          ? [data.employeeGroupId]
          : []
      const roleIds = data.roleIds && Array.isArray(data.roleIds) ? data.roleIds : []

      // Delete existing department and employee group relationships
      await tx.employeeDepartment.deleteMany({
        where: { employeeId: id }
      })

      await tx.employeeEmployeeGroup.deleteMany({
        where: { employeeId: id }
      })

      // Delete existing employee role relationships
      await tx.employeeRole.deleteMany({
        where: { employeeId: id }
      })

      // Update employee record
      const updatedEmployee = await tx.employee.update({
        where: { id },
        data: {
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email || currentEmployee.email,
          birthday: new Date(data.birthday),
          dateOfHire: new Date(data.dateOfHire),
          socialSecurityNo: data.socialSecurityNo,
          address: data.address,
          mobile: data.mobile,
          sex: data.sex,
          employeeNo: data.employeeNo,
          bankAccount: data.bankAccount,
          hoursPerMonth: parseFloat(data.hoursPerMonth) || 0,
          isTeamLeader: Boolean(data.isTeamLeader),
          departmentId: departmentIds[0],
          employeeGroupId: employeeGroupIds.length > 0 ? employeeGroupIds[0] : null,
          profilePhoto: data.profilePhoto !== undefined ? data.profilePhoto : currentEmployee.profilePhoto,
          salaryRate: data.salaryRate !== undefined ? (data.salaryRate ? parseFloat(data.salaryRate) : null) : currentEmployee.salaryRate,
          departments: {
            create: departmentIds.map((deptId: string, index: number) => ({
              departmentId: deptId,
              isPrimary: index === 0
            }))
          },
          employeeGroups: employeeGroupIds.length > 0 
            ? {
                create: employeeGroupIds.map((groupId: string, index: number) => ({
                  employeeGroupId: groupId,
                  isPrimary: index === 0
                }))
              }
            : undefined,
          employeeRoles: roleIds.length > 0
            ? {
                create: roleIds.map((roleId: string, index: number) => ({
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

      // Update user record if email, firstName, or lastName changed
      if (currentEmployee.userId && (
        (data.email && data.email !== currentEmployee.email) ||
        data.firstName !== currentEmployee.firstName ||
        data.lastName !== currentEmployee.lastName
      )) {
        await tx.user.update({
          where: { id: currentEmployee.userId },
          data: {
            email: data.email || currentEmployee.email,
            firstName: data.firstName,
            lastName: data.lastName
          }
        })
      }

      return updatedEmployee
    })

    return NextResponse.json(result)

  } catch (error: any) {
    console.error('Update employee error:', error)
    
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

    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to update employee',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const currentUser = await getCurrentUser()
    
    if (!currentUser || currentUser.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 401 }
      )
    }

    // First check if employee exists
    const employee = await prisma.employee.findUnique({
      where: { id },
      include: {
        timeEntries: true,
        sickLeaves: true,
        workPlans: true
      }
    })

    if (!employee) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      )
    }

    // Prevent deletion if employee has related records
    if (employee.timeEntries.length > 0 || 
        employee.sickLeaves.length > 0 || 
        employee.workPlans.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete employee with related records' },
        { status: 400 }
      )
    }

    await prisma.employee.delete({
      where: { id }
    })

    return NextResponse.json(
      { message: 'Employee deleted successfully' }
    )

  } catch (error: any) {
    console.error('Delete employee error:', error)
    
    if (error.code === 'P2003') {
      return NextResponse.json(
        { error: 'Cannot delete employee with related records' },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to delete employee',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const currentUser = await getCurrentUser()
    
    // Allow both ADMIN and regular users to view employee details
    // but restrict sensitive info for non-admins
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      )
    }

    const employee = await prisma.employee.findUnique({
      where: { id },
      include: {
        department: true,
        employeeGroup: true,
        departments: {
          include: {
            department: true
          },
          orderBy: {
            isPrimary: 'desc'
          }
        },
        employeeGroups: {
          include: {
            employeeGroup: true
          },
          orderBy: {
            isPrimary: 'desc'
          }
        },
        employeeRoles: {
          include: {
            role: true
          },
          orderBy: {
            isPrimary: 'desc'
          }
        }
      }
    })

    if (!employee) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      )
    }

    // For non-admin users, filter out sensitive information
    if (currentUser.role !== 'ADMIN') {
      const { socialSecurityNo, bankAccount, address, ...safeEmployeeData } = employee
      return NextResponse.json(safeEmployeeData)
    }

    return NextResponse.json(employee)

  } catch (error: any) {
    console.error('Get employee error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch employee',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}
