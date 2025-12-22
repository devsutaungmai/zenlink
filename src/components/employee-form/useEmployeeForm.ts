import { useState, useRef, useEffect, useMemo } from 'react'
import { z } from 'zod'
import { Sex } from '@prisma/client'
import { EmployeeFormData } from './types'
import { createEmployeeValidationSchema, EmployeeSettingsForValidation, defaultValidationSettings } from './validation'
import { parseMobileNumber } from './constants'

interface UseEmployeeFormProps {
  initialData?: Partial<EmployeeFormData>
}

export function useEmployeeForm({ initialData }: UseEmployeeFormProps) {
  const [employeeNumberMode, setEmployeeNumberMode] = useState<'manual' | 'automatic'>('automatic')
  const [fetchingNextNumber, setFetchingNextNumber] = useState(false)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const [validatingSSN, setValidatingSSN] = useState(false)
  const [validatingEmail, setValidatingEmail] = useState(false)
  const [validatingEmployeeNo, setValidatingEmployeeNo] = useState(false)
  const [isFormValid, setIsFormValid] = useState(false)
  const [validationSettings, setValidationSettings] = useState<EmployeeSettingsForValidation>(defaultValidationSettings)
  const [settingsLoaded, setSettingsLoaded] = useState(false)

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/employee-settings')
        if (res.ok) {
          const settings = await res.json()
          setValidationSettings({
            requireFirstName: settings.requireFirstName ?? defaultValidationSettings.requireFirstName,
            requireLastName: settings.requireLastName ?? defaultValidationSettings.requireLastName,
            requireBirthday: settings.requireBirthday ?? defaultValidationSettings.requireBirthday,
            requireGender: settings.requireGender ?? defaultValidationSettings.requireGender,
            requireAddress: settings.requireAddress ?? defaultValidationSettings.requireAddress,
            requirePhone: settings.requirePhone ?? defaultValidationSettings.requirePhone,
            requireEmail: settings.requireEmail ?? defaultValidationSettings.requireEmail,
            requireSocialSecurityNo: settings.requireSocialSecurityNo ?? defaultValidationSettings.requireSocialSecurityNo,
            requireEmployeeNo: settings.requireEmployeeNo ?? defaultValidationSettings.requireEmployeeNo,
            requireDateOfHire: settings.requireDateOfHire ?? defaultValidationSettings.requireDateOfHire,
            requireHoursPerMonth: settings.requireHoursPerMonth ?? defaultValidationSettings.requireHoursPerMonth,
            requireBankAccount: settings.requireBankAccount ?? defaultValidationSettings.requireBankAccount,
            requireDepartment: settings.requireDepartment ?? defaultValidationSettings.requireDepartment,
            requireEmployeeGroup: settings.requireEmployeeGroup ?? defaultValidationSettings.requireEmployeeGroup,
            requireRole: settings.requireRole ?? defaultValidationSettings.requireRole,
            requireSalaryRate: settings.requireSalaryRate ?? defaultValidationSettings.requireSalaryRate,
          })
          
          // Apply default values only for new employee (no initialData)
          if (!initialData) {
            setFormData(prev => {
              const updates: Partial<EmployeeFormData> = {}
              
              if (settings.defaultDepartmentId && prev.departmentIds.length === 0) {
                updates.departmentIds = [settings.defaultDepartmentId]
                updates.departmentId = settings.defaultDepartmentId
              }
              
              if (settings.defaultEmployeeGroupId && prev.employeeGroupIds.length === 0) {
                updates.employeeGroupIds = [settings.defaultEmployeeGroupId]
              }
              
              if (settings.defaultRoleId && prev.roleIds.length === 0) {
                updates.roleIds = [settings.defaultRoleId]
              }
              
              if (Object.keys(updates).length > 0) {
                return { ...prev, ...updates }
              }
              return prev
            })
          }
        }
      } catch (error) {
        console.error('Failed to fetch employee settings:', error)
      } finally {
        setSettingsLoaded(true)
      }
    }
    fetchSettings()
  }, [initialData])

  const validationSchema = useMemo(() => 
    createEmployeeValidationSchema(validationSettings), 
    [validationSettings]
  )
  
  const ssnValidationTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const emailValidationTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const employeeNoValidationTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const validationTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  const validationCacheRef = useRef<Map<string, { result: boolean, timestamp: number }>>(new Map())
  const CACHE_DURATION = 30000

  const [formData, setFormData] = useState<EmployeeFormData>(() => {
    const baseData: EmployeeFormData = {
      firstName: '',
      lastName: '',
      birthday: new Date(),
      sex: 'MALE' as Sex,
      socialSecurityNo: '',
      address: '',
      countryCode: '+66',
      mobile: '',
      employeeNo: '',
      bankAccount: '',
      hoursPerMonth: 0,
      dateOfHire: new Date(),
      isTeamLeader: false,
      departmentId: '',
      departmentIds: [],
      employeeGroupIds: [],
      roleIds: [],
      email: '',
      profilePhoto: null,
      salaryRate: undefined,
      ...initialData
    }

    // Handle initial data for multi-select
    if (initialData) {
      // Convert existing departmentId to departmentIds array
      if (initialData.departmentId && !initialData.departmentIds) {
        baseData.departmentIds = [initialData.departmentId]
      } else if (initialData.departmentIds) {
        baseData.departmentIds = initialData.departmentIds
      }

      // Convert existing employeeGroupId to employeeGroupIds array
      if (initialData.employeeGroupId && !initialData.employeeGroupIds) {
        baseData.employeeGroupIds = [initialData.employeeGroupId]
      } else if (initialData.employeeGroupIds) {
        baseData.employeeGroupIds = initialData.employeeGroupIds
      }

      if (initialData.roleIds) {
        baseData.roleIds = initialData.roleIds
      }
    }

    if (initialData?.mobile) {
      const { countryCode, mobile } = parseMobileNumber(initialData.mobile)
      baseData.countryCode = countryCode
      baseData.mobile = mobile
    }
    
    return baseData
  })

  const validateForm = async (): Promise<boolean> => {
    try {
      await validationSchema.parseAsync(formData)

      const customFieldErrors: Record<string, string> = {}

      if (validationSettings.requirePhone && formData.mobile && formData.mobile.length !== 8) {
        customFieldErrors.mobile = 'Mobile number must contain exactly 8 digits'
      }

      if (validationSettings.requireSalaryRate && formData.salaryRate !== undefined && formData.salaryRate !== null && formData.salaryRate <= 0) {
        customFieldErrors.salaryRate = 'Salary rate must be greater than 0'
      }

      if (Object.keys(customFieldErrors).length > 0) {
        setValidationErrors(prev => ({ ...prev, ...customFieldErrors }))
        setIsFormValid(false)
        return false
      }

      const hasUniqueErrors = Object.keys(validationErrors).some(key => 
        validationErrors[key] && 
        validationErrors[key] !== '' && 
        (key === 'socialSecurityNo' || key === 'email' || key === 'employeeNo')
      )
      
      if (hasUniqueErrors) {
        return false
      }

      if (validatingSSN || validatingEmail || validatingEmployeeNo) {
        return false
      }

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
          ...prevErrors,
          ...fieldErrors
        }))
        setIsFormValid(false)
      }
      return false
    }
  }

  const validateField = (fieldName: string, value: any) => {
    if (fieldName === 'salaryRate') {
      if (value === undefined || value === null || value === '') {
        setValidationErrors(prev => ({ ...prev, salaryRate: '' }))
        return
      }

      const numericValue = typeof value === 'number' ? value : Number(value)
      if (validationSettings.requireSalaryRate && (Number.isNaN(numericValue) || numericValue <= 0)) {
        setValidationErrors(prev => ({ ...prev, salaryRate: 'Salary rate must be greater than 0' }))
      } else {
        setValidationErrors(prev => ({ ...prev, salaryRate: '' }))
      }
      return
    }

    try {
      const fieldSchema = validationSchema.shape[fieldName as keyof typeof validationSchema.shape]
      if (fieldSchema) {
        fieldSchema.parse(value)
        if (!['socialSecurityNo', 'email', 'employeeNo'].includes(fieldName)) {
          setValidationErrors(prev => ({ ...prev, [fieldName]: '' }))
        }
      }
    } catch (error) {
      if (error instanceof z.ZodError && error.issues.length > 0) {
        setValidationErrors(prev => ({ ...prev, [fieldName]: error.issues[0].message }))
      }
    }
  }

  const debouncedValidation = (fieldName: string, value: any) => {
    if (validationTimeoutRef.current) {
      clearTimeout(validationTimeoutRef.current)
    }

    validationTimeoutRef.current = setTimeout(() => {
      validateField(fieldName, value)
    }, 500)
  }

  const validateSocialSecurityNumber = async (ssn: string) => {
    if (!ssn || ssn.trim() === '') {
      setValidationErrors(prev => ({ ...prev, socialSecurityNo: '' }))
      return
    }

    setValidatingSSN(true)
    
    try {
      const response = await fetch('/api/employees/check-social-security', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          socialSecurityNo: ssn.trim(),
          excludeEmployeeId: initialData?.id
        })
      })

      if (response.ok) {
        const data = await response.json()
        if (!data.available) {
          setValidationErrors(prev => ({
            ...prev,
            socialSecurityNo: data.existingEmployee 
              ? `Social security number already in use by ${data.existingEmployee.name}`
              : 'Social security number already in use'
          }))
        } else {
          setValidationErrors(prev => ({ ...prev, socialSecurityNo: '' }))
        }
      } else {
        setValidationErrors(prev => ({ ...prev, socialSecurityNo: 'Unable to validate social security number' }))
      }
    } catch (error) {
      setValidationErrors(prev => ({ ...prev, socialSecurityNo: 'Unable to validate social security number' }))
    } finally {
      setValidatingSSN(false)
    }
  }

  const validateEmailUniqueness = async (email: string) => {
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
          excludeEmployeeId: initialData?.id,
          scope: 'global'
        })
      })

      if (response.ok) {
        const data = await response.json()
        if (!data.available) {
          setValidationErrors(prev => ({
            ...prev,
            email: data.existingEmployee 
              ? `Email already in used`
              : 'Email already in used'
          }))
        } else {
          setValidationErrors(prev => ({ ...prev, email: '' }))
        }
      } else {
        setValidationErrors(prev => ({ ...prev, email: 'Unable to validate email address' }))
      }
    } catch (error) {
      setValidationErrors(prev => ({ ...prev, email: 'Unable to validate email address' }))
    } finally {
      setValidatingEmail(false)
    }
  }

  const checkValidationCache = (key: string): boolean | null => {
    const cached = validationCacheRef.current.get(key)
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.result
    }
    return null
  }

  const setValidationCache = (key: string, result: boolean) => {
    validationCacheRef.current.set(key, { result, timestamp: Date.now() })
  }

  const validateEmployeeNumberUniqueness = async (employeeNo: string) => {
    if (!employeeNo || employeeNo.trim() === '') {
      setValidationErrors(prev => ({ ...prev, employeeNo: '' }))
      return
    }

    const trimmedEmployeeNo = employeeNo.trim()
    const cacheKey = `employeeNo:${trimmedEmployeeNo}:${initialData?.id || 'new'}`
    const cachedResult = checkValidationCache(cacheKey)
    if (cachedResult !== null) {
      if (!cachedResult) {
        setValidationErrors(prev => ({ ...prev, employeeNo: 'Employee number already in use' }))
      } else {
        setValidationErrors(prev => ({ ...prev, employeeNo: '' }))
      }
      return
    }

    setValidatingEmployeeNo(true)
    
    try {
      const response = await fetch('/api/employees/check-employee-number', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeNo: trimmedEmployeeNo,
          excludeEmployeeId: initialData?.id
        })
      })

      if (response.ok) {
        const data = await response.json()
        setValidationCache(cacheKey, data.available)
        
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
        setValidationErrors(prev => ({ ...prev, employeeNo: 'Unable to validate employee number' }))
      }
    } catch (error) {
      setValidationErrors(prev => ({ ...prev, employeeNo: 'Unable to validate employee number' }))
    } finally {
      setValidatingEmployeeNo(false)
    }
  }

  const fetchNextEmployeeNumber = async () => {
    setFetchingNextNumber(true)
    try {
      const response = await fetch('/api/employees/next-number')
      if (response.ok) {
        const data = await response.json()
        setFormData(prev => ({ ...prev, employeeNo: data.nextEmployeeNumber }))
      }
    } catch (error) {
      console.error('Error fetching next employee number:', error)
    } finally {
      setFetchingNextNumber(false)
    }
  }

  // const handleEmployeeNumberModeChange = (mode: 'manual' | 'automatic') => {
  //   setEmployeeNumberMode(mode)
  //   if (mode === 'manual') {
  //     setFormData(prev => ({ ...prev, employeeNo: '' }))
  //   } else {
  //     fetchNextEmployeeNumber()
  //   }
  // }

  useEffect(() => {
    if (employeeNumberMode === 'automatic' && !initialData?.employeeNo) {
      const timeoutId = setTimeout(() => {
        fetchNextEmployeeNumber()
      }, 300)
      
      return () => clearTimeout(timeoutId)
    }
  }, [employeeNumberMode, initialData?.employeeNo])

  useEffect(() => {
    if (initialData?.mobile) {
      const { countryCode, mobile } = parseMobileNumber(initialData.mobile)
      setFormData(prevData => ({
        ...prevData,
        countryCode,
        mobile
      }))
    }
  }, [initialData?.mobile])

  return {
    formData,
    setFormData,
    employeeNumberMode,
    setEmployeeNumberMode,
    fetchingNextNumber,
    validationErrors,
    setValidationErrors,
    validatingSSN,
    validatingEmail,
    validatingEmployeeNo,
    isFormValid,
    ssnValidationTimeoutRef,
    emailValidationTimeoutRef,
    employeeNoValidationTimeoutRef,
    validateForm,
    validateField,
    debouncedValidation,
    validateSocialSecurityNumber,
    validateEmailUniqueness,
    validateEmployeeNumberUniqueness,
    validationSettings,
    settingsLoaded,
  }
}
