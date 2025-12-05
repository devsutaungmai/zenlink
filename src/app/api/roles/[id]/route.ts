import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/shared/lib/prisma'
import { getCurrentUser } from '@/shared/lib/auth'
import { PERMISSION_INFO } from '@/shared/lib/permissions'

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
        _count: {
          select: { users: true }
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
    const { name, description, permissions = [] } = data

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

    // Ensure all permissions exist
    for (const permCode of permissions) {
      await prisma.permission.upsert({
        where: { code: permCode },
        update: {},
        create: {
          code: permCode,
          name: PERMISSION_INFO[permCode as keyof typeof PERMISSION_INFO]?.name || permCode,
          description: PERMISSION_INFO[permCode as keyof typeof PERMISSION_INFO]?.description || '',
          category: PERMISSION_INFO[permCode as keyof typeof PERMISSION_INFO]?.category || 'Other'
        }
      })
    }

    // Update the role
    const role = await prisma.$transaction(async (tx) => {
      // Delete existing permissions
      await tx.rolePermission.deleteMany({
        where: { roleId: id }
      })

      // Update role and add new permissions
      return tx.role.update({
        where: { id },
        data: {
          name: name || existingRole.name,
          description: description !== undefined ? description : existingRole.description,
          permissions: {
            create: permissions.map((permCode: string) => ({
              permission: {
                connect: { code: permCode }
              }
            }))
          }
        },
        include: {
          permissions: {
            include: {
              permission: true
            }
          }
        }
      })
    })

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
          select: { users: true }
        }
      }
    })

    if (!role) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 })
    }

    if (role.isSystem) {
      return NextResponse.json({ error: 'System roles cannot be deleted' }, { status: 400 })
    }

    if (role._count.users > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete role that is assigned to users. Please reassign users first.' 
      }, { status: 400 })
    }

    await prisma.role.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting role:', error)
    return NextResponse.json({ error: 'Failed to delete role' }, { status: 500 })
  }
}
