import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserOrEmployee } from '@/shared/lib/auth'
import { prisma } from '@/shared/lib/prisma'

const parseDateOnly = (value: string) => {
  const dateKey = value.includes('T') ? value.slice(0, 10) : value
  const [year, month, day] = dateKey.split('-').map(Number)
  if (!year || !month || !day) return null

  const parsed = new Date(Date.UTC(year, month - 1, day))
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return null
  }

  return parsed
}

const isValidDate = (value: Date | null): value is Date => value instanceof Date

export async function GET(request: NextRequest) {
  try {
    const auth = await getCurrentUserOrEmployee()
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const employeeId = searchParams.get('employeeId')
    const month = searchParams.get('month')
    const year = searchParams.get('year')
    const startDateParam = searchParams.get('startDate')
    const endDateParam = searchParams.get('endDate')

    let whereClause: any = {}

    if (auth.type === 'user') {
      whereClause.employee = {
        user: {
          businessId: auth.data.businessId
        }
      }
    } else {
      whereClause.employeeId = auth.data.id
    }

    if (employeeId) {
      if (auth.type === 'employee' && employeeId !== auth.data.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      whereClause.employeeId = employeeId
    }

    // Add date filter if month and year are provided
    if (startDateParam && endDateParam) {
      const startDate = parseDateOnly(startDateParam)
      const endDate = parseDateOnly(endDateParam)

      if (startDate && endDate) {
        const endDateExclusive = new Date(endDate)
        endDateExclusive.setUTCDate(endDateExclusive.getUTCDate() + 1)
        whereClause.date = {
          gte: startDate,
          lt: endDateExclusive
        }
      }
    } else if (month && year) {
      const yearNumber = Number(year)
      const monthNumber = Number(month)

      if (yearNumber && monthNumber >= 1 && monthNumber <= 12) {
        const startDate = new Date(Date.UTC(yearNumber, monthNumber - 1, 1))
        const endDateExclusive = new Date(Date.UTC(yearNumber, monthNumber, 1))

        whereClause.date = {
          gte: startDate,
          lt: endDateExclusive
        }
      }
    }

    const availabilities = await prisma.availability.findMany({
      where: whereClause,
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeNo: true
          }
        }
      },
      orderBy: {
        date: 'asc'
      }
    })

    return NextResponse.json(availabilities)
  } catch (error) {
    console.error('Error fetching availabilities:', error)
    return NextResponse.json(
      { error: 'Failed to fetch availabilities' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getCurrentUserOrEmployee()
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { employeeId, dates, isAvailable, note } = body

    if (!employeeId || !dates || !Array.isArray(dates)) {
      return NextResponse.json(
        { error: 'Employee ID and dates array are required' },
        { status: 400 }
      )
    }

    if (auth.type === 'employee' && employeeId !== auth.data.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const parsedDates = dates.map((dateString: string) => parseDateOnly(String(dateString)))
    if (parsedDates.some(date => !date)) {
      return NextResponse.json(
        { error: 'Invalid date format. Expected YYYY-MM-DD' },
        { status: 400 }
      )
    }

    const validDates = parsedDates.filter(isValidDate)

    const operations = validDates.map(async (date) => {
      return prisma.availability.upsert({
        where: {
          employeeId_date: {
            employeeId,
            date
          }
        },
        update: {
          isAvailable: isAvailable ?? true,
          note: note || null
        },
        create: {
          employeeId,
          date,
          isAvailable: isAvailable ?? true,
          note: note || null
        }
      })
    })

    const results = await Promise.all(operations)

    return NextResponse.json(results)
  } catch (error) {
    console.error('Error updating availabilities:', error)
    return NextResponse.json(
      { error: 'Failed to update availabilities' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await getCurrentUserOrEmployee()
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { employeeId, dates } = body

    if (!employeeId || !dates || !Array.isArray(dates)) {
      return NextResponse.json(
        { error: 'Employee ID and dates array are required' },
        { status: 400 }
      )
    }

    if (auth.type === 'employee' && employeeId !== auth.data.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const dateObjects = dates.map((dateString: string) => parseDateOnly(String(dateString)))
    if (dateObjects.some(date => !date)) {
      return NextResponse.json(
        { error: 'Invalid date format. Expected YYYY-MM-DD' },
        { status: 400 }
      )
    }

    const validDateObjects = dateObjects.filter(isValidDate)

    await prisma.availability.deleteMany({
      where: {
        employeeId,
        date: {
          in: validDateObjects
        }
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting availabilities:', error)
    return NextResponse.json(
      { error: 'Failed to delete availabilities' },
      { status: 500 }
    )
  }
}
