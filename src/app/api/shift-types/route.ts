import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/shared/lib/prisma'
import { getCurrentUser } from '@/shared/lib/auth'

// GET /api/shift-types - Get all shift types for the business
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Fetching shift types...')
    const user = await getCurrentUser()
    console.log('👤 User:', user ? { id: user.id, email: user.email, businessId: user.businessId } : 'Not found')
    
    if (!user) {
      console.log('❌ Unauthorized: No user found')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!user.businessId) {
      console.log('❌ Business not found for user:', user.id)
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    console.log('🔎 Querying shift types for business:', user.businessId)
    const shiftTypes = await prisma.shiftTypeConfig.findMany({
      where: {
        businessId: user.businessId,
      },
      orderBy: {
        name: 'asc',
      },
    })

    console.log('✅ Found shift types:', shiftTypes.length)
    return NextResponse.json({ shiftTypes })
  } catch (error) {
    console.error('❌ Error fetching shift types:', error)
    return NextResponse.json(
      { error: 'Failed to fetch shift types' },
      { status: 500 }
    )
  }
}

// POST /api/shift-types - Create a new shift type
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!user.businessId) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    const body = await request.json()
    const { name, salaryCode, payCalculationType, payCalculationValue, description } = body

    if (!name || !salaryCode || !payCalculationType) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate that payCalculationValue is provided when required
    if (payCalculationType !== 'UNPAID' && !payCalculationValue && payCalculationValue !== 0) {
      return NextResponse.json(
        { error: 'Calculation value is required for this type' },
        { status: 400 }
      )
    }

    // Check if shift type with same name already exists
    const existing = await prisma.shiftTypeConfig.findFirst({
      where: {
        name,
        businessId: user.businessId,
      },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Shift type with this name already exists' },
        { status: 409 }
      )
    }

    const shiftType = await prisma.shiftTypeConfig.create({
      data: {
        name,
        salaryCode,
        payCalculationType,
        payCalculationValue: payCalculationValue ? parseFloat(payCalculationValue) : null,
        description: description || null,
        businessId: user.businessId,
      },
    })

    return NextResponse.json({ shiftType }, { status: 201 })
  } catch (error) {
    console.error('Error creating shift type:', error)
    return NextResponse.json(
      { error: 'Failed to create shift type' },
      { status: 500 }
    )
  }
}
