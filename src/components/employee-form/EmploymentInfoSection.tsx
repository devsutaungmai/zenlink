import React from 'react'
import { useTranslation } from 'react-i18next'
import { DatePicker } from '@/components/ui/date-picker'
import { MultiSelect } from '@/components/ui/multi-select'
import { EmployeeFormData, Role } from './types'

interface EmploymentInfoSectionProps {
  formData: EmployeeFormData
  validationErrors: Record<string, string>
  getFieldStyle: (fieldName: string) => string
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void
  onDateChange: (date: Date | null, fieldName: 'birthday' | 'dateOfHire') => void
  onDepartmentsChange: (departmentIds: string[]) => void
  onEmployeeGroupsChange: (employeeGroupIds: string[]) => void
  onRolesChange?: (roleIds: string[]) => void
  departments: Array<{ id: string; name: string }>
  employeeGroups: Array<{ id: string; name: string }>
  roles?: Role[]
  employeeNumberMode: 'manual' | 'automatic'
  fetchingNextNumber: boolean
  onSSNChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  readOnly?: boolean
  canViewSensitive?: boolean
}

export function EmploymentInfoSection({
  formData,
  validationErrors,
  getFieldStyle,
  onChange,
  onDateChange,
  onDepartmentsChange,
  onEmployeeGroupsChange,
  onRolesChange,
  departments,
  employeeGroups,
  roles = [],
  employeeNumberMode,
  fetchingNextNumber,
  onSSNChange,
  readOnly = false,
  canViewSensitive = true,
}: EmploymentInfoSectionProps) {
  const { t } = useTranslation()

  const filteredRoles = React.useMemo(() => {
    if (formData.departmentIds.length === 0) {
      return roles.filter(role => 
        !role.departments || role.departments.length === 0
      )
    }
    
    return roles.filter(role => {
      if (!role.departments || role.departments.length === 0) {
        return true
      }
      return role.departments.some(rd => 
        formData.departmentIds.includes(rd.departmentId)
      )
    })
  }, [roles, formData.departmentIds])

  return (
    <>
      {canViewSensitive && (
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
            disabled={readOnly}
          />
          {validationErrors.socialSecurityNo && (
            <p className="mt-1 text-sm text-red-500">{validationErrors.socialSecurityNo}</p>
          )}
        </div>
      )}

    <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('employees.form.employee_number')} <span className="text-red-500">*</span>
        </label>
        
        <div className="items-center gap-2">
            <input
              type="text"
              name="employeeNo"
              value={formData.employeeNo}
              onChange={onChange}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 bg-gray-50 text-gray-500"
              required
              disabled={readOnly}
            />
            {fetchingNextNumber && (
              <div className="text-sm text-gray-500">Generating...</div>
            )}
        </div>

        {validationErrors.employeeNo && (
          <p className="mt-1 text-sm text-red-500">{validationErrors.employeeNo}</p>
        )}
    </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          {t('employees.form.date_of_hire')} <span className="text-red-500">*</span>
        </label>
        <DatePicker
          date={formData.dateOfHire}
          onDateChange={(date) => onDateChange(date || null, 'dateOfHire')}
          className={getFieldStyle('dateOfHire')}
          placeholder="Select date of hire"
          dateFormat="dd/MM/yyyy"
          yearRange={{
            from: new Date().getFullYear() - 10,
            to: new Date().getFullYear() + 1
          }}
          disabled={readOnly}
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
          disabled={readOnly}
        />
        {validationErrors.hoursPerMonth && (
          <p className="mt-1 text-sm text-red-500">{validationErrors.hoursPerMonth}</p>
        )}
      </div>

      {canViewSensitive && (
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Salary Rate (per hour) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            name="salaryRate"
            value={formData.salaryRate || ''}
            onChange={onChange}
            step="0.01"
            min="0.01"
            className={getFieldStyle('salaryRate')}
            required
            disabled={readOnly}
          />
          {validationErrors.salaryRate && (
            <p className="mt-1 text-sm text-red-500">{validationErrors.salaryRate}</p>
          )}
        </div>
      )}

      <div className="sm:col-span-2">
        <MultiSelect
          label={t('employees.form.department')}
          options={departments}
          selectedIds={formData.departmentIds}
          onChange={onDepartmentsChange}
          placeholder="Select departments..."
          required
          error={validationErrors.departmentId || validationErrors.departmentIds}
          disabled={readOnly}
        />
      </div>

      <div className="sm:col-span-2">
        <MultiSelect
          label={t('employees.form.employee_group')}
          options={employeeGroups}
          selectedIds={formData.employeeGroupIds}
          onChange={onEmployeeGroupsChange}
          placeholder="Select employee groups..."
          disabled={readOnly}
        />
      </div>

      {filteredRoles.length > 0 && onRolesChange && (
        <div className="sm:col-span-2">
          <MultiSelect
            label={t('employees.form.access_roles', 'Access Roles')}
            options={filteredRoles.map(r => ({ id: r.id, name: r.name }))}
            selectedIds={formData.roleIds.filter(id => filteredRoles.some(r => r.id === id))}
            onChange={onRolesChange}
            placeholder={t('employees.form.select_roles', 'Select access roles...')}
            disabled={readOnly}
          />
          <p className="mt-1 text-xs text-gray-500">
            {formData.departmentIds.length > 0 
              ? t('employees.form.access_roles_hint_filtered', 'Showing roles available for selected departments and roles without department restrictions.')
              : t('employees.form.access_roles_hint', 'Select departments first to see department-specific roles. Roles without department restrictions are always shown.')}
          </p>
        </div>
      )}

      {canViewSensitive && (
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
            disabled={readOnly}
          />
          {validationErrors.bankAccount && (
            <p className="mt-1 text-sm text-red-500">{validationErrors.bankAccount}</p>
          )}
        </div>
      )}

      <div className="flex items-center">
        <input
          type="checkbox"
          name="isTeamLeader"
          checked={formData.isTeamLeader}
          onChange={onChange}
          className="h-4 w-4 rounded border-gray-300 text-[#31BCFF] focus:ring-[#31BCFF]"
          disabled={readOnly}
        />
        <label className="ml-2 block text-sm text-gray-700">
          {t('employees.form.team_leader')}
        </label>
      </div>
    </>
  )
}
