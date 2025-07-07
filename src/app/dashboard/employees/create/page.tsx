'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import EmployeeForm from '@/components/EmployeeForm'
import { Department, EmployeeGroup } from '@prisma/client'

export default function CreateEmployeePage() {
  const { t } = useTranslation()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [departments, setDepartments] = useState<Department[]>([])
  const [employeeGroups, setEmployeeGroups] = useState<EmployeeGroup[]>([])
  const [authChecked, setAuthChecked] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/me')
        const currentUser = await res.json()
        if (!currentUser || currentUser.role !== 'ADMIN') {
          throw new Error(`${currentUser}`)
        }
        setAuthChecked(true)

        const [deptsRes, groupsRes] = await Promise.all([
          fetch('/api/departments'),
          fetch('/api/employee-groups'),
        ])

        if (!deptsRes.ok || !groupsRes.ok) {
          throw new Error('Failed to fetch required data')
        }

        setDepartments(await deptsRes.json())
        setEmployeeGroups(await groupsRes.json())
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Failed to load form data')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const handleSubmit = async (formData: any) => {
    setSaving(true)
    setError(null)

    try {
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          birthday: new Date(formData.birthday).toISOString(),
          dateOfHire: new Date(formData.dateOfHire).toISOString()
        }),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to create employee')
      }

      router.push('/dashboard/employees')
      router.refresh()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="p-4 text-gray-500">{t('employees.create_page.loading')}</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-md max-w-md text-center">
          {error}
          <div className="mt-4 space-y-2">
            {error.includes('Unauthorized') ? (
              <button
                onClick={() => router.push('/dashboard')}
                className="w-full px-4 py-2 text-sm font-medium text-white bg-[#31BCFF] rounded-md hover:bg-[#31BCFF]/90"
              >
                {t('employees.create_page.back_to_dashboard')}
              </button>
            ) : (
              <button
                onClick={() => {}}
                className="w-full px-4 py-2 text-sm font-medium text-white bg-[#31BCFF] rounded-md hover:bg-[#31BCFF]/90"
              >
                {t('employees.create_page.try_again')}
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-semibold text-gray-900">{t('employees.create_page.title')}</h1>
        
        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-md">
            {error}
          </div>
        )}

        <div className="mt-6 bg-white shadow rounded-lg p-6">
          {authChecked && (
            <EmployeeForm 
              onSubmit={handleSubmit} 
              loading={saving}
              departments={departments}
              employeeGroups={employeeGroups}
            />
          )}
        </div>
      </div>
    </div>
  )
}