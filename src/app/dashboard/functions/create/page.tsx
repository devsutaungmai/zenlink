'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import Swal from 'sweetalert2'
import { usePermissions } from '@/shared/lib/usePermissions'
import { PERMISSIONS } from '@/shared/lib/permissions'

interface Category {
  id: string
  name: string
  color?: string | null
  department?: {
    id: string
    name: string
  } | null
  departments?: Array<{
    id: string
    department: {
      id: string
      name: string
    }
  }>
}

interface EmployeeGroupOption {
  id: string
  name: string
  _count?: {
    employees: number
  }
}

export default function CreateFunctionPage() {
  const router = useRouter()
  const { t } = useTranslation('functions')
  const { hasPermission, loading: permissionsLoading } = usePermissions()
  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [employeeGroups, setEmployeeGroups] = useState<EmployeeGroupOption[]>([])
  const [selectedEmployeeGroupIds, setSelectedEmployeeGroupIds] = useState<string[]>([])
  const [formData, setFormData] = useState({
    name: '',
    color: '#3B82F6',
    categoryId: ''
  })

  const canCreateFunctions = hasPermission(PERMISSIONS.FUNCTIONS_CREATE)

  useEffect(() => {
    if (!permissionsLoading && !canCreateFunctions) {
      router.push('/dashboard/functions')
    }
  }, [permissionsLoading, canCreateFunctions, router])

  useEffect(() => {
    fetchCategories()
    fetchEmployeeGroups()
  }, [])

  useEffect(() => {
    setSelectedEmployeeGroupIds((prev) => prev.filter((id) => employeeGroups.some((group) => group.id === id)))
  }, [employeeGroups])

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories')
      if (response.ok) {
        const data = await response.json()
        setCategories(data)
      }
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }

  const fetchEmployeeGroups = async () => {
    try {
      const response = await fetch('/api/employee-groups')
      if (response.ok) {
        const data = await response.json()
        setEmployeeGroups(data)
      }
    } catch (error) {
      console.error('Error fetching employee groups:', error)
    }
  }

  const toggleEmployeeGroup = (groupId: string) => {
    setSelectedEmployeeGroupIds((prev) =>
      prev.includes(groupId)
        ? prev.filter((id) => id !== groupId)
        : [...prev, groupId]
    )
  }

  const allEmployeeGroupsSelected = employeeGroups.length > 0 && selectedEmployeeGroupIds.length === employeeGroups.length

  const handleToggleAllEmployeeGroups = () => {
    if (allEmployeeGroupsSelected) {
      setSelectedEmployeeGroupIds([])
    } else {
      setSelectedEmployeeGroupIds(employeeGroups.map((group) => group.id))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      await Swal.fire({
        title: t('error'),
        text: t('name_required'),
        icon: 'error',
        confirmButtonColor: '#EF4444'
      })
      return
    }

    if (!formData.categoryId) {
      await Swal.fire({
        title: t('error'),
        text: t('category_required'),
        icon: 'error',
        confirmButtonColor: '#EF4444'
      })
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/functions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          employeeGroupIds: selectedEmployeeGroupIds
        })
      })

      if (response.ok) {
        await Swal.fire({
          title: t('success'),
          text: t('create_success'),
          icon: 'success',
          confirmButtonColor: '#3B82F6'
        })
        router.push('/dashboard/functions')
      } else {
        const error = await response.json()
        await Swal.fire({
          title: t('error'),
          text: error.error || t('create_error'),
          icon: 'error',
          confirmButtonColor: '#EF4444'
        })
      }
    } catch (error) {
      console.error('Error creating function:', error)
      await Swal.fire({
        title: 'Error!',
        text: 'An error occurred while creating the function',
        icon: 'error',
        confirmButtonColor: '#EF4444'
      })
    } finally {
      setLoading(false)
    }
  }

  if (permissionsLoading || !canCreateFunctions) {
    return null
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
              {t('create_function')}
            </h1>
            <p className="mt-2 text-gray-600">
              {t('create_description')}
            </p>
          </div>
          <div className="hidden md:flex items-center space-x-2">
            <div className="w-12 h-12 bg-[#31BCFF]/10 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-[#31BCFF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Form Container */}
      <div className="bg-white/80 p-3 backdrop-blur-xl rounded-2xl border border-gray-200/50 shadow-lg">
        <form onSubmit={handleSubmit} className="space-y-6 p-3">
          {/* Function Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              {t('function_name')} *
            </label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 sm:py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
              placeholder={t('name_placeholder')}
              required
            />
            <p className="mt-1 text-xs sm:text-sm text-gray-500">
              {t('name_helper')}
            </p>
          </div>

          {/* Category */}
          <div>
            <label htmlFor="categoryId" className="block text-sm font-medium text-gray-700 mb-2">
              {t('category')} *
            </label>
            <select
              id="categoryId"
              value={formData.categoryId}
              onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
              className="w-full px-4 py-2 sm:py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
              required
            >
              <option value="">{t('select_category')}</option>
              {categories.map((category) => {
                const deptNames = category.departments && category.departments.length > 0
                  ? category.departments.map((cd: any) => cd.department.name).join(', ')
                  : t('business_wide');
                
                return (
                  <option key={category.id} value={category.id}>
                    {category.name} ({deptNames})
                  </option>
                );
              })}
            </select>
            <p className="mt-1 text-xs sm:text-sm text-gray-500">
              {t('category_helper')}
            </p>
          </div>

          {/* Color */}
          <div>
            <label htmlFor="color" className="block text-sm font-medium text-gray-700 mb-2">
              {t('color')}
            </label>
            <div className="flex items-center space-x-4">
              <input
                type="color"
                id="color"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                className="h-12 w-20 rounded-xl border border-gray-300 cursor-pointer"
              />
              <input
                type="text"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                className="flex-1 px-4 py-2 sm:py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                placeholder="#3B82F6"
              />
            </div>
            <p className="mt-1 text-xs sm:text-sm text-gray-500">
              {t('color_helper')}
            </p>
          </div>

          {/* Employee Groups */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('employee_groups_label', { defaultValue: 'Employee Groups' })}
              <span className="text-gray-500 text-xs ml-1">
                {t('employee_groups_optional', { defaultValue: '(optional)' })}
              </span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-60 overflow-y-auto border border-gray-300 rounded-xl p-4 bg-white/70 backdrop-blur-sm">
              {employeeGroups.length === 0 ? (
                <div className="text-sm text-gray-500 col-span-full">
                  {t('employee_groups_empty', { defaultValue: 'No employee groups available yet.' })}
                </div>
              ) : (
                <>
                  <label className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors col-span-full sm:col-span-2 lg:col-span-3">
                    <input
                      type="checkbox"
                      checked={allEmployeeGroupsSelected}
                      onChange={handleToggleAllEmployeeGroups}
                      className="h-4 w-4 text-[#31BCFF] border-gray-300 rounded focus:ring-[#31BCFF]"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      {t('employee_groups_select_all', { defaultValue: 'Select all groups' })}
                    </span>
                  </label>
                  {employeeGroups.map((group) => (
                    <label
                      key={group.id}
                      className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selectedEmployeeGroupIds.includes(group.id)}
                        onChange={() => toggleEmployeeGroup(group.id)}
                        className="h-4 w-4 text-[#31BCFF] border-gray-300 rounded focus:ring-[#31BCFF]"
                      />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{group.name}</p>
                        <p className="text-xs text-gray-500">
                          {t('employee_groups_employee_count', {
                            defaultValue: '{{count}} employees',
                            count: group._count?.employees ?? 0
                          })}
                        </p>
                      </div>
                    </label>
                  ))}
                </>
              )}
            </div>
            <div className="mt-2 text-xs text-gray-500">
              {allEmployeeGroupsSelected
                ? t('employee_groups_selected_all', { defaultValue: 'All groups selected' })
                : t('employee_groups_selected_count', {
                    defaultValue: 'Selected {{count}} of {{total}} groups',
                    count: selectedEmployeeGroupIds.length,
                    total: employeeGroups.length
                  })}
            </div>
          </div>

          <div className="flex justify-end space-x-4 pt-6">
            <Link
              href="/dashboard/functions"
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#31BCFF]"
            >
              {t('cancel')}
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-[#31BCFF] border border-transparent rounded-md hover:bg-[#31BCFF]/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#31BCFF] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? t('creating') : t('create_function')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
