import React from 'react'
import { useTranslation } from 'react-i18next'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { EmployeeFormData } from './types'

interface EmploymentInfoSectionProps {
  formData: EmployeeFormData
  validationErrors: Record<string, string>
  getFieldStyle: (fieldName: string) => string
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void
  onDateChange: (date: Date | null, fieldName: 'birthday' | 'dateOfHire') => void
  departments: Array<{ id: string; name: string }>
  employeeGroups: Array<{ id: string; name: string }>
  employeeNumberMode: 'manual' | 'automatic'
  fetchingNextNumber: boolean
  onEmployeeNumberModeChange: (mode: 'manual' | 'automatic') => void
  onSSNChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}

export function EmploymentInfoSection({
  formData,
  validationErrors,
  getFieldStyle,
  onChange,
  onDateChange,
  departments,
  employeeGroups,
  employeeNumberMode,
  fetchingNextNumber,
  onEmployeeNumberModeChange,
  onSSNChange
}: EmploymentInfoSectionProps) {
  const { t } = useTranslation()

  return (
    <>
      <div>
        <label className="block text-sm font-medium text-gray-700">
          {t('employees.form.social_security_no')} <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          name="socialSecurityNo"
          value={formData.socialSecurityNo}
          onChange={onSSNChange}
          className={getFieldStyle('socialSecurityNo')}
          required
        />
        {validationErrors.socialSecurityNo && (
          <p className="mt-1 text-sm text-red-500">{validationErrors.socialSecurityNo}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          {t('employees.form.employee_number')} <span className="text-red-500">*</span>
        </label>
        
        <div className="flex gap-6 mb-3">
          <label className="flex items-center">
            <input
              type="radio"
              name="employeeNumberMode"
              value="automatic"
              checked={employeeNumberMode === 'automatic'}
              onChange={() => onEmployeeNumberModeChange('automatic')}
              className="mr-2 text-[#31BCFF] focus:ring-[#31BCFF]"
            />
            <span className="text-sm text-gray-700">Automatic Generation</span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              name="employeeNumberMode"
              value="manual"
              checked={employeeNumberMode === 'manual'}
              onChange={() => onEmployeeNumberModeChange('manual')}
              className="mr-2 text-[#31BCFF] focus:ring-[#31BCFF]"
            />
            <span className="text-sm text-gray-700">Manual Entry</span>
          </label>
        </div>

        {employeeNumberMode === 'manual' ? (
          <input
            type="text"
            name="employeeNo"
            value={formData.employeeNo}
            onChange={onChange}
            placeholder="Enter employee number"
            className={getFieldStyle('employeeNo')}
            required
          />
        ) : (
          <div className="flex items-center gap-2">
            <input
              type="text"
              name="employeeNo"
              value={formData.employeeNo}
              readOnly
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 bg-gray-50 text-gray-500 cursor-not-allowed"
              required
            />
            {fetchingNextNumber && (
              <div className="text-sm text-gray-500">Generating...</div>
            )}
          </div>
        )}
        {validationErrors.employeeNo && (
          <p className="mt-1 text-sm text-red-500">{validationErrors.employeeNo}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          {t('employees.form.date_of_hire')} <span className="text-red-500">*</span>
        </label>
        <DatePicker
          selected={formData.dateOfHire}
          onChange={(date) => onDateChange(date, 'dateOfHire')}
          className={getFieldStyle('dateOfHire')}
          required
        />
        {validationErrors.dateOfHire && (
          <p className="mt-1 text-sm text-red-500">{validationErrors.dateOfHire}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          {t('employees.form.hours_per_month')} <span className="text-red-500">*</span>
        </label>
        <input
          type="number"
          name="hoursPerMonth"
          value={formData.hoursPerMonth || 0}
          onChange={onChange}
          className={getFieldStyle('hoursPerMonth')}
          required
        />
        {validationErrors.hoursPerMonth && (
          <p className="mt-1 text-sm text-red-500">{validationErrors.hoursPerMonth}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Salary Rate (per hour)
        </label>
        <input
          type="number"
          name="salaryRate"
          value={formData.salaryRate || ''}
          onChange={onChange}
          step="0.01"
          className={getFieldStyle('salaryRate')}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          {t('employees.form.department')} <span className="text-red-500">*</span>
        </label>
        <select
          name="departmentId"
          value={formData.departmentId}
          onChange={onChange}
          className={getFieldStyle('departmentId')}
          required
        >
          <option value="">{t('employees.form.select_department')}</option>
          {departments.map((dept) => (
            <option key={dept.id} value={dept.id}>
              {dept.name}
            </option>
          ))}
        </select>
        {validationErrors.departmentId && (
          <p className="mt-1 text-sm text-red-500">{validationErrors.departmentId}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          {t('employees.form.employee_group')}
        </label>
        <select
          name="employeeGroupId"
          value={formData.employeeGroupId || ''}
          onChange={onChange}
          className={getFieldStyle('employeeGroupId')}
        >
          <option value="">{t('employees.form.select_employee_group')}</option>
          {employeeGroups.map((group) => (
            <option key={group.id} value={group.id}>
              {group.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          {t('employees.form.bank_account')} <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          name="bankAccount"
          value={formData.bankAccount}
          onChange={onChange}
          className={getFieldStyle('bankAccount')}
          required
        />
        {validationErrors.bankAccount && (
          <p className="mt-1 text-sm text-red-500">{validationErrors.bankAccount}</p>
        )}
      </div>

      <div className="flex items-center">
        <input
          type="checkbox"
          name="isTeamLeader"
          checked={formData.isTeamLeader}
          onChange={onChange}
          className="h-4 w-4 rounded border-gray-300 text-[#31BCFF] focus:ring-[#31BCFF]"
        />
        <label className="ml-2 block text-sm text-gray-700">
          {t('employees.form.team_leader')}
        </label>
      </div>
    </>
  )
}
