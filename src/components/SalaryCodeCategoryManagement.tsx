'use client'

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  TagIcon,
} from '@heroicons/react/24/outline'
import Swal from 'sweetalert2'

interface SalaryCodeCategory {
  id: string
  code: string
  name: string
  description?: string
  icon?: string
  color?: string
  sortOrder: number
  isActive: boolean
  _count?: {
    salaryCodes: number
  }
}

interface FormData {
  code: string
  name: string
  description: string
  icon: string
  color: string
  sortOrder: number
}

const colorOptions = [
  { value: 'blue', label: 'Blue', class: 'bg-blue-100 text-blue-800' },
  { value: 'orange', label: 'Orange', class: 'bg-orange-100 text-orange-800' },
  { value: 'purple', label: 'Purple', class: 'bg-purple-100 text-purple-800' },
  { value: 'green', label: 'Green', class: 'bg-green-100 text-green-800' },
  { value: 'gray', label: 'Gray', class: 'bg-gray-100 text-gray-800' },
  { value: 'red', label: 'Red', class: 'bg-red-100 text-red-800' },
]

const iconOptions = [
  { value: 'ClockIcon', key: 'clock' },
  { value: 'CurrencyDollarIcon', key: 'currency' },
  { value: 'HeartIcon', key: 'heart' },
  { value: 'GiftIcon', key: 'gift' },
  { value: 'MinusIcon', key: 'minus' },
]

