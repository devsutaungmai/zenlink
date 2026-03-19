import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/shared/lib/prisma'
import { getCurrentUserOrEmployee } from '@/shared/lib/auth'
import { InvoiceStatus } from '@prisma/client'

// GET /api/invoice-started - Check if any invoice has been started (not in DRAFT status)
export async function GET(request: NextRequest) {
  try {
    const auth = await getCurrentUserOrEmployee()

    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let businessId: string
    if (auth.type === 'user') {
      businessId = (auth.data as any).businessId
    } else {
      // For employees, get businessId from their department
      const employeeData = auth.data as any
      if (!employeeData.department || !employeeData.department.businessId) {
        return NextResponse.json({ error: 'Employee department not found' }, { status: 404 })
      }
      businessId = employeeData.department.businessId
    }

    if (!businessId) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    // Fetch existing settings
    let firstInvoice = await prisma.invoice.findFirst({
      where: { businessId, status: {not:InvoiceStatus.DRAFT} }
    })

    // If no settings exist, create default ones
    if (firstInvoice) {
        return NextResponse.json({
            success: true,
            started: true
        })
    }
    return NextResponse.json({
        success: true,
        started: false
    })

  } catch (error) {
    console.error('Error fetching invoice settings:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}