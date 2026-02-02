'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import PayrollEntryForm from '@/components/PayrollEntryForm'
import { PayrollEntry, PayrollEntryFormData } from '@/shared/types'

export default function EditPayrollEntryPage() {
  const { t } = useTranslation('payroll-entries')
  const router = useRouter()
  const params = useParams()
  const [payrollEntry, setPayrollEntry] = useState<PayrollEntry | null>(null)
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    const fetchPayrollEntry = async () => {
      try {
        const response = await fetch(`/api/payroll-entries/${params.id}`)
        const data = await response.json()

        if (response.ok) {
          setPayrollEntry(data)
        } else {
          console.error('Error fetching payroll entry:', data.error)
          router.push('/dashboard/payroll-entries')
        }
      } catch (error) {
        console.error('Error fetching payroll entry:', error)
        router.push('/dashboard/payroll-entries')
      } finally {
        setLoading(false)
      }
    }

    if (params.id) {
      fetchPayrollEntry()
    }
  }, [params.id, router])

  const handleSubmit = async (data: PayrollEntryFormData) => {
    setIsSubmitting(true)
    
    try {
      const response = await fetch(`/api/payroll-entries/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (response.ok) {
        router.push('/dashboard/payroll-entries')
      } else {
        alert(result.error || t('edit_page.update_failed'))
      }
    } catch (error) {
      console.error('Error updating payroll entry:', error)
      alert(t('edit_page.update_failed'))
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

  if (!payrollEntry) {
    return (
      <div className="space-y-6">
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-12 border border-gray-200/50 shadow-lg text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">{t('edit_page.not_found_title')}</h1>
          <p className="text-gray-600 mb-6">{t('edit_page.not_found_text')}</p>
          <Link
            href="/dashboard/payroll-entries"
            className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-[#31BCFF] to-[#0EA5E9] text-white font-medium rounded-xl hover:from-[#31BCFF]/90 hover:to-[#0EA5E9]/90 focus:outline-none focus:ring-2 focus:ring-[#31BCFF]/50 transform hover:scale-105 transition-all duration-200 shadow-lg"
          >
            {t('edit_page.back_button')}
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
              {t('edit_page.title')}
            </h1>
            <p className="mt-2 text-gray-600">
              {t('edit_page.subtitle', { name: `${payrollEntry.employee.firstName} ${payrollEntry.employee.lastName}` })}
            </p>
          </div>
        </div>

        {/* Entry Info */}
        <div className="bg-white/50 backdrop-blur-sm rounded-xl p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-600">{t('edit_page.employee')}</p>
              <p className="font-semibold text-gray-900">
                {payrollEntry.employee.firstName} {payrollEntry.employee.lastName}
                {payrollEntry.employee.employeeNo && ` (#${payrollEntry.employee.employeeNo})`}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">{t('edit_page.payroll_period')}</p>
              <p className="font-semibold text-gray-900">{payrollEntry.payrollPeriod.name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">{t('edit_page.status')}</p>
              <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium border ${
                payrollEntry.status === 'DRAFT' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                payrollEntry.status === 'APPROVED' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                'bg-green-100 text-green-800 border-green-200'
              }`}>
                {payrollEntry.status === 'DRAFT' ? t('status.draft') : 
                 payrollEntry.status === 'APPROVED' ? t('status.approved') : t('status.paid')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 shadow-lg">
        <PayrollEntryForm
          initialData={{
            employeeId: payrollEntry.employeeId,
            regularHours: payrollEntry.regularHours,
            overtimeHours: payrollEntry.overtimeHours,
            regularRate: payrollEntry.regularRate,
            overtimeRate: payrollEntry.overtimeRate,
            deductions: payrollEntry.deductions,
            bonuses: payrollEntry.bonuses,
            status: payrollEntry.status,
            notes: payrollEntry.notes || ''
          }}
          onSubmit={handleSubmit}
          isLoading={isSubmitting}
          mode="edit"
          payrollPeriodId={payrollEntry.payrollPeriodId}
        />
      </div>
    </div>
  )
}