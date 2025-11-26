import * as Dialog from "@radix-ui/react-dialog";
import { X, Calendar, ChevronDown, Trash2 } from "lucide-react";
import { useState } from "react";

type Payment = {
    id: string | number;
    customer: string;
    date: string;
    paymentType: string;
    amount: number;
};

export default function RegisterPaymentDialog({
    open,
    onOpenChange,
    invoice
}: any) {

    const [payments, setPayments] = useState<Payment[]>([
        {
            id: invoice?.id,
            customer: invoice?.customer?.name,
            date: new Date().toISOString().split("T")[0],
            paymentType: "Betalt til bank",
            amount: 0,
        },
    ]);

    const totalAmount = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);

    const updatePayment = (index: number, field: keyof Payment, value: any) => {
        setPayments((prev) => {
            const updated = [...prev];
            updated[index] = {
                ...updated[index],
                [field]: value,
            };
            return updated;
        });
    };

    const removePayment = (index: number) => {
        setPayments((prev) => prev.filter((_, i) => i !== index));
    };

    return (
        <Dialog.Root open={open} onOpenChange={onOpenChange}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/40" />

                <Dialog.Content
                    className="
            fixed top-[50%] left-[50%] -translate-x-[50%] -translate-y-[50%]
            w-full max-w-3xl rounded-xl bg-white shadow-lg p-6
          "
                >
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                        <Dialog.Title className="text-2xl font-semibold text-gray-800">
                            Register payment
                        </Dialog.Title>

                        <Dialog.Close asChild>
                            <button className="p-2 rounded-lg hover:bg-gray-100">
                                <X size={22} />
                            </button>
                        </Dialog.Close>
                    </div>


                    {/* Table */}
                    <div className="border rounded-lg overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-gray-100 text-gray-600 font-medium">
                                <tr>
                                    <th className="text-left px-4 py-3">Info</th>
                                    <th className="text-left px-4 py-3">Date</th>
                                    <th className="text-left px-4 py-3">Payment type</th>
                                    <th className="text-left px-4 py-3">Received amount</th>
                                    <th className="text-right px-4 py-3"></th>
                                </tr>
                            </thead>

                            <tbody>
                                {payments.map((p, index) => (
                                    <tr key={p.id} className="border-t">
                                        {/* Info */}
                                        <td className="px-4 py-4">
                                            <div className="font-medium">#{p.id}</div>
                                            <div className="text-gray-600 text-sm">{p.customer}</div>
                                        </td>

                                        {/* Date */}
                                        <td className="px-4 py-4">
                                            <div className="flex items-center gap-2 border px-3 py-2 rounded-md w-[140px]">
                                                <input
                                                    type="date"
                                                    value={p.date}
                                                    onChange={(e) =>
                                                        updatePayment(index, "date", e.target.value)
                                                    }
                                                    className="bg-transparent outline-none text-sm w-full"
                                                />
                                                <Calendar size={18} className="text-gray-600" />
                                            </div>
                                        </td>

                                        {/* Payment type */}
                                        <td className="px-4 py-4">
                                            <div className="flex items-center justify-between border px-3 py-2 rounded-md w-[160px] cursor-pointer">
                                                <span className="text-sm">{p.paymentType}</span>
                                                <ChevronDown size={18} className="text-gray-600" />
                                            </div>
                                        </td>

                                        {/* Amount */}
                                        <td className="px-4 py-4">
                                            <input
                                                type="number"
                                                value={p.amount}
                                                onChange={(e) =>
                                                    updatePayment(index, "amount", Number(e.target.value))
                                                }
                                                className="w-[80px] border px-3 py-2 rounded-md text-sm"
                                            />
                                        </td>

                                        {/* Delete */}
                                        <td className="px-4 py-4 text-right">
                                            <button
                                                onClick={() => removePayment(index)}
                                                className="p-2 text-gray-700 hover:bg-gray-100 rounded-md"
                                            >
                                                <Trash2 size={20} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Footer */}
                    <div className="flex justify-between items-center mt-6">
                        <button className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg">
                            Register payment
                        </button>

                        <div className="text-right">
                            <div className="text-gray-500">Total</div>
                            <div className="text-2xl font-semibold">{totalAmount.toFixed(2)}</div>
                        </div>
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
