'use client'

import React from 'react'
import { AlertTriangle, AlertCircle, Info } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

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

interface ShiftValidationWarningsProps {
  laborLawViolations?: LaborLawViolation[]
  laborLawWarnings?: LaborLawWarning[]
  contractDeviations?: ContractDeviation[]
  overtimeEligible?: boolean
  overtimeExemptReason?: string | null
  compact?: boolean
}

export default function ShiftValidationWarnings({
  laborLawViolations = [],
  laborLawWarnings = [],
  contractDeviations = [],
  overtimeEligible = true,
  overtimeExemptReason = null,
  compact = false,
}: ShiftValidationWarningsProps) {
  const hasViolations = laborLawViolations.length > 0
  const hasWarnings = laborLawWarnings.length > 0 || contractDeviations.length > 0
  const hasOvertimeInfo = !overtimeEligible && overtimeExemptReason

  if (!hasViolations && !hasWarnings && !hasOvertimeInfo) {
    return null
  }

  if (compact) {
    return (
      <div className="flex flex-wrap gap-2">
        {hasViolations && (
          <Badge variant="destructive" className="flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            {laborLawViolations.length} Legal Violation{laborLawViolations.length > 1 ? 's' : ''}
          </Badge>
        )}
        {contractDeviations.length > 0 && (
          <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            {contractDeviations.length} Contract Deviation{contractDeviations.length > 1 ? 's' : ''}
          </Badge>
        )}
        {laborLawWarnings.length > 0 && (
          <Badge variant="outline" className="flex items-center gap-1">
            <Info className="h-3 w-3" />
            {laborLawWarnings.length} Warning{laborLawWarnings.length > 1 ? 's' : ''}
          </Badge>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {laborLawViolations.length > 0 && (
        <div className="rounded-md bg-red-50 border border-red-200 p-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="text-sm font-medium text-red-800">
                Labor Law Violations
              </h4>
              <ul className="mt-1 text-sm text-red-700 space-y-1">
                {laborLawViolations.map((violation, idx) => (
                  <li key={idx} className="flex items-start gap-1">
                    <span>•</span>
                    <span>{violation.message}</span>
                    {violation.overridable && (
                      <span className="text-xs text-red-500">(can override)</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {contractDeviations.length > 0 && (
        <div className="rounded-md bg-yellow-50 border border-yellow-200 p-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="text-sm font-medium text-yellow-800">
                Contract Deviations
              </h4>
              <ul className="mt-1 text-sm text-yellow-700 space-y-1">
                {contractDeviations.map((deviation, idx) => (
                  <li key={idx} className="flex items-start gap-1">
                    <span>•</span>
                    <span>{deviation.message}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {laborLawWarnings.length > 0 && (
        <div className="rounded-md bg-blue-50 border border-blue-200 p-3">
          <div className="flex items-start gap-2">
            <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="text-sm font-medium text-blue-800">
                Warnings
              </h4>
              <ul className="mt-1 text-sm text-blue-700 space-y-1">
                {laborLawWarnings.map((warning, idx) => (
                  <li key={idx} className="flex items-start gap-1">
                    <span>•</span>
                    <span>{warning.message}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {hasOvertimeInfo && (
        <div className="rounded-md bg-gray-50 border border-gray-200 p-3">
          <div className="flex items-start gap-2">
            <Info className="h-5 w-5 text-gray-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="text-sm font-medium text-gray-800">
                Overtime Status
              </h4>
              <p className="mt-1 text-sm text-gray-600">
                {overtimeExemptReason}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
