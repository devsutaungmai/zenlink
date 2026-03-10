import { NextRequest, NextResponse } from 'next/server';
import { createCreditNote, getBusinessId } from '@/shared/lib/invoiceHelper';


export async function POST(request: NextRequest,
    { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const originalInvoiceId = id;

        if (!originalInvoiceId) {
            return NextResponse.json({ error: 'Missing original invoiceId id in params' }, { status: 400 });
        }
        const businessId = await getBusinessId()
        if (!businessId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json();
        const { creditNoteDate, comment, creditLineIds, rebillLines } = body ?? {};

        if (!creditNoteDate || !creditLineIds?.length) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const parsedDate = new Date(creditNoteDate);
        if (Number.isNaN(parsedDate.getTime())) {
            return NextResponse.json({ error: 'Invalid creditNoteDate' }, { status: 400 });
        }



        const result = await createCreditNote({
            originalInvoiceId: originalInvoiceId,
            reason: comment || "No reason provided",
            creditNoteDate: parsedDate,
            businessId: businessId,
            creditLineIds: creditLineIds,
            rebillLines: rebillLines || false
        });


        return NextResponse.json(result, { status: 201 });
    } catch (err: any) {
        // simple error mapping
        const message = err?.message ?? 'Internal Server Error';
        const status = message === 'Invoice not found' ? 404 : message.startsWith('Invoice must be') ? 400 : 500;
        return NextResponse.json({ error: message }, { status });
    }
}
