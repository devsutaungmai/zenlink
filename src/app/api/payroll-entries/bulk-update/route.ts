import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/app/lib/prisma'
import { getCurrentUserOrEmployee } from '@/lib/auth'

export async function PATCH(request: NextRequest) {
  try {
    const auth = await getCurrentUserOrEmployee()
    if (!auth || auth.type !== 'user') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { entryIds, status } = body

    if (!entryIds || !Array.isArray(entryIds) || entryIds.length === 0) {
      return NextResponse.json(
        { error: 'Entry IDs array is required' },
        { status: 400 }
      )
    }

    if (!status || !['DRAFT', 'APPROVED', 'PAID'].includes(status)) {
      return NextResponse.json(
        { error: 'Valid status is required (DRAFT, APPROVED, or PAID)' },
        { status: 400 }
      )
    }

    const user = auth.data as any
    const businessId = user.businessId

    // Verify all entries belong to this business
    const entries = await prisma.payrollEntry.findMany({
      where: {
        id: { in: entryIds },
        employee: {
          user: {
            businessId
          }
        }
      },
      select: { id: true }
    })

    if (entries.length !== entryIds.length) {
      return NextResponse.json(
        { error: 'Some entries not found or do not belong to your business' },
        { status: 404 }
      )
    }

    // Update all entries
    const result = await prisma.payrollEntry.updateMany({
      where: {
        id: { in: entryIds }
      },
      data: {
        status,
        updatedAt: new Date()
      }
    })

    return NextResponse.json({
      message: `Successfully updated ${result.count} payroll ${result.count === 1 ? 'entry' : 'entries'}`,
      count: result.count
    })
  } catch (error) {
    console.error('Error updating payroll entries:', error)
    return NextResponse.json(
      { error: 'Failed to update payroll entries' },
      { status: 500 }
    )
  }
}
