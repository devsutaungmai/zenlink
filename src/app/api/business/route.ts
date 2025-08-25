import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/app/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const business = await prisma.business.findUnique({
      where: { id: user.businessId },
      include: {
        _count: {
          select: {
            users: true,
            departments: true,
            employeeGroups: true
          }
        }
      }
    })

    if (!business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    return NextResponse.json(business)
  } catch (error) {
    console.error('Error fetching business:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const requestBody = await request.json()
    console.log('PUT request body:', requestBody)

    const { name, address, type, currency } = requestBody

    // Validate required fields
    if (!name?.trim()) {
      return NextResponse.json({ error: 'Business name is required' }, { status: 400 })
    }

    // Validate currency if provided
    const validCurrencies = [
      'USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF', 'CNY', 'INR', 
      'SGD', 'HKD', 'NZD', 'SEK', 'NOK', 'DKK', 'PLN', 'CZK', 'HUF', 
      'RON', 'BGN'
    ]
    
    if (currency && !validCurrencies.includes(currency)) {
      return NextResponse.json({ error: 'Invalid currency code' }, { status: 400 })
    }

    // Prepare update data
    const updateData: any = {
      name: name.trim(),
      address: address?.trim() || '',
      type: type?.trim() || '',
      updatedAt: new Date()
    }

    // Only include currency if it's provided and valid
    if (currency) {
      updateData.currency = currency
    }

    console.log('Update data:', updateData)
    console.log('User business ID:', user.businessId)

    const updatedBusiness = await prisma.business.update({
      where: { id: user.businessId },
      data: updateData,
      include: {
        _count: {
          select: {
            users: true,
            departments: true,
            employeeGroups: true
          }
        }
      }
    })

    console.log('Updated business:', updatedBusiness)
    return NextResponse.json(updatedBusiness)
  } catch (error) {
    console.error('Detailed error updating business:', error)
    
    if (error instanceof Error) {
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)
      return NextResponse.json(
        { error: `Internal server error: ${error.message}` },
        { status: 500 }
      )
    }
    
    return NextResponse.json(
      { error: 'Internal server error: Unknown error occurred' },
      { status: 500 }
    )
  }
}
