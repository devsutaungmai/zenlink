// app/api/ledger/report/route.ts
import { getBusinessId } from '@/shared/lib/invoiceHelper';
import { prisma } from '@/shared/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    try {

        const businessId = await getBusinessId()
        if (!businessId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
        const vatCodes = await prisma.vatCode.findMany({
            orderBy: { code: 'asc' }
        });

        return NextResponse.json(vatCodes);
    } catch (error) {
        console.error('VAT codes error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch VAT codes' },
            { status: 500 }
        );
    }
}