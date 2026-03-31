import { formatProjectNumberForDisplay } from "@/shared/lib/invoiceHelper";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import React from "react";
import { projectValidationSchema } from "./validation";
import z from "zod";

export interface ProjectFormType {
  name: string;
  projectNumber: string;
  defaultProjectNumber?: string
  customerId: string;
  startDate?: string;
  endDate?: string;
}

interface ProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (project: ProjectFormType) => Promise<void>;
  loading: boolean;
}

const emptyProject: ProjectFormType = {
  name: "",
  projectNumber: "",
  customerId: "",
  startDate: undefined,
  endDate: undefined,
};

export default function ProjectDialog({
  open,
  onOpenChange,
  onSave,
  loading,
}: ProjectDialogProps) {
  const [form, setForm] = useState<ProjectFormType>(emptyProject);
  const projectNameRef = useRef<HTMLInputElement>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const validationTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (open) setForm(emptyProject);
  }, [open]);

  useEffect(() => {
    getDefaultProjectNumber();
  }, [])

  const getDefaultProjectNumber = async () => {
    try {
      const res = await fetch('/api/projects/next-number')

      if (res.ok) {
        const data = await res.json()
        const defaultNumber = formatProjectNumberForDisplay(data.projectNumber);

        setForm(prev => ({
          ...prev, projectNumber: defaultNumber, defaultProjectNumber: data.projectNumber, sequence: data.sequence,
          year: data.year
        }))
      }
    } catch (error) {
      console.error('Error fetching default project number:', error)
    }
  }

  const validateField = (fieldName: string, value: any) => {
    try {
      const fieldSchema = projectValidationSchema.shape[fieldName as keyof typeof projectValidationSchema.shape]
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
    if (validationTimeoutRef.current) {
      clearTimeout(validationTimeoutRef.current)
    }

    validationTimeoutRef.current = setTimeout(() => {
      validateField(fieldName, value)
    }, 500)
  }


  const updateField = (field: keyof ProjectFormType, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    await onSave(form);
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-50" />

        <Dialog.Content
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => e.preventDefault()}
          className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] max-w-lg rounded-xl bg-white shadow-lg p-6 max-h-[90vh] overflow-y-auto z-50"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <Dialog.Title className="text-2xl font-semibold">
              Create New Project
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                disabled={loading}
                className="p-2 rounded-lg hover:bg-gray-100"
              >
                <X size={20} />
              </button>
            </Dialog.Close>
          </div>

          {/* Form */}
          <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <ProjectInput
                ref={projectNameRef}
                label="Project Name *"
                value={form.name}
                onChange={(v) => { updateField("name", v); debouncedValidation('name', v) }}
                onBlur={(v) => validateField("name", v)}
                error={validationErrors.name}
                required
              />
              <ProjectInput
                label="Project Number *"
                value={form.projectNumber}
                onChange={(v) => { updateField("projectNumber", v); debouncedValidation('projectNumber', v) }}

                onBlur={(v) => validateField("projectNumber", v)}

                error={validationErrors.projectNumber}
              />
              <ProjectInput
                label="Start Date"
                type="date"
                value={form.startDate || ""}
                onChange={(v) => updateField("startDate", v)}
              />
              <ProjectInput
                label="End Date"
                type="date"
                value={form.endDate || ""}
                onChange={(v) => updateField("endDate", v)}
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
                {loading ? "Saving..." : "Save project"}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/* Small helper input, same pattern as CustomerDialog */
const ProjectInput = React.forwardRef<
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
>(({ label, value, onChange, onBlur, className = "", required = false, type = "text", error }, ref) => {
  return (
    <div className={className}>
      <label className="block text-gray-500 mb-1">
        {label}
      </label>
      <input
        ref={ref}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={(e) => onBlur?.(e.target.value)}
        className={`w-full px-3 py-2 rounded-md border ${error ? "border-red-500 focus:ring-red-300" : "border-gray-300 focus:ring-[#31BCFF]/50"
          } focus:ring-2 outline-none`}
        required={required}
      />
      {error && (
        <p className="mt-1 text-xs text-red-600">{error}</p>
      )}
    </div>
  );
});

ProjectInput.displayName = "ProjectInput";