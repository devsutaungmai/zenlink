'use client'

import { useMemo } from 'react'
import { InformationCircleIcon } from '@heroicons/react/24/outline'
import { InvoiceLine } from '@/app/dashboard/invoices/create/page'
import { calculateInvoiceTotals } from '@/shared/lib/invoiceHelper'

interface InvoiceSummaryCalculationProps {
    invoiceLines: InvoiceLine[]
}

interface Summary {
    netAmount: number
    vatAmount: number
    totalAmount: number
}

interface VatBreakdown {
    vatPercentage: number
    netAmount: number
    vatAmount: number
}

export default function InvoiceSummaryCalculation({ invoiceLines }: InvoiceSummaryCalculationProps) {

    // Use useMemo instead of useEffect + useState for better performance and reactivity
    const { summary, vatBreakdowns } = useMemo(() => {
        console.log('Recalculating summary totals...', invoiceLines);
        let finalNetAmount = 0;
        let finalVatAmount = 0;
        let finalTotalAmount = 0;

        // Group VAT amounts by percentage
        const vatMap = new Map<number, { netAmount: number, vatAmount: number }>();

        invoiceLines.forEach((line) => {
            const { totalExclVAT, vatAmount, totalInclVAT } = calculateInvoiceTotals(
                Number(line.quantity) || 0,
                Number(line.pricePerUnit) || 0,
                Number(line.discountPercentage) || 0,
                Number(line.vatPercentage) || 0
            );

            finalNetAmount += totalExclVAT;
            finalVatAmount += vatAmount;
            finalTotalAmount += totalInclVAT;

            // Group by VAT percentage
            const vatKey = Number(line.vatPercentage) || 0;
            const current = vatMap.get(vatKey) || { netAmount: 0, vatAmount: 0 };
            vatMap.set(vatKey, {
                netAmount: current.netAmount + totalExclVAT,
                vatAmount: current.vatAmount + vatAmount
            });
        });

        // Convert map to array and sort by VAT percentage
        const breakdowns = Array.from(vatMap.entries())
            .map(([vatPercentage, amounts]) => ({
                vatPercentage,
                netAmount: amounts.netAmount,
                vatAmount: amounts.vatAmount
            }))
            .sort((a, b) => b.vatPercentage - a.vatPercentage); // Sort descending

        return {
            summary: {
                netAmount: finalNetAmount,
                vatAmount: finalVatAmount,
                totalAmount: finalTotalAmount
            },
            vatBreakdowns: breakdowns
        };
    }, [invoiceLines]);

    return (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
            <div className="bg-gray-50 px-6 py-4 flex items-center justify-between cursor-pointer">
                <h3 className="text-gray-900 font-medium text-lg">Summary Calculation</h3>
                <InformationCircleIcon className="h-5 w-5 text-gray-400" />
            </div>
            <div className="px-6 py-4 space-y-4">
                <div className="flex items-center justify-between">
                    <span className="text-gray-700">Net Amount</span>
                    <span className="text-gray-900 font-medium">
                        {summary.netAmount.toFixed(2)}
                    </span>
                </div>

                {/* VAT Breakdown by percentage */}
                {vatBreakdowns.length > 0 && (
                    <div className="border-t border-gray-200 pt-4 space-y-2">
                        {vatBreakdowns.map((breakdown, index) => (
                            <div key={`${breakdown.vatPercentage}-${index}`} className="flex items-center justify-between">
                                <span className="text-gray-700">
                                    VAT ({breakdown.vatPercentage}%) of {breakdown.netAmount.toFixed(2)} - {breakdown.vatAmount.toFixed(2)}
                                </span>
                               
                            </div>
                        ))}
                    </div>
                )}

                <div className="flex items-center justify-between border-t border-gray-200 pt-4">
                    <span className="text-gray-700 font-semibold">Total VAT Amount</span>
                    <span className="text-gray-900 font-semibold">
                        {summary.vatAmount.toFixed(2)}
                    </span>
                </div>
                <div className="flex items-center justify-between border-t border-gray-200 pt-4">
                    <span className="text-gray-900 font-semibold">Total NOK</span>
                    <span className="text-gray-900 font-semibold">
                        {summary.totalAmount.toFixed(2)}
                    </span>
                </div>
            </div>
        </div>
    )
}