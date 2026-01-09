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

    const contractType = await prisma.contractType.findFirst({
      where: {
        id,
        businessId: user.businessId,
      },
      include: {
        laborLawProfile: {
          include: {
            laborLawSettings: true
          }
        },
        _count: {
          select: { employees: true }
        }
      },
    })

    if (!contractType) {
      return NextResponse.json({ error: 'Contract type not found' }, { status: 404 })
    }

    return NextResponse.json({ contractType })
  } catch (error) {
    console.error('Error fetching contract type:', error)
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

    const existingType = await prisma.contractType.findFirst({
      where: {
        id,
        businessId: user.businessId,
      },
    })

    if (!existingType) {
      return NextResponse.json({ error: 'Contract type not found' }, { status: 404 })
    }

    if (name && name.trim() !== existingType.name) {
      const duplicateName = await prisma.contractType.findUnique({
        where: {
          name_businessId: {
            name: name.trim(),
            businessId: user.businessId,
          },
        },
      })

      if (duplicateName) {
        return NextResponse.json(
          { error: 'A contract type with this name already exists' },
          { status: 400 }
        )
      }
    }

    if (laborLawProfileId && laborLawProfileId !== existingType.laborLawProfileId) {
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
    }

    const contractType = await prisma.contractType.update({
      where: { id },
      data: {
        name: name?.trim() ?? existingType.name,
        employmentType: employmentType ?? existingType.employmentType,
        defaultFtePercent: defaultFtePercent ?? existingType.defaultFtePercent,
        agreedWeeklyHours: agreedWeeklyHours !== undefined ? agreedWeeklyHours : existingType.agreedWeeklyHours,
        maxPlannedWeeklyHours: maxPlannedWeeklyHours !== undefined ? maxPlannedWeeklyHours : existingType.maxPlannedWeeklyHours,
        overtimeAllowed: overtimeAllowed ?? existingType.overtimeAllowed,
        overtimeExemptRoleIds: overtimeExemptRoleIds !== undefined ? overtimeExemptRoleIds : existingType.overtimeExemptRoleIds,
        maxWeekendsPerMonth: maxWeekendsPerMonth !== undefined ? maxWeekendsPerMonth : existingType.maxWeekendsPerMonth,
        customBreakMinutes: customBreakMinutes !== undefined ? customBreakMinutes : existingType.customBreakMinutes,
        warningType: warningType ?? existingType.warningType,
        notifyManagerOnDeviation: notifyManagerOnDeviation ?? existingType.notifyManagerOnDeviation,
        allowSchedulingWithDeviation: allowSchedulingWithDeviation ?? existingType.allowSchedulingWithDeviation,
        laborLawProfileId: laborLawProfileId ?? existingType.laborLawProfileId,
      },
      include: {
        laborLawProfile: {
          include: {
            laborLawSettings: true
          }
        },
      },
    })

    return NextResponse.json({ contractType })
  } catch (error) {
    console.error('Error updating contract type:', error)
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

    const existingType = await prisma.contractType.findFirst({
      where: {
        id,
        businessId: user.businessId,
      },
      include: {
        _count: {
          select: { employees: true }
        }
      }
    })

    if (!existingType) {
      return NextResponse.json({ error: 'Contract type not found' }, { status: 404 })
    }

    if (existingType._count.employees > 0) {
      return NextResponse.json(
        { error: 'Cannot delete contract type that is assigned to employees. Please reassign employees first.' },
        { status: 400 }
      )
    }

    await prisma.contractType.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting contract type:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
