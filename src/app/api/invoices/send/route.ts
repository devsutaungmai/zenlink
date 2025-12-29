import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/shared/lib/prisma'
import { generateVoucherNumber, getBusinessId, invoiceToLedgerPosting } from '@/shared/lib/invoiceHelper'
import { VoucherType } from '@prisma/client'

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
    let invoiceId = '';
    for(const id of ids) {
     invoiceId = id
    
    // Check if invoice exists and belongs to the business
    const existingInvoice = await prisma.invoice.findFirst({
      where: {
        id: invoiceId,
        businessId
      }
    })

    if (!existingInvoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      )
    }

    if (existingInvoice.status === "SENT") {
      const voucher = await generateVoucherNumber(businessId, VoucherType.INVOICE);

      await prisma.invoice.update({
        where: { id: existingInvoice.id },
        data: { voucherId: voucher.id }
      });

      await invoiceToLedgerPosting(existingInvoice.id);
    }
  

    return NextResponse.json(existingInvoice)}
  } catch (error) {
    console.error('Error updating invoice:', error)
    return NextResponse.json(
      { error: 'Failed to update invoice', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}