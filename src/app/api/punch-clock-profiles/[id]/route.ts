import { NextResponse } from 'next/server'
import { prisma } from '@/shared/lib/prisma'
import { getCurrentUser } from '@/shared/lib/auth'

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const data = await request.json()
    const { name, departmentId, isActive } = data
    const profileId = params.id

    if (!name || !departmentId) {
      return NextResponse.json(
        { error: 'Name and department are required' },
        { status: 400 }
      )
    }

    // Check if profile exists and belongs to user's business
    const existingProfile = await prisma.punchClockProfile.findFirst({
      where: {
        id: profileId,
        businessId: currentUser.businessId
      }
    })

    if (!existingProfile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      )
    }

    // Check if department exists and belongs to user's business
    const department = await prisma.department.findFirst({
      where: {
        id: departmentId,
        businessId: currentUser.businessId
      }
    })

    if (!department) {
      return NextResponse.json(
        { error: 'Department not found' },
        { status: 404 }
      )
    }

    const updatedProfile = await prisma.punchClockProfile.update({
      where: {
        id: profileId
      },
      data: {
        name,
        departmentId,
        isActive: isActive ?? true
      },
      include: {
        department: {
          select: {
            name: true
          }
        }
      }
    })

    const transformedProfile = {
      id: updatedProfile.id,
      name: updatedProfile.name,
      departmentId: updatedProfile.departmentId,
      departmentName: updatedProfile.department.name,
      isActive: updatedProfile.isActive,
      createdAt: updatedProfile.createdAt.toISOString()
    }

    return NextResponse.json(transformedProfile)
  } catch (error) {
    console.error('Failed to update punch clock profile:', error)
    
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Profile name already exists for this business' },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const profileId = params.id

    // Check if profile exists and belongs to user's business
    const existingProfile = await prisma.punchClockProfile.findFirst({
      where: {
        id: profileId,
        businessId: currentUser.businessId
      }
    })

    if (!existingProfile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      )
    }

    await prisma.punchClockProfile.delete({
      where: {
        id: profileId
      }
    })

    return NextResponse.json({ message: 'Profile deleted successfully' })
  } catch (error) {
    console.error('Failed to delete punch clock profile:', error)
    return NextResponse.json(
      { error: 'Failed to delete profile' },
      { status: 500 }
    )
  }
}
