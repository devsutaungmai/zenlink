import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/shared/lib/auth'
import { prisma } from '@/shared/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const includeSettings = searchParams.get('includeSettings') === 'true'

    const profiles = await prisma.laborLawProfile.findMany({
      where: {
        businessId: user.businessId,
      },
      include: {
        laborLawSettings: includeSettings,
        _count: {
          select: { contractTypes: true }
        }
      },
      orderBy: [
        { isDefault: 'desc' },
        { name: 'asc' },
      ],
    })

    return NextResponse.json({ profiles })
  } catch (error) {
    console.error('Error fetching labor law profiles:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      name,
      description,
      laborLawSettingsId,
      isDefault,
    } = body

    if (!name || name.trim() === '') {
      return NextResponse.json(
        { error: 'Profile name is required' },
        { status: 400 }
      )
    }

    const existingProfile = await prisma.laborLawProfile.findUnique({
      where: {
        name_businessId: {
          name: name.trim(),
          businessId: user.businessId,
        },
      },
    })

    if (existingProfile) {
      return NextResponse.json(
        { error: 'A profile with this name already exists' },
        { status: 400 }
      )
    }

    if (isDefault) {
      await prisma.laborLawProfile.updateMany({
        where: {
          businessId: user.businessId,
          isDefault: true,
        },
        data: {
          isDefault: false,
        },
      })
    }

    const profile = await prisma.laborLawProfile.create({
      data: {
        name: name.trim(),
        description: description || null,
        laborLawSettingsId: laborLawSettingsId || null,
        businessId: user.businessId,
        isDefault: isDefault || false,
      },
      include: {
        laborLawSettings: true,
      },
    })

    return NextResponse.json({ profile }, { status: 201 })
  } catch (error) {
    console.error('Error creating labor law profile:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
