'use client'

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ClockIcon,
  CurrencyDollarIcon,
} from '@heroicons/react/24/outline'

interface OvertimeRule {
  id: string
  triggerAfterHours: number
  rateMultiplier: number
  maxHoursPerDay?: number
  isDaily: boolean
  payRule: {
    id: string
    name: string
    description?: string
    isActive: boolean
    salaryCode: {
      id: string
      code: string
      name: string
    }
  }
}

interface OvertimeRuleFormData {
  name: string
  description: string
  hoursThreshold: number
  multiplier: number
  maxOvertimeHours: number | null
  salaryCodeId: string
}

interface SalaryCode {
  id: string
  code: string
  name: string
  category: string
}

export default function OvertimeRuleManagement() {
  const { t } = useTranslation()
  const [overtimeRules, setOvertimeRules] = useState<OvertimeRule[]>([])
  const [salaryCodes, setSalaryCodes] = useState<SalaryCode[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingRule, setEditingRule] = useState<OvertimeRule | null>(null)
  const [formData, setFormData] = useState<OvertimeRuleFormData>({
    name: '',
    description: '',
    hoursThreshold: 40,
    multiplier: 1.5,
    maxOvertimeHours: null,
    salaryCodeId: '',
  })

  useEffect(() => {
    fetchOvertimeRules()
    fetchSalaryCodes()
  }, [])

  const fetchOvertimeRules = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/overtime-rules')
      const data = await response.json()
      
      if (response.ok) {
        setOvertimeRules(data)
      } else {
        console.error('Error fetching overtime rules:', data.error)
      }
    } catch (error) {
      console.error('Error fetching overtime rules:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchSalaryCodes = async () => {
    try {
      const response = await fetch('/api/salary-codes')
      const data = await response.json()
      
      if (response.ok) {
        // Filter to show only OVERTIME category salary codes
        const overtimeCodes = data.filter((code: SalaryCode) => 
          code.category === 'OVERTIME' || code.category === 'HOURLY'
        )
        setSalaryCodes(overtimeCodes)
      } else {
        console.error('Error fetching salary codes:', data.error)
      }
    } catch (error) {
      console.error('Error fetching salary codes:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const url = editingRule ? `/api/overtime-rules/${editingRule.id}` : '/api/overtime-rules'
      const method = editingRule ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          maxOvertimeHours: formData.maxOvertimeHours || null,
        }),
      })

      if (response.ok) {
        await fetchOvertimeRules()
        setShowForm(false)
        setEditingRule(null)
        setFormData({
          name: '',
          description: '',
          hoursThreshold: 40,
          multiplier: 1.5,
          maxOvertimeHours: null,
          salaryCodeId: '',
        })
      } else {
        const data = await response.json()
        alert(data.error || 'Failed to save overtime rule')
      }
    } catch (error) {
      console.error('Error saving overtime rule:', error)
      alert('Failed to save overtime rule')
    }
  }

  const handleEdit = (rule: OvertimeRule) => {
    setEditingRule(rule)
    setFormData({
      name: rule.payRule.name,
      description: rule.payRule.description || '',
      hoursThreshold: rule.triggerAfterHours,
      multiplier: rule.rateMultiplier,
      maxOvertimeHours: rule.maxHoursPerDay || null,
      salaryCodeId: rule.payRule.salaryCode.id,
    })
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this overtime rule?')) {
      return
    }

    try {
      const response = await fetch(`/api/overtime-rules/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        await fetchOvertimeRules()
      } else {
        const data = await response.json()
        alert(data.error || 'Failed to delete overtime rule')
      }
    } catch (error) {
      console.error('Error deleting overtime rule:', error)
      alert('Failed to delete overtime rule')
    }
  }

  const toggleActive = async (id: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/overtime-rules/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive: !isActive }),
      })

      if (response.ok) {
        await fetchOvertimeRules()
      } else {
        const data = await response.json()
        alert(data.error || 'Failed to update overtime rule')
      }
    } catch (error) {
      console.error('Error updating overtime rule:', error)
      alert('Failed to update overtime rule')
    }
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
      <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-2xl p-6 border border-orange-100">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
              Overtime Rules Management
            </h1>
            <p className="mt-2 text-gray-600">
              Configure overtime rules and multipliers for different scenarios
            </p>
          </div>
          <button
            onClick={() => {
              setEditingRule(null)
              setFormData({
                name: '',
                description: '',
                hoursThreshold: 40,
                multiplier: 1.5,
                maxOvertimeHours: null,
                salaryCodeId: '',
              })
              setShowForm(true)
            }}
            className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-medium rounded-xl hover:from-orange-600 hover:to-amber-600 focus:outline-none focus:ring-2 focus:ring-orange-500/50 transform hover:scale-105 transition-all duration-200 shadow-lg"
          >
            <PlusIcon className="w-5 h-5 mr-2" />
            Add Overtime Rule
          </button>
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {editingRule ? 'Edit Overtime Rule' : 'Add New Overtime Rule'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rule Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-orange-500 focus:outline-none"
                  placeholder="e.g., Standard Overtime"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Hours Threshold <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  step="0.5"
                  value={formData.hoursThreshold}
                  onChange={(e) => setFormData(prev => ({ ...prev, hoursThreshold: parseFloat(e.target.value) }))}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-orange-500 focus:outline-none"
                  placeholder="40"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Overtime kicks in after this many hours</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Overtime Multiplier <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  step="0.1"
                  value={formData.multiplier}
                  onChange={(e) => setFormData(prev => ({ ...prev, multiplier: parseFloat(e.target.value) }))}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-orange-500 focus:outline-none"
                  placeholder="1.5"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Rate multiplier (e.g., 1.5 = time and a half)</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Overtime Hours
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={formData.maxOvertimeHours || ''}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    maxOvertimeHours: e.target.value ? parseFloat(e.target.value) : null 
                  }))}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-orange-500 focus:outline-none"
                  placeholder="Leave empty for unlimited"
                />
                <p className="text-xs text-gray-500 mt-1">Maximum overtime hours allowed (optional)</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Salary Code <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.salaryCodeId}
                  onChange={(e) => setFormData(prev => ({ ...prev, salaryCodeId: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-orange-500 focus:outline-none"
                  required
                >
                  <option value="">Select a salary code</option>
                  {salaryCodes.map((code) => (
                    <option key={code.id} value={code.id}>
                      {code.code} - {code.name}
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
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-orange-500 focus:outline-none"
                  placeholder="Optional description"
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false)
                    setEditingRule(null)
                  }}
                  className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-orange-500 text-white rounded-xl hover:bg-orange-600 font-medium"
                >
                  {editingRule ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Overtime Rules List */}
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 shadow-lg overflow-hidden">
        {overtimeRules.length === 0 ? (
          <div className="p-12 text-center">
            <ClockIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Overtime Rules</h3>
            <p className="text-gray-500 mb-6">Get started by creating your first overtime rule</p>
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center px-6 py-3 bg-orange-500 text-white font-medium rounded-xl hover:bg-orange-600"
            >
              <PlusIcon className="w-5 h-5 mr-2" />
              Add First Overtime Rule
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50/80">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rule Name
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Threshold
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Multiplier
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Max Hours
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Salary Code
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
                {overtimeRules.map((rule) => (
                  <tr key={rule.id} className="hover:bg-orange-50/30 transition-colors duration-200">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{rule.payRule.name}</div>
                      {rule.payRule.description && (
                        <div className="text-sm text-gray-500">{rule.payRule.description}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <ClockIcon className="w-4 h-4 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-900">{rule.triggerAfterHours}h</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <CurrencyDollarIcon className="w-4 h-4 text-gray-400 mr-2" />
                        <span className="text-sm font-medium text-gray-900">{rule.rateMultiplier}x</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {rule.maxHoursPerDay ? `${rule.maxHoursPerDay}h` : 'Unlimited'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {rule.payRule.salaryCode.code} - {rule.payRule.salaryCode.name}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => toggleActive(rule.id, rule.payRule.isActive)}
                        className={`inline-flex px-2 py-1 rounded-full text-xs font-medium transition-colors duration-200 ${
                          rule.payRule.isActive 
                            ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                            : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                        }`}
                      >
                        {rule.payRule.isActive ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleEdit(rule)}
                          className="p-2 text-gray-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-all duration-200"
                          title="Edit"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(rule.id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                          title="Delete"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
