import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserOrEmployee } from '@/shared/lib/auth'
import { prisma } from '@/shared/lib/prisma'

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

    let whereClause: any = {}

    // If employeeId is provided, filter by that employee
    if (employeeId) {
      whereClause.employeeId = employeeId
    }

    // Add date filter if month and year are provided
    if (month && year) {
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1)
      const endDate = new Date(parseInt(year), parseInt(month), 0)
      
      whereClause.date = {
        gte: startDate,
        lte: endDate
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

    // Process each date
    const operations = dates.map(async (dateString: string) => {
      const date = new Date(dateString)
      
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

    const dateObjects = dates.map(dateString => new Date(dateString))

    await prisma.availability.deleteMany({
      where: {
        employeeId,
        date: {
          in: dateObjects
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
