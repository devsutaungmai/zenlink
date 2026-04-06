import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import React from "react";
import z from "zod";

export type AccountType =
  | "EXPENSE"
  | "APPROPRIATIONS"
  | "ASSET"
  | "LIABILITY"
  | "EQUITY"
  | "INCOME";

export interface LedgerAccountFormType {
  accountNumber: number | string;
  name: string;
  type: AccountType;
  isActive: boolean;
  industrySpecification?: string;
  reportGroup?: string;
  saftStandardAccount?: string;
  vatCodeId?: string;
}

interface VatCode {
  id: string;
  code: string;
  name: string;
  rate: number;
}

interface LedgerAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (account: LedgerAccountFormType) => Promise<void>;
  loading: boolean;
}

const ledgerValidationSchema = z.object({
  accountNumber: z
    .union([z.number(), z.string()])
    .refine((v) => !isNaN(Number(v)) && Number(v) > 0, {
      message: "Account number is required",
    }),
  name: z.string().min(1, "Account name is required"),
  type: z.string().min(1, "Type is required"),
});

const emptyForm: LedgerAccountFormType = {
  accountNumber: "",
  name: "",
  type: "ASSET",
  isActive: true,
  industrySpecification: "",
  reportGroup: "",
  saftStandardAccount: "",
  vatCodeId: "",
};

// ---------------------------------------------------------------------------
// Helper — derive account type from number (mirrors getAccountType logic)
// ---------------------------------------------------------------------------
function deriveAccountType(num: number): AccountType {
  if (num >= 1000 && num < 2000) return "ASSET";
  if (num >= 2000 && num < 3000) return "LIABILITY";
  if (num >= 3000 && num < 4000) return "INCOME";
  if (num >= 4000 && num < 8000) return "EXPENSE";
  if (num >= 8000 && num < 9000) return "EQUITY";
  if (num >= 9000) return "APPROPRIATIONS";
  return "ASSET";
}

