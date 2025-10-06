import { NextResponse } from 'next/server'
import { prisma } from '@/shared/lib/prisma'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const businessName = searchParams.get('businessName')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const employeeId = searchParams.get('employeeId')

    if (!businessName) {
      return NextResponse.json(
        { error: 'Business name is required' },
        { status: 400 }
      )
    }

    const trimmedName = businessName.trim()

    const business = await prisma.business.findFirst({
      where: {
        OR: [
          {
            name: {
              equals: trimmedName,
              mode: 'insensitive'
            }
          },
          {
            AND: [
              {
                name: {
                  contains: trimmedName,
                  mode: 'insensitive'
                }
              }
            ]
          }
        ]
      }
    })

    if (!business) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      )
    }

    const whereClause: any = {
      employee: {
        user: {
          businessId: business.id
        }
      }
    }

    if (startDate || endDate) {
      whereClause.date = {}
      if (startDate) {
        whereClause.date.gte = new Date(startDate)
      }
      if (endDate) {
        whereClause.date.lte = new Date(endDate)
      }
    }

    if (employeeId) {
      whereClause.employeeId = employeeId
    }

    const shifts = await prisma.shift.findMany({
      where: whereClause,
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeNo: true,
            department: {
              select: {
                name: true
              }
            }
          }
        }
      },
      orderBy: [
        { date: 'desc' },
        { startTime: 'desc' }
      ]
    })

    return NextResponse.json(shifts)
  } catch (error) {
    console.error('Failed to fetch shifts for time tracking:', error)
    return NextResponse.json(
      { error: 'Failed to fetch shifts' },
      { status: 500 }
    )
  }
}
