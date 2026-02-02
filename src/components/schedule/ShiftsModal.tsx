import React from 'react'
import { format } from 'date-fns'
import { useTranslation } from 'react-i18next'
import { formatDate } from '@/shared/lib/dateLocale'
import { ShiftWithRelations } from '@/types/schedule'
import { Employee } from '@prisma/client'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'

interface ShiftsModalProps {
  isOpen: boolean
  onClose: () => void
  shifts: ShiftWithRelations[]
  date: Date
  title: string
  employees?: Employee[]
  onEditShift: (shift: ShiftWithRelations) => void
  canEditShifts?: boolean
}

export default function ShiftsModal({
  isOpen,
  onClose,
  shifts,
  date,
  title,
  employees = [],
  onEditShift,
  canEditShifts = true
}: ShiftsModalProps) {
  const { i18n } = useTranslation()
  const handleShiftClick = (shift: ShiftWithRelations) => {
    onEditShift(shift)
    onClose()
  }

  const getShiftStatusColor = (status: string) => {
    switch (status) {
      case 'CANCELLED':
        return 'bg-red-500'
      case 'WORKING':
        return 'bg-blue-500'
      case 'COMPLETED':
        return 'bg-green-500'
      default:
        return 'bg-[#31BCFF]'
    }
  }

  const getEmployeeName = (employeeId: string) => {
    const employee = employees.find(emp => emp.id === employeeId)
    return employee ? `${employee.firstName} ${employee.lastName}` : 'Unknown Employee'
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {formatDate(date, 'EEEE, MMMM d, yyyy', i18n.language)}
          </DialogDescription>
        </DialogHeader>

        {/* Shifts List */}
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {shifts.map((shift, index) => (
            <button
              key={shift.id}
              onClick={() => handleShiftClick(shift)}
              className="w-full p-3 rounded-lg border border-gray-200 transition-all text-left hover:border-[#31BCFF] hover:bg-blue-50 cursor-pointer"
            >
              <div className="flex items-center gap-3">
                {/* Status Indicator */}
                <div className={`w-3 h-3 rounded-full ${getShiftStatusColor(shift.status)}`} />
                
                {/* Shift Info */}
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-900">
                      {shift.startTime} - {shift.endTime || 'Active'}
                    </span>
                    <span className="text-xs text-gray-500 capitalize">
                      {shift.status?.toLowerCase() || 'scheduled'}
                    </span>
                  </div>
                  
                  <div className="text-sm text-gray-600 mt-1">
                    {shift.function?.name && (
                      <span className="inline-block bg-gray-100 px-2 py-0.5 rounded text-xs mr-2">
                        {shift.function.name}
                      </span>
                    )}
                    <span>{getEmployeeName(shift.employeeId || '')}</span>
                  </div>
                  
                  {shift.note && (
                    <p className="text-xs text-gray-500 mt-1 truncate">
                      {shift.note}
                    </p>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-gray-200">
          <p className="text-sm text-gray-600 text-center">
            {shifts.length} shift{shifts.length !== 1 ? 's' : ''} on this date
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
