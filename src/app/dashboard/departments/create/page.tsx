'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import DepartmentForm from '@/components/DepartmentForm'

export default function CreateDepartmentPage() {
  const router = useRouter()
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [existingDepartments, setExistingDepartments] = useState<{ id: string; name: string; number?: string | null }[]>([])

  useEffect(() => {
    const fetchExistingDepartments = async () => {
      try {
        const res = await fetch('/api/departments')
        if (!res.ok) return
        const data = await res.json()
        setExistingDepartments(
          data.map((dept: { id: string; name: string; number?: string | null }) => ({
            id: dept.id,
            name: dept.name,
            number: dept.number ?? null,
          }))
        )
      } catch (fetchError) {
        console.error('Failed to load departments for validation', fetchError)
      }
    }

    fetchExistingDepartments()
  }, [])

  const handleSubmit = async (formData: any) => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/departments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!res.ok) {
        throw new Error('Failed to create department')
      }

      router.push('/dashboard/departments')
      router.refresh()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
              {t('departments.create_department')}
            </h1>
            <p className="mt-2 text-gray-600">
              {t('departments.description')}
            </p>
          </div>
          <div className="hidden md:flex items-center space-x-2">
            <div className="w-12 h-12 bg-[#31BCFF]/10 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-[#31BCFF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
          </div>
        </div>
      </div>
      
      {error && (
        <div className="bg-red-50/80 backdrop-blur-xl border border-red-200/50 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-red-600 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-red-700 font-medium">{error}</span>
          </div>
        </div>
      )}

      {/* Form Container */}
      <div className="bg-white/80 p-3 backdrop-blur-xl rounded-2xl border border-gray-200/50 shadow-lg">
        <DepartmentForm 
          onSubmit={handleSubmit} 
          loading={loading}
          existingDepartments={existingDepartments}
        />
      </div>
    </div>
  )
}