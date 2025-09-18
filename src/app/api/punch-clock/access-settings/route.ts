import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/app/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get business from user
    const userWithBusiness = await prisma.user.findUnique({
      where: { id: currentUser.id },
      include: { business: true }
    })

    if (!userWithBusiness?.businessId) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    // Get punch clock access settings
    const settings = await prisma.punchClockAccessSettings.findUnique({
      where: { businessId: userWithBusiness.businessId },
      include: {
        allowedLocations: true
      }
    })

    if (!settings) {
      // Return default settings
      return NextResponse.json({
        allowPunchFromAnywhere: true,
        restrictByDepartment: false,
        allowedDepartments: [],
        specificLocations: []
      })
    }

    return NextResponse.json({
      allowPunchFromAnywhere: settings.allowPunchFromAnywhere,
      restrictByDepartment: settings.restrictByDepartment,
      allowedDepartments: settings.allowedDepartments,
      specificLocations: settings.allowedLocations.map(location => ({
        id: location.id,
        name: location.name,
        address: location.address,
        latitude: location.latitude,
        longitude: location.longitude,
        radius: location.radius,
        departmentIds: location.departmentIds || []
      }))
    })
  } catch (error) {
    console.error('Error fetching punch clock access settings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data = await req.json()
    const { allowPunchFromAnywhere, specificLocations, restrictByDepartment, allowedDepartments } = data

    // Get business from user
    const userWithBusiness = await prisma.user.findUnique({
      where: { id: currentUser.id },
      include: { business: true }
    })

    if (!userWithBusiness?.businessId) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    // Update or create punch clock access settings
    const settings = await prisma.punchClockAccessSettings.upsert({
      where: { businessId: userWithBusiness.businessId },
      create: {
        businessId: userWithBusiness.businessId,
        allowPunchFromAnywhere,
        restrictByDepartment: restrictByDepartment || false,
        allowedDepartments: allowedDepartments || [],
        allowedLocations: {
          create: specificLocations.map((location: any) => ({
            name: location.name,
            address: location.address,
            latitude: location.latitude,
            longitude: location.longitude,
            radius: location.radius,
            departmentIds: location.departmentIds || []
          }))
        }
      },
      update: {
        allowPunchFromAnywhere,
        restrictByDepartment: restrictByDepartment || false,
        allowedDepartments: allowedDepartments || [],
        allowedLocations: {
          deleteMany: {},
          create: specificLocations.map((location: any) => ({
            name: location.name,
            address: location.address,
            latitude: location.latitude,
            longitude: location.longitude,
            radius: location.radius,
            departmentIds: location.departmentIds || []
          }))
        }
      },
      include: {
        allowedLocations: true
      }
    })

    return NextResponse.json({
      allowPunchFromAnywhere: settings.allowPunchFromAnywhere,
      restrictByDepartment: settings.restrictByDepartment || false,
      allowedDepartments: settings.allowedDepartments || [],
      specificLocations: settings.allowedLocations.map(location => ({
        id: location.id,
        name: location.name,
        address: location.address,
        latitude: location.latitude,
        longitude: location.longitude,
        radius: location.radius,
        departmentIds: location.departmentIds || []
      }))
    })
  } catch (error) {
    console.error('Error saving punch clock access settings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
