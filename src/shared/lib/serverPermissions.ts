import { prisma } from './prisma'
import { getCurrentUserOrEmployee } from './auth'

interface PermissionsData {
  permissions: string[]
  accessibleDepartmentIds: string[] | null
  isAdmin: boolean
}

/**
 * Get current user's permissions on the server side
 * Returns null if not authenticated
 */
export async function getServerPermissions(): Promise<PermissionsData | null> {
  try {
    const auth = await getCurrentUserOrEmployee()
    if (!auth) {
      return null
    }

    let permissions: string[] = []
    let accessibleDepartmentIds: string[] | null = null

    if (auth.type === 'user') {
      const user = auth.data as any
      
      // Admin users have all permissions
      if (user.role === 'ADMIN') {
        return {
          permissions: ['*'],
          accessibleDepartmentIds: null,
          isAdmin: true
        }
      }

      // Get user's assigned role and its permissions
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
          permissions = userWithRole.assignedRole.permissions.map(rp => rp.permission.code)
          
          // If role has department restrictions
          if (userWithRole.assignedRole.departments.length > 0) {
            accessibleDepartmentIds = userWithRole.assignedRole.departments.map(d => d.departmentId)
          }
        }
      }
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

    return {
      permissions,
      accessibleDepartmentIds,
      isAdmin: false
    }
  } catch (error) {
    console.error('Error fetching server permissions:', error)
    return null
  }
}

/**
 * Check if current user has a specific permission
 */
export async function hasServerPermission(permission: string): Promise<boolean> {
  const data = await getServerPermissions()
  if (!data) return false
  if (data.isAdmin || data.permissions.includes('*')) return true
  return data.permissions.includes(permission)
}

/**
 * Check if current user has any of the specified permissions
 */
export async function hasAnyServerPermission(permissions: string[]): Promise<boolean> {
  const data = await getServerPermissions()
  if (!data) return false
  if (data.isAdmin || data.permissions.includes('*')) return true
  return permissions.some(p => data.permissions.includes(p))
}

/**
 * Check if current user has all of the specified permissions
 */
export async function hasAllServerPermissions(permissions: string[]): Promise<boolean> {
  const data = await getServerPermissions()
  if (!data) return false
  if (data.isAdmin || data.permissions.includes('*')) return true
  return permissions.every(p => data.permissions.includes(p))
}

/**
 * Get accessible department IDs for the current user
 * Returns null if user has unrestricted access
 */
export async function getAccessibleDepartments(): Promise<string[] | null> {
  const data = await getServerPermissions()
  if (!data) return []
  return data.accessibleDepartmentIds
}
