'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { EmployeeFormProps } from './types'
import { useEmployeeForm } from './useEmployeeForm'
import { PersonalInfoSection } from './PersonalInfoSection'
import { EmploymentInfoSection } from './EmploymentInfoSection'
import { ContactInfoSection } from './ContactInfoSection'
import ProfilePhotoUpload from '../ProfilePhotoUpload'

export default function EmployeeForm({
  initialData,
  onSubmit,
  loading,
  departments,
  employeeGroups,
}: EmployeeFormProps) {
  const { t } = useTranslation()
  const router = useRouter()
  
  const {
    formData,
    setFormData,
    employeeNumberMode,
    fetchingNextNumber,
    validationErrors,
    setValidationErrors,
    validatingSSN,
    validatingEmail,
    validatingEmployeeNo,
    ssnValidationTimeoutRef,
    emailValidationTimeoutRef,
    employeeNoValidationTimeoutRef,
    validateForm,
    debouncedValidation,
    validateSocialSecurityNumber,
    validateEmailUniqueness,
    validateEmployeeNumberUniqueness,
  } = useEmployeeForm({ initialData })

  const getFieldStyle = (fieldName: string) => {
    const hasError = validationErrors[fieldName] && validationErrors[fieldName] !== ''
    const isValidating = (fieldName === 'socialSecurityNo' && validatingSSN) ||
                        (fieldName === 'email' && validatingEmail) ||
                        (fieldName === 'employeeNo' && validatingEmployeeNo)
    
    return `mt-1 block w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-1 ${
      hasError
        ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
        : isValidating
          ? 'border-yellow-300 focus:border-yellow-500 focus:ring-yellow-500'
          : 'border-gray-300 focus:border-[#31BCFF] focus:ring-[#31BCFF]'
    }`
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const target = e.target as HTMLInputElement
    const { name, value, type } = target

    if (name === 'mobile') {
      const digitsOnly = value.replace(/\D/g, '').slice(0, 8)
      setFormData(prev => ({ ...prev, mobile: digitsOnly }))

      if (digitsOnly.length > 0 && digitsOnly.length < 8) {
        setValidationErrors(prev => ({ ...prev, mobile: 'Mobile number must contain 8 digits' }))
      } else {
        setValidationErrors(prev => ({ ...prev, mobile: '' }))
      }

      debouncedValidation(name, digitsOnly)
      return
    }

    if (name === 'salaryRate') {
      if (value === '') {
        setFormData(prev => ({ ...prev, salaryRate: undefined }))
        setValidationErrors(prev => ({ ...prev, salaryRate: '' }))
        debouncedValidation(name, undefined)
        return
      }

      if (value.includes('-')) {
        setValidationErrors(prev => ({ ...prev, salaryRate: 'Salary rate cannot be negative' }))
        return
      }

      const parsedValue = Number(value)
      if (Number.isNaN(parsedValue)) {
        setValidationErrors(prev => ({ ...prev, salaryRate: 'Salary rate must be a valid number' }))
        return
      }

      if (parsedValue <= 0) {
        setValidationErrors(prev => ({ ...prev, salaryRate: 'Salary rate must be greater than 0' }))
      } else {
        setValidationErrors(prev => ({ ...prev, salaryRate: '' }))
      }

      setFormData(prev => ({ ...prev, salaryRate: parsedValue }))
      debouncedValidation(name, parsedValue)
      return
    }

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? target.checked : 
              type === 'number' ? (value === '' ? undefined : parseFloat(value)) : 
              value
    }))

    if (validationErrors[name]) {
      setValidationErrors(prev => ({ ...prev, [name]: '' }))
    }

    debouncedValidation(name, value)

    if (name === 'socialSecurityNo') {
      if (ssnValidationTimeoutRef.current) {
        clearTimeout(ssnValidationTimeoutRef.current)
      }
      ssnValidationTimeoutRef.current = setTimeout(() => {
        validateSocialSecurityNumber(value)
      }, 1000)
    }

    if (name === 'email') {
      if (emailValidationTimeoutRef.current) {
        clearTimeout(emailValidationTimeoutRef.current)
      }
      emailValidationTimeoutRef.current = setTimeout(() => {
        validateEmailUniqueness(value)
      }, 1000)
    }

    if (name === 'employeeNo') {
      if (employeeNoValidationTimeoutRef.current) {
        clearTimeout(employeeNoValidationTimeoutRef.current)
      }
      employeeNoValidationTimeoutRef.current = setTimeout(() => {
        validateEmployeeNumberUniqueness(value)
      }, 1500)
    }
  }

  const handleDateChange = (date: Date | null, fieldName: 'birthday' | 'dateOfHire') => {
    if (date) {
      setFormData(prev => ({ ...prev, [fieldName]: date }))
      if (validationErrors[fieldName]) {
        setValidationErrors(prev => ({ ...prev, [fieldName]: '' }))
      }
      debouncedValidation(fieldName, date)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const isValid = await validateForm()
    
    if (!isValid) {
      return
    }

    const fullMobile = formData.mobile.startsWith('+') 
      ? formData.mobile 
      : formData.countryCode + formData.mobile
      
    const submissionData = {
      ...formData,
      mobile: fullMobile
    }
    
    onSubmit(submissionData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Profile Photo</h3>
        <ProfilePhotoUpload
          currentPhotoUrl={formData.profilePhoto}
          onPhotoChange={(url) => setFormData({ ...formData, profilePhoto: url })}
          disabled={loading}
        />
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Personal Information</h3>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <PersonalInfoSection
            formData={formData}
            validationErrors={validationErrors}
            getFieldStyle={getFieldStyle}
            onChange={handleChange}
            onDateChange={handleDateChange}
          />
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Employment Details</h3>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <EmploymentInfoSection
            formData={formData}
            validationErrors={validationErrors}
            getFieldStyle={getFieldStyle}
            onChange={handleChange}
            onDateChange={handleDateChange}
            departments={departments}
            employeeGroups={employeeGroups}
            employeeNumberMode={employeeNumberMode}
            fetchingNextNumber={fetchingNextNumber}
            onSSNChange={(e) => {
              handleChange(e)
              validateSocialSecurityNumber(e.target.value)
            }}
          />
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Contact Information</h3>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <ContactInfoSection
            formData={formData}
            validationErrors={validationErrors}
            getFieldStyle={getFieldStyle}
            onChange={handleChange}
            onCountryCodeSelect={(code) => setFormData({ ...formData, countryCode: code })}
          />
        </div>
      </div>

      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#31BCFF]"
        >
          {t('common.cancel')}
        </button>
        <button
          type="submit"
          disabled={loading || validatingSSN || validatingEmail || validatingEmployeeNo}
          className={`px-4 py-2 text-sm font-medium text-white border border-transparent rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#31BCFF] ${
            loading || validatingSSN || validatingEmail || validatingEmployeeNo
              ? 'bg-gray-400 cursor-not-allowed'
              : Object.keys(validationErrors).some(key => validationErrors[key] !== '')
                ? 'bg-red-500 hover:bg-red-600'
                : 'bg-[#31BCFF] hover:bg-[#31BCFF]/90'
          }`}
        >
          {loading ? (
            t('employees.form.saving')
          ) : validatingSSN || validatingEmail || validatingEmployeeNo ? (
            'Validating...'
          ) : Object.keys(validationErrors).some(key => validationErrors[key] !== '') ? (
            'Fix Errors to Save'
          ) : (
            t('common.save')
          )}
        </button>
      </div>
    </form>
  )
}
