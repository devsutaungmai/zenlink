'use client'

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CurrencyDollarIcon,
  ClockIcon,
  HeartIcon,
  GiftIcon,
  MinusIcon,
} from '@heroicons/react/24/outline'

interface SalaryCode {
  id: string
  code: string
  name: string
  description?: string
  category: string
  isActive: boolean
  payRules: any[]
  _count: {
    payRules: number
  }
}

interface SalaryCodeFormData {
  code: string
  name: string
  description: string
  category: string
}

export default function SalaryCodeManagement() {
  const { t } = useTranslation()
  const [salaryCodes, setSalaryCodes] = useState<SalaryCode[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingCode, setEditingCode] = useState<SalaryCode | null>(null)
  const [formData, setFormData] = useState<SalaryCodeFormData>({
    code: '',
    name: '',
    description: '',
    category: 'HOURLY',
  })

  const categories = [
    { value: 'HOURLY', label: 'Hourly Wages', icon: ClockIcon },
    { value: 'OVERTIME', label: 'Overtime Pay', icon: CurrencyDollarIcon },
    { value: 'SICK_PAY', label: 'Sick Pay', icon: HeartIcon },
    { value: 'BONUS', label: 'Bonuses', icon: GiftIcon },
    { value: 'DEDUCTION', label: 'Deductions', icon: MinusIcon },
  ]

  useEffect(() => {
    fetchSalaryCodes()
  }, [])

  const fetchSalaryCodes = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/salary-codes')
      const data = await response.json()
      
      if (response.ok) {
        setSalaryCodes(data)
      } else {
        console.error('Error fetching salary codes:', data.error)
      }
    } catch (error) {
      console.error('Error fetching salary codes:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const url = editingCode ? `/api/salary-codes/${editingCode.id}` : '/api/salary-codes'
      const method = editingCode ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        await fetchSalaryCodes()
        setShowForm(false)
        setEditingCode(null)
        setFormData({
          code: '',
          name: '',
          description: '',
          category: 'HOURLY',
        })
      } else {
        const data = await response.json()
        alert(data.error || 'Failed to save salary code')
      }
    } catch (error) {
      console.error('Error saving salary code:', error)
      alert('Failed to save salary code')
    }
  }

  const handleEdit = (code: SalaryCode) => {
    setEditingCode(code)
    setFormData({
      code: code.code,
      name: code.name,
      description: code.description || '',
      category: code.category,
    })
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this salary code?')) {
      return
    }

    try {
      const response = await fetch(`/api/salary-codes/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        await fetchSalaryCodes()
      } else {
        const data = await response.json()
        alert(data.error || 'Failed to delete salary code')
      }
    } catch (error) {
      console.error('Error deleting salary code:', error)
      alert('Failed to delete salary code')
    }
  }

  const getCategoryIcon = (category: string) => {
    const categoryConfig = categories.find(c => c.value === category)
    const IconComponent = categoryConfig?.icon || CurrencyDollarIcon
    return IconComponent
  }

  const getCategoryLabel = (category: string) => {
    return categories.find(c => c.value === category)?.label || category
  }

  const getCategoryColor = (category: string) => {
    const colors = {
      HOURLY: 'bg-blue-100 text-blue-800',
      OVERTIME: 'bg-orange-100 text-orange-800',
      SICK_PAY: 'bg-red-100 text-red-800',
      BONUS: 'bg-green-100 text-green-800',
      DEDUCTION: 'bg-gray-100 text-gray-800',
    }
    return colors[category as keyof typeof colors] || 'bg-gray-100 text-gray-800'
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
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
              Salary Code Management
            </h1>
            <p className="mt-2 text-gray-600">
              Manage salary codes for different types of pay and accounting integration
            </p>
          </div>
          <button
            onClick={() => {
              setEditingCode(null)
              setFormData({
                code: '',
                name: '',
                description: '',
                category: 'HOURLY',
              })
              setShowForm(true)
            }}
            className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-[#31BCFF] to-[#0EA5E9] text-white font-medium rounded-xl hover:from-[#31BCFF]/90 hover:to-[#0EA5E9]/90 focus:outline-none focus:ring-2 focus:ring-[#31BCFF]/50 transform hover:scale-105 transition-all duration-200 shadow-lg"
          >
            <PlusIcon className="w-5 h-5 mr-2" />
            Add Salary Code
          </button>
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {editingCode ? 'Edit Salary Code' : 'Add New Salary Code'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#31BCFF] focus:outline-none"
                  placeholder="e.g., 120, 1203"
                  required
                  disabled={!!editingCode} // Don't allow editing code once created
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#31BCFF] focus:outline-none"
                  placeholder="e.g., Hourly Wages"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#31BCFF] focus:outline-none"
                  required
                >
                  {categories.map((category) => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#31BCFF] focus:outline-none"
                  placeholder="Optional description"
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false)
                    setEditingCode(null)
                  }}
                  className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-[#31BCFF] text-white rounded-xl hover:bg-[#31BCFF]/90 font-medium"
                >
                  {editingCode ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Salary Codes List */}
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 shadow-lg overflow-hidden">
        {salaryCodes.length === 0 ? (
          <div className="p-12 text-center">
            <CurrencyDollarIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Salary Codes</h3>
            <p className="text-gray-500 mb-6">Get started by creating your first salary code</p>
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center px-6 py-3 bg-[#31BCFF] text-white font-medium rounded-xl hover:bg-[#31BCFF]/90"
            >
              <PlusIcon className="w-5 h-5 mr-2" />
              Add First Salary Code
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50/80">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Code
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pay Rules
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200/50">
                {salaryCodes.map((code) => {
                  const IconComponent = getCategoryIcon(code.category)
                  return (
                    <tr key={code.id} className="hover:bg-blue-50/30 transition-colors duration-200">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{code.code}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{code.name}</div>
                        {code.description && (
                          <div className="text-sm text-gray-500">{code.description}</div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <IconComponent className="w-4 h-4 text-gray-400 mr-2" />
                          <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(code.category)}`}>
                            {getCategoryLabel(code.category)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{code._count.payRules} rules</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                          code.isActive 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {code.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => handleEdit(code)}
                            className="p-2 text-gray-400 hover:text-[#31BCFF] hover:bg-blue-50 rounded-lg transition-all duration-200"
                            title="Edit"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(code.id)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                            title="Delete"
                            disabled={code._count.payRules > 0}
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
