// /api/invoices/credit-note/standalone/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getBusinessId, createCreditNoteRecord, generateCreditNoteNumber, generateVoucherNumber, calculateInvoiceTotals, invoiceToLedgerPosting } from '@/shared/lib/invoiceHelper';
import { InvoiceStatus, VoucherType } from '@prisma/client';
import { prisma } from '@/shared/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const businessId = await getBusinessId();
    if (!businessId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { customerId, creditNoteDate, comment, lines, projectId, departmentId, contactPersonId,sourceDraftId} = body ?? {};

    if (!customerId || !creditNoteDate || !lines?.length) {
      return NextResponse.json({ error: 'Missing required fields: customerId, creditNoteDate, lines' }, { status: 400 });
    }

    const parsedDate = new Date(creditNoteDate);
    if (Number.isNaN(parsedDate.getTime())) {
      return NextResponse.json({ error: 'Invalid creditNoteDate' }, { status: 400 });
    }

     if (sourceDraftId) {
      const sourceDraft = await prisma.invoice.findFirst({
        where: { id: sourceDraftId, businessId, status: InvoiceStatus.DRAFT },
      });
      if (!sourceDraft) {
        return NextResponse.json(
          { error: 'Source draft invoice not found or is no longer a draft' },
          { status: 404 }
        );
      }
    }

    let creditNote: any = null;

    await prisma.$transaction(async (tx) => {
      // Delete the source draft inside the transaction so it's atomic
      // (if credit note creation fails, draft is NOT deleted)
      if (sourceDraftId) {
        await tx.invoiceLine.deleteMany({ where: { invoiceId: sourceDraftId } });
        await tx.invoice.delete({ where: { id: sourceDraftId } });
      }
 
      const { year, sequence, creditNoteNumber } = await generateCreditNoteNumber(businessId, tx);
      const voucher = await generateVoucherNumber(businessId, VoucherType.CREDIT_NOTE, tx);

      // Map frontend lines to the shape createCreditNoteRecord expects
      const mappedLines = lines.map((line: any) => {
        const qty = Math.abs(Number(line.quantity));
        const price = Math.abs(Number(line.pricePerUnit));
        const discount = Number(line.discountPercentage ?? 0);
        const vat = Number(line.vatPercentage ?? 0);
        const { totalExclVAT, vatAmount } = calculateInvoiceTotals(qty, price, discount, vat);

        return {
          productId: line.productId,
          productName: line.productName,
          productNumber: line.productNumber ?? null,
          quantity: qty,
          pricePerUnit: price,
          discountPercentage: discount,
          vatPercentage: vat,
          subtotal: qty * price,
          discountAmount: (qty * price) * (discount / 100),
          lineTotal: totalExclVAT,
          vatAmount,
        };
      });

      creditNote = await createCreditNoteRecord({
        businessId,
        customerId,
        creditNoteDate: parsedDate,
        reason: comment || 'Standalone credit note',
        lines: mappedLines,
        creditedInvoiceId: null, // standalone — not linked to any invoice
        projectId: projectId ?? null,
        departmentId: departmentId ?? null,
        contactPersonId: contactPersonId ?? null,
        voucherId: voucher.id,
        creditNoteNumber,
        year,
        sequence,
      }, tx);
    },{ timeout: 30000 });

    if (!creditNote) throw new Error('Failed to create standalone credit note');

    await invoiceToLedgerPosting(creditNote.id);

    return NextResponse.json({ success: true, creditNote }, { status: 201 });
  } catch (err: any) {
    const message = err?.message ?? 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}