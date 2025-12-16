import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, Prisma, LedgerEntryType, VoucherType } from '@prisma/client';
import { generateVoucherNumber, getBusinessId } from '@/shared/lib/invoiceHelper';

const prisma = new PrismaClient();

async function customerPaid(params: {
    invoiceId: string;
    customerId: string;
    businessId: string;
    paymentDate: Date;
    paymentMethod: 'BANK' | 'CASH';
    amount: number;
}) {
    return await prisma.$transaction(async (tx) => {
        const { invoiceId, customerId, businessId, paymentDate, paymentMethod, amount } = params;

        const invoice = await tx.invoice.findUnique({
            where: { id: invoiceId }
        });

        if (!invoice) throw new Error('Invoice not found');
        if (invoice.status !== 'OUTSTANDING') throw new Error('Invoice must be OUTSTANDING to receive payment');

        const accountsReceivable = await tx.ledgerAccount.findFirst({
            where: { accountNumber: 1500 }
        });

        const paymentAccount = await tx.ledgerAccount.findFirst({
            where: {
                accountNumber: paymentMethod === 'BANK' ? 1900 : 1920
            }
        });

        if (!accountsReceivable || !paymentAccount) {
            throw new Error('Required payment accounts not found');
        }
        const voucher = await generateVoucherNumber(
            businessId,
            VoucherType.PAYMENT
        );

        const customerPayment = await tx.customerPayment.create({
            data: {
                customerId,
                businessId,
                paymentDate,
                voucherId: voucher.id ?? "",
                method: paymentMethod,
                amount: new Prisma.Decimal(amount),
                allocations: {
                    create: {
                        invoiceId,
                        amountAllocated: new Prisma.Decimal(amount)
                    }
                }
            }
        });

        await tx.ledgerEntry.create({
            data: {
                entryType: LedgerEntryType.PAYMENT_RECEIVED,
                invoiceId: invoice.id,
                voucherId: customerPayment.voucherId ?? "",
                documentDate: paymentDate,
                postingDate: new Date(),
                amount: new Prisma.Decimal(amount),
                debitAccountId: paymentAccount.id,
                creditAccountId: accountsReceivable.id,
                businessId,
                projectId: invoice.projectId,
                departmentId: invoice.departmentId,
                description: `Payment: Faktura ${invoice.invoiceNumber}`
            }
        });

        await tx.invoice.update({
            where: { id: invoiceId },
            data: { status: 'PAID', paidAt: paymentDate }
        });

        return customerPayment;
    });
}

export async function POST(request: NextRequest,
    { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const invoiceId = id;

        if (!invoiceId) {
            return NextResponse.json({ error: 'Missing invoice id in params' }, { status: 400 });
        }
        const businessId = await getBusinessId()
        if (!businessId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json();
        const { customerId, paymentDate, paymentMethod, amount } = body ?? {};

        if (!customerId || !paymentDate || !paymentMethod || amount == null) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        if (!['BANK', 'CASH'].includes(paymentMethod)) {
            return NextResponse.json({ error: 'Invalid paymentMethod' }, { status: 400 });
        }

        const parsedDate = new Date(paymentDate);
        if (Number.isNaN(parsedDate.getTime())) {
            return NextResponse.json({ error: 'Invalid paymentDate' }, { status: 400 });
        }

        const numericAmount = Number(amount);
        if (!isFinite(numericAmount) || numericAmount <= 0) {
            return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
        }

        const result = await customerPaid({
            invoiceId,
            customerId,
            businessId,
            paymentDate: parsedDate,
            paymentMethod,
            amount: numericAmount
        });

        return NextResponse.json(result, { status: 201 });
    } catch (err: any) {
        // simple error mapping
        const message = err?.message ?? 'Internal Server Error';
        const status = message === 'Invoice not found' ? 404 : message.startsWith('Invoice must be') ? 400 : 500;
        return NextResponse.json({ error: message }, { status });
    }
}
