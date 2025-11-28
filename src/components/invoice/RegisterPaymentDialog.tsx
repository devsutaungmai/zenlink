import * as Dialog from "@radix-ui/react-dialog";
import { X, Calendar, ChevronDown, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface Customer {
    id: string;
    customerName: string;
}

interface PaymentData {
    customer: Customer;
    invoiceId: string;
    date?: string;
    paymentMethod?: string;
    amount: number;
}

interface RegisterPaymentDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    paymentData: {
        customer: Customer | undefined;
        invoiceId: string;
        amount: number | null;
    }
    fetchInvoices: () => Promise<void>; 

}

export default function RegisterPaymentDialog({
    open,
    onOpenChange,
    paymentData,
    fetchInvoices
}: RegisterPaymentDialogProps) {
    const router = useRouter()

    const paymentMethods = [
        { id: "CASH", name: "CASH" },
        { id: "BANK", name: "BANK" }
    ]

    const [payment, setPayment] = useState<PaymentData>({
        customer: paymentData.customer || { id: "", customerName: "" },
        invoiceId: paymentData.invoiceId,
        date: new Date().toISOString().split("T")[0],
        paymentMethod: paymentMethods[0].id,
        amount: paymentData.amount || 0,
    });

    // Update payment when paymentData changes
    useEffect(() => {
        setPayment({
            customer: paymentData.customer || { id: "", customerName: "" },
            invoiceId: paymentData.invoiceId,
            date: new Date().toISOString().split("T")[0],
            paymentMethod: "BANK",
            amount: paymentData.amount || 0,
        });
    }, [paymentData]);

    const handleSubmit = async () => {
        try {
            const response = await fetch(`/api/invoices/${payment.invoiceId}/customer/paid`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    customerId: payment.customer.id,
                    paymentDate: payment.date,
                    paymentMethod: payment.paymentMethod,
                    amount: payment.amount
                })
            });

            if (response.ok) {
                onOpenChange(false);
                // Refresh invoice list or show success message
                await fetchInvoices();
                router.refresh()
            }
          
        } catch (error) {
            console.error('Failed to register payment:', error);
        }
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
                                    <th className="text-left px-4 py-3">Customer</th>
                                    <th className="text-left px-4 py-3">Date</th>
                                    <th className="text-left px-4 py-3">Payment type</th>
                                    <th className="text-left px-4 py-3">Received amount</th>
                                    <th className="text-right px-4 py-3"></th>
                                </tr>
                            </thead>

                            <tbody>
                                <tr className="border-t">
                                    {/* Info */}
                                    <td className="px-4 py-4">
                                        <div className="text-gray-600 text-sm">{payment.customer?.customerName}</div>
                                    </td>

                                    {/* Date */}
                                    <td className="px-4 py-4">
                                        <div className="flex items-center gap-2 border px-3 py-2 rounded-md w-[140px]">
                                            <input
                                                type="date"
                                                value={payment.date || ""}
                                                onChange={(e) =>
                                                    setPayment({ ...payment, date: e.target.value })
                                                }
                                                className="bg-transparent outline-none text-sm w-full"
                                            />
                                            <Calendar size={18} className="text-gray-600" />
                                        </div>
                                    </td>

                                    {/* Payment type */}
                                    <td className="px-4 py-4">
                                        <div className="flex items-center justify-between border px-3 py-2 rounded-md w-[160px]">
                                            <select
                                                value={payment.paymentMethod ?? ""}
                                                onChange={(e) => setPayment({ ...payment, paymentMethod: e.target.value })}
                                                className="bg-transparent outline-none text-sm w-full appearance-none pr-6"
                                            >
                                                <option value="">Select</option>
                                                {paymentMethods.map((m) => (
                                                    <option key={m.id} value={m.id}>
                                                        {m.name}
                                                    </option>
                                                ))}
                                            </select>
                                            <ChevronDown size={18} className="text-gray-600" />
                                        </div>
                                    </td>

                                    {/* Amount */}
                                    <td className="px-4 py-4">
                                        <input
                                            type="number"
                                            value={payment.amount}
                                            onChange={(e) =>
                                                setPayment({ ...payment, amount: parseFloat(e.target.value) })
                                            }
                                            className="w-[80px] border px-3 py-2 rounded-md text-sm"
                                        />
                                    </td>

                                    {/* Delete */}
                                    {/* <td className="px-4 py-4 text-right">
                                            <button
                                                onClick={() => removePayment(index)}
                                                className="p-2 text-gray-700 hover:bg-gray-100 rounded-md"
                                            >
                                                <Trash2 size={20} />
                                            </button>
                                        </td> */}
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* Footer */}
                    <div className="flex justify-between items-center mt-6">
                        <button onClick={handleSubmit} className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg">
                            Register payment
                        </button>

                        <div className="text-right">
                            <div className="text-gray-500">Total</div>
                            <div className="text-2xl font-semibold">{payment.amount.toFixed(2)}</div>
                        </div>
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
