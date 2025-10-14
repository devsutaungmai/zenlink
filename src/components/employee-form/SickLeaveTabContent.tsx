import React from 'react'
import { HeartIcon } from '@heroicons/react/24/outline'

interface SickLeaveTabContentProps {
  employeeName?: string
  isNewEmployee?: boolean
}

export function SickLeaveTabContent({ employeeName, isNewEmployee }: SickLeaveTabContentProps) {
  if (isNewEmployee) {
    return (
      <div className="bg-gray-50 rounded-xl p-8 text-center">
        <HeartIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h4 className="text-lg font-medium text-gray-900 mb-2">No Sick Leave Records Yet</h4>
        <p className="text-gray-500">
          Sick leave records will be available after the employee is created.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Sick Leave Records</h3>
        <div className="text-sm text-gray-500">
          Track sick leave history and requests
        </div>
      </div>
      
      <div className="bg-gray-50 rounded-xl p-8 text-center">
        <HeartIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h4 className="text-lg font-medium text-gray-900 mb-2">Sick Leave Management</h4>
        <p className="text-gray-500 mb-6">
          View and manage sick leave requests for this employee
        </p>
      </div>
    </div>
  )
}
