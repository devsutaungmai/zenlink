import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/shared/lib/auth'
import { prisma } from '@/shared/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payRule = await prisma.payRule.findFirst({
      where: {
        id: id,
        businessId: user.businessId,
      },
      include: {
        salaryCode: true,
        overtimeRule: true,
        employeeGroupPayRules: {
          include: {
            employeeGroup: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        employeePayRules: {
          where: { isActive: true },
          include: {
            employee: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                employeeNo: true,
              },
            },
          },
        },
      },
    })

    if (!payRule) {
      return NextResponse.json(
        { error: 'Pay rule not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(payRule)
  } catch (error) {
    console.error('Error fetching pay rule:', error)
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
    const { id } = await params
    const user = await getCurrentUser()
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { 
      name, 
      description, 
      isActive, 
      overtimeRule,
      employeeGroupRules 
    } = body

    const existingPayRule = await prisma.payRule.findFirst({
      where: {
        id: id,
        businessId: user.businessId,
      },
      include: {
        overtimeRule: true,
        employeeGroupPayRules: true,
      },
    })

    if (!existingPayRule) {
      return NextResponse.json(
        { error: 'Pay rule not found' },
        { status: 404 }
      )
    }

    const result = await prisma.$transaction(async (tx) => {
      // Update the pay rule
      const payRule = await tx.payRule.update({
        where: { id: id },
        data: {
          name,
          description,
          isActive,
        },
      })

      // Update overtime rule if it exists and data is provided
      if (overtimeRule && existingPayRule.ruleType === 'OVERTIME') {
        if (existingPayRule.overtimeRule) {
          await tx.overtimeRule.update({
            where: { payRuleId: id },
            data: {
              triggerAfterHours: overtimeRule.triggerAfterHours,
              rateMultiplier: overtimeRule.rateMultiplier,
              isDaily: overtimeRule.isDaily,
              maxHoursPerDay: overtimeRule.maxHoursPerDay,
              maxHoursPerWeek: overtimeRule.maxHoursPerWeek,
            },
          })
        } else {
          await tx.overtimeRule.create({
            data: {
              payRuleId: id,
              triggerAfterHours: overtimeRule.triggerAfterHours,
              rateMultiplier: overtimeRule.rateMultiplier || 1.5,
              isDaily: overtimeRule.isDaily ?? true,
              maxHoursPerDay: overtimeRule.maxHoursPerDay,
              maxHoursPerWeek: overtimeRule.maxHoursPerWeek,
            },
          })
        }
      }

      // Update employee group pay rules if provided
      if (employeeGroupRules) {
        // Delete existing rules
        await tx.employeeGroupPayRule.deleteMany({
          where: { payRuleId: id },
        })

        // Create new rules
        if (employeeGroupRules.length > 0) {
          await tx.employeeGroupPayRule.createMany({
            data: employeeGroupRules.map((rule: any) => ({
              employeeGroupId: rule.employeeGroupId,
              payRuleId: id,
              baseRate: rule.baseRate,
              isDefault: rule.isDefault ?? true,
            })),
          })
        }
      }

      return payRule
    })

    // Fetch the complete updated pay rule
    const completePayRule = await prisma.payRule.findUnique({
      where: { id: id },
      include: {
        salaryCode: true,
        overtimeRule: true,
        employeeGroupPayRules: {
          include: {
            employeeGroup: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    })

    return NextResponse.json(completePayRule)
  } catch (error) {
    console.error('Error updating pay rule:', error)
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
    const { id } = await params
    const user = await getCurrentUser()
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const existingPayRule = await prisma.payRule.findFirst({
      where: {
        id: id,
        businessId: user.businessId,
      },
      include: {
        _count: {
          select: {
            employeePayRules: true,
          },
        },
      },
    })

    if (!existingPayRule) {
      return NextResponse.json(
        { error: 'Pay rule not found' },
        { status: 404 }
      )
    }

    if (existingPayRule._count.employeePayRules > 0) {
      return NextResponse.json(
        { error: 'Cannot delete pay rule with associated employee rules' },
        { status: 400 }
      )
    }

    await prisma.payRule.delete({
      where: { id: id },
    })

    return NextResponse.json({ message: 'Pay rule deleted successfully' })
  } catch (error) {
    console.error('Error deleting pay rule:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
