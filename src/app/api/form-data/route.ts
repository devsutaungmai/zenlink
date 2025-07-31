import { NextResponse } from 'next/server'
import { prisma } from '@/app/lib/prisma'
import { getCurrentUserOrEmployee } from '@/lib/auth'

// Create a combined endpoint for form data to reduce multiple API calls
export async function GET() {
  try {
    const auth = await getCurrentUserOrEmployee()
    if (!auth) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    let businessId: string
    if (auth.type === 'user') {
      businessId = (auth.data as any).businessId
    } else {
      businessId = (auth.data as any).user.businessId
    }

    // Fetch all required data in parallel
    const [departments, employeeGroups] = await Promise.all([
      prisma.department.findMany({
        where: {
          businessId: businessId
        },
        select: {
          id: true,
          name: true
        },
        orderBy: {
          name: 'asc'
        }
      }),
      prisma.employeeGroup.findMany({
        where: {
          businessId: businessId
        },
        select: {
          id: true,
          name: true
        },
        orderBy: {
          name: 'asc'
        }
      })
    ])

    return NextResponse.json({
      departments,
      employeeGroups
    }, {
      headers: {
        'Cache-Control': 's-maxage=60, stale-while-revalidate=300' // Cache for 1 minute, stale for 5 minutes
      }
    })
  } catch (error) {
    console.error('Failed to fetch form data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch form data' },
      { status: 500 }
    )
  }
}
