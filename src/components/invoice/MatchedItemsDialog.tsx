"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { formatVoucherNumberForDisplay, formatDateLocal } from "@/shared/lib/invoiceHelper"
import { OpenItem } from "@/app/dashboard/accounts/customer-ledger/page"

interface Props {
    open: boolean
    onClose: () => void
    matchGroup: OpenItem | null
    onUnmatch?: (item:OpenItem) => void
}

export function MatchedItemsDialog({ open, onClose, matchGroup, onUnmatch }: Props) {

    if (!matchGroup) return null

    const handleUnmatch = () => {
        onUnmatch?.(matchGroup)
        onClose()
    }

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[800px]">
                <DialogHeader>
                    <DialogTitle>Matched Items</DialogTitle>
                </DialogHeader>

                <div className="border rounded-md overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-muted">
                            <tr>
                                <th className="p-2 text-left">Text</th>
                                <th className="p-2 text-left">Date</th>
                                <th className="p-2 text-right">Amount</th>
                                <th className="p-2 text-right">Balance</th>
                            </tr>
                        </thead>
                        <tbody>
                            {matchGroup.rows?.map((r, i) => (
                                <tr key={i} className="border-t">
                                    <td className="p-2">{r.description}</td>
                                    <td className="p-2">{formatDateLocal(r.postingDate)}</td>
                                    <td className="p-2 text-right">{r.amount}</td>
                                    <td className="p-2 text-right">{matchGroup.balance}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                    <Button variant="outline" onClick={onClose}>
                        Cancel
                    </Button>

                    <Button
                        variant="destructive"
                        onClick={handleUnmatch}
                    >
                        Unmatch
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}

