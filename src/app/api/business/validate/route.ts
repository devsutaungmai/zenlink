import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/shared/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const { businessName } = await request.json()

    console.log('Business validation - received name:', businessName)

    if (!businessName || !businessName.trim()) {
      return NextResponse.json(
        { error: 'Business name is required' },
        { status: 400 }
      )
    }

    const trimmedName = businessName.trim()

    const allBusinesses = await prisma.business.findMany({
      select: {
        id: true,
        name: true,
        address: true,
        type: true
      }
    })
    console.log('Business validation - all businesses:', allBusinesses.map(b => b.name))

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
              },
              {
                name: {
                  startsWith: trimmedName,
                  mode: 'insensitive'
                }
              }
            ]
          }
        ]
      },
      select: {
        id: true,
        name: true,
        address: true,
        type: true
      }
    })

    if (!business) {
      const flexibleBusiness = await prisma.business.findFirst({
        where: {
          name: {
            contains: trimmedName,
            mode: 'insensitive'
          }
        },
        select: {
          id: true,
          name: true,
          address: true,
          type: true
        }
      })

      if (flexibleBusiness && flexibleBusiness.name.trim().toLowerCase() === trimmedName.toLowerCase()) {
        return NextResponse.json({
          success: true,
          business: {
            id: flexibleBusiness.id,
            name: flexibleBusiness.name.trim(),
            address: flexibleBusiness.address,
            type: flexibleBusiness.type
          }
        })
      }
    }

    if (!business) {
      return NextResponse.json(
        { 
          error: 'Business not found. Please check the business name and try again.',
          availableBusinesses: allBusinesses.map(b => b.name.trim())
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      business: {
        id: business.id,
        name: business.name.trim(),
        address: business.address,
        type: business.type
      }
    })

  } catch (error) {
    console.error('Error validating business:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