export default function SalaryCodeCategoryManagement() {
  const { t } = useTranslation('salary-codes')
  const [categories, setCategories] = useState<SalaryCodeCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingCategory, setEditingCategory] = useState<SalaryCodeCategory | null>(null)
  const [formData, setFormData] = useState<FormData>({
    code: '',
    name: '',
    description: '',
    icon: 'ClockIcon',
    color: 'blue',
    sortOrder: 0,
  })

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/salary-code-categories')
      const data = await response.json()
      if (response.ok) {
        setCategories(Array.isArray(data) ? data : [])
      }
    } catch (error) {
      console.error('Error fetching categories:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const url = editingCategory
      ? `/api/salary-code-categories/${editingCategory.id}`
      : '/api/salary-code-categories'
    const method = editingCategory ? 'PUT' : 'POST'

    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        await fetchCategories()
        setShowForm(false)
        setEditingCategory(null)
        setFormData({ code: '', name: '', description: '', icon: 'ClockIcon', color: 'blue', sortOrder: 0 })
        Swal.fire({
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 3000,
          icon: 'success',
          title: editingCategory ? t('categoryManagement.toast.updated') : t('categoryManagement.toast.created')
        })
      } else {
        const data = await response.json()
        Swal.fire({
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 3000,
          icon: 'error',
          title: data.error || t('categoryManagement.toast.saveFailed')
        })
      }
    } catch (error) {
      console.error('Error saving category:', error)
    }
  }

  const handleEdit = (category: SalaryCodeCategory) => {
    setEditingCategory(category)
    setFormData({
      code: category.code,
      name: category.name,
      description: category.description || '',
      icon: category.icon || 'ClockIcon',
      color: category.color || 'blue',
      sortOrder: category.sortOrder,
    })
    setShowForm(true)
  }

  const handleDelete = async (category: SalaryCodeCategory) => {
    const result = await Swal.fire({
      title: t('categoryManagement.toast.deleteConfirmTitle'),
      text: t('categoryManagement.toast.deleteConfirmText'),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: t('delete'),
      cancelButtonText: t('cancel'),
    })

    if (!result.isConfirmed) return

    try {
      const response = await fetch(`/api/salary-code-categories/${category.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        await fetchCategories()
        Swal.fire({
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 3000,
          icon: 'success',
          title: t('categoryManagement.toast.deleted')
        })
      } else {
        const data = await response.json()
        Swal.fire({
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 3000,
          icon: 'error',
          title: data.error || t('categoryManagement.toast.deleteFailed')
        })
      }
    } catch (error) {
      console.error('Error deleting category:', error)
    }
  }

  const getColorClass = (color: string) => {
    return colorOptions.find(c => c.value === color)?.class || 'bg-gray-100 text-gray-800'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#31BCFF]"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">{t('categoryManagement.title')}</h2>
          <p className="text-sm text-gray-500">{t('categoryManagement.subtitle')}</p>
        </div>
        <button
          onClick={() => {
            setEditingCategory(null)
            setFormData({ code: '', name: '', description: '', icon: 'ClockIcon', color: 'blue', sortOrder: categories.length })
            setShowForm(true)
          }}
          className="inline-flex items-center px-4 py-2.5 bg-gradient-to-r from-[#31BCFF] to-[#0EA5E9] text-white font-medium rounded-xl hover:from-[#31BCFF]/90 hover:to-[#0EA5E9]/90 transition-all shadow-lg"
        >
          <PlusIcon className="w-5 h-5 mr-2" />
          {t('categoryManagement.addCategory')}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
          <h3 className="text-lg font-semibold mb-4">
            {editingCategory ? t('categoryManagement.editCategory') : t('categoryManagement.newCategory')}
          </h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('categoryManagement.code')} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 focus:border-[#31BCFF] focus:outline-none"
                placeholder={t('categoryManagement.codePlaceholder')}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('categoryManagement.name')} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 focus:border-[#31BCFF] focus:outline-none"
                placeholder={t('categoryManagement.namePlaceholder')}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('categoryManagement.color')}</label>
              <select
                value={formData.color}
                onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 focus:border-[#31BCFF] focus:outline-none"
              >
                {colorOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{t(`categoryManagement.colors.${opt.value}`)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('categoryManagement.icon')}</label>
              <select
                value={formData.icon}
                onChange={(e) => setFormData(prev => ({ ...prev, icon: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 focus:border-[#31BCFF] focus:outline-none"
              >
                {iconOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{t(`categoryManagement.icons.${opt.key}`)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('categoryManagement.sortOrder')}</label>
              <input
                type="number"
                value={formData.sortOrder}
                onChange={(e) => setFormData(prev => ({ ...prev, sortOrder: parseInt(e.target.value) || 0 }))}
                className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 focus:border-[#31BCFF] focus:outline-none"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('categoryManagement.description')}</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={2}
                className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 focus:border-[#31BCFF] focus:outline-none"
                placeholder={t('categoryManagement.descriptionPlaceholder')}
              />
            </div>
            <div className="md:col-span-2 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-6 py-2.5 text-gray-600 font-medium rounded-xl border-2 border-gray-200 hover:bg-gray-50"
              >
                {t('cancel')}
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 bg-[#31BCFF] text-white font-medium rounded-xl hover:bg-[#31BCFF]/90"
              >
                {editingCategory ? t('update') : t('create')}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">{t('categoryManagement.code')}</th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">{t('categoryManagement.name')}</th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">{t('categoryManagement.color')}</th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">{t('categoryManagement.sortOrder')}</th>
              <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase">{t('actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {categories.map((category) => (
              <tr key={category.id} className="hover:bg-blue-50/30">
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    <TagIcon className="w-4 h-4 text-gray-400 mr-2" />
                    <span className="font-mono text-sm">{category.code}</span>
                  </div>
                </td>
                <td className="px-6 py-4 font-medium text-gray-900">{category.name}</td>
                <td className="px-6 py-4">
                  <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getColorClass(category.color || 'gray')}`}>
                    {category.color || 'gray'}
                  </span>
                </td>
                <td className="px-6 py-4 text-gray-500">{category.sortOrder}</td>
                <td className="px-6 py-4">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => handleEdit(category)}
                      className="p-2 text-gray-500 hover:text-[#31BCFF] hover:bg-blue-50 rounded-lg"
                    >
                      <PencilIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(category)}
                      className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-lg"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {categories.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                  {t('categoryManagement.noCategories')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
