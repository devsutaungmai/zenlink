// app/api/ledger/report/route.ts
import { generateLedgerReport, getBusinessId } from '@/shared/lib/invoiceHelper';
import { NextRequest, NextResponse } from 'next/server';

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
        const accountNumbersParam = searchParams.get('accountNumbers');

        if (!startDate || !endDate) {
            return NextResponse.json(
                { error: 'Missing required parameters: businessId, startDate, endDate' },
                { status: 400 }
            );
        }

        const accountNumbers = accountNumbersParam
            ? accountNumbersParam.split(',').map(n => parseInt(n.trim()))
            : undefined;

        const report = await generateLedgerReport(
            businessId,
            new Date(startDate),
            new Date(endDate),
            accountNumbers
        );

        return NextResponse.json(report);
    } catch (error) {
        console.error('Ledger report error:', error);
        return NextResponse.json(
            { error: 'Failed to generate ledger report' },
            { status: 500 }
        );
    }
}