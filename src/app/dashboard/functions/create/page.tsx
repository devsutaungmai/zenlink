'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import { useTranslation } from 'react-i18next'
import Swal from 'sweetalert2'

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

export default function CreateFunctionPage() {
  const router = useRouter()
  const { t } = useTranslation('functions')
  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [formData, setFormData] = useState({
    name: '',
    color: '#3B82F6',
    categoryId: ''
  })

  useEffect(() => {
    fetchCategories()
  }, [])

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
        body: JSON.stringify(formData)
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-4 sm:py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-4 sm:p-6 shadow-sm border border-blue-100">
          <div className="flex items-center gap-3 sm:gap-4">
            <Link
              href="/dashboard/functions"
              className="p-2 hover:bg-white rounded-lg transition-colors duration-200"
            >
              <ArrowLeftIcon className="h-5 w-5 sm:h-6 sm:w-6 text-gray-600" />
            </Link>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                {t('create_function')}
              </h1>
              <p className="mt-1 sm:mt-2 text-sm sm:text-base text-gray-600">{t('create_description')}</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg p-4 sm:p-6 border border-gray-200/50">
          <form onSubmit={handleSubmit} className="space-y-6">
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

            {/* Submit Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 sm:space-x-4 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-2 sm:py-3 px-4 sm:px-6 rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg text-sm sm:text-base"
              >
                {loading ? t('creating') : t('create_function')}
              </button>
              <Link
                href="/dashboard/functions"
                className="flex-1 bg-gray-100 text-gray-700 py-2 sm:py-3 px-4 sm:px-6 rounded-xl hover:bg-gray-200 transition-colors duration-200 font-medium text-center text-sm sm:text-base"
              >
                {t('cancel')}
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
