import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import Swal from "sweetalert2";
import React from "react";

export interface CustomerContact {
    name: string
    phoneNumber: string
    email: string,
    isPrimary: boolean
}
export interface CustomerFormType {
    customerName: string;
    customerNumber: string;
    organizationNumber: string;
    address: string;
    postalCode: string;
    postalAddress: string;
    phoneNumber: string;
    email: string;
    deliveryAddress: string;
    deliveryAddressPostalCode: string;
    deliveryAddressPostalAddress: string;
    customerContactName: string;
    customerContacts?: CustomerContact[]

}

interface CustomerDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    customer?: CustomerFormType;
    onSave: (customer: CustomerFormType) => Promise<void>;
    loading: boolean;
}

const emptyCustomer: CustomerFormType = {
    customerName: "",
    customerNumber: "",
    organizationNumber: "",
    address: "",
    postalCode: "",
    postalAddress: "",
    phoneNumber: "",
    email: "",
    deliveryAddress: "",
    deliveryAddressPostalCode: "",
    deliveryAddressPostalAddress: "",
    customerContactName: ""
};

export default function CustomerDialog({
    open,
    onOpenChange,
    customer,
    onSave,
    loading,
}: CustomerDialogProps) {
    const [form, setForm] = useState<CustomerFormType>(customer ?? emptyCustomer);
    const customerNameRef = useRef<HTMLInputElement>(null);
    const customerNumberRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setForm(customer ?? emptyCustomer);
    }, [customer]);

    const updateField = (field: keyof CustomerFormType, value: string) => {
        setForm((prev) => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async () => {
        const payload: any = { ...form };

        if (form.customerContactName) {
            payload.contactPersons = {
                create: [
                    {
                        name: form.customerContactName,
                        phoneNumber: form.phoneNumber ?? "",
                        email: form.email ?? "",
                        isPrimary: true,
                    },
                ],
            };
        }

        delete payload.customerContactName;

        await onSave(payload);
    };

    return (
        <Dialog.Root open={open} onOpenChange={onOpenChange}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/40" />

                <Dialog.Content
                    onOpenAutoFocus={(e) => e.preventDefault()}
                    onCloseAutoFocus={(e) => e.preventDefault()}
                    className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] max-w-3xl rounded-xl bg-white shadow-lg p-6 max-h-[90vh] overflow-y-auto">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                        <Dialog.Title className="text-2xl font-semibold">
                            Customer details
                        </Dialog.Title>

                        <Dialog.Close asChild>
                            <button
                                disabled={loading}
                                className="p-2 rounded-lg hover:bg-gray-100">
                                <X size={20} />
                            </button>
                        </Dialog.Close>
                    </div>

                    {/* Form */}
                    <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                            <Input ref={customerNameRef} label="Customer name" value={form.customerName} onChange={(v) => updateField("customerName", v)} required />
                            <Input ref={customerNumberRef} label="Customer number" value={form.customerNumber} onChange={(v) => updateField("customerNumber", v)} required />
                            <Input label="Organization number" value={form.organizationNumber} onChange={(v) => updateField("organizationNumber", v)} />

                            <Input
                                className="md:col-span-3"
                                label="Address"
                                value={form.address}
                                onChange={(v) => updateField("address", v)}
                            />

                            <Input label="Postal code" value={form.postalCode} onChange={(v) => updateField("postalCode", v)} />
                            <Input label="Postal address" value={form.postalAddress} onChange={(v) => updateField("postalAddress", v)} />
                            <Input label="Phone number" value={form.phoneNumber} onChange={(v) => updateField("phoneNumber", v)} />
                            <Input label="Email" value={form.email} onChange={(v) => updateField("email", v)} />
                            <Input label="Delivery postal code" value={form.deliveryAddressPostalCode} onChange={(v) => updateField("deliveryAddressPostalCode", v)} />
                            <Input label="Delivery postal address" value={form.deliveryAddressPostalAddress} onChange={(v) => updateField("deliveryAddressPostalAddress", v)} />
                            <Input
                                className="md:col-span-3"
                                label="Delivery address"
                                value={form.deliveryAddress}
                                onChange={(v) => updateField("deliveryAddress", v)}
                            />
                            <Input className="md:col-span-3" label="Customer Contact Name" value={form.customerContactName} onChange={(v) => updateField("customerContactName", v)} />

                        </div>

                        {/* Footer */}
                        <div className="flex justify-end gap-3 mt-8">
                            <Dialog.Close asChild>
                                <button type="button" disabled={loading} className="px-5 py-2 rounded-lg border">
                                    Cancel
                                </button>
                            </Dialog.Close>

                            <button
                                type="submit"
                                disabled={loading}
                                className="px-6 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
                            >
                                {loading ? "Saving..." : "Save customer"}
                            </button>
                        </div>
                    </form>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}

/* Small helper */
const Input = React.forwardRef<HTMLInputElement, {
    label: string;
    value: string;
    onChange: (value: string) => void;
    className?: string;
    required?: boolean;
}>(({ label, value, onChange, className = "", required = false }, ref) => {
    return (
        <div className={className}>
            <label className="block text-gray-500 mb-1">
                {label}
                {required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <input
                ref={ref}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-full border px-3 py-2 rounded-md"
                required={required}
            />
        </div>
    );
});

Input.displayName = "Input";