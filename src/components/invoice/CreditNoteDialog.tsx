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

}

export default function CreditNoteDialog({ open, onOpenChange ,creditNoteData, fetchInvoices}: CreditNoteDialogProps) {
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
        onOpenChange(false)
        await fetchInvoices();
        router.refresh()
      }
    } catch (error) {
      console.error("Failed to create credit note:", error)
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40" />
        <Dialog.Content className="fixed top-[54%] left-[50%] -translate-x-[50%] -translate-y-[50%] w-full max-w-2xl rounded-xl bg-white shadow-lg p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-1">
            <Dialog.Title className="text-3xl font-semibold text-gray-900">Credit note</Dialog.Title>
            <Dialog.Close asChild>
              <button className="p-2 rounded-lg hover:bg-gray-100">
                <X size={24} />
              </button>
            </Dialog.Close>
          </div>

          {/* Customer & Invoice Info */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">{creditNote.customer?.customerName}</h3>
            <p className="text-gray-600 text-sm">Invoice #{creditNote.invoiceId}</p>
          </div>

          {/* Form Fields */}
          <div className="space-y-6 mb-8">
            {/* Date */}
            <div>
              <label className="block text-gray-900 font-medium text-sm mb-2">Date</label>
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
                  className="bg-transparent outline-none text-sm w-40"
                />
                <Calendar size={18} className="text-gray-600" />
              </div>
            </div>

            {/* Sending Type */}
            {/* <div>
              <label className="block text-gray-900 font-medium text-sm mb-3">Sending type</label>
              <div className="flex items-center gap-8">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="sendingType"
                    value="email"
                    checked={creditNote.sendingType === "email"}
                    onChange={(e) =>
                      setCreditNote({
                        ...creditNote,
                        sendingType: "email",
                      })
                    }
                    className="w-5 h-5 accent-blue-600"
                  />
                  <span className="text-gray-700 text-sm font-medium">Email</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="sendingType"
                    value="no-send"
                    checked={creditNote.sendingType === "no-send"}
                    onChange={(e) =>
                      setCreditNote({
                        ...creditNote,
                        sendingType: "no-send",
                      })
                    }
                    className="w-5 h-5 accent-blue-600"
                  />
                  <span className="text-gray-700 text-sm font-medium">Do not send</span>
                </label>
              </div>
            </div> */}

            {/* Email Address - Only show if Email is selected */}
            {/* {creditNote.sendingType === "email" && (
              <div>
                <label className="block text-gray-900 font-medium text-sm mb-2">
                  Email address <span className="text-red-600">*</span>
                </label>
                <input
                  type="email"
                  value={creditNote.emailAddress}
                  onChange={(e) =>
                    setCreditNote({
                      ...creditNote,
                      emailAddress: e.target.value,
                    })
                  }
                  placeholder="pyaephoo66@gmail.com"
                  className="w-full border border-gray-300 px-4 py-3 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            )} */}

            {/* Comment */}
            <div>
              <label className="block text-gray-900 font-medium text-sm mb-2">Comment</label>
              <textarea
                value={creditNote.comment}
                onChange={(e) =>
                  setCreditNote({
                    ...creditNote,
                    comment: e.target.value,
                  })
                }
                placeholder="Add any notes or comments here..."
                className="w-full border border-gray-300 px-4 py-3 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 resize-none h-32"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-6 border-t border-gray-200">
            <div className="flex items-center gap-4">
              <button
                onClick={handleSubmit}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
              >
                Send credit note
              </button>
              <Dialog.Close asChild>
                <button className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors">
                  Cancel
                </button>
              </Dialog.Close>
            </div>

            {/* Amount Display */}
            <div className="text-right">
              <p className="text-gray-600 text-sm mb-1">Amount</p>
              <p className="text-2xl font-semibold text-gray-900">NOK -{Math.abs(creditNote.amount).toFixed(2)}</p>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
