import React from 'react'
import { useTranslation } from 'react-i18next'
import { DocumentTextIcon } from '@heroicons/react/24/outline'

interface PayslipsTabContentProps {
  employeeName?: string
  isNewEmployee?: boolean
}

export function PayslipsTabContent({ employeeName, isNewEmployee }: PayslipsTabContentProps) {
  const { t } = useTranslation()
  
  if (isNewEmployee) {
    return (
      <div className="bg-gray-50 rounded-xl p-8 text-center">
        <DocumentTextIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h4 className="text-lg font-medium text-gray-900 mb-2">{t('employees.tabs.no_payslips_yet')}</h4>
        <p className="text-gray-500">
          {t('employees.tabs.payslips_available_after_creation')}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">{t('employees.tabs.employee_payslips')}</h3>
        <div className="text-sm text-gray-500">
          {t('employees.tabs.download_view_payslips')}
        </div>
      </div>
      
      <div className="bg-gray-50 rounded-xl p-8 text-center">
        <DocumentTextIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h4 className="text-lg font-medium text-gray-900 mb-2">{t('employees.tabs.payslips_archive')}</h4>
        <p className="text-gray-500 mb-6">
          {t('employees.tabs.payslips_archive_description')}
        </p>
      </div>
    </div>
  )
}
