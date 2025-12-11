import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/shared/lib/prisma'
import { getCurrentUser } from '@/shared/lib/auth'
import { PERMISSION_INFO } from '@/shared/lib/permissions'

export const maxDuration = 30 // Allow up to 30 seconds for this endpoint

// GET - Get a single role
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const currentUser = await getCurrentUser()
    
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const role = await prisma.role.findFirst({
      where: {
        id,
        businessId: currentUser.businessId
      },
      include: {
        permissions: {
          include: {
            permission: true
          }
        },
        departments: {
          select: {
            departmentId: true
          }
        },
        _count: {
          select: { users: true, employees: true }
        }
      }
    })

    if (!role) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 })
    }

    return NextResponse.json(role)
  } catch (error: any) {
    console.error('Error fetching role:', error)
    return NextResponse.json({ error: 'Failed to fetch role' }, { status: 500 })
  }
}

// PUT - Update a role
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const currentUser = await getCurrentUser()
    
    if (!currentUser || currentUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data = await request.json()
    const { name, description, permissions = [], departmentIds } = data

    // Find the role
    const existingRole = await prisma.role.findFirst({
      where: {
        id,
        businessId: currentUser.businessId
      }
    })

    if (!existingRole) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 })
    }

    // Check if name is taken by another role
    if (name && name !== existingRole.name) {
      const duplicateName = await prisma.role.findFirst({
        where: {
          name,
          businessId: currentUser.businessId,
          id: { not: id }
        }
      })

      if (duplicateName) {
        return NextResponse.json({ error: 'A role with this name already exists' }, { status: 400 })
      }
    }

    // Batch upsert permissions using transaction for better performance
    const permissionUpserts = permissions.map((permCode: string) =>
      prisma.permission.upsert({
        where: { code: permCode },
        update: {},
        create: {
          code: permCode,
          name: PERMISSION_INFO[permCode as keyof typeof PERMISSION_INFO]?.name || permCode,
          description: PERMISSION_INFO[permCode as keyof typeof PERMISSION_INFO]?.description || '',
          category: PERMISSION_INFO[permCode as keyof typeof PERMISSION_INFO]?.category || 'Other'
        }
      })
    )
    
    if (permissionUpserts.length > 0) {
      await prisma.$transaction(permissionUpserts, { timeout: 15000 })
    }

    // Get permission IDs for the codes
    const permissionRecords = await prisma.permission.findMany({
      where: { code: { in: permissions } },
      select: { id: true, code: true }
    })
    const permissionIdMap = new Map(permissionRecords.map(p => [p.code, p.id]))

    // Update the role using batch operations
    const role = await prisma.$transaction(async (tx) => {
      // Delete existing permissions
      await tx.rolePermission.deleteMany({
        where: { roleId: id }
      })

      // Delete existing department associations if departmentIds is provided
      if (departmentIds !== undefined) {
        await tx.roleDepartment.deleteMany({
          where: { roleId: id }
        })
      }

      // Batch create new permissions using createMany
      if (permissions.length > 0) {
        await tx.rolePermission.createMany({
          data: permissions.map((permCode: string) => ({
            roleId: id,
            permissionId: permissionIdMap.get(permCode)!
          })),
          skipDuplicates: true
        })
      }

      // Batch create new departments using createMany
      if (departmentIds !== undefined && departmentIds.length > 0) {
        await tx.roleDepartment.createMany({
          data: departmentIds.map((deptId: string) => ({
            roleId: id,
            departmentId: deptId
          })),
          skipDuplicates: true
        })
      }

      // Update role basic info
      return tx.role.update({
        where: { id },
        data: {
          name: name || existingRole.name,
          description: description !== undefined ? description : existingRole.description,
        },
        include: {
          permissions: {
            include: {
              permission: true
            }
          },
          departments: {
            select: {
              departmentId: true
            }
          }
        }
      })
    }, { timeout: 25000 })

    return NextResponse.json(role)
  } catch (error: any) {
    console.error('Error updating role:', error)
    return NextResponse.json({ error: 'Failed to update role' }, { status: 500 })
  }
}

// DELETE - Delete a role
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const currentUser = await getCurrentUser()
    
    if (!currentUser || currentUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const role = await prisma.role.findFirst({
      where: {
        id,
        businessId: currentUser.businessId
      },
      include: {
        _count: {
          select: { users: true, employees: true }
        }
      }
    })

    if (!role) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 })
    }

    if (role.isSystem) {
      return NextResponse.json({ error: 'System roles cannot be deleted' }, { status: 400 })
    }

    if (role._count.users > 0 || role._count.employees > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete role that is assigned to users or employees. Please reassign them first.' 
      }, { status: 400 })
    }

    // Use transaction to delete related records first
    await prisma.$transaction([
      prisma.rolePermission.deleteMany({ where: { roleId: id } }),
      prisma.roleDepartment.deleteMany({ where: { roleId: id } }),
      prisma.role.delete({ where: { id } })
    ])

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting role:', error)
    return NextResponse.json({ error: 'Failed to delete role' }, { status: 500 })
  }
}
