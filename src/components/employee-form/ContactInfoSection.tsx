import React, { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDownIcon, MagnifyingGlassIcon, CheckIcon } from '@heroicons/react/24/outline'
import { EmployeeFormData } from './types'
import { countryCodes } from './constants'
import { EmployeeSettingsForValidation } from './validation'

interface ContactInfoSectionProps {
  formData: EmployeeFormData
  validationErrors: Record<string, string>
  getFieldStyle: (fieldName: string) => string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onCountryCodeSelect: (code: string) => void
  readOnly?: boolean
  validationSettings?: EmployeeSettingsForValidation
}

export function ContactInfoSection({
  formData,
  validationErrors,
  getFieldStyle,
  onChange,
  onCountryCodeSelect,
  readOnly = false,
  validationSettings,
}: ContactInfoSectionProps) {
  const { t } = useTranslation()
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false)
  const [countrySearch, setCountrySearch] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)

  const filteredCountryCodes = countryCodes.filter(country =>
    country.country.toLowerCase().includes(countrySearch.toLowerCase()) ||
    country.code.includes(countrySearch)
  )

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsCountryDropdownOpen(false)
        setCountrySearch('')
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])
  
  const handleCountryCodeSelect = (countryCode: string) => {
    onCountryCodeSelect(countryCode)
    setIsCountryDropdownOpen(false)
    setCountrySearch('')
  }

  return (
    <>
      {validationSettings?.requirePhone !== false && (
        <div>
          <label className="block text-sm font-medium text-gray-700">
            {t('employees.form.mobile')} <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-2">
            <div className="relative w-32" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => !readOnly && setIsCountryDropdownOpen(!isCountryDropdownOpen)}
                disabled={readOnly}
                className={`mt-1 w-full flex items-center justify-between rounded-md border px-3 py-2 text-left ${getFieldStyle('countryCode')} ${readOnly ? 'bg-gray-100 cursor-not-allowed' : ''}`}
              >
                <span>{formData.countryCode}</span>
                <ChevronDownIcon className="w-4 h-4 text-gray-400" />
              </button>
              
              {isCountryDropdownOpen && (
                <div className="absolute z-10 mt-1 w-64 bg-white border border-gray-300 rounded-md shadow-lg max-h-64 overflow-hidden">
                  <div className="p-2 border-b border-gray-200">
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <MagnifyingGlassIcon className="h-4 w-4 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        value={countrySearch}
                        onChange={(e) => setCountrySearch(e.target.value)}
                        placeholder="Search country..."
                        className="block w-full pl-10 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#31BCFF] focus:border-[#31BCFF]"
                      />
                    </div>
                  </div>
                  <div className="overflow-y-auto max-h-48">
                    {filteredCountryCodes.length > 0 ? (
                      filteredCountryCodes.map((country) => (
                        <button
                          key={country.code}
                          type="button"
                          onClick={() => handleCountryCodeSelect(country.code)}
                          className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center justify-between"
                        >
                          <span className="text-sm">
                            {country.code} - {country.country}
                          </span>
                          {formData.countryCode === country.code && (
                            <CheckIcon className="w-4 h-4 text-[#31BCFF]" />
                          )}
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-6 text-center text-gray-500 text-sm">
                        No country codes found
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            <input
              type="tel"
              name="mobile"
              value={formData.mobile}
              onChange={onChange}
              placeholder="12345678"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={8}
              className={getFieldStyle('mobile')}
              required
              disabled={readOnly}
            />
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Enter exactly 8 digits. Full number will be: {formData.mobile.startsWith('+') ? formData.mobile : formData.countryCode + formData.mobile}
          </p>
          {validationErrors.mobile && (
            <p className="mt-1 text-sm text-red-500">{validationErrors.mobile}</p>
          )}
        </div>
      )}

      {validationSettings?.requireEmail === true && (
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Email <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            name="email"
            value={formData.email || ''}
            onChange={onChange}
            className={getFieldStyle('email')}
            placeholder="employee@company.com"
            required
            disabled={readOnly}
          />
          <p className="mt-1 text-xs text-gray-500">
            Will be used for account setup and notifications.
          </p>
          {validationErrors.email && (
            <p className="mt-1 text-sm text-red-500">{validationErrors.email}</p>
          )}
        </div>
      )}
    </>
  )
}
