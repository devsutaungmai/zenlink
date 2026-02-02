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
import Swal from 'sweetalert2'

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
  const { t } = useTranslation('pay-rules')
  const [activeTab, setActiveTab] = useState<'pay-rules' | 'overtime-rules'>('pay-rules')
  const [payRules, setPayRules] = useState<PayRule[]>([])
  const [salaryCodes, setSalaryCodes] = useState<SalaryCode[]>([])
  const [employeeGroups, setEmployeeGroups] = useState<EmployeeGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingRule, setEditingRule] = useState<PayRule | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  const filteredPayRules = payRules.filter(rule =>
    rule.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    rule.salaryCode.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    rule.salaryCode.code.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const activeRulesCount = payRules.filter(rule => rule.isActive).length
  const [formData, setFormData] = useState<PayRuleFormData>({
    name: '',
    description: '',
    ruleType: 'REGULAR',
    salaryCodeId: '',
    employeeGroupRules: [],
  })

  const tabs = [
    { id: 'pay-rules', name: t('tabs.payRules'), icon: CurrencyDollarIcon },
    { id: 'overtime-rules', name: t('tabs.overtimeRules'), icon: ClockIcon },
  ]

  const ruleTypes = [
    { value: 'REGULAR', label: 'Regular Pay', icon: CurrencyDollarIcon },
    { value: 'OVERTIME', label: 'Overtime Pay', icon: ClockIcon },
    { value: 'SICK_PAY', label: 'Sick Pay', icon: UserGroupIcon },
  ]

  useEffect(() => {
    Promise.all([
      fetchPayRules(),
      fetchSalaryCodes(),
      fetchEmployeeGroups(),
    ])
  }, [])

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
        Swal.fire({
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 3000,
          timerProgressBar: true,
          icon: 'error',
          title: data.error || t('toast.saveFailed')
        })
      }
    } catch (error) {
      console.error('Error saving pay rule:', error)
      Swal.fire({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        icon: 'error',
        title: t('toast.saveFailed')
      })
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
    const result = await Swal.fire({
      title: t('toast.deleteConfirmTitle'),
      text: t('toast.deleteConfirmText'),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: t('toast.deleteConfirmButton'),
      cancelButtonText: t('toast.cancelButton')
    })

    if (!result.isConfirmed) {
      return
    }

    try {
      const response = await fetch(`/api/pay-rules/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        await fetchPayRules()
        Swal.fire({
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 3000,
          timerProgressBar: true,
          icon: 'success',
          title: t('toast.deleteSuccess')
        })
      } else {
        const data = await response.json()
        Swal.fire({
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 3000,
          timerProgressBar: true,
          icon: 'error',
          title: data.error || t('toast.deleteFailed')
        })
      }
    } catch (error) {
      console.error('Error deleting pay rule:', error)
      Swal.fire({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        icon: 'error',
        title: t('toast.deleteFailed')
      })
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
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-4 sm:p-6 border border-blue-100">
        <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
              {t('title')} <span className="hidden sm:inline">{t('overtimeManagementSuffix')}</span>

            </h1>
            <p className="mt-2 text-sm sm:text-base text-gray-600">
              {t('subtitle')}
            </p>
          </div>
          {activeTab === 'pay-rules' && (
            <button
              onClick={() => {
                setEditingRule(null)
                resetForm()
                setShowForm(true)
              }}
              className="w-full lg:w-auto inline-flex items-center justify-center px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-[#31BCFF] to-[#0EA5E9] text-white text-sm sm:text-base font-medium rounded-xl hover:from-[#31BCFF]/90 hover:to-[#0EA5E9]/90 focus:outline-none focus:ring-2 focus:ring-[#31BCFF]/50 transform hover:scale-105 transition-all duration-200 shadow-lg"
            >
              <PlusIcon className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
              <span className="sm:hidden">{t('addRule')}</span>
              <span className="hidden sm:inline">{t('addPayRule')}</span>
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="mt-4 sm:mt-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-4 sm:space-x-8 overflow-x-auto">
            {tabs.map((tab) => {
              const IconComponent = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as 'pay-rules' | 'overtime-rules')}
                  className={`flex items-center py-2 px-1 border-b-2 font-medium text-xs sm:text-sm transition-colors duration-200 whitespace-nowrap ${activeTab === tab.id
                      ? 'border-[#31BCFF] text-[#31BCFF]'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                >
                  <IconComponent className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" />
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
          {/* Pay Rules Content */}
          {/* Stats and Search */}
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 shadow-lg p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex gap-4 sm:gap-6">
                <div>
                  <p className="text-xs sm:text-sm text-gray-500">{t('stats.totalRules')}</p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900">{payRules.length}</p>
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-gray-500">{t('stats.activeRules')}</p>
                  <p className="text-xl sm:text-2xl font-bold text-green-600">{activeRulesCount}</p>
                </div>
              </div>
              <div className="flex-1 max-w-md">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={t('searchPlaceholder')}
                  className="w-full px-4 py-2 text-sm rounded-xl border-2 border-gray-200 focus:border-[#31BCFF] focus:outline-none"
                />
              </div>
            </div>
            {searchTerm && (
              <p className="mt-3 text-xs sm:text-sm text-gray-500">
                {t('showing', { count: filteredPayRules.length, total: payRules.length })}
              </p>
            )}
          </div>

          {/* Form Modal */}
          {showForm && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl p-4 sm:p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">
                  {editingRule ? t('form.editPayRule') : t('form.addNewPayRule')}
                </h2>

                <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                  {/* Basic Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                        {t('form.ruleName')} <span className="text-red-500">{t('form.required')}</span>
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base rounded-xl border-2 border-gray-200 focus:border-[#31BCFF] focus:outline-none"
                        placeholder={t('form.ruleNamePlaceholder')}
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                        {t('form.ruleType')} <span className="text-red-500">{t('form.required')}</span>
                      </label>
                      <select
                        value={formData.ruleType}
                        onChange={(e) => setFormData(prev => ({ ...prev, ruleType: e.target.value }))}
                        className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base rounded-xl border-2 border-gray-200 focus:border-[#31BCFF] focus:outline-none"
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
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                      {t('form.salaryCode')} <span className="text-red-500">{t('form.required')}</span>
                    </label>
                    <select
                      value={formData.salaryCodeId}
                      onChange={(e) => setFormData(prev => ({ ...prev, salaryCodeId: e.target.value }))}
                      className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base rounded-xl border-2 border-gray-200 focus:border-[#31BCFF] focus:outline-none"
                      required
                    >
                      <option value="">{t('form.selectSalaryCode')}</option>
                      {salaryCodes.map((code) => (
                        <option key={code.id} value={code.id}>
                          {code.code} - {code.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                      {t('form.description')}
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      rows={2}
                      className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base rounded-xl border-2 border-gray-200 focus:border-[#31BCFF] focus:outline-none"
                      placeholder={t('form.descriptionPlaceholder')}
                    />
                  </div>

                  {/* Overtime Rule Configuration */}
                  {formData.ruleType === 'OVERTIME' && (
                    <div className="bg-orange-50 rounded-xl p-3 sm:p-4 border border-orange-200">
                      <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-3 sm:mb-4">{t('overtimeConfig.title')}</h3>


                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                        <div>
                          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                            {t('overtimeConfig.triggerAfterHours')} <span className="text-red-500">{t('form.required')}</span>
                          </label>
                          <input
                            type="number"
                            step="0.25"
                            min="0"
                            value={formData.overtimeRule?.triggerAfterHours || 8}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              overtimeRule: {
                                ...prev.overtimeRule,
                                triggerAfterHours: parseFloat(e.target.value),
                                rateMultiplier: prev.overtimeRule?.rateMultiplier || 1.5,
                                isDaily: prev.overtimeRule?.isDaily ?? true,
                              }
                            }))}
                            className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base rounded-xl border-2 border-gray-200 focus:border-[#31BCFF] focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                            {t('overtimeConfig.rateMultiplier')} <span className="text-red-500">{t('form.required')}</span>
                          </label>
                          <input
                            type="number"
                            step="0.1"
                            min="1"
                            value={formData.overtimeRule?.rateMultiplier || 1.5}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              overtimeRule: {
                                ...prev.overtimeRule,
                                triggerAfterHours: prev.overtimeRule?.triggerAfterHours || 8,
                                rateMultiplier: parseFloat(e.target.value),
                                isDaily: prev.overtimeRule?.isDaily ?? true,
                              }
                            }))}
                            className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base rounded-xl border-2 border-gray-200 focus:border-[#31BCFF] focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="mt-3 sm:mt-4">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={formData.overtimeRule?.isDaily ?? true}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              overtimeRule: {
                                ...prev.overtimeRule,
                                triggerAfterHours: prev.overtimeRule?.triggerAfterHours || 8,
                                rateMultiplier: prev.overtimeRule?.rateMultiplier || 1.5,
                                isDaily: e.target.checked,
                              }
                            }))}
                            className="rounded border-gray-300 text-[#31BCFF] focus:ring-[#31BCFF]"
                          />
                          <span className="ml-2 text-xs sm:text-sm text-gray-700">
                            {t('overtimeConfig.calculateDaily')}
                          </span>
                        </label>
                      </div>
                    </div>
                  )}

                  {/* Employee Group Rules */}
                  <div className="bg-blue-50 rounded-xl p-3 sm:p-4 border border-blue-200">
                    <div className="flex items-center justify-between mb-3 sm:mb-4">
                      <h3 className="text-base sm:text-lg font-medium text-gray-900">{t('employeeGroupRates.title')}</h3>
                      <button
                        type="button"
                        onClick={addEmployeeGroupRule}
                        className="inline-flex items-center px-2.5 sm:px-3 py-1.5 sm:py-2 bg-[#31BCFF] text-white text-xs sm:text-sm font-medium rounded-lg hover:bg-[#31BCFF]/90"
                      >
                        <PlusIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1" />
                        {t('employeeGroupRates.addGroup')}
                      </button>
                    </div>

                    {formData.employeeGroupRules.length === 0 ? (
                      <p className="text-gray-600 text-xs sm:text-sm">
                        {t('employeeGroupRates.noGroups')}
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {formData.employeeGroupRules.map((rule, index) => (
                          <div key={index} className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 bg-white rounded-lg p-3">
                            <select
                              value={rule.employeeGroupId}
                              onChange={(e) => updateEmployeeGroupRule(index, 'employeeGroupId', e.target.value)}
                              className="w-full sm:flex-1 px-3 py-2 text-sm rounded-lg border-2 border-gray-200 focus:border-[#31BCFF] focus:outline-none"
                              required
                            >
                              <option value="">{t('employeeGroupRates.selectEmployeeGroup')}</option>
                              {employeeGroups.map((group) => (
                                <option key={group.id} value={group.id}>
                                  {group.name}
                                </option>
                              ))}
                            </select>

                            <div className="flex items-center space-x-2 w-full sm:w-auto">
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={rule.baseRate}
                                onChange={(e) => updateEmployeeGroupRule(index, 'baseRate', parseFloat(e.target.value) || 0)}
                                placeholder={t('employeeGroupRates.baseRatePlaceholder')}
                                className="flex-1 sm:w-32 px-3 py-2 text-sm rounded-lg border-2 border-gray-200 focus:border-[#31BCFF] focus:outline-none"
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
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowForm(false)
                        setEditingRule(null)
                      }}
                      className="w-full sm:flex-1 px-4 py-2.5 sm:py-3 bg-gray-100 text-gray-700 text-sm sm:text-base rounded-xl hover:bg-gray-200 font-medium"
                    >
                      {t('buttons.cancel')}
                    </button>
                    <button
                      type="submit"
                      className="w-full sm:flex-1 px-4 py-2.5 sm:py-3 bg-[#31BCFF] text-white text-sm sm:text-base rounded-xl hover:bg-[#31BCFF]/90 font-medium"
                    >
                      {editingRule ? t('buttons.update') : t('buttons.create')} {t('addPayRule')}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Pay Rules List */}
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 shadow-lg overflow-hidden">
            {filteredPayRules.length === 0 ? (
              <div className="p-8 sm:p-12 text-center">
                <CogIcon className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">{t('emptyState.title')}</h3>
                <p className="text-sm sm:text-base text-gray-500 mb-6">{t('emptyState.description')}</p>
                <button
                  onClick={() => setShowForm(true)}
                  className="inline-flex items-center px-4 sm:px-6 py-2.5 sm:py-3 bg-[#31BCFF] text-white text-sm sm:text-base font-medium rounded-xl hover:bg-[#31BCFF]/90"
                >
                  <PlusIcon className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                  {t('emptyState.addFirstPayRule')}

                </button>
              </div>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="hidden lg:block overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50/80">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t('table.ruleName')}
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t('table.type')}
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t('table.salaryCode')}
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t('table.groups')}
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t('table.status')}
                        </th>
                        <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t('table.actions')}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200/50">
                      {filteredPayRules.map((rule) => {
                        const IconComponent = getRuleTypeIcon(rule.ruleType)
                        return (
                          <tr key={rule.id} className="hover:bg-blue-50/30 transition-colors duration-200">
                            <td className="px-6 py-4">
                              <div className="text-sm font-medium text-gray-900">{rule.name}</div>
                              {rule.description && (
                                <div className="text-sm text-gray-500">{rule.description}</div>
                              )}
                              {rule.overtimeRule && (
                                <div className="text-xs text-orange-600 mt-1">
                                  {/* Overtime after {rule.overtimeRule.triggerAfterHours}h @ {rule.overtimeRule.rateMultiplier}x rate */}
                                  {t('table.overtimeAfter')} {rule.overtimeRule.triggerAfterHours}{t('table.hours')} {t('table.atRate', { multiplier: rule.overtimeRule.rateMultiplier })}
                                </div>
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
                              <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${rule.isActive
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-gray-100 text-gray-800'
                                }`}>
                                {rule.isActive ? t('status.active') : t('status.inactive')}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end space-x-2">
                                <button
                                  onClick={() => handleEdit(rule)}
                                  className="p-2 text-gray-400 hover:text-[#31BCFF] hover:bg-blue-50 rounded-lg transition-all duration-200"
                                  title={t('actions.edit')}
                                >
                                  <PencilIcon className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleDelete(rule.id)}
                                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                                  title={t('actions.delete')}
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

                {/* Mobile Card View */}
                <div className="lg:hidden p-4 space-y-3">
                  {filteredPayRules.map((rule) => {
                    const IconComponent = getRuleTypeIcon(rule.ruleType)
                    return (
                      <div key={rule.id} className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
                        {/* Header */}
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-medium text-gray-900 text-sm">{rule.name}</h3>
                            {rule.description && (
                              <p className="text-xs text-gray-500 mt-1 line-clamp-2">{rule.description}</p>
                            )}
                          </div>
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ml-2 ${rule.isActive
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                            }`}>
                            {rule.isActive ? t('status.active') : t('status.inactive')}
                          </span>
                        </div>

                        {/* Type and Salary Code */}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <div className="text-[10px] text-gray-500 uppercase mb-1">{t('mobile.type')}</div>
                            <div className="flex items-center">
                              <IconComponent className="w-3.5 h-3.5 text-gray-400 mr-1.5" />
                              <span className="text-xs text-gray-900">{getRuleTypeLabel(rule.ruleType)}</span>
                            </div>
                          </div>
                          <div>
                            <div className="text-[10px] text-gray-500 uppercase mb-1">{t('mobile.salaryCode')}</div>
                            <div className="text-xs text-gray-900 font-medium">{rule.salaryCode.code}</div>
                            <div className="text-[10px] text-gray-500 truncate">{rule.salaryCode.name}</div>
                          </div>
                        </div>

                        {/* Overtime Info */}
                        {rule.overtimeRule && (
                          <div className="bg-orange-50 rounded-lg p-2 border border-orange-200">
                            <div className="text-[10px] text-orange-600 font-medium">
                              {/* Overtime after {rule.overtimeRule.triggerAfterHours}h @ {rule.overtimeRule.rateMultiplier}x rate */}
                              {t('table.overtimeAfter')} {rule.overtimeRule.triggerAfterHours}{t('table.hours')} {t('table.atRate', { multiplier: rule.overtimeRule.rateMultiplier })}
                            </div>
                          </div>
                        )}

                        {/* Groups */}
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center text-gray-600">
                            <UserGroupIcon className="w-3.5 h-3.5 mr-1" />
                            <span>{rule._count.employeeGroupPayRules} {t('table.groupsCount')}</span>
                            {rule._count.employeePayRules > 0 && (
                              <span className="ml-2 text-gray-500">• {rule._count.employeePayRules} custom</span>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex space-x-2 pt-2 border-t border-gray-100">
                          <button
                            onClick={() => handleEdit(rule)}
                            className="flex-1 inline-flex items-center justify-center px-3 py-2 bg-[#31BCFF] text-white text-xs font-medium rounded-lg hover:bg-[#31BCFF]/90"
                          >
                            <PencilIcon className="w-3.5 h-3.5 mr-1.5" />
                            {t('actions.edit')}
                          </button>
                          <button
                            onClick={() => handleDelete(rule.id)}
                            className="flex-1 inline-flex items-center justify-center px-3 py-2 bg-red-50 text-red-600 text-xs font-medium rounded-lg hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={rule._count.employeePayRules > 0}
                          >
                            <TrashIcon className="w-3.5 h-3.5 mr-1.5" />
                            {t('actions.delete')}
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        </>
      ) : (
        /* Overtime Rules Tab */
        <OvertimeRuleManagement />
      )}
    </div>
  )
}