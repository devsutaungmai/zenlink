import React from 'react'
import { useTranslation } from 'react-i18next'
import { useCurrency } from '@/shared/hooks/useCurrency'

export enum WageType {
  HOURLY = 'HOURLY',
  PER_SHIFT = 'PER_SHIFT'
}

export interface EmployeeGroupFormData {
  name: string
  hourlyWage: number
  wagePerShift: number
  defaultWageType: WageType
}

interface EmployeeGroupFormProps {
  initialData?: EmployeeGroupFormData
  onSubmit: (data: EmployeeGroupFormData) => void
  loading: boolean
}

export default function EmployeeGroupForm({ initialData, onSubmit, loading }: EmployeeGroupFormProps) {
  const { t } = useTranslation()
  const { currencySymbol } = useCurrency()
  const [formData, setFormData] = React.useState<EmployeeGroupFormData>(
    initialData || {
      name: '',
      hourlyWage: 0,
      wagePerShift: 0,
      defaultWageType: WageType.HOURLY,
    }
  )

  React.useEffect(() => {
    if (initialData) {
      setFormData(prev => ({
        ...prev,
        ...initialData,
      }))
    }
  }, [initialData])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  const handleWageChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'hourlyWage' | 'wagePerShift') => {
    // Allow only whole numbers (no decimals)
    const numericValue = e.target.value.replace(/[^0-9]/g, '')
    // Parse to integer or default to 0
    const value = numericValue ? parseInt(numericValue) : 0
    setFormData({ ...formData, [field]: value })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="grid grid-cols-1 gap-6">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            {t('employee_groups.form.group_name')} <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="block w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-[#31BCFF]/50 focus:border-[#31BCFF] transition-all duration-200"
            placeholder={t('employee_groups.form.group_name_placeholder')}
            required
          />
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              {t('employee_groups.form.hourly_wage')} <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">{currencySymbol}</span>
              <input
                type="text"
                value={formData.hourlyWage || ''}
                onChange={(e) => handleWageChange(e, 'hourlyWage')}
                placeholder="0"
                className="block w-full pl-8 pr-4 py-3 rounded-xl border border-gray-300 text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-[#31BCFF]/50 focus:border-[#31BCFF] transition-all duration-200"
                required
              />
            </div>
            <p className="mt-1 text-xs text-gray-500">{t('employee_groups.form.hourly_wage_help')}</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              {t('employee_groups.form.wage_per_shift')} <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">{currencySymbol}</span>
              <input
                type="text"
                value={formData.wagePerShift || ''}
                onChange={(e) => handleWageChange(e, 'wagePerShift')}
                placeholder="0"
                className="block w-full pl-8 pr-4 py-3 rounded-xl border border-gray-300 text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-[#31BCFF]/50 focus:border-[#31BCFF] transition-all duration-200"
                required
              />
            </div>
            <p className="mt-1 text-xs text-gray-500">{t('employee_groups.form.wage_per_shift_help')}</p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            {t('employee_groups.form.default_wage_type')} <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.defaultWageType}
            onChange={(e) => setFormData({ ...formData, defaultWageType: e.target.value as WageType })}
            className="block w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 focus:ring-2 focus:ring-[#31BCFF]/50 focus:border-[#31BCFF] transition-all duration-200"
            required
          >
            <option value={WageType.HOURLY}>{t('employee_groups.form.hourly_wage_option')}</option>
            <option value={WageType.PER_SHIFT}>{t('employee_groups.form.wage_per_shift_option')}</option>
          </select>
          <p className="mt-1 text-xs text-gray-500">{t('employee_groups.form.default_wage_type_help')}</p>
        </div>
      </div>

      <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
        <button
          type="button"
          onClick={() => window.history.back()}
          className="px-6 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#31BCFF] transition-all duration-200"
        >
          {t('common.cancel')}
        </button>
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center px-6 py-3 text-sm font-medium text-white bg-gradient-to-r from-[#31BCFF] to-[#0EA5E9] border border-transparent rounded-xl hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#31BCFF] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              {initialData ? t('employee_groups.form.updating') : t('employee_groups.form.creating')}
            </>
          ) : (
            initialData ? t('employee_groups.form.update_group') : t('employee_groups.form.create_group')
          )}
        </button>
      </div>
    </form>
  )
}
