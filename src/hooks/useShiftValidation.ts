import { useState, useCallback } from 'react'

interface LaborLawViolation {
  type: string
  message: string
  severity: 'ERROR' | 'WARNING'
  currentValue: number
  allowedValue: number
  overridable?: boolean
}

interface LaborLawWarning {
  type: string
  message: string
  currentValue: number
  limitValue: number
}

interface ContractDeviation {
  type: string
  message: string
  severity: 'WARNING'
  currentValue: number
  contractLimit: number
}

interface ValidationResult {
  laborLaw: {
    isValid: boolean
    violations: LaborLawViolation[]
    warnings: LaborLawWarning[]
  }
  contract: {
    hasDeviations: boolean
    deviations: ContractDeviation[]
    overtimeEligible: boolean
    overtimeExemptReason: string | null
  } | null
  canSchedule: boolean
  requiresOverride: boolean
  summaryMessage: string | null
}

interface ShiftValidationInput {
  shiftId?: string
  date: string
  startTime: string
  endTime: string
  breakStart?: string | null
  breakEnd?: string | null
  employeeId: string
}

export function useShiftValidation() {
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null)
  const [isValidating, setIsValidating] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)

  const validateShift = useCallback(async (input: ShiftValidationInput) => {
    if (!input.employeeId || !input.date || !input.startTime || !input.endTime) {
      setValidationResult(null)
      return null
    }

    setIsValidating(true)
    setValidationError(null)

    try {
      const response = await fetch('/api/shifts/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })

      if (!response.ok) {
        const error = await response.json()
        setValidationError(error.error || 'Validation failed')
        return null
      }

      const result = await response.json()
      setValidationResult(result)
      return result as ValidationResult
    } catch (error) {
      console.error('Error validating shift:', error)
      setValidationError('Failed to validate shift')
      return null
    } finally {
      setIsValidating(false)
    }
  }, [])

  const clearValidation = useCallback(() => {
    setValidationResult(null)
    setValidationError(null)
  }, [])

  return {
    validationResult,
    isValidating,
    validationError,
    validateShift,
    clearValidation,
  }
}

export type { ValidationResult, ShiftValidationInput, LaborLawViolation, LaborLawWarning, ContractDeviation }
