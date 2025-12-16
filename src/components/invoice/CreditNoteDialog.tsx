"use client"

import * as Dialog from "@radix-ui/react-dialog"
import { X, Calendar, Info } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

interface Customer {
  id: string
  customerName: string
}

interface CreditNoteData {
  customer: Customer | undefined
  invoiceId: string
  amount: number | null
}

interface CreditNoteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  creditNoteData: CreditNoteData
  fetchInvoices: () => Promise<void>
  loadingCredit: boolean
  setLoadingCredit: (loadingCredit: boolean) => void
}

export default function CreditNoteDialog({ open, onOpenChange, creditNoteData, fetchInvoices, loadingCredit, setLoadingCredit }: CreditNoteDialogProps) {
  const router = useRouter()
  const [creditNote, setCreditNote] = useState({
    customer: creditNoteData.customer || { id: "", customerName: "" },
    invoiceId: creditNoteData.invoiceId,
    date: new Date().toISOString().split("T")[0],
    sendingType: "email" as "email" | "no-send",
    emailAddress: "",
    comment: "",
    amount: creditNoteData.amount || 0,
  })

  useEffect(() => {
    console.log("creditNoteData changed:", creditNoteData);
    setCreditNote({
      customer: creditNoteData.customer || { id: "", customerName: "" },
      invoiceId: creditNoteData.invoiceId,
      date: new Date().toISOString().split("T")[0],
      sendingType: "email",
      emailAddress: "",
      comment: "",
      amount: creditNoteData.amount || 0,
    })
  }, [creditNoteData])

  const handleSubmit = async () => {

    try {
      setLoadingCredit(true)
      const response = await fetch(`/api/invoices/${creditNote.invoiceId}/customer/credit-note`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: creditNote.customer.id,
          creditNoteDate: creditNote.date,
          comment: creditNote.comment,
          amount: creditNote.amount,
        }),
      })

      if (response.ok) {
        setLoadingCredit(false)
        onOpenChange(false)
        await fetchInvoices();
        router.refresh()
      }
    } catch (error) {
      console.error("Failed to create credit note:", error)
    }
  }
  return (
    <Dialog.Root open={open} onOpenChange={(isOpen) => {
      if (loadingCredit) return;
      onOpenChange(isOpen)
    }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40" />
        <Dialog.Content className="fixed left-[50%] top-[50%] -translate-x-[50%] -translate-y-[50%] w-[calc(100%-2rem)] max-w-sm sm:max-w-lg md:max-w-2xl rounded-xl bg-white shadow-lg p-4 sm:p-6 md:p-8 max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-4 sm:mb-6 md:mb-8">
            <Dialog.Title className="text-xl sm:text-2xl md:text-3xl font-semibold text-gray-900">
              Credit note
            </Dialog.Title>
            <Dialog.Close asChild>
              <button className="p-2 rounded-lg hover:bg-gray-100">
                <X size={20} className="sm:w-6 sm:h-6" />
              </button>
            </Dialog.Close>
          </div>

          {/* Customer & Invoice Info */}
          <div className="mb-6 sm:mb-8 md:mb-8">
            <h3 className="text-base sm:text-lg md:text-lg font-semibold text-gray-900 mb-1">
              {creditNote.customer?.customerName}
            </h3>
            <p className="text-gray-600 text-xs sm:text-sm">Invoice #{creditNote.invoiceId}</p>
          </div>

          {/* Form Fields */}
          <div className="space-y-4 sm:space-y-6 mb-6 sm:mb-8">
            {/* Date */}
            <div>
              <label className="block text-gray-900 font-medium text-xs sm:text-sm mb-2">Date</label>
              <div className="flex items-center gap-2 border border-gray-300 px-3 py-2 rounded-md w-fit">
                <input
                  type="date"
                  value={creditNote.date || ""}
                  onChange={(e) =>
                    setCreditNote({
                      ...creditNote,
                      date: e.target.value,
                    })
                  }
                  className="bg-transparent outline-none text-xs sm:text-sm w-32 sm:w-40"
                />
                <Calendar size={16} className="sm:w-[18px] sm:h-[18px] text-gray-600" />
              </div>
            </div>

            {/* Comment */}
            <div>
              <label className="block text-gray-900 font-medium text-xs sm:text-sm mb-2">Comment</label>
              <textarea
                value={creditNote.comment}
                onChange={(e) =>
                  setCreditNote({
                    ...creditNote,
                    comment: e.target.value,
                  })
                }
                placeholder="Add any notes or comments here..."
                className="w-full border border-gray-300 px-4 py-3 rounded-md text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 resize-none h-24 sm:h-32"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-4 sm:pt-6 border-t border-gray-200">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loadingCredit}
                aria-busy={loadingCredit}
                className={`w-full sm:w-auto px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg transition-colors text-sm flex items-center justify-center ${loadingCredit ? "opacity-80 cursor-not-allowed" : "hover:bg-blue-700"
                  }`}
              >
                {loadingCredit ? (
                  <>
                    <span className="inline-block h-4 w-4 mr-2 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Send credit note"
                )}
              </button>
              <Dialog.Close asChild>
                <button
                  type="button"
                  disabled={loadingCredit}
                  className={`w-full sm:w-auto px-6 py-3 bg-gray-100 text-gray-700 font-medium rounded-lg transition-colors text-sm ${loadingCredit ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-200"
                    }`}
                >
                  Cancel
                </button>
              </Dialog.Close>
            </div>

            {/* Amount Display */}
            <div className="text-right w-full sm:w-auto">
              <p className="text-gray-600 text-xs sm:text-sm mb-1">Amount</p>
              <p className="text-xl sm:text-2xl font-semibold text-gray-900">
                NOK -{Math.abs(creditNote.amount).toFixed(2)}
              </p>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
