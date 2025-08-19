import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/app/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const { activationCode } = await request.json()

    if (!activationCode) {
      return NextResponse.json(
        { error: 'Activation code is required' },
        { status: 400 }
      )
    }

    // Find a profile with the matching activation code
    const profile = await prisma.punchClockProfile.findFirst({
      where: {
        activationCode: activationCode.toUpperCase(),
        isActive: true, // Only active profiles can be activated
      },
      include: {
        business: {
          select: {
            id: true,
            name: true,
            address: true,
          }
        },
        department: {
          select: {
            id: true,
            name: true,
            address: true,
          }
        }
      }
    })

    if (!profile) {
      return NextResponse.json(
        { error: 'Invalid or expired activation code' },
        { status: 404 }
      )
    }

    // Return the profile information (without sensitive data)
    return NextResponse.json({
      success: true,
      profile: {
        id: profile.id,
        name: profile.name,
        isActive: profile.isActive,
        business: profile.business,
        department: profile.department,
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
