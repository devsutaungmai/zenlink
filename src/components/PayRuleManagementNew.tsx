'use client'

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ClockIcon,
  CurrencyDollarIcon,
  UserGroupIcon,
  CogIcon,
} from '@heroicons/react/24/outline'
import OvertimeRuleManagement from './OvertimeRuleManagement'

interface PayRule {
  id: string
  name: string
  description?: string
  ruleType: string
  isActive: boolean
  salaryCode: {
    id: string
    code: string
    name: string
    category: string
  }
  overtimeRule?: {
    triggerAfterHours: number
    rateMultiplier: number
    isDaily: boolean
    maxHoursPerDay?: number
    maxHoursPerWeek?: number
  }
  employeeGroupPayRules: Array<{
    id: string
    baseRate: number
    isDefault: boolean
    employeeGroup: {
      id: string
      name: string
    }
  }>
  employeePayRules?: Array<{
    id: string
    customRate: number
    employee: {
      id: string
      firstName: string
      lastName: string
      employeeNo?: string
    }
  }>
  _count: {
    employeeGroupPayRules: number
    employeePayRules: number
  }
}

interface SalaryCode {
  id: string
  code: string
  name: string
  category: string
}

interface EmployeeGroup {
  id: string
  name: string
}

interface PayRuleFormData {
  name: string
  description: string
  ruleType: string
  salaryCodeId: string
  overtimeRule?: {
    triggerAfterHours: number
    rateMultiplier: number
    isDaily: boolean
    maxHoursPerDay?: number
    maxHoursPerWeek?: number
  }
  employeeGroupRules: Array<{
    employeeGroupId: string
    baseRate: number
    isDefault: boolean
  }>
}

