import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/shared/lib/prisma'
import { getCurrentUser } from '@/shared/lib/auth'
import { PERMISSION_INFO, DEFAULT_ROLES } from '@/shared/lib/permissions'

// GET - List all roles for the business
export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser()
    
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const roles = await prisma.role.findMany({
      where: { businessId: currentUser.businessId },
      include: {
        permissions: {
          include: {
            permission: true
          }
        },
        _count: {
          select: { users: true }
        }
      },
      orderBy: [
        { isSystem: 'desc' },
        { name: 'asc' }
      ]
    })

    return NextResponse.json(roles)
  } catch (error: any) {
    console.error('Error fetching roles:', error)
    return NextResponse.json({ error: 'Failed to fetch roles' }, { status: 500 })
  }
}

// POST - Create a new role
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser()
    
    if (!currentUser || currentUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data = await request.json()
    const { name, description, permissions = [] } = data

    if (!name) {
      return NextResponse.json({ error: 'Role name is required' }, { status: 400 })
    }

    // Check if role with same name exists
    const existingRole = await prisma.role.findFirst({
      where: {
        name,
        businessId: currentUser.businessId
      }
    })

    if (existingRole) {
      return NextResponse.json({ error: 'A role with this name already exists' }, { status: 400 })
    }

    // Ensure all permissions exist in the Permission table
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

    // Create the role with permissions
    const role = await prisma.role.create({
      data: {
        name,
        description,
        businessId: currentUser.businessId,
        isSystem: false,
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

    return NextResponse.json(role, { status: 201 })
  } catch (error: any) {
    console.error('Error creating role:', error)
    return NextResponse.json({ error: 'Failed to create role' }, { status: 500 })
  }
}
