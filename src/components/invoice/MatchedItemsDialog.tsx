"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { formatVoucherNumberForDisplay, formatDateLocal } from "@/shared/lib/invoiceHelper"

interface Props {
    open: boolean
    onClose: () => void
    matchGroup: any | null
}

export function MatchedItemsDialog({ open, onClose, matchGroup }: Props) {

    if (!matchGroup) return null

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
                            {matchGroup.rows.map((r:any, i:any) => (
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
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button className="bg-green-600 hover:bg-green-700 text-white">
                        OK
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
