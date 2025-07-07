'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import EmployeeGroupForm from '@/components/EmployeeGroupForm'

export default function CreateEmployeeGroupPage() {
  const { t } = useTranslation()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (formData: any) => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/employee-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to create employee group')
      }

      router.push('/dashboard/employee-groups')
      router.refresh()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-semibold text-gray-900">{t('employee_groups.create_page.title')}</h1>
        
        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-md">
            {error}
          </div>
        )}

        <div className="mt-6 bg-white shadow rounded-lg p-6">
          <EmployeeGroupForm onSubmit={handleSubmit} loading={loading} />
        </div>
      </div>
    </div>
  )
}
