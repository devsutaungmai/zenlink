import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import React from "react";

export interface ProjectFormType {
  name: string;
  projectNumber: string;
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

  useEffect(() => {
    if (open) setForm(emptyProject);
  }, [open]);

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
                label="Project Name"
                value={form.name}
                onChange={(v) => updateField("name", v)}
                required
              />
              <ProjectInput
                label="Project Number"
                value={form.projectNumber}
                onChange={(v) => updateField("projectNumber", v)}
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
    className?: string;
    required?: boolean;
    type?: string;
  }
>(({ label, value, onChange, className = "", required = false, type = "text" }, ref) => {
  return (
    <div className={className}>
      <label className="block text-gray-500 mb-1">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <input
        ref={ref}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border px-3 py-2 rounded-md focus:ring-2 focus:ring-[#31BCFF]/50 focus:border-[#31BCFF] focus:outline-none"
        required={required}
      />
    </div>
  );
});

ProjectInput.displayName = "ProjectInput";