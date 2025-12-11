import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Assigning default Employee role to employees without roles...')

  const businesses = await prisma.business.findMany({
    select: { id: true, name: true }
  })

  let totalUpdated = 0

  for (const business of businesses) {
    console.log(`\nProcessing business: ${business.name} (${business.id})`)

    const defaultEmployeeRole = await prisma.role.findFirst({
      where: {
        businessId: business.id,
        name: 'Employee',
        isDefault: true
      }
    })

    if (!defaultEmployeeRole) {
      console.log(`  No default Employee role found for this business, skipping...`)
      continue
    }

    console.log(`  Found default Employee role: ${defaultEmployeeRole.id}`)

    const employeesWithoutRoles = await prisma.employee.findMany({
      where: {
        user: {
          businessId: business.id
        },
        employeeRoles: {
          none: {}
        }
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        employeeNo: true
      }
    })

    console.log(`  Found ${employeesWithoutRoles.length} employees without roles`)

    for (const employee of employeesWithoutRoles) {
      await prisma.employeeRole.create({
        data: {
          employeeId: employee.id,
          roleId: defaultEmployeeRole.id,
          isPrimary: true
        }
      })
      console.log(`    Assigned role to: ${employee.firstName} ${employee.lastName} (${employee.employeeNo})`)
      totalUpdated++
    }
  }

  console.log(`\nDone! Assigned default Employee role to ${totalUpdated} employees.`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
