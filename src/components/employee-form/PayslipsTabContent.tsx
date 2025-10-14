import React from 'react'
import { DocumentTextIcon } from '@heroicons/react/24/outline'

interface PayslipsTabContentProps {
  employeeName?: string
  isNewEmployee?: boolean
}

export function PayslipsTabContent({ employeeName, isNewEmployee }: PayslipsTabContentProps) {
  if (isNewEmployee) {
    return (
      <div className="bg-gray-50 rounded-xl p-8 text-center">
        <DocumentTextIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h4 className="text-lg font-medium text-gray-900 mb-2">No Payslips Yet</h4>
        <p className="text-gray-500">
          Payslips will be available after the employee is created.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Employee Payslips</h3>
        <div className="text-sm text-gray-500">
          Download and view payslips
        </div>
      </div>
      
      <div className="bg-gray-50 rounded-xl p-8 text-center">
        <DocumentTextIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h4 className="text-lg font-medium text-gray-900 mb-2">Payslips Archive</h4>
        <p className="text-gray-500 mb-6">
          Access and download payslips for this employee
        </p>
      </div>
    </div>
  )
}
