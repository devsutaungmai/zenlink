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
    const includeProfile = searchParams.get('includeProfile') === 'true'
    const includeEmployeeCount = searchParams.get('includeEmployeeCount') === 'true'

    const contractTypes = await prisma.contractType.findMany({
      where: {
        businessId: user.businessId,
      },
      include: {
        laborLawProfile: includeProfile ? {
          include: {
            laborLawSettings: true
          }
        } : false,
        _count: includeEmployeeCount ? {
          select: { employees: true }
        } : false,
      },
      orderBy: {
        name: 'asc',
      },
    })

    return NextResponse.json({ contractTypes })
  } catch (error) {
    console.error('Error fetching contract types:', error)
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
      employmentType,
      defaultFtePercent,
      agreedWeeklyHours,
      maxPlannedWeeklyHours,
      overtimeAllowed,
      overtimeExemptRoleIds,
      maxWeekendsPerMonth,
      customBreakMinutes,
      warningType,
      notifyManagerOnDeviation,
      allowSchedulingWithDeviation,
      laborLawProfileId,
    } = body

    if (!name || name.trim() === '') {
      return NextResponse.json(
        { error: 'Contract type name is required' },
        { status: 400 }
      )
    }

    if (!laborLawProfileId) {
      return NextResponse.json(
        { error: 'Labor law profile is required' },
        { status: 400 }
      )
    }

    const laborLawProfile = await prisma.laborLawProfile.findFirst({
      where: {
        id: laborLawProfileId,
        businessId: user.businessId,
      },
    })

    if (!laborLawProfile) {
      return NextResponse.json(
        { error: 'Labor law profile not found' },
        { status: 400 }
      )
    }

    const existingType = await prisma.contractType.findUnique({
      where: {
        name_businessId: {
          name: name.trim(),
          businessId: user.businessId,
        },
      },
    })

    if (existingType) {
      return NextResponse.json(
        { error: 'A contract type with this name already exists' },
        { status: 400 }
      )
    }

    const contractType = await prisma.contractType.create({
      data: {
        name: name.trim(),
        employmentType: employmentType || 'FULL_TIME',
        defaultFtePercent: defaultFtePercent ?? 100,
        agreedWeeklyHours: agreedWeeklyHours || null,
        maxPlannedWeeklyHours: maxPlannedWeeklyHours || null,
        overtimeAllowed: overtimeAllowed ?? true,
        overtimeExemptRoleIds: overtimeExemptRoleIds || [],
        maxWeekendsPerMonth: maxWeekendsPerMonth || null,
        customBreakMinutes: customBreakMinutes || null,
        warningType: warningType || 'YELLOW_IN_PLANNER',
        notifyManagerOnDeviation: notifyManagerOnDeviation ?? false,
        allowSchedulingWithDeviation: allowSchedulingWithDeviation ?? true,
        laborLawProfileId,
        businessId: user.businessId,
      },
      include: {
        laborLawProfile: {
          include: {
            laborLawSettings: true
          }
        },
      },
    })

    return NextResponse.json({ contractType }, { status: 201 })
  } catch (error) {
    console.error('Error creating contract type:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
