'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import PayrollPeriodForm from '@/components/PayrollPeriodForm'
import { PayrollPeriodFormData } from '@/shared/types'

export default function CreatePayrollPeriodPage() {
  const { t } = useTranslation('payroll-periods')
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (data: PayrollPeriodFormData) => {
    setIsLoading(true)
    
    try {
      const response = await fetch('/api/payroll-periods', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (response.ok) {
        router.push('/dashboard/payroll-periods')
      } else {
        alert(result.error || t('errors.create_failed'))
      }
    } catch (error) {
      console.error('Error creating payroll period:', error)
      alert(t('errors.create_failed'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/payroll-periods"
            className="p-2 rounded-xl bg-white/50 hover:bg-white/80 transition-all duration-200 transform hover:scale-105"
          >
            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
              {t('create_page.title')}
            </h1>
            <p className="mt-2 text-gray-600">
              {t('create_page.subtitle')}
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 shadow-lg">
        <PayrollPeriodForm
          onSubmit={handleSubmit}
          isLoading={isLoading}
          mode="create"
        />
      </div>
    </div>
  )
}
