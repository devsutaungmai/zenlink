import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/app/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET() {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (user.role === 'EMPLOYEE') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const overtimeRules = await prisma.overtimeRule.findMany({
      include: {
        payRule: {
          include: {
            salaryCode: {
              select: {
                id: true,
                code: true,
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

    const filteredRules = overtimeRules.filter(rule => 
      rule.payRule.businessId === user.businessId
    )

    return NextResponse.json(filteredRules)
  } catch (error) {
    console.error('Error fetching overtime rules:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (user.role === 'EMPLOYEE') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { name, description, hoursThreshold, multiplier, maxOvertimeHours, salaryCodeId } = body

    if (!name || !hoursThreshold || !multiplier || !salaryCodeId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const salaryCode = await prisma.salaryCode.findFirst({
      where: {
        id: salaryCodeId,
        businessId: user.businessId
      }
    })

    if (!salaryCode) {
      return NextResponse.json({ error: 'Invalid salary code' }, { status: 400 })
    }

    const result = await prisma.$transaction(async (tx) => {
      const payRule = await tx.payRule.create({
        data: {
          name,
          description,
          ruleType: 'OVERTIME',
          salaryCodeId,
          businessId: user.businessId,
          isActive: true
        }
      })

      const overtimeRule = await tx.overtimeRule.create({
        data: {
          payRuleId: payRule.id,
          triggerAfterHours: parseFloat(hoursThreshold),
          rateMultiplier: parseFloat(multiplier),
          maxHoursPerDay: maxOvertimeHours ? parseFloat(maxOvertimeHours) : null,
          isDaily: true
        },
        include: {
          payRule: {
            include: {
              salaryCode: {
                select: {
                  id: true,
                  code: true,
                  name: true
                }
              }
            }
          }
        }
      })

      return overtimeRule
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('Error creating overtime rule:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
