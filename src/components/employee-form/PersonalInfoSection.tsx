import React from 'react'
import { useTranslation } from 'react-i18next'
import { DatePicker } from '@/components/ui/date-picker'
import { Sex } from '@prisma/client'
import { EmployeeFormData } from './types'
import { EmployeeSettingsForValidation } from './validation'

interface PersonalInfoSectionProps {
  formData: EmployeeFormData
  validationErrors: Record<string, string>
  getFieldStyle: (fieldName: string) => string
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void
  onDateChange: (date: Date | null, fieldName: 'birthday' | 'dateOfHire') => void
  readOnly?: boolean
  validationSettings?: EmployeeSettingsForValidation
}

export function PersonalInfoSection({
  formData,
  validationErrors,
  getFieldStyle,
  onChange,
  onDateChange,
  readOnly = false,
  validationSettings,
}: PersonalInfoSectionProps) {
  const { t } = useTranslation()

  return (
    <>
      <div>
        <label className="block text-sm font-medium text-gray-700">
          {t('employees.form.first_name')} {validationSettings?.requireFirstName !== false && <span className="text-red-500">*</span>}
        </label>
        <input
          type="text"
          name="firstName"
          value={formData.firstName}
          onChange={onChange}
          className={getFieldStyle('firstName')}
          required={validationSettings?.requireFirstName !== false}
          disabled={readOnly}
        />
        {validationErrors.firstName && (
          <p className="mt-1 text-sm text-red-500">{validationErrors.firstName}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          {t('employees.form.last_name')} {validationSettings?.requireLastName !== false && <span className="text-red-500">*</span>}
        </label>
        <input
          type="text"
          name="lastName"
          value={formData.lastName}
          onChange={onChange}
          className={getFieldStyle('lastName')}
          required={validationSettings?.requireLastName !== false}
          disabled={readOnly}
        />
        {validationErrors.lastName && (
          <p className="mt-1 text-sm text-red-500">{validationErrors.lastName}</p>
        )}
      </div>

      {validationSettings?.requireBirthday !== false && (
        <div>
          <label className="block text-sm font-medium text-gray-700">
            {t('employees.form.birthday')} <span className="text-red-500">*</span>
          </label>
          <DatePicker
            date={formData.birthday}
            onDateChange={(date) => onDateChange(date || null, 'birthday')}
            className={getFieldStyle('birthday')}
            placeholder="Select date of birth"
            dateFormat="dd/MM/yyyy"
            yearRange={{ 
              from: new Date().getFullYear() - 100, 
              to: new Date().getFullYear() 
            }}
            disabled={readOnly}
          />
          {validationErrors.birthday && (
            <p className="mt-1 text-sm text-red-500">{validationErrors.birthday}</p>
          )}
        </div>
      )}

      {validationSettings?.requireGender !== false && (
        <div>
          <label className="block text-sm font-medium text-gray-700">
            {t('employees.form.gender')} <span className="text-red-500">*</span>
          </label>
          <select
            name="sex"
            value={formData.sex}
            onChange={onChange}
            className={getFieldStyle('sex')}
            required
            disabled={readOnly}
          >
            <option value="MALE">{t('employees.form.male')}</option>
            <option value="FEMALE">{t('employees.form.female')}</option>
            <option value="OTHER">{t('employees.form.other')}</option>
          </select>
          {validationErrors.sex && (
            <p className="mt-1 text-sm text-red-500">{validationErrors.sex}</p>
          )}
        </div>
      )}

      {validationSettings?.requireAddress === true && (
        <div>
          <label className="block text-sm font-medium text-gray-700">
            {t('employees.form.address')} <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="address"
            value={formData.address}
            onChange={onChange}
            className={getFieldStyle('address')}
            required
            disabled={readOnly}
          />
          {validationErrors.address && (
            <p className="mt-1 text-sm text-red-500">{validationErrors.address}</p>
          )}
        </div>
      )}
    </>
  )
}
