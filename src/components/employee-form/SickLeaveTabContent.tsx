import React from 'react'
import { useTranslation } from 'react-i18next'
import { HeartIcon } from '@heroicons/react/24/outline'

interface SickLeaveTabContentProps {
  employeeName?: string
  isNewEmployee?: boolean
}

export function SickLeaveTabContent({ employeeName, isNewEmployee }: SickLeaveTabContentProps) {
  const { t } = useTranslation()
  
  if (isNewEmployee) {
    return (
      <div className="bg-gray-50 rounded-xl p-8 text-center">
        <HeartIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h4 className="text-lg font-medium text-gray-900 mb-2">{t('employees.tabs.no_sick_leave_yet')}</h4>
        <p className="text-gray-500">
          {t('employees.tabs.sick_leave_available_after_creation')}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">{t('employees.tabs.sick_leave_records')}</h3>
        <div className="text-sm text-gray-500">
          {t('employees.tabs.track_sick_leave')}
        </div>
      </div>
      
      <div className="bg-gray-50 rounded-xl p-8 text-center">
        <HeartIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h4 className="text-lg font-medium text-gray-900 mb-2">{t('employees.tabs.sick_leave_management')}</h4>
        <p className="text-gray-500 mb-6">
          {t('employees.tabs.sick_leave_management_description')}
        </p>
      </div>
    </div>
  )
}
