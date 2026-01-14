import { NextResponse } from 'next/server'
import { prisma } from '@/shared/lib/prisma'
import { getCurrentUser } from '@/shared/lib/auth'

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
            id: true,
            name: true
          }
        },
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
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    const transformedProfiles = profiles.map(profile => {
      const departmentIds = profile.departments.map(d => d.departmentId)
      const departmentNames = profile.departments.map(d => d.department.name)
      
      return {
        id: profile.id,
        name: profile.name,
        departmentId: profile.departmentId,
        departmentName: profile.department?.name || null,
        departmentIds,
        departmentNames,
        isActive: profile.isActive,
        activationCode: profile.activationCode,
        createdAt: profile.createdAt.toISOString()
      }
    })

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
    const { name, departmentIds, isActive } = data

    if (!name || !departmentIds || !Array.isArray(departmentIds) || departmentIds.length === 0) {
      return NextResponse.json(
        { error: 'Name and at least one department are required' },
        { status: 400 }
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

    const profile = await prisma.punchClockProfile.create({
      data: {
        name,
        isActive: isActive ?? true,
        businessId: currentUser.businessId,
        departments: {
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
      id: profile.id,
      name: profile.name,
      departmentIds: profile.departments.map(d => d.departmentId),
      departmentNames: profile.departments.map(d => d.department.name),
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
