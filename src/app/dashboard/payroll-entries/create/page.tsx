'use client'

import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import PayrollEntryForm from '@/components/PayrollEntryForm'
import { PayrollEntryFormData, PayrollPeriod } from '@/shared/types'

function CreatePayrollEntryContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(false)
  const [periods, setPeriods] = useState<PayrollPeriod[]>([])
  const [selectedPeriodId, setSelectedPeriodId] = useState('')
  const [loadingPeriods, setLoadingPeriods] = useState(true)

  useEffect(() => {
    const fetchPeriods = async () => {
      try {
        const response = await fetch('/api/payroll-periods')
        const data = await response.json()

        if (response.ok) {
          setPeriods(data.payrollPeriods)
          
          // Set initial period from URL params or first available period
          const periodIdFromUrl = searchParams.get('periodId')
          if (periodIdFromUrl && data.payrollPeriods.some((p: PayrollPeriod) => p.id === periodIdFromUrl)) {
            setSelectedPeriodId(periodIdFromUrl)
          } else if (data.payrollPeriods.length > 0) {
            setSelectedPeriodId(data.payrollPeriods[0].id)
          }
        } else {
          console.error('Error fetching periods:', data.error)
        }
      } catch (error) {
        console.error('Error fetching periods:', error)
      } finally {
        setLoadingPeriods(false)
      }
    }

    fetchPeriods()
  }, [searchParams])

  const handleSubmit = async (data: PayrollEntryFormData) => {
    if (!selectedPeriodId) {
      alert('Please select a payroll period')
      return
    }

    setIsLoading(true)
    
    try {
      const response = await fetch('/api/payroll-entries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          payrollPeriodId: selectedPeriodId,
        }),
      })

      const result = await response.json()

      if (response.ok) {
        router.push('/dashboard/payroll-entries')
      } else {
        alert(result.error || 'Failed to create payroll entry')
      }
    } catch (error) {
      console.error('Error creating payroll entry:', error)
      alert('Failed to create payroll entry')
    } finally {
      setIsLoading(false)
    }
  }

  if (loadingPeriods) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#31BCFF]"></div>
      </div>
    )
  }

  if (periods.length === 0) {
    return (
      <div className="space-y-6">
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-12 border border-gray-200/50 shadow-lg text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">No Payroll Periods Available</h1>
          <p className="text-gray-600 mb-6">You need to create a payroll period before adding entries.</p>
          <Link
            href="/dashboard/payroll-periods/create"
            className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-[#31BCFF] to-[#0EA5E9] text-white font-medium rounded-xl hover:from-[#31BCFF]/90 hover:to-[#0EA5E9]/90 focus:outline-none focus:ring-2 focus:ring-[#31BCFF]/50 transform hover:scale-105 transition-all duration-200 shadow-lg"
          >
            Create Payroll Period
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
        <div className="flex items-center gap-4 mb-6">
          <Link
            href="/dashboard/payroll-entries"
            className="p-2 rounded-xl bg-white/50 hover:bg-white/80 transition-all duration-200 transform hover:scale-105"
          >
            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
              Create Payroll Entry
            </h1>
            <p className="mt-2 text-gray-600">
              Add a new payroll entry for an employee
            </p>
          </div>
        </div>

        {/* Period Selection */}
        <div className="bg-white/50 backdrop-blur-sm rounded-xl p-4">
          <label htmlFor="periodSelect" className="block text-sm font-medium text-gray-700 mb-2">
            Payroll Period <span className="text-red-500">*</span>
          </label>
          <select
            id="periodSelect"
            value={selectedPeriodId}
            onChange={(e) => setSelectedPeriodId(e.target.value)}
            className="block w-full px-4 py-3 rounded-xl border-2 border-gray-200 bg-white/70 backdrop-blur-sm text-gray-900 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#31BCFF]/50 focus:border-[#31BCFF] hover:border-gray-300"
          >
            <option value="">Select a payroll period</option>
            {periods.map((period) => (
              <option key={period.id} value={period.id}>
                {period.name} ({new Date(period.startDate).toLocaleDateString()} - {new Date(period.endDate).toLocaleDateString()})
              </option>
            ))}
          </select>
          {selectedPeriodId && (
            <div className="mt-2 text-sm text-gray-600">
              Selected: {periods.find(p => p.id === selectedPeriodId)?.name}
            </div>
          )}
        </div>
      </div>

      {/* Form */}
      {selectedPeriodId && (
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 shadow-lg">
          <PayrollEntryForm
            onSubmit={handleSubmit}
            isLoading={isLoading}
            mode="create"
            payrollPeriodId={selectedPeriodId}
          />
        </div>
      )}
    </div>
  )
}

export default function CreatePayrollEntryPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#31BCFF]"></div>
    </div>}>
      <CreatePayrollEntryContent />
    </Suspense>
  )
}
