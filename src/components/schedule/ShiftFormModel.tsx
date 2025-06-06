import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

import ShiftForm from "../ShiftForm"

interface ShiftFormModalProps {
  isOpen: boolean
  onClose: () => void
  initialData: any
  employees: Employee[]
  employeeGroups: EmployeeGroup[]
  onSubmit: (formData: any) => void
  viewType: 'week' | 'day'
  loading: boolean
}

export default function ShiftFormModal({
  isOpen,
  onClose,
  initialData,
  employees,
  employeeGroups,
  onSubmit,
  viewType,
  loading
}: ShiftFormModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {initialData?.id ? 'Edit Shift' : 'Create New Shift'}
          </DialogTitle>
        </DialogHeader>
        <ShiftForm
          initialData={initialData}
          employees={employees}
          employeeGroups={employeeGroups}
          onSubmit={onSubmit}
          onCancel={onClose}
          loading={loading}
          showEmployee={true} // Always show employee selector
          showStartTime={viewType === 'week'} // Only hide startTime for day view if needed
          showDate={true}
        />
      </DialogContent>
    </Dialog>
  )
}