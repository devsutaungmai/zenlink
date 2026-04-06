import { formatProductNumberForDisplay } from "@/shared/lib/invoiceHelper";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import React from "react";
import z from "zod";
import { productValidationSchema } from "./validation";
import { LedgerAccountOption, LedgerAccountSelectCombobox } from "./LedgerAccountSelectCombobox";
import { LedgerAccountFormType } from "./LedgerAccountDialog";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ProductFormType {
  productName: string;
  productNumber: string;
  defaultProductNumber?: string;
  salesPrice: number;
  costPrice?: number;
  discountPercentage?: number;
  ledgerAccountId?: string;
}

interface LedgerAccount {
  id: string;
  accountNumber: string;
  name: string;
  vatCode?: { name: string; rate: number } | null;
  businessVatCodes?: { vatCode: { name: string; rate: number } }[];
}

interface ProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (product: ProductFormType) => Promise<void>;
  loading: boolean;
}

const emptyProduct: ProductFormType = {
  productName: "",
  productNumber: "",
  salesPrice: 0,
  costPrice: 0,
  discountPercentage: 0,
  ledgerAccountId: "",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ProductDialog({
  open,
  onOpenChange,
  onSave,
  loading,
}: ProductDialogProps) {
  const [form, setForm] = useState<ProductFormType>(emptyProduct);
  const [ledgerAccounts, setLedgerAccounts] = useState<LedgerAccountOption[]>([]);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const validationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // On open: reset form, fetch both defaults in parallel
  useEffect(() => {
    if (open) {
      setForm(emptyProduct);
      setValidationErrors({});
      getDefaultProductNumber();
      fetchLedgerAccounts();
    }
  }, [open]);

  const getDefaultProductNumber = async () => {
    try {
      const res = await fetch("/api/products/next-number");
      if (res.ok) {
        const data = await res.json();
        const display = formatProductNumberForDisplay(data.productNumber);
        setForm((prev) => ({
          ...prev,
          productNumber: display,
          defaultProductNumber: data.productNumber,
          sequence: data.sequence,
          year: data.year
        }));
      }
    } catch (error) {
      console.error("Error fetching default product number:", error);
    }
  };

  const fetchLedgerAccounts = async () => {
    try {
      const res = await fetch("/api/sales-ledger-accounts");
      if (res.ok) {
        const data: LedgerAccount[] = await res.json();
        setLedgerAccounts(data);
        // Auto-select first account — mirrors CreateProductPage behaviour
        if (data.length > 0) {
          setForm((prev) => ({ ...prev, ledgerAccountId: data[0].id }));
        }
      }
    } catch (error) {
      console.error("Error fetching ledger accounts:", error);
    }
  };

  const onSaveLedgerAccount = async (
    account: LedgerAccountFormType
  ): Promise<LedgerAccountOption> => {
    const res = await fetch("/api/ledger/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(account),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Failed to create ledger account");
    }
    const created: LedgerAccountOption = await res.json();
    // Add to local list so it shows in the dropdown immediately
    setLedgerAccounts((prev) => [...prev, created]);
    return created;
  };

  const validateField = (fieldName: string, value: unknown) => {
    try {
      const fieldSchema =
        productValidationSchema.shape[fieldName as keyof typeof productValidationSchema.shape];
      if (fieldSchema) {
        fieldSchema.parse(value);
        setValidationErrors((prev) => ({ ...prev, [fieldName]: "" }));
      }
    } catch (error) {
      if (error instanceof z.ZodError && error.issues.length > 0) {
        setValidationErrors((prev) => ({ ...prev, [fieldName]: error.issues[0].message }));
      }
    }
  };

  const debouncedValidation = (fieldName: string, value: unknown) => {
    if (validationTimeoutRef.current) clearTimeout(validationTimeoutRef.current);
    validationTimeoutRef.current = setTimeout(() => validateField(fieldName, value), 500);
  };

  const updateField = (field: keyof ProductFormType, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    try {
      productValidationSchema.parse(form);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: Record<string, string> = {};
        error.issues.forEach((issue) => {
          if (issue.path[0]) errors[issue.path[0].toString()] = issue.message;
        });
        setValidationErrors(errors);
        return;
      }
    }
    await onSave(form);
  };

  // Build a readable label for each ledger account — same format as CreateProductPage
  const ledgerLabel = (sa: LedgerAccount) => {
    const bv = sa.businessVatCodes?.[0]?.vatCode;
    const vatPart = bv
      ? `${bv.name} (${bv.rate}%)`
      : sa.vatCode
        ? `${sa.vatCode.name} (${sa.vatCode.rate}%)`
        : "0%";
    return `${sa.accountNumber} - ${sa.name} - ${vatPart}`;
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-50" />

        <Dialog.Content
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => e.preventDefault()}
          className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] max-w-4xl rounded-xl bg-white shadow-lg p-6 max-h-[90vh] overflow-y-auto z-50"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <Dialog.Title className="text-2xl font-semibold">Create New Product</Dialog.Title>
            <Dialog.Close asChild>
              <button disabled={loading} className="p-2 rounded-lg hover:bg-gray-100">
                <X size={20} />
              </button>
            </Dialog.Close>
          </div>

          {/* Form */}
          <form onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleSubmit();
          }}>

            {/* 2-col grid for the smaller fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <ProductInput
                label="Product Name *"
                value={form.productName}
                onChange={(v) => { updateField("productName", v); debouncedValidation("productName", v); }}
                onBlur={(v) => validateField("productName", v)}
                error={validationErrors.productName}
                required
              />
              <ProductInput
                label="Product Number *"
                value={form.productNumber}
                onChange={(v) => { updateField("productNumber", v); debouncedValidation("productNumber", v); }}
                onBlur={(v) => validateField("productNumber", v)}
                error={validationErrors.productNumber}
                required
              />
              <ProductInput
                label="Sales Price *"
                type="number"
                value={String(form.salesPrice)}
                onChange={(v) => { updateField("salesPrice", v); debouncedValidation("salesPrice", v); }}
                onBlur={(v) => validateField("salesPrice", v)}
                error={validationErrors.salesPrice}
                required
              />
              <ProductInput
                label="Cost Price"
                type="number"
                value={String(form.costPrice ?? "")}
                onChange={(v) => updateField("costPrice", v)}
              />
              {/* <ProductInput
                label="Discount (%)"
                type="number"
                value={String(form.discountPercentage ?? "")}
                onChange={(v) => updateField("discountPercentage", v)}
              /> */}
            </div>

            {/* Ledger Account — full width below the grid */}
            <div className="mt-4 text-sm">
              <label className="block text-gray-500 mb-1">Ledger Account *</label>
              <LedgerAccountSelectCombobox
                ledgerAccounts={ledgerAccounts}
                value={form.ledgerAccountId ?? ""}
                onChange={(id) => {
                  updateField("ledgerAccountId", id);
                  validateField("ledgerAccountId", id);
                }}
                onSaveNewLedgerAccount={onSaveLedgerAccount}
                onLedgerAccountCreated={(newAccount) => {
                  // ledgerAccounts state already updated inside onSaveLedgerAccount
                }}
                placeholder="Select Ledger Account"
              />
              {validationErrors.ledgerAccountId && (
                <p className="mt-1 text-xs text-red-600">
                  {validationErrors.ledgerAccountId}
                </p>
              )}
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
                className="px-6 py-2 rounded-lg bg-[#31BCFF] text-white hover:bg-[#0ea5e9] transition-colors disabled:opacity-60"
              >
                {loading ? "Saving..." : "Save Product"}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// ---------------------------------------------------------------------------
// Reusable input — mirrors ProjectInput
// ---------------------------------------------------------------------------

const ProductInput = React.forwardRef<
  HTMLInputElement,
  {
    label: string;
    value: string;
    onChange: (value: string) => void;
    onBlur?: (value: string) => void;
    className?: string;
    required?: boolean;
    type?: string;
    error?: string;
  }
>(({ label, value, onChange, onBlur, className = "", required = false, type = "text", error }, ref) => (
  <div className={className}>
    <label className="block text-gray-500 mb-1">{label}</label>
    <input
      ref={ref}
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={(e) => onBlur?.(e.target.value)}
      className={`w-full px-3 py-2 rounded-md border ${error
        ? "border-red-500 focus:ring-red-300"
        : "border-gray-300 focus:ring-[#31BCFF]/50"
        } focus:ring-2 outline-none`}
      required={required}
    />
    {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
  </div>
));

ProductInput.displayName = "ProductInput";