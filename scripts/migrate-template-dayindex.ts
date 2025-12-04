import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function migrate() {
  console.log('Starting migration: Converting template shift dayIndex from Monday-based to Sunday-based...')

  try {
    const templateShifts = await prisma.scheduleTemplateShift.findMany()
    
    console.log(`Found ${templateShifts.length} template shifts to migrate`)

    let updatedCount = 0
    
    for (const shift of templateShifts) {
      const oldDayIndex = shift.dayIndex
      const newDayIndex = (oldDayIndex + 1) % 7
      
      if (oldDayIndex !== newDayIndex) {
        await prisma.scheduleTemplateShift.update({
          where: { id: shift.id },
          data: { dayIndex: newDayIndex }
        })
        
        updatedCount++
        console.log(`  Shift ${shift.id}: dayIndex ${oldDayIndex} → ${newDayIndex}`)
      }
    }

    console.log(`\nMigration complete! Updated ${updatedCount} template shifts.`)
  } catch (error) {
    console.error('Migration failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

migrate()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
