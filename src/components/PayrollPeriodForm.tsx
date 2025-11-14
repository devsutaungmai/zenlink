'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PayrollPeriodFormData } from '@/shared/types'

interface PayrollPeriodFormProps {
  initialData?: Partial<PayrollPeriodFormData>
  onSubmit: (data: PayrollPeriodFormData) => Promise<void>
  isLoading?: boolean
  mode?: 'create' | 'edit'
}

export default function PayrollPeriodForm({
  initialData,
  onSubmit,
  isLoading = false,
  mode = 'create'
}: PayrollPeriodFormProps) {
  const router = useRouter()
  const [formData, setFormData] = useState<PayrollPeriodFormData>({
    name: initialData?.name || '',
    startDate: initialData?.startDate ? new Date(initialData.startDate).toISOString().split('T')[0] : '',
    endDate: initialData?.endDate ? new Date(initialData.endDate).toISOString().split('T')[0] : '',
    status: initialData?.status || 'DRAFT'
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Period name is required'
    }

    if (!formData.startDate) {
      newErrors.startDate = 'Start date is required'
    }

    if (!formData.endDate) {
      newErrors.endDate = 'End date is required'
    }

    if (formData.startDate && formData.endDate) {
      const startDate = new Date(formData.startDate)
      const endDate = new Date(formData.endDate)
      
      if (startDate >= endDate) {
        newErrors.endDate = 'End date must be after start date'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    try {
      await onSubmit(formData)
    } catch (error) {
      console.error('Form submission error:', error)
    }
  }

  return (
    <div className="p-8">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 gap-6">
          {/* Period Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              Period Name
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g., January 2025 Payroll"
              className={`w-full px-4 py-3 rounded-xl border bg-white/70 backdrop-blur-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#31BCFF]/50 ${
                errors.name 
                  ? 'border-red-300 focus:border-red-500' 
                  : 'border-gray-300 focus:border-[#31BCFF] hover:border-gray-400'
              }`}
              disabled={isLoading}
            />
            {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-2">
                Start Date
              </label>
              <input
                type="date"
                id="startDate"
                name="startDate"
                value={formData.startDate}
                onChange={handleChange}
                className={`w-full px-4 py-3 rounded-xl border bg-white/70 backdrop-blur-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#31BCFF]/50 ${
                  errors.startDate 
                    ? 'border-red-300 focus:border-red-500' 
                    : 'border-gray-300 focus:border-[#31BCFF] hover:border-gray-400'
                }`}
                disabled={isLoading}
              />
              {errors.startDate && <p className="mt-1 text-sm text-red-600">{errors.startDate}</p>}
            </div>

            <div>
              <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-2">
                End Date
              </label>
              <input
                type="date"
                id="endDate"
                name="endDate"
                value={formData.endDate}
                onChange={handleChange}
                className={`w-full px-4 py-3 rounded-xl border bg-white/70 backdrop-blur-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#31BCFF]/50 ${
                  errors.endDate 
                    ? 'border-red-300 focus:border-red-500' 
                    : 'border-gray-300 focus:border-[#31BCFF] hover:border-gray-400'
                }`}
                disabled={isLoading}
              />
              {errors.endDate && <p className="mt-1 text-sm text-red-600">{errors.endDate}</p>}
            </div>
          </div>

          {/* Status */}
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              id="status"
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white/70 backdrop-blur-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#31BCFF]/50 focus:border-[#31BCFF] hover:border-gray-400"
              disabled={isLoading}
            >
              <option value="DRAFT">Draft</option>
              <option value="FINALIZED">Finalized</option>
              <option value="CLOSED">Closed</option>
            </select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col-reverse sm:flex-row gap-3 pt-6 border-t border-gray-200/50">
          <button
            type="button"
            onClick={() => router.push('/dashboard/payroll-periods')}
            disabled={isLoading}
            className="w-full sm:flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full sm:flex-1 px-4 py-3 bg-gradient-to-r from-[#31BCFF] to-[#0EA5E9] text-white font-medium rounded-xl hover:from-[#31BCFF]/90 hover:to-[#0EA5E9]/90 focus:outline-none focus:ring-2 focus:ring-[#31BCFF]/50 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {mode === 'create' ? 'Creating...' : 'Updating...'}
              </>
            ) : (
              mode === 'create' ? 'Create Period' : 'Update Period'
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
