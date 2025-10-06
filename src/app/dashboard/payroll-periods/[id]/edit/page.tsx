'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import PayrollPeriodForm from '@/components/PayrollPeriodForm'
import { PayrollPeriod, PayrollPeriodFormData } from '@/shared/types'

export default function EditPayrollPeriodPage() {
  const router = useRouter()
  const params = useParams()
  const [payrollPeriod, setPayrollPeriod] = useState<PayrollPeriod | null>(null)
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    const fetchPayrollPeriod = async () => {
      try {
        const response = await fetch(`/api/payroll-periods/${params.id}`)
        const data = await response.json()

        if (response.ok) {
          setPayrollPeriod(data)
        } else {
          console.error('Error fetching payroll period:', data.error)
          router.push('/dashboard/payroll-periods')
        }
      } catch (error) {
        console.error('Error fetching payroll period:', error)
        router.push('/dashboard/payroll-periods')
      } finally {
        setLoading(false)
      }
    }

    if (params.id) {
      fetchPayrollPeriod()
    }
  }, [params.id, router])

  const handleSubmit = async (data: PayrollPeriodFormData) => {
    setIsSubmitting(true)
    
    try {
      const response = await fetch(`/api/payroll-periods/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (response.ok) {
        router.push('/dashboard/payroll-periods')
      } else {
        alert(result.error || 'Failed to update payroll period')
      }
    } catch (error) {
      console.error('Error updating payroll period:', error)
      alert('Failed to update payroll period')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#31BCFF]"></div>
      </div>
    )
  }

  if (!payrollPeriod) {
    return (
      <div className="space-y-6">
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-12 border border-gray-200/50 shadow-lg text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Payroll Period Not Found</h1>
          <p className="text-gray-600 mb-6">The payroll period you're looking for doesn't exist or has been deleted.</p>
          <Link
            href="/dashboard/payroll-periods"
            className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-[#31BCFF] to-[#0EA5E9] text-white font-medium rounded-xl hover:from-[#31BCFF]/90 hover:to-[#0EA5E9]/90 focus:outline-none focus:ring-2 focus:ring-[#31BCFF]/50 transform hover:scale-105 transition-all duration-200 shadow-lg"
          >
            Back to Payroll Periods
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
            href="/dashboard/payroll-periods"
            className="p-2 rounded-xl bg-white/50 hover:bg-white/80 transition-all duration-200 transform hover:scale-105"
          >
            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
              Edit Payroll Period
            </h1>
            <p className="mt-2 text-gray-600">
              Update payroll period: {payrollPeriod.name}
            </p>
          </div>
        </div>

        {/* Period Info */}
        <div className="bg-white/50 backdrop-blur-sm rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900">{payrollPeriod.name}</h3>
              <p className="text-sm text-gray-600">
                {new Date(payrollPeriod.startDate).toLocaleDateString()} - {new Date(payrollPeriod.endDate).toLocaleDateString()}
              </p>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm font-medium border ${
              payrollPeriod.status === 'DRAFT' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
              payrollPeriod.status === 'FINALIZED' ? 'bg-blue-100 text-blue-800 border-blue-200' :
              'bg-gray-100 text-gray-800 border-gray-200'
            }`}>
              {payrollPeriod.status}
            </span>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 shadow-lg">
        <PayrollPeriodForm
          initialData={{
            name: payrollPeriod.name,
            startDate: payrollPeriod.startDate,
            endDate: payrollPeriod.endDate,
            status: payrollPeriod.status
          }}
          onSubmit={handleSubmit}
          isLoading={isSubmitting}
          mode="edit"
        />
      </div>
    </div>
  )
}
