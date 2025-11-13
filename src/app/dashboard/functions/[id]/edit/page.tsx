'use client'

import { use, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
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

interface Function {
  id: string
  name: string
  color?: string | null
  categoryId: string
  category: Category
}

export default function EditFunctionPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const resolvedParams = use(params)
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
    fetchFunction()
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

  const fetchFunction = async () => {
    try {
      const response = await fetch(`/api/functions/${resolvedParams.id}`)
      if (response.ok) {
        const data: Function = await response.json()
        setFormData({
          name: data.name,
          color: data.color || '#3B82F6',
          categoryId: data.categoryId
        })
      } else {
        await Swal.fire({
          title: t('error'),
          text: t('function_not_found'),
          icon: 'error',
          confirmButtonColor: '#31BCFF'
        })
        router.push('/dashboard/functions')
      }
    } catch (error) {
      console.error('Error fetching function:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      await Swal.fire({
        title: t('error'),
        text: t('name_required'),
        icon: 'error',
        confirmButtonColor: '#31BCFF'
      })
      return
    }

    if (!formData.categoryId) {
      await Swal.fire({
        title: t('error'),
        text: t('category_required'),
        icon: 'error',
        confirmButtonColor: '#31BCFF'
      })
      return
    }

    setLoading(true)

    try {
      const response = await fetch(`/api/functions/${resolvedParams.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        await Swal.fire({
          title: t('success'),
          text: t('update_success'),
          icon: 'success',
          confirmButtonColor: '#31BCFF'
        })
        router.push('/dashboard/functions')
      } else {
        const error = await response.json()
        await Swal.fire({
          title: t('error'),
          text: error.error || t('update_error'),
          icon: 'error',
          confirmButtonColor: '#31BCFF'
        })
      }
    } catch (error) {
      console.error('Error updating function:', error)
      await Swal.fire({
        title: t('error'),
        text: t('update_error'),
        icon: 'error',
        confirmButtonColor: '#31BCFF'
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
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
              {t('edit_function')}
            </h1>
            <p className="mt-2 text-gray-600">
              {t('edit_description')}
            </p>
            {formData.name && (
              <div className="mt-3 flex items-center text-sm text-gray-500">
                <div className="w-2 h-2 bg-[#31BCFF] rounded-full mr-2"></div>
                Editing: {formData.name}
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

      {/* Form Container */}
      <div className="bg-white/80 p-3 backdrop-blur-xl rounded-2xl border border-gray-200/50 shadow-lg">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Function Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              {t('name_label')} *
            </label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#31BCFF]/50 focus:border-[#31BCFF] transition-all duration-200"
              placeholder={t('name_placeholder')}
              required
            />
            <p className="mt-1 text-sm text-gray-500">
              {t('name_helper')}
            </p>
          </div>

          {/* Category */}
          <div>
            <label htmlFor="categoryId" className="block text-sm font-medium text-gray-700 mb-2">
              {t('category_label')} *
            </label>
            <select
              id="categoryId"
              value={formData.categoryId}
              onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#31BCFF]/50 focus:border-[#31BCFF] transition-all duration-200"
              required
            >
              <option value="">Select a category</option>
              {categories.map((category) => {
                const deptNames = category.departments && category.departments.length > 0
                  ? category.departments.map((cd: any) => cd.department.name).join(', ')
                  : 'Business-Wide';
                
                return (
                  <option key={category.id} value={category.id}>
                    {category.name} ({deptNames})
                  </option>
                );
              })}
            </select>
            <p className="mt-1 text-sm text-gray-500">
              {t('category_helper')}
            </p>
          </div>

          {/* Color */}
          <div>
            <label htmlFor="color" className="block text-sm font-medium text-gray-700 mb-2">
              {t('color_label')}
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
                className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#31BCFF]/50 focus:border-[#31BCFF] transition-all duration-200"
                placeholder="#31BCFF"
              />
            </div>
            <p className="mt-1 text-sm text-gray-500">
              {t('color_helper')}
            </p>
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
              {loading ? t('updating') : t('update_function')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
