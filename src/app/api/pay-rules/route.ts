import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/app/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const ruleType = searchParams.get('ruleType')
    const isActive = searchParams.get('isActive')

    const where: any = {
      businessId: user.businessId,
    }

    if (ruleType) {
      where.ruleType = ruleType
    }

    if (isActive !== null) {
      where.isActive = isActive === 'true'
    }

    const payRules = await prisma.payRule.findMany({
      where,
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
        _count: {
          select: {
            employeeGroupPayRules: true,
            employeePayRules: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    })

    return NextResponse.json(payRules)
  } catch (error) {
    console.error('Error fetching pay rules:', error)
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
      description, 
      ruleType, 
      salaryCodeId, 
      overtimeRule,
      employeeGroupRules 
    } = body

    if (!name || !ruleType || !salaryCodeId) {
      return NextResponse.json(
        { error: 'Name, rule type, and salary code are required' },
        { status: 400 }
      )
    }

    const existingRule = await prisma.payRule.findUnique({
      where: {
        name_businessId: {
          name,
          businessId: user.businessId,
        },
      },
    })

    if (existingRule) {
      return NextResponse.json(
        { error: 'Pay rule name already exists' },
        { status: 400 }
      )
    }

    const salaryCode = await prisma.salaryCode.findFirst({
      where: {
        id: salaryCodeId,
        businessId: user.businessId,
      },
    })

    if (!salaryCode) {
      return NextResponse.json(
        { error: 'Salary code not found' },
        { status: 400 }
      )
    }

    const result = await prisma.$transaction(async (tx) => {

      const payRule = await tx.payRule.create({
        data: {
          name,
          description,
          ruleType,
          salaryCodeId,
          businessId: user.businessId,
        },
      })

      if (overtimeRule && ruleType === 'OVERTIME') {
        await tx.overtimeRule.create({
          data: {
            payRuleId: payRule.id,
            triggerAfterHours: overtimeRule.triggerAfterHours,
            rateMultiplier: overtimeRule.rateMultiplier || 1.5,
            isDaily: overtimeRule.isDaily ?? true,
            maxHoursPerDay: overtimeRule.maxHoursPerDay,
            maxHoursPerWeek: overtimeRule.maxHoursPerWeek,
          },
        })
      }

      if (employeeGroupRules && employeeGroupRules.length > 0) {
        await tx.employeeGroupPayRule.createMany({
          data: employeeGroupRules.map((rule: any) => ({
            employeeGroupId: rule.employeeGroupId,
            payRuleId: payRule.id,
            baseRate: rule.baseRate,
            isDefault: rule.isDefault ?? true,
          })),
        })
      }

      return payRule
    })

    const completePayRule = await prisma.payRule.findUnique({
      where: { id: result.id },
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

    return NextResponse.json(completePayRule, { status: 201 })
  } catch (error) {
    console.error('Error creating pay rule:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
