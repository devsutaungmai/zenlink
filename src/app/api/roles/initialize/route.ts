import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/shared/lib/prisma'
import { getCurrentUser } from '@/shared/lib/auth'
import { PERMISSION_INFO, DEFAULT_ROLES } from '@/shared/lib/permissions'

export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser()
    
    if (!currentUser || currentUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const allPermissions = Object.values(PERMISSION_INFO)
    
    // Use createMany with skipDuplicates for faster bulk insert
    await prisma.permission.createMany({
      data: allPermissions.map((perm) => ({
        code: perm.code,
        name: perm.name,
        description: perm.description,
        category: perm.category
      })),
      skipDuplicates: true
    })

    // Create roles in parallel for better performance
    const roleEntries = Object.entries(DEFAULT_ROLES)
    const roleResults = await Promise.all(
      roleEntries.map(async ([key, roleData]) => {
        try {
          const existingRole = await prisma.role.findUnique({
            where: {
              name_businessId: {
                name: roleData.name,
                businessId: currentUser.businessId
              }
            }
          })

          if (existingRole) {
            return existingRole
          }

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
            }
          })
          return role
        } catch (err: any) {
          if (err.code === 'P2002') {
            console.log(`Role ${roleData.name} already exists, skipping...`)
            return null
          }
          throw err
        }
      })
    )

    const createdRoles = roleResults.filter(Boolean)

    return NextResponse.json({
      success: true,
      message: `Initialized ${createdRoles.length} roles`,
      roles: createdRoles
    })
  } catch (error: any) {
    console.error('Error initializing roles:', error)
    return NextResponse.json({ error: 'Failed to initialize roles' }, { status: 500 })
  }
}