export default function PayRuleManagement() {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<'pay-rules' | 'overtime-rules'>('pay-rules')
  const [payRules, setPayRules] = useState<PayRule[]>([])
  const [salaryCodes, setSalaryCodes] = useState<SalaryCode[]>([])
  const [employeeGroups, setEmployeeGroups] = useState<EmployeeGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingRule, setEditingRule] = useState<PayRule | null>(null)
  const [formData, setFormData] = useState<PayRuleFormData>({
    name: '',
    description: '',
    ruleType: 'REGULAR',
    salaryCodeId: '',
    employeeGroupRules: [],
  })

  const tabs = [
    { id: 'pay-rules', name: 'Pay Rules', icon: CurrencyDollarIcon },
    { id: 'overtime-rules', name: 'Overtime Rules', icon: ClockIcon },
  ]

  const ruleTypes = [
    { value: 'REGULAR', label: 'Regular Pay', icon: CurrencyDollarIcon },
    { value: 'OVERTIME', label: 'Overtime Pay', icon: ClockIcon },
    { value: 'SICK_PAY', label: 'Sick Pay', icon: UserGroupIcon },
  ]

  useEffect(() => {
    if (activeTab === 'pay-rules') {
      Promise.all([
        fetchPayRules(),
        fetchSalaryCodes(),
        fetchEmployeeGroups(),
      ])
    }
  }, [activeTab])

  const fetchPayRules = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/pay-rules')
      const data = await response.json()
      
      if (response.ok) {
        setPayRules(data)
      } else {
        console.error('Error fetching pay rules:', data.error)
      }
    } catch (error) {
      console.error('Error fetching pay rules:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchSalaryCodes = async () => {
    try {
      const response = await fetch('/api/salary-codes?isActive=true')
      const data = await response.json()
      
      if (response.ok) {
        setSalaryCodes(data.salaryCodes || [])
      }
    } catch (error) {
      console.error('Error fetching salary codes:', error)
    }
  }

  const fetchEmployeeGroups = async () => {
    try {
      const response = await fetch('/api/employee-groups')
      const data = await response.json()
      
      if (response.ok) {
        setEmployeeGroups(data)
      }
    } catch (error) {
      console.error('Error fetching employee groups:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const url = editingRule ? `/api/pay-rules/${editingRule.id}` : '/api/pay-rules'
      const method = editingRule ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        await fetchPayRules()
        setShowForm(false)
        setEditingRule(null)
        resetForm()
      } else {
        const data = await response.json()
        alert(data.error || 'Failed to save pay rule')
      }
    } catch (error) {
      console.error('Error saving pay rule:', error)
      alert('Failed to save pay rule')
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      ruleType: 'REGULAR',
      salaryCodeId: '',
      employeeGroupRules: [],
    })
  }

  const handleEdit = (rule: PayRule) => {
    setEditingRule(rule)
    setFormData({
      name: rule.name,
      description: rule.description || '',
      ruleType: rule.ruleType,
      salaryCodeId: rule.salaryCode.id,
      overtimeRule: rule.overtimeRule,
      employeeGroupRules: rule.employeeGroupPayRules.map(egpr => ({
        employeeGroupId: egpr.employeeGroup.id,
        baseRate: egpr.baseRate,
        isDefault: egpr.isDefault,
      })),
    })
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this pay rule?')) {
      return
    }

    try {
      const response = await fetch(`/api/pay-rules/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        await fetchPayRules()
      } else {
        const data = await response.json()
        alert(data.error || 'Failed to delete pay rule')
      }
    } catch (error) {
      console.error('Error deleting pay rule:', error)
      alert('Failed to delete pay rule')
    }
  }

  const addEmployeeGroupRule = () => {
    setFormData(prev => ({
      ...prev,
      employeeGroupRules: [
        ...prev.employeeGroupRules,
        { employeeGroupId: '', baseRate: 0, isDefault: true },
      ],
    }))
  }

  const removeEmployeeGroupRule = (index: number) => {
    setFormData(prev => ({
      ...prev,
      employeeGroupRules: prev.employeeGroupRules.filter((_, i) => i !== index),
    }))
  }

  const updateEmployeeGroupRule = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      employeeGroupRules: prev.employeeGroupRules.map((rule, i) => 
        i === index ? { ...rule, [field]: value } : rule
      ),
    }))
  }

  const getRuleTypeIcon = (ruleType: string) => {
    const typeConfig = ruleTypes.find(t => t.value === ruleType)
    return typeConfig?.icon || CurrencyDollarIcon
  }

  const getRuleTypeLabel = (ruleType: string) => {
    return ruleTypes.find(t => t.value === ruleType)?.label || ruleType
  }

  if (loading && activeTab === 'pay-rules') {
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
              Pay Rules & Overtime Management
            </h1>
            <p className="mt-2 text-gray-600">
              Configure pay rules, overtime rates, and wage calculations for employee groups
            </p>
          </div>
          {activeTab === 'pay-rules' && (
            <button
              onClick={() => {
                setEditingRule(null)
                resetForm()
                setShowForm(true)
              }}
              className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-[#31BCFF] to-[#0EA5E9] text-white font-medium rounded-xl hover:from-[#31BCFF]/90 hover:to-[#0EA5E9]/90 focus:outline-none focus:ring-2 focus:ring-[#31BCFF]/50 transform hover:scale-105 transition-all duration-200 shadow-lg"
            >
              <PlusIcon className="w-5 h-5 mr-2" />
              Add Pay Rule
            </button>
          )}
        </div>
        
        {/* Tabs */}
        <div className="mt-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => {
              const IconComponent = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as 'pay-rules' | 'overtime-rules')}
                  className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                    activeTab === tab.id
                      ? 'border-[#31BCFF] text-[#31BCFF]'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <IconComponent className="w-5 h-5 mr-2" />
                  {tab.name}
                </button>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'pay-rules' ? (
        <>
          {/* Form Modal */}
          {showForm && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
              <div className="bg-white rounded-2xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  {editingRule ? 'Edit Pay Rule' : 'Add New Pay Rule'}
                </h2>
                
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Basic Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Rule Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#31BCFF] focus:outline-none"
                        placeholder="e.g., Standard Overtime"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Rule Type <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={formData.ruleType}
                        onChange={(e) => setFormData(prev => ({ ...prev, ruleType: e.target.value }))}
                        className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#31BCFF] focus:outline-none"
                        required
                      >
                        {ruleTypes.map((type) => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Salary Code <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.salaryCodeId}
                      onChange={(e) => setFormData(prev => ({ ...prev, salaryCodeId: e.target.value }))}
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#31BCFF] focus:outline-none"
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
                      rows={2}
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#31BCFF] focus:outline-none"
                      placeholder="Optional description"
                    />
                  </div>

                  {/* Employee Group Rules */}
                  <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-medium text-gray-900">Employee Group Rates</h3>
                      <button
                        type="button"
                        onClick={addEmployeeGroupRule}
                        className="inline-flex items-center px-3 py-2 bg-[#31BCFF] text-white text-sm font-medium rounded-lg hover:bg-[#31BCFF]/90"
                      >
                        <PlusIcon className="w-4 h-4 mr-1" />
                        Add Group
                      </button>
                    </div>

                    {formData.employeeGroupRules.length === 0 ? (
                      <p className="text-gray-600 text-sm">
                        No employee groups configured. Add groups to set default rates.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {formData.employeeGroupRules.map((rule, index) => (
                          <div key={index} className="flex items-center space-x-3 bg-white rounded-lg p-3">
                            <select
                              value={rule.employeeGroupId}
                              onChange={(e) => updateEmployeeGroupRule(index, 'employeeGroupId', e.target.value)}
                              className="flex-1 px-3 py-2 rounded-lg border-2 border-gray-200 focus:border-[#31BCFF] focus:outline-none"
                              required
                            >
                              <option value="">Select employee group</option>
                              {employeeGroups.map((group) => (
                                <option key={group.id} value={group.id}>
                                  {group.name}
                                </option>
                              ))}
                            </select>
                            
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={rule.baseRate}
                              onChange={(e) => updateEmployeeGroupRule(index, 'baseRate', parseFloat(e.target.value) || 0)}
                              placeholder="Base rate"
                              className="w-32 px-3 py-2 rounded-lg border-2 border-gray-200 focus:border-[#31BCFF] focus:outline-none"
                              required
                            />
                            
                            <button
                              type="button"
                              onClick={() => removeEmployeeGroupRule(index)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
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
                      className="flex-1 px-4 py-3 bg-[#31BCFF] text-white rounded-xl hover:bg-[#31BCFF]/90 font-medium"
                    >
                      {editingRule ? 'Update' : 'Create'} Pay Rule
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Pay Rules List */}
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 shadow-lg overflow-hidden">
            {payRules.length === 0 ? (
              <div className="p-12 text-center">
                <CogIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Pay Rules</h3>
                <p className="text-gray-500 mb-6">Create pay rules to manage wages and overtime calculations</p>
                <button
                  onClick={() => setShowForm(true)}
                  className="inline-flex items-center px-6 py-3 bg-[#31BCFF] text-white font-medium rounded-xl hover:bg-[#31BCFF]/90"
                >
                  <PlusIcon className="w-5 h-5 mr-2" />
                  Add First Pay Rule
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
                        Type
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Salary Code
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Groups
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
                    {payRules.map((rule) => {
                      const IconComponent = getRuleTypeIcon(rule.ruleType)
                      return (
                        <tr key={rule.id} className="hover:bg-blue-50/30 transition-colors duration-200">
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-gray-900">{rule.name}</div>
                            {rule.description && (
                              <div className="text-sm text-gray-500">{rule.description}</div>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center">
                              <IconComponent className="w-4 h-4 text-gray-400 mr-2" />
                              <span className="text-sm text-gray-900">{getRuleTypeLabel(rule.ruleType)}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900">{rule.salaryCode.code}</div>
                            <div className="text-sm text-gray-500">{rule.salaryCode.name}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900">
                              {rule._count.employeeGroupPayRules} groups
                            </div>
                            {rule._count.employeePayRules > 0 && (
                              <div className="text-sm text-gray-500">
                                {rule._count.employeePayRules} custom rates
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                              rule.isActive 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {rule.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end space-x-2">
                              <button
                                onClick={() => handleEdit(rule)}
                                className="p-2 text-gray-400 hover:text-[#31BCFF] hover:bg-blue-50 rounded-lg transition-all duration-200"
                                title="Edit"
                              >
                                <PencilIcon className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(rule.id)}
                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                                title="Delete"
                                disabled={rule._count.employeePayRules > 0}
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
        </>
      ) : (
        <>
          {/* Overtime Rules Content */}
          <OvertimeRuleManagement />
        </>
      )}
    </div>
  )
}
