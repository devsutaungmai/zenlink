import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/shared/lib/prisma'
import { getCurrentUser } from '@/shared/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (user.role === 'EMPLOYEE') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const overtimeRule = await prisma.overtimeRule.findUnique({
      where: { id: params.id },
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

    if (!overtimeRule || overtimeRule.payRule.businessId !== user.businessId) {
      return NextResponse.json({ error: 'Overtime rule not found' }, { status: 404 })
    }

    return NextResponse.json(overtimeRule)
  } catch (error) {
    console.error('Error fetching overtime rule:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const existingRule = await prisma.overtimeRule.findUnique({
      where: { id: params.id },
      include: { payRule: true }
    })

    if (!existingRule || existingRule.payRule.businessId !== user.businessId) {
      return NextResponse.json({ error: 'Overtime rule not found' }, { status: 404 })
    }

    const updatedRule = await prisma.$transaction(async (tx) => {
      if (name || description || salaryCodeId) {
        await tx.payRule.update({
          where: { id: existingRule.payRuleId },
          data: {
            ...(name && { name }),
            ...(description && { description }),
            ...(salaryCodeId && { salaryCodeId })
          }
        })
      }

      const overtime = await tx.overtimeRule.update({
        where: { id: params.id },
        data: {
          ...(hoursThreshold && { triggerAfterHours: parseFloat(hoursThreshold) }),
          ...(multiplier && { rateMultiplier: parseFloat(multiplier) }),
          ...(maxOvertimeHours !== undefined && { 
            maxHoursPerDay: maxOvertimeHours ? parseFloat(maxOvertimeHours) : null 
          })
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

      return overtime
    })

    return NextResponse.json(updatedRule)
  } catch (error) {
    console.error('Error updating overtime rule:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (user.role === 'EMPLOYEE') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const existingRule = await prisma.overtimeRule.findUnique({
      where: { id: params.id },
      include: { payRule: true }
    })

    if (!existingRule || existingRule.payRule.businessId !== user.businessId) {
      return NextResponse.json({ error: 'Overtime rule not found' }, { status: 404 })
    }

    await prisma.$transaction(async (tx) => {
      await tx.overtimeRule.delete({
        where: { id: params.id }
      })

      await tx.payRule.delete({
        where: { id: existingRule.payRuleId }
      })
    })

    return NextResponse.json({ message: 'Overtime rule deleted successfully' })
  } catch (error) {
    console.error('Error deleting overtime rule:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
