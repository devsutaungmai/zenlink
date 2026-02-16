// app/api/ledger/report/route.ts
import { getBusinessId, getCustomerLedger } from '@/shared/lib/invoiceHelper';
import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {

        const businessId = await getBusinessId()
        if (!businessId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
        const searchParams = request.nextUrl.searchParams;

        // Get parameters from query string
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
        const customerIdParam = searchParams.get('customerId');
        const onlyOpenItems = searchParams.get('onlyOpenItems') === 'true';

        if (!startDate || !endDate) {
            return NextResponse.json(
                { error: 'Missing required parameters: businessId, startDate, endDate' },
                { status: 400 }
            );
        }

        const report = await getCustomerLedger({businessId,
            fromDate: new Date(startDate),
            toDate: new Date(endDate),
            customerId: customerIdParam ?? undefined,
            onlyOpenItems: onlyOpenItems}
        )

        return NextResponse.json(report);
    } catch (error) {
        console.error('Customer Ledger report error:', error);
        return NextResponse.json(
            { error: 'Failed to generate customer ledger report' },
            { status: 500 }
        );
    }
}