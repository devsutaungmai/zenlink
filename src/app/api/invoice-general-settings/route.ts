import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/shared/lib/prisma'
import { getCurrentUserOrEmployee } from '@/shared/lib/auth'

// GET /api/invoice-general-settings - Fetch invoice general settings
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
    let settings = await prisma.invoiceGeneralSetting.findUnique({
      where: { businessId }
    })

    // If no settings exist, create default ones
    if (!settings) {
      settings = await prisma.invoiceGeneralSetting.create({
        data: {
          businessId,
          firstInvoiceNumber: 1,
          firstCreditNoteNumber: 1,
          defaultPaymentTermsDays: 30,
          defaultDueDays: 30
        }
      })
    }

    return NextResponse.json({ 
      success: true,
      settings 
    })

  } catch (error) {
    console.error('Error fetching invoice settings:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/invoice-general-settings - Create or update invoice general settings
export async function POST(request: NextRequest) {
  try {
    const auth = await getCurrentUserOrEmployee()

    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let businessId: string
    if (auth.type === 'user') {
      businessId = (auth.data as any).businessId
    } else {
      const employeeData = auth.data as any
      if (!employeeData.department || !employeeData.department.businessId) {
        return NextResponse.json({ error: 'Employee department not found' }, { status: 404 })
      }
      businessId = employeeData.department.businessId
    }

    if (!businessId) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    const body = await request.json()

    console.log('Saving invoice settings with data:', JSON.stringify(body))

    // Validation
    if (body.firstInvoiceNumber && body.firstInvoiceNumber < 1) {
      return NextResponse.json(
        { error: 'First invoice number must be at least 1' },
        { status: 400 }
      )
    }

    if (body.firstCreditNoteNumber && body.firstCreditNoteNumber < 1) {
      return NextResponse.json(
        { error: 'First credit note number must be at least 1' },
        { status: 400 }
      )
    }

    if (body.customerNumberSeriesStart && body.customerNumberSeriesEnd) {
      if (body.customerNumberSeriesStart >= body.customerNumberSeriesEnd) {
        return NextResponse.json(
          { error: 'Customer number series start must be less than end' },
          { status: 400 }
        )
      }
    }

    // Check if settings already exist
    const existingSettings = await prisma.invoiceGeneralSetting.findUnique({
      where: { businessId }
    })

    let settings

    if (existingSettings) {
      // Update existing settings
      settings = await prisma.invoiceGeneralSetting.update({
        where: { businessId },
        data: {
          firstInvoiceNumber: body.firstInvoiceNumber || 1,
          firstCreditNoteNumber: body.firstCreditNoteNumber || 1,
          customerNumberSeriesStart: body.customerNumberSeriesStart || null,
          customerNumberSeriesEnd: body.customerNumberSeriesEnd || null,
          defaultBankAccount: body.defaultBankAccount || null,
          defaultPaymentTermsDays: body.defaultPaymentTermsDays || 30,
          defaultDueDays: body.defaultDueDays || 30,
          // Set nextCustomerNumber if series is being set for the first time
          nextCustomerNumber: existingSettings.nextCustomerNumber || body.customerNumberSeriesStart || null
        }
      })
    } else {
      // Create new settings
      settings = await prisma.invoiceGeneralSetting.create({
        data: {
          businessId,
          firstInvoiceNumber: body.firstInvoiceNumber || 1,
          firstCreditNoteNumber: body.firstCreditNoteNumber || 1,
          customerNumberSeriesStart: body.customerNumberSeriesStart || null,
          customerNumberSeriesEnd: body.customerNumberSeriesEnd || null,
          defaultBankAccount: body.defaultBankAccount || null,
          defaultPaymentTermsDays: body.defaultPaymentTermsDays || 30,
          defaultDueDays: body.defaultDueDays || 30,
          nextCustomerNumber: body.customerNumberSeriesStart || null
        }
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Settings saved successfully',
      settings
    }, { status: 200 })

  } catch (error: any) {
    console.error('Error saving invoice settings:', error)
    
    // Handle Prisma unique constraint errors
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Settings already exist for this business' },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}