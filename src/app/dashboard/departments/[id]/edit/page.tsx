'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import DepartmentForm from '@/components/DepartmentForm'

interface Department {
  id: string
  name: string
  number?: string
  address: string
  address2?: string
  postCode?: string
  city: string
  phone: string
  country: string
}

export default function EditDepartmentPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const { t } = useTranslation()
  const departmentId = React.use(params).id
  const [department, setDepartment] = useState<Department | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [existingDepartments, setExistingDepartments] = useState<{ id: string; name: string; number?: string | null }[]>([])

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [departmentRes, existingRes] = await Promise.all([
          fetch(`/api/departments/${departmentId}`),
          fetch('/api/departments')
        ])

        if (!departmentRes.ok) {
          throw new Error('Failed to fetch department')
        }

        const departmentData = await departmentRes.json()
        setDepartment(departmentData)

        if (existingRes.ok) {
          const existingData = await existingRes.json()
          setExistingDepartments(
            existingData.map((dept: { id: string; name: string; number?: string | null }) => ({
              id: dept.id,
              name: dept.name,
              number: dept.number ?? null,
            }))
          )
        }
      } catch (fetchError) {
        setError(fetchError instanceof Error ? fetchError.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [departmentId])

  const handleSubmit = async (formData: any) => {
    setSaving(true)
    setError(null)

    try {
      const res = await fetch(`/api/departments/${departmentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!res.ok) {
        throw new Error('Failed to update department')
      }

      router.push('/dashboard/departments')
      router.refresh()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#31BCFF] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading department...</p>
        </div>
      </div>
    )
  }

  if (error && !department) {
    return (
      <div className="space-y-6">
        <div className="bg-red-50/80 backdrop-blur-xl rounded-2xl p-8 border border-red-200/50 shadow-lg text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-red-900 mb-2">{t('common.error')}</h3>
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
              {t('departments.edit_department')}
            </h1>
            <p className="mt-2 text-gray-600">
              {t('departments.description')}
            </p>
            {department && (
              <div className="mt-3 flex items-center text-sm text-gray-500">
                <div className="w-2 h-2 bg-[#31BCFF] rounded-full mr-2"></div>
                {t('departments.edit_department_action')}: {department.name}
              </div>
            )}
          </div>
          <div className="hidden md:flex items-center space-x-2">
            <div className="w-12 h-12 bg-[#31BCFF]/10 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-[#31BCFF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
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
          initialData={department ? {
            name: department.name,
            number: department.number,
            address: department.address,
            address2: department.address2,
            postCode: department.postCode,
            city: department.city,
            phone: department.phone,
            country: department.country
          } : undefined}
          onSubmit={handleSubmit} 
          loading={saving}
          existingDepartments={existingDepartments}
          currentDepartmentId={departmentId}
        />
      </div>
    </div>
  )
}
