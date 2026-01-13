'use client'

import { useEffect, useState } from 'react'
import { ChevronUpIcon, ChevronDownIcon, InformationCircleIcon } from '@heroicons/react/24/outline'
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

export default function InvoiceSummaryCalculation({ invoiceLines }: InvoiceSummaryCalculationProps) {

    const [summary, setSummary] = useState<Summary>({
        netAmount: 0,
        vatAmount: 0,
        totalAmount: 0,
    });

    useEffect(() => {
        console.log('Recalculating summary totals...', invoiceLines);
        let finalNetAmount = 0;
        let finalVatAmount = 0;
        let FinalTotalAmount = 0;
       invoiceLines.forEach(line => {
          const {totalExclVAT,vatAmount,totalInclVAT}= calculateInvoiceTotals(line.quantity, line.pricePerUnit, line.discountPercentage, line.vatPercentage);
            finalNetAmount += totalExclVAT;
            finalVatAmount += vatAmount;
            FinalTotalAmount += totalInclVAT;
       });

        setSummary({
            netAmount: finalNetAmount,
            vatAmount: finalVatAmount,
            totalAmount: FinalTotalAmount,
        });
    }, [invoiceLines]);

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
        <div className="bg-gray-50 px-6 py-4 flex items-center justify-between cursor-pointer">
            <h3 className="text-gray-900 font-medium text-lg">Summary Calculation</h3>
            <InformationCircleIcon className="h-5 w-5 text-gray-400" />
        </div>
        <div className="px-6 py-4 space-y-4">
           
            {invoiceLines.map((line,index) => (
                <div key={index} className="flex items-center justify-between">
                    <span className="text-gray-700">{line.productName} - VAT ({line.vatPercentage}%)</span>
                    <span className="text-gray-900 font-medium">
                        {((line.quantity * line.pricePerUnit * (1 - line.discountPercentage / 100)) * (line.vatPercentage / 100)).toFixed(2)}
                    </span>
                </div>
            ))}
             <div className="flex items-center justify-between">
                <span className="text-gray-700">Net Amount</span>
                <span className="text-gray-900 font-medium">
                   {summary.netAmount.toFixed(2)}
                </span>
            </div>
            <div className="flex items-center justify-between border-t border-gray-200 pt-4">
                <span className="text-gray-700 font-semibold">Total VAT AMOUNT</span>
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
