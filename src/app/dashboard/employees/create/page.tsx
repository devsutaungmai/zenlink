'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import EmployeeForm from '@/components/EmployeeForm'
import { Department, EmployeeGroup } from '@prisma/client'
import { 
  EmployeeFormTabs, 
  defaultEmployeeTabs, 
  EmployeeTabType 
} from '@/components/employee-form/EmployeeFormTabs'
import { ShiftsTabContent } from '@/components/employee-form/ShiftsTabContent'
import { PayslipsTabContent } from '@/components/employee-form/PayslipsTabContent'
import { SickLeaveTabContent } from '@/components/employee-form/SickLeaveTabContent'
import { ChevronLeftIcon } from '@heroicons/react/24/outline'

export default function CreateEmployeePage() {
  const { t } = useTranslation()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [departments, setDepartments] = useState<Department[]>([])
  const [employeeGroups, setEmployeeGroups] = useState<EmployeeGroup[]>([])
  const [authChecked, setAuthChecked] = useState(false)
  const [activeTab, setActiveTab] = useState<EmployeeTabType>('details')

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Check auth and fetch form data in parallel
        const [authRes, formDataRes] = await Promise.all([
          fetch('/api/me'),
          fetch('/api/form-data')
        ])

        const currentUser = await authRes.json()
        if (!authRes.ok || !currentUser || currentUser.role !== 'ADMIN') {
          throw new Error('Unauthorized access')
        }
        setAuthChecked(true)

        if (!formDataRes.ok) {
          throw new Error('Failed to fetch form data')
        }

        const { departments, employeeGroups } = await formDataRes.json()
        setDepartments(departments)
        setEmployeeGroups(employeeGroups)
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
        console.error('Server error:', errorData.error)
        setError(errorData.error || 'Failed to create employee. Please check all fields and try again.')
        return
      }

      router.push('/dashboard/employees')
      router.refresh()
    } catch (error) {
      console.error('Network error:', error)
      setError('Network error occurred. Please check your connection and try again.')
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
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/dashboard/employees')}
            className="p-2 hover:bg-white/50 rounded-xl transition-colors duration-200"
          >
            <ChevronLeftIcon className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
              {t('employees.create_page.title')}
            </h1>
            <p className="mt-2 text-gray-600">
              Create a new employee and manage their information
            </p>
          </div>
        </div>
      </div>
        
      {/* Error Display */}
      {error && (
        <div className="bg-orange-50 border border-orange-200 text-orange-800 rounded-xl p-4">
          <p className="font-medium">Unable to save employee</p>
          <p>{error}</p>
          <button
            onClick={() => setError(null)}
            className="mt-2 text-orange-600 hover:text-orange-700 underline text-sm"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Tabs Navigation */}
      <EmployeeFormTabs 
        activeTab={activeTab}
        onTabChange={setActiveTab}
        tabs={defaultEmployeeTabs}
      />

      {/* Tab Content */}
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 shadow-lg p-6">
        {activeTab === 'details' && authChecked && (
          <EmployeeForm 
            onSubmit={handleSubmit} 
            loading={saving}
            departments={departments}
            employeeGroups={employeeGroups}
          />
        )}

        {activeTab === 'shifts' && (
          <ShiftsTabContent isNewEmployee={true} />
        )}

        {activeTab === 'payslips' && (
          <PayslipsTabContent isNewEmployee={true} />
        )}

        {activeTab === 'sickleave' && (
          <SickLeaveTabContent isNewEmployee={true} />
        )}
      </div>
    </div>
  )
}