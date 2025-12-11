import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/shared/lib/prisma'
import { getCurrentUser } from '@/shared/lib/auth'
import { PERMISSION_INFO, DEFAULT_ROLES } from '@/shared/lib/permissions'

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser()
    
    if (!currentUser || currentUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const allPermissions = Object.values(PERMISSION_INFO)
    for (const perm of allPermissions) {
      await prisma.permission.upsert({
        where: { code: perm.code },
        update: {
          name: perm.name,
          description: perm.description,
          category: perm.category
        },
        create: {
          code: perm.code,
          name: perm.name,
          description: perm.description,
          category: perm.category
        }
      })
    }

    // Create default roles if they don't exist
    const createdRoles = []
    for (const [key, roleData] of Object.entries(DEFAULT_ROLES)) {
      try {
        const existingRole = await prisma.role.findUnique({
          where: {
            name_businessId: {
              name: roleData.name,
              businessId: currentUser.businessId
            }
          }
        })

        if (!existingRole) {
          const role = await prisma.role.create({
            data: {
              name: roleData.name,
              description: roleData.description,
              isSystem: roleData.isSystem,
              isDefault: (roleData as any).isDefault || false,
              businessId: currentUser.businessId,
              permissions: {
                create: roleData.permissions.map((permCode: string) => ({
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
          createdRoles.push(role)
        } else {
          createdRoles.push(existingRole)
        }
      } catch (err: any) {
        // Handle race condition - role might have been created by another request
        if (err.code === 'P2002') {
          console.log(`Role ${roleData.name} already exists, skipping...`)
          continue
        }
        throw err
      }
    }

    return NextResponse.json({
      success: true,
      message: `Created ${createdRoles.length} default roles`,
      roles: createdRoles
    })
  } catch (error: any) {
    console.error('Error initializing roles:', error)
    return NextResponse.json({ error: 'Failed to initialize roles' }, { status: 500 })
  }
}
