import { PrismaClient, PayCalculationType } from '@prisma/client'

const prisma = new PrismaClient()

async function seedShiftTypes() {
  console.log('Seeding shift types...')

  const business = await prisma.business.findFirst()
  
  if (!business) {
    console.log('No business found. Please create a business first.')
    return
  }

  console.log(`Found business: ${business.name}`)

  const shiftTypes = [
    {
      name: 'Absent',
      salaryCode: 'ABSENT',
      payCalculationType: PayCalculationType.UNPAID,
      payCalculationValue: null,
      description: 'Employee absence without pay',
      businessId: business.id,
    },
    {
      name: 'Arrived Late',
      salaryCode: 'LATE',
      payCalculationType: PayCalculationType.HOURLY_PLUS_FIXED,
      payCalculationValue: -5.0,
      description: 'Late arrival penalty (deducts $5 per hour)',
      businessId: business.id,
    },
    {
      name: 'Meeting',
      salaryCode: 'MEETING',
      payCalculationType: PayCalculationType.PERCENTAGE,
      payCalculationValue: 100.0,
      description: 'Regular pay for meeting attendance',
      businessId: business.id,
    },
    {
      name: 'Sick - Unpaid',
      salaryCode: 'SICK_UNPAID',
      payCalculationType: PayCalculationType.UNPAID,
      payCalculationValue: null,
      description: 'Sick leave without compensation',
      businessId: business.id,
    },
    {
      name: 'Time Off',
      salaryCode: 'TIME_OFF',
      payCalculationType: PayCalculationType.PERCENTAGE,
      payCalculationValue: 100.0,
      description: 'Paid time off at regular rate',
      businessId: business.id,
    },
    {
      name: 'Training',
      salaryCode: 'TRAINING',
      payCalculationType: PayCalculationType.UNPAID,
      payCalculationValue: null,
      description: 'Employee training sessions (unpaid)',
      businessId: business.id,
    },
  ]

  for (const shiftType of shiftTypes) {
    try {
      const existing = await prisma.shiftTypeConfig.findFirst({
        where: {
          name: shiftType.name,
          businessId: business.id,
        },
      })

      if (!existing) {
        await prisma.shiftTypeConfig.create({ 
          data: {
            ...shiftType,
            payCalculationValue: shiftType.payCalculationValue 
              ? parseFloat(shiftType.payCalculationValue.toString())
              : null
          } 
        })
        console.log(`✓ Created shift type: ${shiftType.name}`)
      } else {
        console.log(`ℹ Shift type "${shiftType.name}" already exists`)
      }
    } catch (error) {
      console.error(`Error creating shift type "${shiftType.name}":`, error)
    }
  }
}

async function main() {
  try {
    await seedShiftTypes()
    console.log(' Shift types seeding completed successfully!')
  } catch (error) {
    console.error(' Error during seeding:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
