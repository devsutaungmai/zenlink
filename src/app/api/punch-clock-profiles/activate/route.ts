import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/shared/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const { activationCode, businessId } = await request.json()

    if (!activationCode || !businessId) {
      return NextResponse.json(
        { error: 'Activation code and business are required' },
        { status: 400 }
      )
    }

    const profile = await prisma.punchClockProfile.findFirst({
      where: {
        activationCode: activationCode.toUpperCase(),
        businessId,
        isActive: true,
      },
      include: {
        business: {
          select: {
            id: true,
            name: true,
            address: true,
          }
        },
        departments: {
          include: {
            department: {
              select: {
                id: true,
                name: true,
                address: true,
              }
            }
          }
        }
      }
    })

    if (!profile) {
      return NextResponse.json(
        { error: 'Invalid activation code for this business' },
        { status: 404 }
      )
    }

    const profileDepartments = profile.departments.map(d => ({
      id: d.department.id,
      name: d.department.name,
      address: d.department.address,
    }))

    return NextResponse.json({
      success: true,
      profile: {
        id: profile.id,
        name: profile.name,
        isActive: profile.isActive,
        business: profile.business,
        departments: profileDepartments,
        departmentIds: profile.departments.map(d => d.departmentId),
        createdAt: profile.createdAt,
      },
      message: `Successfully connected to ${profile.name} profile`,
    })

  } catch (error) {
    console.error('Error activating punch clock profile:', error)
    return NextResponse.json(
      { error: 'Failed to activate punch clock profile' },
      { status: 500 }
    )
  }
}
