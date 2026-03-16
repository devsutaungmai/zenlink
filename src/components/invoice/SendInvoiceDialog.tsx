'use client'

import * as Dialog from '@radix-ui/react-dialog'
import { set } from 'date-fns'
import { X, ChevronDown } from 'lucide-react'
import { useEffect, useState } from 'react'

export type DeliveryMethod = 'EMAIL' | 'EHF' | 'PRINT'

export interface SendInvoiceDialogResult {
    sentAt: string
    dueDay: number
    paidAt: string
    deliveryMethod: DeliveryMethod
}

interface SendInvoiceDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    /** Default payment terms (days) — comes from customer settings, used to calculate due date */
    defaultDueDay?: number
    loading: boolean
    isCreditNote?: boolean
    onConfirm: (result: SendInvoiceDialogResult) => void
}

export default function SendInvoiceDialog({
    open,
    onOpenChange,
    defaultDueDay = 14,
    loading,
    isCreditNote = false,
    onConfirm,
}: SendInvoiceDialogProps) {
    const today = new Date().toISOString().split('T')[0]

    const [sentAt, setSentAt] = useState(today)
    const [paidAt, setPaidAt] = useState('')
    const [dueDay, setDueDay] = useState(defaultDueDay)
    const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>('EMAIL')

    // Reset to today every time dialog opens
    useEffect(() => {
        if (open) {
            setSentAt(today)
        }
    }, [open])

    // Recalculate due date whenever sentAt changes
    useEffect(() => {
        if (sentAt) {
            const sentDate = new Date(sentAt)
            const paidDate = new Date(sentDate)
            paidDate.setDate(paidDate.getDate() + Number(dueDay))
            setPaidAt(paidDate.toISOString().split('T')[0])
        }
    }, [sentAt, dueDay])

    const deliveryOptions: { id: DeliveryMethod; label: string; comingSoon?: boolean }[] = [
        { id: 'EHF', label: 'EHF', comingSoon: true },
        { id: 'EMAIL', label: 'E-mail' },
        { id: 'PRINT', label: 'Print' },
    ]

    const handleConfirm = () => {
        onConfirm({ sentAt, dueDay, paidAt, deliveryMethod })
    }

    return (
        <Dialog.Root open={open} onOpenChange={(isOpen) => {
            if (loading) return
            onOpenChange(isOpen)
        }}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40" />
                <Dialog.Content className="fixed left-[50%] top-[50%] -translate-x-[50%] -translate-y-[50%] w-[calc(100%-2rem)] max-w-md rounded-2xl bg-white shadow-2xl p-8 z-50">

                    {/* Header */}
                    <div className="flex items-center justify-between mb-8">
                        <Dialog.Title className="text-2xl font-bold text-gray-900">
                            {isCreditNote ? 'Send credit note' : 'Send invoice'}
                        </Dialog.Title>
                        <Dialog.Close asChild>
                            <button
                                disabled={loading}
                                className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
                            >
                                <X size={22} className="text-gray-500" />
                            </button>
                        </Dialog.Close>
                    </div>

                    {/* Fields */}
                    <div className="space-y-6">

                        {/* Invoice Date */}
                        <div className="flex items-center gap-6">
                            <label className="text-sm text-gray-600 w-40 shrink-0">
                                Invoice date
                            </label>
                            <input
                                type="date"
                                value={sentAt}
                                onChange={(e) => setSentAt(e.target.value)}
                                className="flex-1 border border-gray-300 rounded-xl px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-[#31BCFF] focus:ring-1 focus:ring-[#31BCFF] transition-colors"
                            />
                        </div>

                        {/* Due Date — read-only */}
                        <div className="flex items-center gap-6">
                            <label className="text-sm text-gray-600 w-40 shrink-0">
                                Due date (Paid At: {paidAt})
                            </label>
                            <input
                                type="text"
                                value={dueDay}
                                onChange={(e)=> setDueDay(Number(e.target.value))}
                                className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-400 bg-gray-50 cursor-default outline-none"
                            />
                        </div>

                        {/* Delivery Method */}
                        <div className="flex items-center gap-6">
                            <label className="text-sm text-gray-600 w-40 shrink-0">
                                Delivery method
                            </label>
                            <div className="flex-1 relative">
                                <select
                                    value={deliveryMethod}
                                    onChange={(e) => setDeliveryMethod(e.target.value as DeliveryMethod)}
                                    className="w-full appearance-none border border-[#31BCFF] rounded-xl px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-[#31BCFF] focus:ring-1 focus:ring-[#31BCFF] pr-8 bg-white cursor-pointer transition-colors"
                                >
                                    {deliveryOptions.map((opt) => (
                                        <option key={opt.id} value={opt.id} disabled={opt.comingSoon}>
                                            {opt.label}{opt.comingSoon ? ' (coming soon)' : ''}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown
                                    size={16}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-end gap-3 mt-10">
                        <Dialog.Close asChild>
                            <button
                                disabled={loading}
                                className="px-6 py-2.5 rounded-xl border border-gray-300 text-sm text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
                            >
                                Cancel
                            </button>
                        </Dialog.Close>
                        <button
                            onClick={handleConfirm}
                            disabled={loading || !sentAt}
                            className="px-8 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {loading && (
                                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                                </svg>
                            )}
                            OK
                        </button>
                    </div>

                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    )
}