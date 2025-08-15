import { NextResponse } from 'next/server'
import { prisma } from '@/app/lib/prisma'

export async function GET() {
  try {
    const businesses = await prisma.business.findMany({
      select: {
        id: true,
        name: true,
        address: true,
        type: true
      },
      orderBy: {
        name: 'asc'
      }
    })

    return NextResponse.json(businesses)
  } catch (error) {
    console.error('Error fetching businesses:', error)
    return NextResponse.json(
      { error: 'Failed to fetch businesses' },
      { status: 500 }
    )
  }
}
