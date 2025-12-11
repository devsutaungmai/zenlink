import { NextResponse } from 'next/server'
import { prisma } from '@/shared/lib/prisma'
import { getCurrentUserOrEmployee } from '@/shared/lib/auth'

// GET - Get current user's permissions based on their assigned roles
export async function GET() {
  try {
    const auth = await getCurrentUserOrEmployee()
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let permissions: string[] = []
    let accessibleDepartmentIds: string[] | null = null

    if (auth.type === 'user') {
      const user = auth.data as any
      
      // Admin users have all permissions
      if (user.role === 'ADMIN') {
        return NextResponse.json({
          permissions: ['*'],
          accessibleDepartmentIds: null,
          isAdmin: true
        })
      }

      const permissionSet = new Set<string>()
      const departmentSet = new Set<string>()
      let hasUnrestrictedRole = false

      // Get user's assigned role (from User.roleId) and its permissions
      if (user.roleId) {
        const userWithRole = await prisma.user.findUnique({
          where: { id: user.id },
          include: {
            assignedRole: {
              include: {
                permissions: {
                  include: {
                    permission: true
                  }
                },
                departments: {
                  select: { departmentId: true }
                }
              }
            }
          }
        })

        if (userWithRole?.assignedRole) {
          for (const rp of userWithRole.assignedRole.permissions) {
            permissionSet.add(rp.permission.code)
          }
          
          // If role has department restrictions
          if (userWithRole.assignedRole.departments.length > 0) {
            for (const d of userWithRole.assignedRole.departments) {
              departmentSet.add(d.departmentId)
            }
          } else {
            hasUnrestrictedRole = true
          }
        }
      }

      // Also check if user has an employee record with additional roles
      const employee = await prisma.employee.findFirst({
        where: { userId: user.id }
      })

      if (employee) {
        const employeeRoles = await prisma.employeeRole.findMany({
          where: { employeeId: employee.id },
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true
                  }
                },
                departments: {
                  select: { departmentId: true }
                }
              }
            }
          }
        })

        for (const er of employeeRoles) {
          for (const rp of er.role.permissions) {
            permissionSet.add(rp.permission.code)
          }
          
          if (er.role.departments.length === 0) {
            hasUnrestrictedRole = true
          } else {
            for (const d of er.role.departments) {
              departmentSet.add(d.departmentId)
            }
          }
        }
      }

      permissions = Array.from(permissionSet)
      accessibleDepartmentIds = hasUnrestrictedRole ? null : (departmentSet.size > 0 ? Array.from(departmentSet) : null)
    } else {
      // Employee - get permissions from all assigned roles
      const employee = auth.data as any
      
      const employeeRoles = await prisma.employeeRole.findMany({
        where: { employeeId: employee.id },
        include: {
          role: {
            include: {
              permissions: {
                include: {
                  permission: true
                }
              },
              departments: {
                select: { departmentId: true }
              }
            }
          }
        }
      })

      const permissionSet = new Set<string>()
      const departmentSet = new Set<string>()
      let hasUnrestrictedRole = false

      for (const er of employeeRoles) {
        for (const rp of er.role.permissions) {
          permissionSet.add(rp.permission.code)
        }
        
        if (er.role.departments.length === 0) {
          hasUnrestrictedRole = true
        } else {
          for (const d of er.role.departments) {
            departmentSet.add(d.departmentId)
          }
        }
      }

      permissions = Array.from(permissionSet)
      accessibleDepartmentIds = hasUnrestrictedRole ? null : Array.from(departmentSet)
    }

    return NextResponse.json({
      permissions,
      accessibleDepartmentIds,
      isAdmin: false
    })
  } catch (error) {
    console.error('Error fetching permissions:', error)
    return NextResponse.json({ error: 'Failed to fetch permissions' }, { status: 500 })
  }
}
