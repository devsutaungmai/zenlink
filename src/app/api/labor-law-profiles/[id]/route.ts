import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/shared/lib/auth'
import { prisma } from '@/shared/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const profile = await prisma.laborLawProfile.findFirst({
      where: {
        id,
        businessId: user.businessId,
      },
      include: {
        laborLawSettings: true,
        contractTypes: {
          select: {
            id: true,
            name: true,
          }
        }
      },
    })

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    return NextResponse.json({ profile })
  } catch (error) {
    console.error('Error fetching labor law profile:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const {
      name,
      description,
      laborLawSettingsId,
      isDefault,
    } = body

    const existingProfile = await prisma.laborLawProfile.findFirst({
      where: {
        id,
        businessId: user.businessId,
      },
    })

    if (!existingProfile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    if (name && name.trim() !== existingProfile.name) {
      const duplicateName = await prisma.laborLawProfile.findUnique({
        where: {
          name_businessId: {
            name: name.trim(),
            businessId: user.businessId,
          },
        },
      })

      if (duplicateName) {
        return NextResponse.json(
          { error: 'A profile with this name already exists' },
          { status: 400 }
        )
      }
    }

    if (isDefault && !existingProfile.isDefault) {
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

    const profile = await prisma.laborLawProfile.update({
      where: { id },
      data: {
        name: name?.trim() || existingProfile.name,
        description: description !== undefined ? description : existingProfile.description,
        laborLawSettingsId: laborLawSettingsId !== undefined ? laborLawSettingsId : existingProfile.laborLawSettingsId,
        isDefault: isDefault !== undefined ? isDefault : existingProfile.isDefault,
      },
      include: {
        laborLawSettings: true,
      },
    })

    return NextResponse.json({ profile })
  } catch (error) {
    console.error('Error updating labor law profile:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const existingProfile = await prisma.laborLawProfile.findFirst({
      where: {
        id,
        businessId: user.businessId,
      },
      include: {
        _count: {
          select: { contractTypes: true }
        }
      }
    })

    if (!existingProfile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    if (existingProfile._count.contractTypes > 0) {
      return NextResponse.json(
        { error: 'Cannot delete profile that is linked to contract types' },
        { status: 400 }
      )
    }

    await prisma.laborLawProfile.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting labor law profile:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
