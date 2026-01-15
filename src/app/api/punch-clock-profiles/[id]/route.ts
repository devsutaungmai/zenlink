import { NextResponse } from 'next/server'
import { prisma } from '@/shared/lib/prisma'
import { getCurrentUser } from '@/shared/lib/auth'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const data = await request.json()
    const { name, departmentIds, isActive } = data
    const profileId = id

    if (!name || !departmentIds || !Array.isArray(departmentIds) || departmentIds.length === 0) {
      return NextResponse.json(
        { error: 'Name and at least one department are required' },
        { status: 400 }
      )
    }

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

    const departments = await prisma.department.findMany({
      where: {
        id: { in: departmentIds },
        businessId: currentUser.businessId
      }
    })

    if (departments.length !== departmentIds.length) {
      return NextResponse.json(
        { error: 'One or more departments not found' },
        { status: 404 }
      )
    }

    const updatedProfile = await prisma.punchClockProfile.update({
      where: {
        id: profileId
      },
      data: {
        name,
        isActive: isActive ?? true,
        departments: {
          deleteMany: {},
          create: departmentIds.map((deptId: string) => ({
            departmentId: deptId
          }))
        }
      },
      include: {
        departments: {
          include: {
            department: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    })

    const transformedProfile = {
      id: updatedProfile.id,
      name: updatedProfile.name,
      departmentIds: updatedProfile.departments.map(d => d.departmentId),
      departmentNames: updatedProfile.departments.map(d => d.department.name),
      isActive: updatedProfile.isActive,
      createdAt: updatedProfile.createdAt.toISOString()
    }

    return NextResponse.json(transformedProfile)
  } catch (error: any) {
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const profileId = id

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
