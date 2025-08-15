'use client'

import React, { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { Sex } from '@prisma/client'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { ChevronDownIcon, MagnifyingGlassIcon, CheckIcon } from '@heroicons/react/24/outline'

interface EmployeeFormData {
  firstName: string
  lastName: string
  birthday: Date
  sex: Sex
  socialSecurityNo: string
  address: string
  countryCode: string
  mobile: string
  employeeNo: string
  bankAccount: string
  hoursPerMonth: number
  dateOfHire: Date
  isTeamLeader: boolean
  departmentId: string
  employeeGroupId?: string
  email?: string
}

interface EmployeeFormProps {
  initialData?: Partial<EmployeeFormData>
  onSubmit: (data: EmployeeFormData) => void
  loading: boolean
  departments: Array<{ id: string; name: string }>
  employeeGroups: Array<{ id: string; name: string }>
}

export default function EmployeeForm({
  initialData,
  onSubmit,
  loading,
  departments,
  employeeGroups,
}: EmployeeFormProps) {
  const { t } = useTranslation()
  const [employeeNumberMode, setEmployeeNumberMode] = React.useState<'manual' | 'automatic'>('automatic')
  const [fetchingNextNumber, setFetchingNextNumber] = React.useState(false)
  
  // Country code select state
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false)
  const [countrySearch, setCountrySearch] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)
  
  console.log('EmployeeForm initialData:', initialData)
  
  // Common country codes
  const countryCodes = [
    { code: '+1', country: 'US/Canada' },
    { code: '+44', country: 'United Kingdom' },
    { code: '+33', country: 'France' },
    { code: '+49', country: 'Germany' },
    { code: '+39', country: 'Italy' },
    { code: '+34', country: 'Spain' },
    { code: '+31', country: 'Netherlands' },
    { code: '+41', country: 'Switzerland' },
    { code: '+43', country: 'Austria' },
    { code: '+32', country: 'Belgium' },
    { code: '+45', country: 'Denmark' },
    { code: '+46', country: 'Sweden' },
    { code: '+47', country: 'Norway' },
    { code: '+358', country: 'Finland' },
    { code: '+86', country: 'China' },
    { code: '+81', country: 'Japan' },
    { code: '+82', country: 'South Korea' },
    { code: '+91', country: 'India' },
    { code: '+65', country: 'Singapore' },
    { code: '+60', country: 'Malaysia' },
    { code: '+62', country: 'Indonesia' },
    { code: '+63', country: 'Philippines' },
    { code: '+66', country: 'Thailand' },
    { code: '+84', country: 'Vietnam' },
    { code: '+856', country: 'Laos' },
    { code: '+852', country: 'Hong Kong' },
    { code: '+886', country: 'Taiwan' },
    { code: '+61', country: 'Australia' },
    { code: '+64', country: 'New Zealand' },
    { code: '+7', country: 'Russia' },
    { code: '+55', country: 'Brazil' },
    { code: '+52', country: 'Mexico' },
    { code: '+54', country: 'Argentina' },
    { code: '+56', country: 'Chile' },
    { code: '+57', country: 'Colombia' },
    { code: '+27', country: 'South Africa' },
    { code: '+20', country: 'Egypt' },
    { code: '+971', country: 'UAE' },
    { code: '+966', country: 'Saudi Arabia' },
    { code: '+90', country: 'Turkey' },
    { code: '+48', country: 'Poland' },
    { code: '+420', country: 'Czech Republic' },
    { code: '+36', country: 'Hungary' },
    { code: '+40', country: 'Romania' },
    { code: '+30', country: 'Greece' },
    { code: '+351', country: 'Portugal' },
  ]
  
  // Helper function to parse mobile number for edit mode
  const parseMobileNumber = (fullMobile: string | undefined) => {
    if (!fullMobile) return { countryCode: '+66', mobile: '' }
    
    // Sort country codes by length (longest first) to match the most specific prefix first
    const sortedCountryCodes = [...countryCodes].sort((a, b) => b.code.length - a.code.length)
    
    // Find matching country code from the full mobile number
    const matchingCountry = sortedCountryCodes.find(cc => fullMobile.startsWith(cc.code))
    
    if (matchingCountry) {
      return {
        countryCode: matchingCountry.code,
        mobile: fullMobile.substring(matchingCountry.code.length)
      }
    }
    
    // Default fallback - if no match, assume it's already just the number without country code
    return { countryCode: '+66', mobile: fullMobile }
  }
  
  const [formData, setFormData] = React.useState<EmployeeFormData>(() => {
    const baseData: EmployeeFormData = {
      firstName: '',
      lastName: '',
      birthday: new Date(),
      sex: 'MALE' as Sex,
      socialSecurityNo: '',
      address: '',
      countryCode: '+66', // Default to Thailand
      mobile: '',
      employeeNo: '',
      bankAccount: '',
      hoursPerMonth: 0,
      dateOfHire: new Date(),
      isTeamLeader: false,
      departmentId: '',
      email: '',
      ...initialData
    }
    
    // Parse mobile number if editing existing employee
    if (initialData?.mobile) {
      const { countryCode, mobile } = parseMobileNumber(initialData.mobile)
      baseData.countryCode = countryCode
      baseData.mobile = mobile
      console.log('Parsing mobile:', initialData.mobile, '-> countryCode:', countryCode, 'mobile:', mobile)
    }
    
    return baseData
  })

  const router = useRouter()
  
  // Filter country codes based on search
  const filteredCountryCodes = countryCodes.filter(country =>
    country.country.toLowerCase().includes(countrySearch.toLowerCase()) ||
    country.code.includes(countrySearch)
  )
  
  // Close dropdown when clicking outside
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
    setFormData({ ...formData, countryCode })
    setIsCountryDropdownOpen(false)
    setCountrySearch('')
  }

  // Handle changes to initialData (for async loading)
  React.useEffect(() => {
    if (initialData?.mobile) {
      const { countryCode, mobile } = parseMobileNumber(initialData.mobile)
      setFormData(prevData => ({
        ...prevData,
        countryCode,
        mobile
      }))
      console.log('useEffect - Parsing mobile:', initialData.mobile, '-> countryCode:', countryCode, 'mobile:', mobile)
    }
  }, [initialData?.mobile]) // Only re-run if mobile changes

  // Fetch next employee number when component mounts or mode changes to automatic
  React.useEffect(() => {
    if (employeeNumberMode === 'automatic' && !initialData?.employeeNo) {
      // Debounce the API call to avoid rapid requests
      const timeoutId = setTimeout(() => {
        fetchNextEmployeeNumber()
      }, 300)
      
      return () => clearTimeout(timeoutId)
    }
  }, [employeeNumberMode, initialData?.employeeNo])

  const fetchNextEmployeeNumber = async () => {
    setFetchingNextNumber(true)
    try {
      const response = await fetch('/api/employees/next-number')
      if (response.ok) {
        const data = await response.json()
        setFormData(prev => ({ ...prev, employeeNo: data.nextEmployeeNumber }))
      } else {
        console.error('Failed to fetch next employee number')
      }
    } catch (error) {
      console.error('Error fetching next employee number:', error)
    } finally {
      setFetchingNextNumber(false)
    }
  }

  const handleEmployeeNumberModeChange = (mode: 'manual' | 'automatic') => {
    setEmployeeNumberMode(mode)
    if (mode === 'manual') {
      setFormData(prev => ({ ...prev, employeeNo: '' }))
    } else {
      fetchNextEmployeeNumber()
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Combine country code and mobile number for submission
    // Only concatenate if mobile doesn't already include country code
    const fullMobile = formData.mobile.startsWith('+') 
      ? formData.mobile 
      : formData.countryCode + formData.mobile
      
    console.log('Submitting mobile data:', {
      countryCode: formData.countryCode,
      mobile: formData.mobile,
      fullMobile: fullMobile
    })
      
    const submissionData = {
      ...formData,
      mobile: fullMobile
    }
    onSubmit(submissionData)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }))
  }

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>, field: keyof EmployeeFormData) => {
    const value = parseFloat(e.target.value) || 0
    setFormData({ ...formData, [field]: value })
  }

  const handleDateChange = (date: Date | null, field: keyof EmployeeFormData) => {
    if (date) {
      setFormData({ ...formData, [field]: date })
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {/* Personal Information */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            {t('employees.form.first_name')} <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="firstName"
            value={formData.firstName}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-[#31BCFF] focus:outline-none focus:ring-1 focus:ring-[#31BCFF]"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            {t('employees.form.last_name')} <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="lastName"
            value={formData.lastName}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-[#31BCFF] focus:outline-none focus:ring-1 focus:ring-[#31BCFF]"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            {t('employees.form.birthday')} <span className="text-red-500">*</span>
          </label>
          <DatePicker
            selected={formData.birthday}
            onChange={(date) => handleDateChange(date, 'birthday')}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-[#31BCFF] focus:outline-none focus:ring-1 focus:ring-[#31BCFF]"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            {t('employees.form.gender')} <span className="text-red-500">*</span>
          </label>
          <select
            name="sex"
            value={formData.sex}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-[#31BCFF] focus:outline-none focus:ring-1 focus:ring-[#31BCFF]"
            required
          >
            <option value="MALE">{t('employees.form.male')}</option>
            <option value="FEMALE">{t('employees.form.female')}</option>
            <option value="OTHER">{t('employees.form.other')}</option>
          </select>
        </div>

        {/* Employment Details */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            {t('employees.form.social_security_no')} <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="socialSecurityNo"
            value={formData.socialSecurityNo}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-[#31BCFF] focus:outline-none focus:ring-1 focus:ring-[#31BCFF]"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            {t('employees.form.employee_number')} <span className="text-red-500">*</span>
          </label>
          
          {/* Radio buttons for selection mode */}
          <div className="flex gap-6 mb-3">
            <label className="flex items-center">
              <input
                type="radio"
                name="employeeNumberMode"
                value="automatic"
                checked={employeeNumberMode === 'automatic'}
                onChange={(e) => handleEmployeeNumberModeChange('automatic')}
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
                onChange={(e) => handleEmployeeNumberModeChange('manual')}
                className="mr-2 text-[#31BCFF] focus:ring-[#31BCFF]"
              />
              <span className="text-sm text-gray-700">Manual Entry</span>
            </label>
          </div>

          {/* Employee number input field */}
          {employeeNumberMode === 'manual' ? (
            <input
              type="text"
              name="employeeNo"
              value={formData.employeeNo}
              onChange={handleChange}
              placeholder="Enter employee number"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-[#31BCFF] focus:outline-none focus:ring-1 focus:ring-[#31BCFF]"
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
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            {t('employees.form.date_of_hire')} <span className="text-red-500">*</span>
          </label>
          <DatePicker
            selected={formData.dateOfHire}
            onChange={(date) => handleDateChange(date, 'dateOfHire')}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-[#31BCFF] focus:outline-none focus:ring-1 focus:ring-[#31BCFF]"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            {t('employees.form.hours_per_month')} <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            value={formData.hoursPerMonth}
            onChange={(e) => handleNumberChange(e, 'hoursPerMonth')}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-[#31BCFF] focus:outline-none focus:ring-1 focus:ring-[#31BCFF]"
            required
          />
        </div>

        {/* Department and Group */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            {t('employees.form.department')} <span className="text-red-500">*</span>
          </label>
          <select
            name="departmentId"
            value={formData.departmentId}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-[#31BCFF] focus:outline-none focus:ring-1 focus:ring-[#31BCFF]"
            required
          >
            <option value="">{t('employees.form.select_department')}</option>
            {departments.map(dept => (
              <option key={dept.id} value={dept.id}>
                {dept.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            {t('employees.form.employee_group')}
          </label>
          <select
            name="employeeGroupId"
            value={formData.employeeGroupId || ''}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-[#31BCFF] focus:outline-none focus:ring-1 focus:ring-[#31BCFF]"
          >
            <option value="">{t('employees.form.no_group')}</option>
            {employeeGroups.map(group => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
        </div>

        {/* Contact Information */}
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700">
            {t('employees.form.address')} <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="address"
            value={formData.address}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-[#31BCFF] focus:outline-none focus:ring-1 focus:ring-[#31BCFF]"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            {t('employees.form.mobile')} <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-2">
            {/* Custom Select2-style dropdown for country code */}
            <div className="relative" ref={dropdownRef}>
              <div
                onClick={() => setIsCountryDropdownOpen(!isCountryDropdownOpen)}
                className="mt-1 w-48 rounded-md border border-gray-300 px-3 py-2 focus:border-[#31BCFF] focus:outline-none focus:ring-1 focus:ring-[#31BCFF] cursor-pointer bg-white flex items-center justify-between"
              >
                <span className="text-gray-900 text-sm">
                  {formData.countryCode} - {countryCodes.find(c => c.code === formData.countryCode)?.country}
                </span>
                <ChevronDownIcon 
                  className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
                    isCountryDropdownOpen ? 'rotate-180' : ''
                  }`} 
                />
              </div>
              
              {/* Dropdown */}
              {isCountryDropdownOpen && (
                <div className="absolute z-50 w-full mt-1 bg-white rounded-md shadow-lg border border-gray-300 max-h-80 overflow-hidden">
                  {/* Search input */}
                  <div className="p-3 border-b border-gray-200">
                    <div className="relative">
                      <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={countrySearch}
                        onChange={(e) => setCountrySearch(e.target.value)}
                        placeholder="Search country codes..."
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-[#31BCFF] focus:border-[#31BCFF]"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  </div>
                  
                  {/* Options */}
                  <div className="max-h-64 overflow-y-auto">
                    {filteredCountryCodes.length > 0 ? (
                      filteredCountryCodes.map((country) => (
                        <div
                          key={country.code}
                          onClick={() => handleCountryCodeSelect(country.code)}
                          className="flex items-center justify-between px-4 py-2 hover:bg-gray-50 cursor-pointer"
                        >
                          <span className="text-gray-900 text-sm">{country.code} - {country.country}</span>
                          {formData.countryCode === country.code && (
                            <CheckIcon className="w-4 h-4 text-[#31BCFF]" />
                          )}
                        </div>
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
              onChange={handleChange}
              placeholder="123456789"
              className="mt-1 flex-1 rounded-md border border-gray-300 px-3 py-2 focus:border-[#31BCFF] focus:outline-none focus:ring-1 focus:ring-[#31BCFF]"
              required
            />
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Full number will be: {formData.mobile.startsWith('+') ? formData.mobile : formData.countryCode + formData.mobile}
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Email
          </label>
          <input
            type="email"
            name="email"
            value={formData.email || ''}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-[#31BCFF] focus:outline-none focus:ring-1 focus:ring-[#31BCFF]"
            placeholder="employee@company.com"
          />
          <p className="mt-1 text-xs text-gray-500">
            Optional. Will be used for account setup and notifications.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            {t('employees.form.bank_account')} <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="bankAccount"
            value={formData.bankAccount}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-[#31BCFF] focus:outline-none focus:ring-1 focus:ring-[#31BCFF]"
            required
          />
        </div>

        {/* Team Leader Toggle */}
        <div className="flex items-center">
          <input
            type="checkbox"
            name="isTeamLeader"
            checked={formData.isTeamLeader}
            onChange={handleChange}
            className="h-4 w-4 rounded border-gray-300 text-[#31BCFF] focus:ring-[#31BCFF]"
          />
          <label className="ml-2 block text-sm text-gray-700">
            {t('employees.form.team_leader')}
          </label>
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
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-white bg-[#31BCFF] border border-transparent rounded-md hover:bg-[#31BCFF]/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#31BCFF] disabled:opacity-50"
        >
          {loading ? t('employees.form.saving') : t('common.save')}
        </button>
      </div>
    </form>
  )
}
