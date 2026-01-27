import React from 'react'
import { useTranslation } from 'react-i18next'
import { ClockIcon } from '@heroicons/react/24/outline'

interface ShiftsTabContentProps {
  employeeName?: string
  isNewEmployee?: boolean
}

export function ShiftsTabContent({ employeeName, isNewEmployee }: ShiftsTabContentProps) {
  const { t } = useTranslation()
  
  if (isNewEmployee) {
    return (
      <div className="bg-gray-50 rounded-xl p-8 text-center">
        <ClockIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h4 className="text-lg font-medium text-gray-900 mb-2">{t('employees.tabs.no_shifts_yet')}</h4>
        <p className="text-gray-500">
          {t('employees.tabs.shifts_available_after_creation')}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">{t('employees.tabs.employee_shifts')}</h3>
        <div className="text-sm text-gray-500">
          {employeeName && t('employees.tabs.showing_shifts_for', { name: employeeName })}
        </div>
      </div>
      <div className="bg-gray-50 rounded-xl p-8 text-center">
        <ClockIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h4 className="text-lg font-medium text-gray-900 mb-2">{t('employees.tabs.shifts_management')}</h4>
        <p className="text-gray-500">
          {t('employees.tabs.shifts_management_description')}
        </p>
      </div>
    </div>
  )
}