export default function LedgerAccountDialog({
  open,
  onOpenChange,
  onSave,
  loading,
}: LedgerAccountDialogProps) {
  const [form, setForm] = useState<LedgerAccountFormType>(emptyForm);
  const [vatCodes, setVatCodes] = useState<VatCode[]>([]);
  const [fetchingVat, setFetchingVat] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const validationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const accountNumberRef = useRef<HTMLInputElement>(null);

  // Reset + fetch on open
  useEffect(() => {
    if (open) {
      setForm(emptyForm);
      setValidationErrors({});
      fetchVatCodes();
      // Focus account number after paint
      requestAnimationFrame(() => accountNumberRef.current?.focus());
    }
  }, [open]);

  const fetchVatCodes = async () => {
    setFetchingVat(true);
    try {
      const res = await fetch("/api/ledger/vat-codes");
      if (res.ok) {
        const data = await res.json();
        setVatCodes(Array.isArray(data) ? data : data.vatCodes ?? []);
      }
    } catch (error) {
      console.error("Error fetching VAT codes:", error);
    } finally {
      setFetchingVat(false);
    }
  };

  const validateField = (fieldName: string, value: unknown) => {
    try {
      const fieldSchema =
        ledgerValidationSchema.shape[
        fieldName as keyof typeof ledgerValidationSchema.shape
        ];
      if (fieldSchema) {
        fieldSchema.parse(value);
        setValidationErrors((prev) => ({ ...prev, [fieldName]: "" }));
      }
    } catch (error) {
      if (error instanceof z.ZodError && error.issues.length > 0) {
        setValidationErrors((prev) => ({
          ...prev,
          [fieldName]: error.issues[0].message,
        }));
      }
    }
  };

  const debouncedValidation = (fieldName: string, value: unknown) => {
    if (validationTimeoutRef.current) clearTimeout(validationTimeoutRef.current);
    validationTimeoutRef.current = setTimeout(
      () => validateField(fieldName, value),
      500
    );
  };

  const handleAccountNumberChange = (raw: string) => {
    const num = parseInt(raw, 10);
    const derivedType = !isNaN(num) ? deriveAccountType(num) : form.type;
    setForm((prev) => ({
      ...prev,
      accountNumber: raw === "" ? "" : num,
      type: derivedType,
    }));
    debouncedValidation("accountNumber", raw);
  };

  const handleSubmit = async () => {
    try {
      ledgerValidationSchema.parse(form);
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

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-50" />

        <Dialog.Content
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => e.preventDefault()}
          className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] max-w-5xl rounded-xl bg-white shadow-lg p-6 max-h-[90vh] overflow-y-auto z-50"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <Dialog.Title className="text-2xl font-semibold">
              Create New Ledger Account
            </Dialog.Title>
            <Dialog.Close asChild>
              <button disabled={loading} className="p-2 rounded-lg hover:bg-gray-100">
                <X size={20} />
              </button>
            </Dialog.Close>
          </div>

          {/* Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleSubmit();
            }}
          >
            {/* Active checkbox */}
            <div className="flex justify-end items-center gap-2 mb-4">
              <input
                id="la-isActive"
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))}
                className="h-4 w-4 text-[#31BCFF] border-gray-300 rounded focus:ring-[#31BCFF]/50"
              />
              <label htmlFor="la-isActive" className="text-sm text-gray-600">
                Active
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              {/* Account Number */}
              <LedgerInput
                ref={accountNumberRef}
                label="Account Number *"
                type="number"
                value={String(form.accountNumber)}
                onChange={handleAccountNumberChange}
                onBlur={(v) => validateField("accountNumber", v)}
                error={validationErrors.accountNumber}
                placeholder="e.g. 3000"
                required
              />

              {/* Account Name */}
              <LedgerInput
                label="Account Name *"
                value={form.name}
                onChange={(v) => {
                  setForm((prev) => ({ ...prev, name: v }));
                  debouncedValidation("name", v);
                }}
                onBlur={(v) => validateField("name", v)}
                error={validationErrors.name}
                placeholder="Enter account name"
                required
              />

              {/* Type — auto-derived but still editable */}
              <div>
                <label className="block text-gray-500 mb-1">Type *</label>
                <select
                  value={form.type}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, type: e.target.value as AccountType }))
                  }
                  className="w-full px-3 py-2 rounded-md border border-gray-300 focus:ring-[#31BCFF]/50 focus:ring-2 outline-none"
                >
                  <option value="EXPENSE">EXPENSE</option>
                  <option value="APPROPRIATIONS">APPROPRIATIONS</option>
                  <option value="ASSET">ASSET</option>
                  <option value="LIABILITY">LIABILITY</option>
                  <option value="EQUITY">EQUITY</option>
                  <option value="INCOME">INCOME</option>
                </select>
              </div>

              {/* VAT Code */}
              <div>
                <label className="block text-gray-500 mb-1">VAT Code</label>
                <select
                  value={form.vatCodeId ?? ""}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, vatCodeId: e.target.value }))
                  }
                  className="w-full px-3 py-2 rounded-md border border-gray-300 focus:ring-[#31BCFF]/50 focus:ring-2 outline-none"
                >
                  <option value="">
                    {fetchingVat ? "Loading..." : "Select VAT Code"}
                  </option>
                  {vatCodes.map((vc) => (
                    <option key={vc.id} value={vc.id}>
                      {vc.code} - {vc.name} ({vc.rate}%)
                    </option>
                  ))}
                </select>
              </div>

              {/* Industry Specification */}
              <LedgerInput
                label="Industry Specification"
                value={form.industrySpecification ?? ""}
                onChange={(v) =>
                  setForm((prev) => ({ ...prev, industrySpecification: v }))
                }
                placeholder="Enter industry specification"
              />

              {/* Report Group */}
              <LedgerInput
                label="Report Group"
                value={form.reportGroup ?? ""}
                onChange={(v) => setForm((prev) => ({ ...prev, reportGroup: v }))}
                placeholder="Enter report group"
              />
            </div>

            {/* SAFT Standard Account — full width */}
            <div className="mt-4 text-sm">
              <LedgerInput
                label="SAFT Standard Account"
                value={form.saftStandardAccount ?? ""}
                onChange={(v) =>
                  setForm((prev) => ({ ...prev, saftStandardAccount: v }))
                }
                placeholder="Enter SAFT standard account"
              />
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 mt-8">
              <Dialog.Close asChild>
                <button
                  type="button"
                  disabled={loading}
                  className="px-5 py-2 rounded-lg border"
                >
                  Cancel
                </button>
              </Dialog.Close>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 rounded-lg bg-[#31BCFF] text-white hover:bg-[#0ea5e9] transition-colors disabled:opacity-60"
              >
                {loading ? "Saving..." : "Save Ledger Account"}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// ---------------------------------------------------------------------------
// Reusable input — mirrors ProjectInput / ProductInput
// ---------------------------------------------------------------------------

const LedgerInput = React.forwardRef<
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
    placeholder?: string;
  }
>(
  (
    {
      label,
      value,
      onChange,
      onBlur,
      className = "",
      required = false,
      type = "text",
      error,
      placeholder,
    },
    ref
  ) => (
    <div className={className}>
      <label className="block text-gray-500 mb-1">{label}</label>
      <input
        ref={ref}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={(e) => onBlur?.(e.target.value)}
        placeholder={placeholder}
        className={`w-full px-3 py-2 rounded-md border ${error
            ? "border-red-500 focus:ring-red-300"
            : "border-gray-300 focus:ring-[#31BCFF]/50"
          } focus:ring-2 outline-none`}
        required={required}
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
);

LedgerInput.displayName = "LedgerInput";