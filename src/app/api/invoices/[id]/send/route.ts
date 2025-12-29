import { NextRequest, NextResponse } from 'next/server'
import { VoucherType } from '@prisma/client'
import { generateVoucherNumber, getBusinessId, invoiceToLedgerPosting } from '@/shared/lib/invoiceHelper'
import { prisma } from '@/shared/lib/prisma'

// POST /api/invoices/send
export async function POST(request: NextRequest) {
  try {
    const businessId = await getBusinessId()
    if (!businessId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { ids, sendType } = body

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'Invoice IDs are required' },
        { status: 400 }
      )
    }

    const updatedInvoices = []

    // Process each invoice
    for (const id of ids) {
      // Check if invoice exists and belongs to the business
      const existingInvoice = await prisma.invoice.findFirst({
        where: {
          id,
          businessId
        }
      })

      if (!existingInvoice) {
        console.warn(`Invoice ${id} not found or doesn't belong to business`)
        continue
      }

      // Only process DRAFT invoices
      if (existingInvoice.status !== 'DRAFT') {
        console.warn(`Invoice ${id} is not in DRAFT status, skipping`)
        continue
      }

      // Generate voucher number
      const voucher = await generateVoucherNumber(businessId, VoucherType.INVOICE)

      // Update invoice status to OUTSTANDING and set voucher number
      const updatedInvoice = await prisma.invoice.update({
        where: { id: existingInvoice.id },
        data: {
          status: 'OUTSTANDING',
          voucherId: voucher.id,
          sentAt: new Date()
        },
        include: {
          customer: true,
          invoiceLines: {
            include: {
              product: true
            }
          }
        }
      })

      // Create ledger postings
      await invoiceToLedgerPosting(updatedInvoice.id)

      updatedInvoices.push(updatedInvoice)
    }

    if (updatedInvoices.length === 0) {
      return NextResponse.json(
        { error: 'No invoices were updated' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      count: updatedInvoices.length,
      invoices: updatedInvoices,
      // Return first invoice for backward compatibility with email sending
      id: updatedInvoices[0].id
    })

  } catch (error) {
    console.error('Error updating invoice:', error)
    return NextResponse.json(
      { 
        error: 'Failed to update invoice', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}