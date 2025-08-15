'use client'

import React, { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { Sex } from '@prisma/client'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { ChevronDownIcon, MagnifyingGlassIcon, CheckIcon } from '@heroicons/react/24/outline'
import { z } from 'zod'

// Zod validation schema for comprehensive client-side validation
const employeeValidationSchema = z.object({
  firstName: z.string()
    .min(1, 'First name is required')
    .min(2, 'First name must be at least 2 characters')
    .max(50, 'First name must be less than 50 characters')
    .regex(/^[a-zA-ZÀ-ÿ\s'-]+$/, 'First name can only contain letters, spaces, apostrophes and hyphens'),
  
  lastName: z.string()
    .min(1, 'Last name is required')
    .min(2, 'Last name must be at least 2 characters')
    .max(50, 'Last name must be less than 50 characters')
    .regex(/^[a-zA-ZÀ-ÿ\s'-]+$/, 'Last name can only contain letters, spaces, apostrophes and hyphens'),
  
  birthday: z.union([z.date(), z.string().transform((str) => new Date(str))]).refine((date) => {
    const actualDate = date instanceof Date ? date : new Date(date)
    if (isNaN(actualDate.getTime())) return false
    
    const today = new Date()
    const hundredYearsAgo = new Date(today.getFullYear() - 100, today.getMonth(), today.getDate())
    const eighteenYearsAgo = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate())
    return actualDate >= hundredYearsAgo && actualDate <= eighteenYearsAgo
  }, 'Employee must be between 18 and 100 years old'),
  
  sex: z.enum(['MALE', 'FEMALE', 'OTHER']),
  
  socialSecurityNo: z.string()
    .min(1, 'Social security number is required')
    .min(9, 'Social security number must be at least 9 characters')
    .max(20, 'Social security number must be less than 20 characters'),
  
  address: z.string()
    .min(1, 'Address is required')
    .min(10, 'Address must be at least 10 characters')
    .max(200, 'Address must be less than 200 characters'),
  
  countryCode: z.string()
    .min(1, 'Country code is required')
    .regex(/^\+\d{1,4}$/, 'Invalid country code format'),
  
  mobile: z.string()
    .min(1, 'Mobile number is required')
    .min(8, 'Mobile number must be at least 8 digits')
    .max(15, 'Mobile number must be less than 15 digits')
    .regex(/^[0-9]+$/, 'Mobile number can only contain numbers'),
  
  employeeNo: z.string()
    .min(1, 'Employee number is required')
    .min(1, 'Employee number must be at least 1 characters')
    .max(20, 'Employee number must be less than 20 characters'),
  
  bankAccount: z.string()
    .min(1, 'Bank account is required')
    .min(8, 'Bank account must be at least 8 characters')
    .max(30, 'Bank account must be less than 30 characters'),
  
  hoursPerMonth: z.number()
    .min(1, 'Hours per month must be at least 1')
    .max(744, 'Hours per month cannot exceed 744 (31 days × 24 hours)'),
  
  dateOfHire: z.union([z.date(), z.string().transform((str) => new Date(str))]).refine((date) => {
    const actualDate = date instanceof Date ? date : new Date(date)
    if (isNaN(actualDate.getTime())) return false
    
    const today = new Date()
    const tenYearsAgo = new Date(today.getFullYear() - 10, today.getMonth(), today.getDate())
    const oneYearFromNow = new Date(today.getFullYear() + 1, today.getMonth(), today.getDate())
    return actualDate >= tenYearsAgo && actualDate <= oneYearFromNow
  }, 'Date of hire must be within the last 10 years or up to 1 year in the future'),
  
  departmentId: z.string()
    .min(1, 'Department is required'),
  
  employeeGroupId: z.string().optional(),
  
  email: z.union([
    z.literal(''),
    z.string().email('Invalid email format')
  ]).optional(),
  
  isTeamLeader: z.boolean()
})

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
  id?: string // Add id for edit mode
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
  
  // Validation state for comprehensive client-side validation
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const [validatingSSN, setValidatingSSN] = useState(false)
  const [validatingEmail, setValidatingEmail] = useState(false)
  const [validatingEmployeeNo, setValidatingEmployeeNo] = useState(false)
  const [isFormValid, setIsFormValid] = useState(false)
  const ssnValidationTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const emailValidationTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const employeeNoValidationTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const validationTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Comprehensive validation function using Zod schema
  const validateForm = async (): Promise<boolean> => {
    try {
      // Basic validation using Zod schema
      await employeeValidationSchema.parseAsync(formData)
      
      // Check for any uniqueness validation errors
      const hasUniqueErrors = Object.keys(validationErrors).some(key => 
        validationErrors[key] && 
        validationErrors[key] !== '' && 
        (key === 'socialSecurityNo' || key === 'email' || key === 'employeeNo')
      )
      
      if (hasUniqueErrors) {
        return false
      }
      
      // Check if still validating SSN, email, or employee number
      if (validatingSSN || validatingEmail || validatingEmployeeNo) {
        return false
      }
      
      // Clear all validation errors since validation passed
      setValidationErrors({})
      setIsFormValid(true)
      return true
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {}
        error.issues.forEach((issue) => {
          if (issue.path.length > 0) {
            const fieldName = issue.path[0] as string
            fieldErrors[fieldName] = issue.message
          }
        })
        setValidationErrors(prevErrors => ({
          ...prevErrors, // Keep existing uniqueness validation errors
          ...fieldErrors  // Add new Zod validation errors
        }))
        setIsFormValid(false)
      }
      return false
    }
  }

  // Validate individual field
  const validateField = (fieldName: string, value: any) => {
    try {
      const fieldSchema = employeeValidationSchema.shape[fieldName as keyof typeof employeeValidationSchema.shape]
      if (fieldSchema) {
        fieldSchema.parse(value)
        // Clear error if validation passes (but preserve uniqueness validation errors)
        if (!['socialSecurityNo', 'email', 'employeeNo'].includes(fieldName)) {
          setValidationErrors(prev => ({ ...prev, [fieldName]: '' }))
        } else if (validationErrors[fieldName] && !validationErrors[fieldName].includes('already in use')) {
          // Only clear non-uniqueness errors for unique fields
          setValidationErrors(prev => ({ ...prev, [fieldName]: '' }))
        }
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        setValidationErrors(prev => ({ 
          ...prev, 
          [fieldName]: error.issues[0]?.message || 'Validation error'
        }))
      }
    }
  }

  // Debounced validation for real-time feedback
  const debouncedValidation = (fieldName: string, value: any) => {
    if (validationTimeoutRef.current) {
      clearTimeout(validationTimeoutRef.current)
    }
    
    validationTimeoutRef.current = setTimeout(() => {
      validateField(fieldName, value)
    }, 500) // Wait 500ms after user stops typing
  }

  // Validate social security number uniqueness
  const validateSocialSecurityNumber = async (socialSecurityNo: string) => {
    if (!socialSecurityNo || socialSecurityNo.trim() === '') {
      setValidationErrors(prev => ({ ...prev, socialSecurityNo: '' }))
      return
    }

    setValidatingSSN(true)
    
    try {
      const response = await fetch('/api/employees/check-social-security', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          socialSecurityNo: socialSecurityNo.trim(),
          excludeEmployeeId: initialData?.id // Exclude current employee when editing
        })
      })

      if (response.ok) {
        const data = await response.json()
        if (!data.available) {
          setValidationErrors(prev => ({
            ...prev,
            socialSecurityNo: data.existingEmployee 
              ? `Social security number already in use by ${data.existingEmployee.name} (${data.existingEmployee.employeeNo})`
              : 'Social security number already in use'
          }))
        } else {
          setValidationErrors(prev => ({ ...prev, socialSecurityNo: '' }))
        }
      } else {
        console.error('Error checking social security number')
        setValidationErrors(prev => ({ ...prev, socialSecurityNo: 'Unable to validate social security number' }))
      }
    } catch (error) {
      console.error('Error validating social security number:', error)
      setValidationErrors(prev => ({ ...prev, socialSecurityNo: 'Unable to validate social security number' }))
    } finally {
      setValidatingSSN(false)
    }
  }

  // Validate email uniqueness
  const validateEmailUniqueness = async (email: string) => {
    // Skip validation for empty emails (optional field)
    if (!email || email.trim() === '') {
      setValidationErrors(prev => ({ ...prev, email: '' }))
      return
    }

    setValidatingEmail(true)
    
    try {
      const response = await fetch('/api/employees/check-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          excludeEmployeeId: initialData?.id // Exclude current employee when editing
        })
      })

      if (response.ok) {
        const data = await response.json()
        if (!data.available) {
          setValidationErrors(prev => ({
            ...prev,
            email: data.existingEmployee 
              ? `Email already in use by ${data.existingEmployee.name} (${data.existingEmployee.employeeNo})`
              : 'Email address already in use'
          }))
        } else {
          setValidationErrors(prev => ({ ...prev, email: '' }))
        }
      } else {
        console.error('Error checking email')
        setValidationErrors(prev => ({ ...prev, email: 'Unable to validate email address' }))
      }
    } catch (error) {
      console.error('Error validating email:', error)
      setValidationErrors(prev => ({ ...prev, email: 'Unable to validate email address' }))
    } finally {
      setValidatingEmail(false)
    }
  }

  // Validate employee number uniqueness
  const validateEmployeeNumberUniqueness = async (employeeNo: string) => {
    if (!employeeNo || employeeNo.trim() === '') {
      setValidationErrors(prev => ({ ...prev, employeeNo: '' }))
      return
    }

    setValidatingEmployeeNo(true)
    
    try {
      const response = await fetch('/api/employees/check-employee-number', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeNo: employeeNo.trim(),
          excludeEmployeeId: initialData?.id // Exclude current employee when editing
        })
      })

      if (response.ok) {
        const data = await response.json()
        if (!data.available) {
          setValidationErrors(prev => ({
            ...prev,
            employeeNo: data.existingEmployee 
              ? `Employee number already in use by ${data.existingEmployee.name}`
              : 'Employee number already in use'
          }))
        } else {
          setValidationErrors(prev => ({ ...prev, employeeNo: '' }))
        }
      } else {
        console.error('Error checking employee number')
        setValidationErrors(prev => ({ ...prev, employeeNo: 'Unable to validate employee number' }))
      }
    } catch (error) {
      console.error('Error validating employee number:', error)
      setValidationErrors(prev => ({ ...prev, employeeNo: 'Unable to validate employee number' }))
    } finally {
      setValidatingEmployeeNo(false)
    }
  }

  // Helper function to get field styling based on validation state
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Run comprehensive validation before submission
    const isValid = await validateForm()
    
    if (!isValid) {
      console.log('Form validation failed. Please fix the errors before submitting.')
      return
    }
    
    // Combine country code and mobile number for submission
    const fullMobile = formData.mobile.startsWith('+') 
      ? formData.mobile 
      : formData.countryCode + formData.mobile
      
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
    
    // Clear validation error when user starts typing
    if (validationErrors[name]) {
      setValidationErrors(prev => ({ ...prev, [name]: '' }))
    }
    
    // Debounced validation for real-time feedback
    debouncedValidation(name, value)

    // Special handling for social security number
    if (name === 'socialSecurityNo') {
      if (ssnValidationTimeoutRef.current) {
        clearTimeout(ssnValidationTimeoutRef.current)
      }
      
      ssnValidationTimeoutRef.current = setTimeout(() => {
        validateSocialSecurityNumber(value)
      }, 1000) // Wait 1 second after user stops typing
    }

    // Special handling for email uniqueness validation
    if (name === 'email') {
      if (emailValidationTimeoutRef.current) {
        clearTimeout(emailValidationTimeoutRef.current)
      }
      
      emailValidationTimeoutRef.current = setTimeout(() => {
        validateEmailUniqueness(value)
      }, 1000) // Wait 1 second after user stops typing
    }

    // Special handling for employee number uniqueness validation (only for manual mode)
    if (name === 'employeeNo' && employeeNumberMode === 'manual') {
      if (employeeNoValidationTimeoutRef.current) {
        clearTimeout(employeeNoValidationTimeoutRef.current)
      }
      
      employeeNoValidationTimeoutRef.current = setTimeout(() => {
        validateEmployeeNumberUniqueness(value)
      }, 1000) // Wait 1 second after user stops typing
    }
  }

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>, field: keyof EmployeeFormData) => {
    const value = parseFloat(e.target.value) || 0
    setFormData({ ...formData, [field]: value })
    debouncedValidation(field, value)
  }

  const handleDateChange = (date: Date | null, field: keyof EmployeeFormData) => {
    if (date) {
      setFormData({ ...formData, [field]: date })
      debouncedValidation(field, date)
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
            onChange={handleChange}
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
            onChange={(date) => handleDateChange(date, 'birthday')}
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
            onChange={handleChange}
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

        {/* Employment Details */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            {t('employees.form.social_security_no')} <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="socialSecurityNo"
            value={formData.socialSecurityNo}
            onChange={(e) => {
              handleChange(e)
              validateSocialSecurityNumber(e.target.value)
            }}
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
            onChange={(date) => handleDateChange(date, 'dateOfHire')}
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
            value={formData.hoursPerMonth}
            onChange={(e) => handleNumberChange(e, 'hoursPerMonth')}
            className={getFieldStyle('hoursPerMonth')}
            required
          />
          {validationErrors.hoursPerMonth && (
            <p className="mt-1 text-sm text-red-500">{validationErrors.hoursPerMonth}</p>
          )}
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
            className={getFieldStyle('departmentId')}
            required
          >
            <option value="">{t('employees.form.select_department')}</option>
            {departments.map(dept => (
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
            onChange={handleChange}
            className={getFieldStyle('employeeGroupId')}
          >
            <option value="">{t('employees.form.no_group')}</option>
            {employeeGroups.map(group => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
          {validationErrors.employeeGroupId && (
            <p className="mt-1 text-sm text-red-500">{validationErrors.employeeGroupId}</p>
          )}
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
            className={getFieldStyle('address')}
            required
          />
          {validationErrors.address && (
            <p className="mt-1 text-sm text-red-500">{validationErrors.address}</p>
          )}
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
              className={getFieldStyle('mobile')}
              required
            />
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Full number will be: {formData.mobile.startsWith('+') ? formData.mobile : formData.countryCode + formData.mobile}
          </p>
          {validationErrors.mobile && (
            <p className="mt-1 text-sm text-red-500">{validationErrors.mobile}</p>
          )}
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
            className={getFieldStyle('email')}
            placeholder="employee@company.com"
          />
          <p className="mt-1 text-xs text-gray-500">
            Optional. Will be used for account setup and notifications.
          </p>
          {validationErrors.email && (
            <p className="mt-1 text-sm text-red-500">{validationErrors.email}</p>
          )}
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
            className={getFieldStyle('bankAccount')}
            required
          />
          {validationErrors.bankAccount && (
            <p className="mt-1 text-sm text-red-500">{validationErrors.bankAccount}</p>
          )}
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
