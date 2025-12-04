import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

import ShiftForm from "../ShiftForm"
import { Employee, EmployeeGroup } from '@prisma/client'

interface ShiftFormModalProps {
  isOpen: boolean
  onClose: () => void
  initialData: any
  employees: Employee[]
  employeeGroups: EmployeeGroup[]
  onSubmit: (formData: any) => void
  onDelete?: (shiftId: string) => void
  viewType: 'week' | 'day' | 'month'
  loading: boolean
}

export default function ShiftFormModal({
  isOpen,
  onClose,
  initialData,
  employees,
  employeeGroups,
  onSubmit,
  onDelete,
  viewType,
  loading
}: ShiftFormModalProps) {
  const formKey = initialData?.id || 'new-shift'
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {initialData?.id ? 'Edit Shift' : 'Create New Shift'}
          </DialogTitle>
        </DialogHeader>
        <ShiftForm
          key={formKey}
          initialData={initialData}
          employees={employees}
          employeeGroups={employeeGroups}
          onSubmit={onSubmit}
          onDelete={onDelete}
          onCancel={onClose}
          loading={loading}
          showEmployee={true}
          showStartTime={true}
          showDate={true}
        />
      </DialogContent>
    </Dialog>
  )
}