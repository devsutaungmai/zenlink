import React from 'react'
import { ClockIcon } from '@heroicons/react/24/outline'

interface ShiftsTabContentProps {
  employeeName?: string
  isNewEmployee?: boolean
}

export function ShiftsTabContent({ employeeName, isNewEmployee }: ShiftsTabContentProps) {
  if (isNewEmployee) {
    return (
      <div className="bg-gray-50 rounded-xl p-8 text-center">
        <ClockIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h4 className="text-lg font-medium text-gray-900 mb-2">No Shifts Yet</h4>
        <p className="text-gray-500">
          Shifts will be available after the employee is created.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Employee Shifts</h3>
        <div className="text-sm text-gray-500">
          {employeeName && `Showing shifts for ${employeeName}`}
        </div>
      </div>
      <div className="bg-gray-50 rounded-xl p-8 text-center">
        <ClockIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h4 className="text-lg font-medium text-gray-900 mb-2">Shifts Management</h4>
        <p className="text-gray-500">
          Shift history and management will be displayed here.
        </p>
      </div>
    </div>
  )
}
