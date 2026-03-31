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
import { useTranslation } from 'react-i18next'

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
  canEditShifts?: boolean
  canDeleteShifts?: boolean
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
  loading,
  canEditShifts = true,
  canDeleteShifts = true
}: ShiftFormModalProps) {
  const { t } = useTranslation()
  const formKey = [
    initialData?.id || 'new-shift',
    initialData?.breakStart || 'no-break-start',
    initialData?.breakEnd || 'no-break-end',
    initialData?.shiftTypeId || initialData?.shiftType || 'no-shift-type',
  ].join(':')
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {!canEditShifts ? t('shifts.view_shift') : (initialData?.id ? t('shifts.edit_shift') : t('shifts.create_shift'))}
          </DialogTitle>
        </DialogHeader>
        <ShiftForm
          key={formKey}
          initialData={initialData}
          employees={employees}
          employeeGroups={employeeGroups}
          onSubmit={canEditShifts ? onSubmit : undefined}
          onDelete={canDeleteShifts ? onDelete : undefined}
          onCancel={onClose}
          loading={loading}
          showEmployee={true}
          showStartTime={true}
          showDate={true}
          readOnly={!canEditShifts}
        />
      </DialogContent>
    </Dialog>
  )
}
