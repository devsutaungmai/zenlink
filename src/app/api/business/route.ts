import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/shared/lib/prisma'
import { getCurrentUser } from '@/shared/lib/auth'
import { put } from '@vercel/blob'

export const runtime = 'nodejs'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

export async function GET(_request: NextRequest) {
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
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()

    const name = formData.get('name') as string
    const address = formData.get('address') as string
    const type = formData.get('type') as string
    const currency = formData.get('currency') as string
    const organizationNumber = formData.get('organizationNumber') as string | null
    const phone = formData.get('phone') as string | null
    const email = formData.get('email') as string | null
    const website = formData.get('website') as string | null
    const existingLogoUrl = formData.get('existingLogoUrl') as string | null
    const logoFile = formData.get('logo') as File | null

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Business name is required' }, { status: 400 })
    }

    const validCurrencies = [
      'USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF', 'CNY', 'INR',
      'SGD', 'HKD', 'NZD', 'SEK', 'NOK', 'DKK', 'PLN', 'CZK', 'HUF',
      'RON', 'BGN'
    ]

    if (currency && !validCurrencies.includes(currency)) {
      return NextResponse.json({ error: 'Invalid currency code' }, { status: 400 })
    }

    // Handle logo upload
    let logoUrl: string | null = existingLogoUrl ?? null

    if (logoFile && logoFile.size > 0) {
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/svg+xml']
      if (!allowedTypes.includes(logoFile.type)) {
        return NextResponse.json(
          { error: 'Invalid file type. Only JPEG, PNG, WebP, and SVG images are allowed.' },
          { status: 400 }
        )
      }
      if (logoFile.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: 'File size too large. Maximum size is 5MB.' },
          { status: 400 }
        )
      }

      const timestamp = Date.now()
      const randomString = Math.random().toString(36).substring(2, 15)
      const fileExtension = logoFile.name.split('.').pop()
      const filename = `business-logos/${user.businessId}-${timestamp}-${randomString}.${fileExtension}`

      const blob = await put(filename, logoFile, {
        access: 'public',
        addRandomSuffix: false,
      })

      logoUrl = blob.url
    }

    const updateData: any = {
      name: name.trim(),
      address: address?.trim() || '',
      type: type?.trim() || '',
      organizationNumber: organizationNumber?.trim() || null,
      phone: phone?.trim() || null,
      email: email?.trim() || null,
      website: website?.trim() || null,
      logoUrl,
      updatedAt: new Date()
    }

    if (currency) {
      updateData.currency = currency
    }

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

    return NextResponse.json(updatedBusiness)
  } catch (error) {
    console.error('Error updating business:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
