import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import Swal from "sweetalert2";
import React from "react";
import { formatCustomerNumberForDisplay } from "@/shared/lib/invoiceHelper";
import { customerValidationSchema } from "./validation";
import z from "zod";

export interface CustomerContact {
    name: string
    phoneNumber: string
    email: string,
    isPrimary: boolean
}
export interface CustomerFormType {
    customerName: string;
    customerNumber: string;
    defaultCustomerNumber?: string;
    organizationNumber: string;
    sequence: number
        year: number
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
    sequence:0,
    year:new Date().getFullYear(),
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
    const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
    const validationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const hasErrors = Object.values(validationErrors).some(Boolean)

    useEffect(() => {
        setForm(customer ?? emptyCustomer);
    }, [customer]);

    useEffect(() => {
        if (open) {
            if (!customer) {
                getDefaultCustomerNumber();
            }
            requestAnimationFrame(() => {
                customerNameRef.current?.focus();
            });
        }
    }, [open]);

    const updateField = (field: keyof CustomerFormType, value: string) => {
        setForm((prev) => ({ ...prev, [field]: value }));
    };
    const validateField = (fieldName: string, value: any) => {
        try {
            const fieldSchema = customerValidationSchema.shape[fieldName as keyof typeof customerValidationSchema.shape]
            if (fieldSchema) {
                fieldSchema.parse(value)
                setValidationErrors(prev => ({ ...prev, [fieldName]: '' }))
            }
        } catch (error) {
            if (error instanceof z.ZodError && error.issues.length > 0) {
                setValidationErrors(prev => ({ ...prev, [fieldName]: error.issues[0].message }))
            }
        }
    }

    const debouncedValidation = (fieldName: string, value: any) => {
        if (!value) {
            setValidationErrors(prev => ({ ...prev, [fieldName]: '' }))
            return
        }

        if (validationTimeoutRef.current) {
            clearTimeout(validationTimeoutRef.current)
        }

        validationTimeoutRef.current = setTimeout(() => {
            validateField(fieldName, value)
        }, 400)
    }

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

    const getDefaultCustomerNumber = async () => {
        try {
            const res = await fetch('/api/customers/next-number');
            const data = await res.json();

            const defaultNumber = formatCustomerNumberForDisplay(data.customerNumber);

            updateField("customerNumber", defaultNumber);
            updateField("defaultCustomerNumber", data.customerNumber);
            updateField("sequence",data.sequence)
            updateField("year",data.year)

        } catch (error) {
            console.error('Error fetching customerDefaultNumber:', error)
        }

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
                            Create New Customer
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
                            <Input
                                ref={customerNameRef}
                                label="Customer name"
                                value={form.customerName}
                                onChange={(v) => {
                                    updateField("customerName", v)
                                    debouncedValidation("customerName", v)
                                }}
                                onBlur={(v) => validateField("customerName", v)}
                                error={validationErrors.customerName}
                                placeholder="Customer name"
                            />


                            <Input ref={customerNumberRef}
                                label="Customer number"
                                value={form.customerNumber}
                                onChange={(v) => { updateField("customerNumber", v); debouncedValidation("customerNumber", v) }}
                                onBlur={(v) => validateField("customerNumber", v)}
                                error={validationErrors.customerNumber}
                                placeholder="Customer number"
                            />
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
                            {/* <Input className="md:col-span-3" label="Customer Contact Name" value={form.customerContactName} onChange={(v) => updateField("customerContactName", v)} /> */}

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
                                disabled={loading || hasErrors}
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
    onBlur?: (value: string) => void;
    className?: string;
    required?: boolean;
    placeholder?: string;
    error?: string; // ✅ add this
}>(({ label, value, onChange, onBlur, className = "", required = false, placeholder, error }, ref) => {
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
                onBlur={(e) => onBlur?.(e.target.value)}
                className={`w-full px-3 py-2 rounded-md border ${error ? "border-red-500 focus:ring-red-300" : "border-gray-300 focus:ring-[#31BCFF]/50"
                    } focus:ring-2 outline-none`}
                required={required}
                placeholder={placeholder}
            />

            {error && (
                <p className="mt-1 text-xs text-red-600">{error}</p>
            )}
        </div>
    );
});