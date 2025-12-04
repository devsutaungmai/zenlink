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
                <Dialog.Content className="fixed left-[50%] top-[50%] -translate-x-[50%] -translate-y-[50%] w-[calc(100%-2rem)] max-w-sm sm:max-w-lg md:max-w-3xl rounded-xl bg-white shadow-lg p-4 sm:p-6 md:p-8 max-h-[90vh] overflow-y-auto">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-4 sm:mb-6">
                        <Dialog.Title className="text-xl sm:text-2xl md:text-2xl font-semibold text-gray-800">
                            Register payment
                        </Dialog.Title>

                        <Dialog.Close asChild>
                            <button className="p-2 rounded-lg hover:bg-gray-100">
                                <X size={20} className="sm:w-6 sm:h-6" />
                            </button>
                        </Dialog.Close>
                    </div>

                    {/* Responsive grid layout */}
                    <div className="border rounded-lg p-4 sm:p-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
                            {/* Customer */}
                            <div className="flex flex-col">
                                <label className="text-xs sm:text-sm font-medium text-gray-600 mb-2">Customer</label>
                                <div className="text-sm sm:text-base text-gray-800 py-2 px-3 bg-gray-50 rounded-md">
                                    {payment.customer?.customerName}
                                </div>
                            </div>

                            {/* Date */}
                            <div className="flex flex-col">
                                <label className="text-xs sm:text-sm font-medium text-gray-600 mb-2">Date</label>
                                <div className="flex items-center gap-2 border px-2 sm:px-3 py-2 rounded-md">
                                    <input
                                        type="date"
                                        value={payment.date || ""}
                                        onChange={(e) => setPayment({ ...payment, date: e.target.value })}
                                        className="bg-transparent outline-none flex-1 text-xs sm:text-sm"
                                    />
                                    <Calendar size={16} className="text-gray-600" />
                                </div>
                            </div>

                            {/* Payment type */}
                            <div className="flex flex-col">
                                <label className="text-xs sm:text-sm font-medium text-gray-600 mb-2">Payment type</label>
                                <div className="flex items-center justify-between border px-2 sm:px-3 py-2 rounded-md">
                                    <select
                                        value={payment.paymentMethod ?? ""}
                                        onChange={(e) => setPayment({ ...payment, paymentMethod: e.target.value })}
                                        className="bg-transparent outline-none appearance-none flex-1 text-xs sm:text-sm"
                                    >
                                        <option value="">Select</option>
                                        {paymentMethods.map((m) => (
                                            <option key={m.id} value={m.id}>
                                                {m.name}
                                            </option>
                                        ))}
                                    </select>
                                    <ChevronDown size={16} className="text-gray-600" />
                                </div>
                            </div>

                            {/* Amount */}
                            <div className="flex flex-col">
                                <label className="text-xs sm:text-sm font-medium text-gray-600 mb-2">Received amount</label>
                                <input
                                    type="number"
                                    value={payment.amount}
                                    onChange={(e) => setPayment({ ...payment, amount: Number.parseFloat(e.target.value) })}
                                    className="border px-3 py-2 rounded-md text-xs sm:text-sm"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mt-4 sm:mt-6">
                        <button
                            onClick={handleSubmit}
                            className="w-full sm:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-sm"
                        >
                            Register payment
                        </button>

                        <div className="text-right w-full sm:w-auto">
                            <div className="text-gray-500 text-xs sm:text-sm">Total</div>
                            <div className="text-xl sm:text-2xl font-semibold">{payment.amount.toFixed(2)}</div>
                        </div>
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    )
}
