import React from 'react'
import { useTranslation } from 'react-i18next'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { Sex } from '@prisma/client'
import { EmployeeFormData } from './types'

interface PersonalInfoSectionProps {
  formData: EmployeeFormData
  validationErrors: Record<string, string>
  getFieldStyle: (fieldName: string) => string
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void
  onDateChange: (date: Date | null, fieldName: 'birthday' | 'dateOfHire') => void
}

export function PersonalInfoSection({
  formData,
  validationErrors,
  getFieldStyle,
  onChange,
  onDateChange
}: PersonalInfoSectionProps) {
  const { t } = useTranslation()

  return (
    <>
      <div>
        <label className="block text-sm font-medium text-gray-700">
          {t('employees.form.first_name')} <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          name="firstName"
          value={formData.firstName}
          onChange={onChange}
          className={getFieldStyle('firstName')}
          required
        />
        {validationErrors.firstName && (
          <p className="mt-1 text-sm text-red-500">{validationErrors.firstName}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          {t('employees.form.last_name')} <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          name="lastName"
          value={formData.lastName}
          onChange={onChange}
          className={getFieldStyle('lastName')}
          required
        />
        {validationErrors.lastName && (
          <p className="mt-1 text-sm text-red-500">{validationErrors.lastName}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          {t('employees.form.birthday')} <span className="text-red-500">*</span>
        </label>
        <DatePicker
          selected={formData.birthday}
          onChange={(date) => onDateChange(date, 'birthday')}
          className={getFieldStyle('birthday')}
          required
        />
        {validationErrors.birthday && (
          <p className="mt-1 text-sm text-red-500">{validationErrors.birthday}</p>
        )}
      </div>

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
        >
          <option value="MALE">{t('employees.form.male')}</option>
          <option value="FEMALE">{t('employees.form.female')}</option>
          <option value="OTHER">{t('employees.form.other')}</option>
        </select>
        {validationErrors.sex && (
          <p className="mt-1 text-sm text-red-500">{validationErrors.sex}</p>
        )}
      </div>

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
        />
        {validationErrors.address && (
          <p className="mt-1 text-sm text-red-500">{validationErrors.address}</p>
        )}
      </div>
    </>
  )
}
