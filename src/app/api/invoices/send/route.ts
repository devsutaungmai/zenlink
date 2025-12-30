import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/shared/lib/prisma'
import { generateVoucherNumber, getBusinessId, invoiceToLedgerPosting } from '@/shared/lib/invoiceHelper'
import { InvoiceStatus, VoucherType } from '@prisma/client'

// POST /api/invoices/send
export async function POST(
  request: NextRequest
) {
  try {
    const businessId = await getBusinessId()
    if (!businessId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const body = await request.json()
    const { ids, sendType } = body
    const processedInvoices: string[] = []
    const errors: { id: string; error: string }[] = []
    for (const id of ids) {
      // Check if invoice exists and belongs to the business
      const existingInvoice = await prisma.invoice.findFirst({
        where: {
          id: id,
          businessId
        }
      })

      if (!existingInvoice) {
        errors.push({ id, error: 'Invoice not found' })
        continue
      }

      if (existingInvoice.status === InvoiceStatus.DRAFT) {
        const voucher = await generateVoucherNumber(businessId, VoucherType.INVOICE);

        await prisma.invoice.update({
          where: { id: existingInvoice.id },
          data: { voucherId: voucher.id, status: InvoiceStatus.SENT }
        });

        await invoiceToLedgerPosting(existingInvoice.id);
        processedInvoices.push(existingInvoice.id)
      } else {
        errors.push({ id, error: 'Invoice is not in DRAFT status' })
      }
    }
    return NextResponse.json({ processedInvoices, errors }, { status: 200 })
  } catch (error) {
    console.error('Error updating invoice:', error)
    return NextResponse.json(
      { error: 'Failed to update invoice', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}