import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Adding new permission: attendance.view_own_hours')

  // First, ensure the permission exists
  const permission = await prisma.permission.upsert({
    where: { code: 'attendance.view_own_hours' },
    update: {},
    create: {
      code: 'attendance.view_own_hours',
      name: 'View Own Hours',
      description: 'View own working hours and attendance history',
      category: 'Attendance',
    },
  })

  console.log('Permission created/found:', permission.id)

  // Find all Employee roles (system default roles)
  const employeeRoles = await prisma.role.findMany({
    where: {
      name: 'Employee',
      isSystem: true,
    },
  })

  console.log(`Found ${employeeRoles.length} Employee roles to update`)

  // Add permission to each Employee role
  for (const role of employeeRoles) {
    // Check if permission already assigned
    const existing = await prisma.rolePermission.findFirst({
      where: {
        roleId: role.id,
        permissionId: permission.id,
      },
    })

    if (!existing) {
      await prisma.rolePermission.create({
        data: {
          roleId: role.id,
          permissionId: permission.id,
        },
      })
      console.log(`Added permission to role: ${role.name} (${role.businessId})`)
    } else {
      console.log(`Permission already exists for role: ${role.name} (${role.businessId})`)
    }
  }

  console.log('Done!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
