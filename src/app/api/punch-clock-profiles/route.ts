import { NextResponse } from 'next/server'
import { prisma } from '@/app/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET() {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const profiles = await prisma.punchClockProfile.findMany({
      where: {
        businessId: currentUser.businessId
      },
      include: {
        department: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Transform to include departmentName and activationCode
    const transformedProfiles = profiles.map(profile => ({
      id: profile.id,
      name: profile.name,
      departmentId: profile.departmentId,
      departmentName: profile.department.name,
      isActive: profile.isActive,
      activationCode: profile.activationCode,
      createdAt: profile.createdAt.toISOString()
    }))

    return NextResponse.json(transformedProfiles)
  } catch (error) {
    console.error('Failed to fetch punch clock profiles:', error)
    return NextResponse.json(
      { error: 'Failed to fetch profiles' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
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

    if (!name || !departmentId) {
      return NextResponse.json(
        { error: 'Name and department are required' },
        { status: 400 }
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

    const profile = await prisma.punchClockProfile.create({
      data: {
        name,
        departmentId,
        isActive: isActive ?? true,
        businessId: currentUser.businessId
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
      id: profile.id,
      name: profile.name,
      departmentId: profile.departmentId,
      departmentName: profile.department.name,
      isActive: profile.isActive,
      createdAt: profile.createdAt.toISOString()
    }

    return NextResponse.json(transformedProfile, { status: 201 })
  } catch (error) {
    console.error('Failed to create punch clock profile:', error)
    
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Profile name already exists for this business' },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to create profile' },
      { status: 500 }
    )
  }
}
