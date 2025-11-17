'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import Link from 'next/link'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import Swal from 'sweetalert2'

interface Department {
  id: string
  name: string
}

export default function CreateCategoryPage() {
  const router = useRouter()
  const { t } = useTranslation('categories')
  const [loading, setLoading] = useState(false)
  const [departments, setDepartments] = useState<Department[]>([])
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#3B82F6',
    departmentIds: [] as string[]
  })
  const [isBusinessWide, setIsBusinessWide] = useState(true)

  const allDepartmentIds = departments.map((dept) => dept.id)

  useEffect(() => {
    fetchDepartments()
  }, [])

  const fetchDepartments = async () => {
    try {
      const res = await fetch('/api/departments')
      if (res.ok) {
        const data = await res.json()
        setDepartments(data)
      }
    } catch (error) {
      console.error('Error fetching departments:', error)
    }
  }

  const handleBusinessWideChange = (checked: boolean) => {
    if (checked) {
      setIsBusinessWide(true)
      setFormData((prev) => ({ ...prev, departmentIds: [] }))
    } else {
      setIsBusinessWide(false)
      setFormData((prev) => ({ ...prev, departmentIds: allDepartmentIds }))
    }
  }

  const handleDepartmentToggle = (deptId: string, checked: boolean) => {
    if (allDepartmentIds.length === 0) {
      return
    }

    setFormData((prev) => {
      const wasBusinessWide = isBusinessWide
      let updatedIds = wasBusinessWide ? [...allDepartmentIds] : [...prev.departmentIds]

      if (wasBusinessWide) {
        setIsBusinessWide(false)
      }

      if (checked) {
        if (!updatedIds.includes(deptId)) {
          updatedIds.push(deptId)
        }
      } else {
        updatedIds = updatedIds.filter((id) => id !== deptId)
      }

      if (!wasBusinessWide && updatedIds.length === allDepartmentIds.length) {
        setIsBusinessWide(true)
        return { ...prev, departmentIds: [] }
      }

      return { ...prev, departmentIds: updatedIds }
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to create category')
      }

      await Swal.fire({
        title: t('success'),
        text: t('create_success'),
        icon: 'success',
        confirmButtonColor: '#31BCFF',
      })

      router.push('/dashboard/categories')
      router.refresh()
    } catch (error) {
      await Swal.fire({
        title: t('error'),
        text: error instanceof Error ? error.message : t('create_error'),
        icon: 'error',
        confirmButtonColor: '#31BCFF',
      })
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
            <div className="flex items-center gap-3 mb-2">
              <Link
                href="/dashboard/categories"
                className="p-2 hover:bg-white/50 rounded-lg transition-colors"
              >
                <ArrowLeftIcon className="w-5 h-5 text-gray-600" />
              </Link>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                {t('create_category')}
              </h1>
            </div>
            <p className="mt-2 text-gray-600 ml-14">
              {t('create_description')}
            </p>
          </div>
          <div className="hidden md:flex items-center space-x-2">
            <div className="w-12 h-12 bg-[#31BCFF]/10 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-[#31BCFF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Form Container */}
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 shadow-lg p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Category Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              {t('name')} *
            </label>
            <input
              type="text"
              id="name"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="block w-full px-4 py-3 rounded-xl border border-gray-300 bg-white/70 backdrop-blur-sm text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-[#31BCFF]/50 focus:border-[#31BCFF] transition-all duration-200"
              placeholder={t('name_placeholder')}
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              {t('description')}
            </label>
            <textarea
              id="description"
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="block w-full px-4 py-3 rounded-xl border border-gray-300 bg-white/70 backdrop-blur-sm text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-[#31BCFF]/50 focus:border-[#31BCFF] transition-all duration-200"
              placeholder={t('description_placeholder')}
            />
          </div>

          {/* Departments (Multi-select) */}
          <div>
            <label htmlFor="departments" className="block text-sm font-medium text-gray-700 mb-2">
              {t('departments')} <span className="text-gray-500 text-xs">({t('departments_optional')})</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-60 overflow-y-auto border border-gray-300 rounded-xl p-4 bg-white/70 backdrop-blur-sm">
              {departments.length === 0 ? (
                <p className="text-sm text-gray-500 col-span-full">{t('no_departments')}</p>
              ) : (
                <>
                  <label className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors">
                    <input
                      type="checkbox"
                      checked={isBusinessWide}
                      onChange={(e) => handleBusinessWideChange(e.target.checked)}
                      className="h-4 w-4 text-[#31BCFF] border-gray-300 rounded focus:ring-[#31BCFF]"
                    />
                    <span className="text-sm font-medium text-gray-700">{t('business_wide')}</span>
                  </label>
                  {departments.map((dept) => (
                    <label key={dept.id} className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors">
                      <input
                        type="checkbox"
                        checked={isBusinessWide || formData.departmentIds.includes(dept.id)}
                        onChange={(e) => handleDepartmentToggle(dept.id, e.target.checked)}
                        className="h-4 w-4 text-[#31BCFF] border-gray-300 rounded focus:ring-[#31BCFF]"
                      />
                      <span className="text-sm text-gray-700">{dept.name}</span>
                    </label>
                  ))}
                </>
              )}
            </div>
            <p className="mt-2 text-xs text-gray-500">
              {isBusinessWide
                ? (departments.length === 0
                    ? t('helper_business_wide')
                    : t(departments.length === 1 ? 'selected_count' : 'selected_count_plural', { count: departments.length })
                  )
                : t(formData.departmentIds.length === 1 ? 'selected_count' : 'selected_count_plural', { count: formData.departmentIds.length })
              }
            </p>
          </div>

          {/* Color */}
          <div>
            <label htmlFor="color" className="block text-sm font-medium text-gray-700 mb-2">
              {t('color')}
            </label>
            <div className="flex items-center gap-4">
              <input
                type="color"
                id="color"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                className="h-12 w-24 rounded-xl border border-gray-300 cursor-pointer"
              />
              <div className="flex items-center gap-2">
                <div
                  className="w-6 h-6 rounded-lg border border-gray-300"
                  style={{ backgroundColor: formData.color }}
                />
                <span className="text-sm text-gray-600">{formData.color}</span>
              </div>
            </div>
            <p className="mt-2 text-sm text-gray-500">
              {t('color_helper')}
            </p>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-4 pt-6 border-t border-gray-200">
            <Link
              href="/dashboard/categories"
              className="px-6 py-3 rounded-xl border border-gray-300 bg-white text-gray-700 font-medium hover:bg-gray-50 transition-colors duration-200"
            >
              {t('cancel')}
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#31BCFF] to-[#0EA5E9] text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {loading ? t('creating') : t('create_category')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
