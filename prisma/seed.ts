import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // First, get the first business to use as default
  const business = await prisma.business.findFirst()
  
  if (!business) {
    console.log('No business found. Please create a business first.')
    return
  }

  console.log('Seeding salary codes for business:', business.name)

  // Create default salary codes
  const defaultSalaryCodes = [
    {
      code: '120',
      name: 'Hourly Wages',
      description: 'Standard hourly wages for regular work',
    },
    {
      code: '1203',
      name: 'Sick Pay',
      description: 'Sick pay based on average salary calculation',
    },
    {
      code: '1201',
      name: 'Supervisor Shift Wages',
      description: 'Additional wages for supervisor shifts',
    },
    {
      code: '121',
      name: 'Overtime Wages',
      description: 'Overtime wages at premium rates',
    },
  ]

  for (const salaryCode of defaultSalaryCodes) {
    try {
      const created = await prisma.salaryCode.upsert({
        where: {
          code_businessId: {
            code: salaryCode.code,
            businessId: business.id,
          },
        },
        update: {
          name: salaryCode.name,
          description: salaryCode.description,
        },
        create: {
          code: salaryCode.code,
          name: salaryCode.name,
          description: salaryCode.description,
          businessId: business.id,
        },
      })
      console.log(`✓ Created/Updated salary code: ${created.code} - ${created.name}`)
    } catch (error) {
      console.log(`✗ Failed to create salary code ${salaryCode.code}:`, error)
    }
  }

  // Create some default pay rules
  const hourlyWagesCode = await prisma.salaryCode.findFirst({
    where: { code: '120', businessId: business.id },
  })

  const overtimeCode = await prisma.salaryCode.findFirst({
    where: { code: '121', businessId: business.id },
  })

  if (hourlyWagesCode) {
    try {
      const basePayRule = await prisma.payRule.upsert({
        where: {
          name_businessId: {
            name: 'Standard Hourly Rate',
            businessId: business.id,
          },
        },
        update: {
          description: 'Standard hourly pay rate for all employees',
          ratePerHour: 15.00,
          isActive: true,
        },
        create: {
          name: 'Standard Hourly Rate',
          description: 'Standard hourly pay rate for all employees',
          ratePerHour: 15.00,
          isActive: true,
          businessId: business.id,
          salaryCodeId: hourlyWagesCode.id,
        },
      })
      console.log(`✓ Created/Updated pay rule: ${basePayRule.name}`)

      if (overtimeCode) {
        await prisma.overtimeRule.upsert({
          where: {
            payRuleId: basePayRule.id,
          },
          update: {
            triggerHours: 8,
            overtimeMultiplier: 1.5,
            maxOvertimeHours: 4,
          },
          create: {
            payRuleId: basePayRule.id,
            triggerHours: 8,
            overtimeMultiplier: 1.5,
            maxOvertimeHours: 4,
          },
        })
        console.log('✓ Created/Updated overtime rule for standard pay')
      }
    } catch (error) {
      console.log('✗ Failed to create pay rule:', error)
    }
  }

  console.log('✓ Database seeding completed!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
