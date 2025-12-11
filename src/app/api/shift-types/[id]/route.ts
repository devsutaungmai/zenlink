import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/shared/lib/prisma'
import { getCurrentUser } from '@/shared/lib/auth'

// PATCH /api/shift-types/[id] - Update a shift type
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!user.businessId) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    const body = await request.json()
    const { name, salaryCode, payCalculationType, payCalculationValue,autoBreakType,autoBreakValue,description } = body

    // Verify the shift type belongs to the user's business
    const shiftType = await prisma.shiftTypeConfig.findUnique({
      where: { id: id },
    })

    if (!shiftType) {
      return NextResponse.json({ error: 'Shift type not found' }, { status: 404 })
    }

    if (shiftType.businessId !== user.businessId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Check if another shift type with the same name exists
    if (name && name !== shiftType.name) {
      const existing = await prisma.shiftTypeConfig.findFirst({
        where: {
          name,
          businessId: user.businessId,
          id: { not: id },
        },
      })

      if (existing) {
        return NextResponse.json(
          { error: 'Shift type with this name already exists' },
          { status: 409 }
        )
      }
    }

    const updated = await prisma.shiftTypeConfig.update({
      where: { id: id },
      data: {
        name: name || shiftType.name,
        salaryCode: salaryCode || shiftType.salaryCode,
        payCalculationType: payCalculationType || shiftType.payCalculationType,
        payCalculationValue: payCalculationValue !== undefined 
          ? (payCalculationValue ? parseFloat(payCalculationValue) : null)
          : shiftType.payCalculationValue,
        autoBreakType: autoBreakType || shiftType.autoBreakType,
        autoBreakValue:
        autoBreakType === 'MANUAL_BREAK' ? null
        : autoBreakValue !== undefined && autoBreakValue !== null
        ? parseFloat(autoBreakValue)
        : shiftType.autoBreakValue,
        description: description !== undefined ? (description || null) : shiftType.description,
      },
    })

    return NextResponse.json({ shiftType: updated })
  } catch (error) {
    console.error('Error updating shift type:', error)
    return NextResponse.json(
      { error: 'Failed to update shift type' },
      { status: 500 }
    )
  }
}

// DELETE /api/shift-types/[id] - Delete a shift type
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!user.businessId) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    // Verify the shift type belongs to the user's business
    const shiftType = await prisma.shiftTypeConfig.findUnique({
      where: { id: id },
    })

    if (!shiftType) {
      return NextResponse.json({ error: 'Shift type not found' }, { status: 404 })
    }

    if (shiftType.businessId !== user.businessId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    await prisma.shiftTypeConfig.delete({
      where: { id: id },
    })

    return NextResponse.json({ message: 'Shift type deleted successfully' })
  } catch (error) {
    console.error('Error deleting shift type:', error)
    return NextResponse.json(
      { error: 'Failed to delete shift type' },
      { status: 500 }
    )
  }
}
