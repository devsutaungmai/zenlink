import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function seedSalaryCodes() {
  console.log('Seeding salary codes...')

  const business = await prisma.business.findFirst()
  
  if (!business) {
    console.log('No business found. Please create a business first.')
    return
  }

  const salaryCodes = [
    {
      code: '120',
      name: 'Hourly Wages',
      description: 'Standard hourly wages for employees',
      category: 'HOURLY',
      businessId: business.id,
    },
    {
      code: '1203',
      name: 'Sick Pay',
      description: 'Sick leave compensation based on 3-month average',
      category: 'SICK_PAY',
      businessId: business.id,
    },
    {
      code: '1201',
      name: 'Supervisor Shift Wages',
      description: 'Enhanced hourly rate for supervisor shifts',
      category: 'HOURLY',
      businessId: business.id,
    },
    {
      code: '121',
      name: 'Overtime Pay',
      description: 'Overtime compensation at enhanced rates',
      category: 'OVERTIME',
      businessId: business.id,
    },
    {
      code: '122',
      name: 'Night Shift Premium',
      description: 'Additional compensation for night shifts',
      category: 'BONUS',
      businessId: business.id,
    },
    {
      code: '130',
      name: 'Holiday Pay',
      description: 'Enhanced pay for holiday work',
      category: 'BONUS',
      businessId: business.id,
    },
  ]

  for (const salaryCode of salaryCodes) {
    try {
      const existing = await prisma.salaryCode.findFirst({
        where: {
          code: salaryCode.code,
          businessId: business.id,
        },
      })

      if (!existing) {
        await prisma.salaryCode.create({ data: salaryCode })
        console.log(`Created salary code: ${salaryCode.code} - ${salaryCode.name}`)
      } else {
        console.log(`Salary code ${salaryCode.code} already exists`)
      }
    } catch (error) {
      console.error(`Error creating salary code ${salaryCode.code}:`, error)
    }
  }
}

async function main() {
  try {
    await seedSalaryCodes()
    console.log('Seeding completed successfully!')
  } catch (error) {
    console.error('Error during seeding:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
