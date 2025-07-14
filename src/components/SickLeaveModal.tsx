import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import SickLeaveForm from "./SickLeaveForm"
import { useTranslation } from 'react-i18next'

interface SickLeaveFormData {
  employeeId?: string
  startDate: string
  endDate: string
  reason?: string
  document?: string
}

interface SickLeaveModalProps {
  isOpen: boolean
  onClose: () => void
  initialData?: SickLeaveFormData & { id?: string }
  onSubmit: (data: SickLeaveFormData) => void
  loading: boolean
  employees?: { id: string; firstName: string; lastName: string; employeeNo?: string }[]
  showEmployeeSelection?: boolean
  isEmployee?: boolean
}

export default function SickLeaveModal({
  isOpen,
  onClose,
  initialData,
  onSubmit,
  loading,
  employees = [],
  showEmployeeSelection = false,
  isEmployee = false
}: SickLeaveModalProps) {
  const { t } = useTranslation('sick-leave')
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {initialData?.id ? t('modal.edit_title') : t('modal.add_title')}
          </DialogTitle>
        </DialogHeader>
        <SickLeaveForm
          initialData={initialData}
          onSubmit={onSubmit}
          onCancel={onClose}
          loading={loading}
          employees={employees}
          showEmployeeSelection={showEmployeeSelection}
          isEmployee={isEmployee}
        />
      </DialogContent>
    </Dialog>
  )
}
