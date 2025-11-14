'use client'

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ClockIcon,
  CurrencyDollarIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline'
import Swal from 'sweetalert2'

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
  const { t } = useTranslation('overtime-rules')
  const [overtimeRules, setOvertimeRules] = useState<OvertimeRule[]>([])
  const [salaryCodes, setSalaryCodes] = useState<SalaryCode[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingRule, setEditingRule] = useState<OvertimeRule | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
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
        const codes = data.salaryCodes || []
        const overtimeCodes = codes.filter((code: SalaryCode) =>
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
    try {
      const result = await Swal.fire({
        title: t('common.confirm'),
        text: t('deleteConfirmation'),
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#31BCFF',
        cancelButtonColor: '#d33',
        confirmButtonText: t('buttons.delete'),
        cancelButtonText: t('buttons.cancel')
      })

      if (result.isConfirmed) {
        const response = await fetch(`/api/overtime-rules/${id}`, {
          method: 'DELETE',
        })

        if (response.ok) {
          await fetchOvertimeRules()
          await Swal.fire({
            title: t('common.success'),
            text: t('deleteSuccess'),
            icon: 'success',
            confirmButtonColor: '#31BCFF',
          })
        } else {
          throw new Error('Failed to delete overtime rule')
        }
      }
    } catch (error) {
      console.error('Error deleting overtime rule:', error)
      await Swal.fire({
        title: t('common.error'),
        text: t('deleteError'),
        icon: 'error',
        confirmButtonColor: '#31BCFF',
      })
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

  const filteredRules = overtimeRules.filter(rule =>
    rule.payRule.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    rule.payRule.salaryCode.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    rule.payRule.salaryCode.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-2xl p-6 border border-orange-100">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between">
          <div className="mb-4 sm:mb-0">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
              {t('title')}
            </h1>
            <p className="mt-2 text-gray-600">
              {t('subtitle')}
            </p>
            <div className="mt-4 flex items-center space-x-4 text-sm text-gray-500">
              <span className="flex items-center">
                <div className="w-2 h-2 bg-orange-500 rounded-full mr-2"></div>
                {t('totalRules', { count: overtimeRules.length })}
              </span>
              <span className="flex items-center">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                {t('activeRules', { count: overtimeRules.filter(r => r.payRule.isActive).length })}
              </span>
            </div>
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
            className="inline-flex items-center justify-center px-6 py-3 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 group"
          >
            <PlusIcon className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform duration-200" />
            {t('addOvertimeRule')}
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 border border-gray-200/50 shadow-lg">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 flex items-center pl-4">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t('searchPlaceholder')}
              className="block w-full pl-12 pr-4 py-3 rounded-xl border border-gray-300 bg-white/70 backdrop-blur-sm text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all duration-200"
            />
          </div>
          <div className="flex items-center text-sm text-gray-500">
            {t('showing', { current: filteredRules.length, total: overtimeRules.length })}
          </div>
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {editingRule ? t('form.editOvertimeRule') : t('form.addNewOvertimeRule')}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('form.ruleName')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-orange-500 focus:outline-none transition-colors duration-200"
                  placeholder={t('form.ruleNamePlaceholder')}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('form.hoursThreshold')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  step="0.5"
                  value={formData.hoursThreshold}
                  onChange={(e) => setFormData(prev => ({ ...prev, hoursThreshold: parseFloat(e.target.value) }))}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-orange-500 focus:outline-none transition-colors duration-200"
                  placeholder="40"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">{t('form.hoursThresholdHelp')}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('form.overtimeMultiplier')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  step="0.1"
                  value={formData.multiplier}
                  onChange={(e) => setFormData(prev => ({ ...prev, multiplier: parseFloat(e.target.value) }))}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-orange-500 focus:outline-none transition-colors duration-200"
                  placeholder="1.5"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">{t('form.multiplierHelp')}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('form.maxOvertimeHours')}
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
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-orange-500 focus:outline-none transition-colors duration-200"
                  placeholder={t('form.maxHoursPlaceholder')}
                />
                <p className="text-xs text-gray-500 mt-1">{t('form.maxHoursHelp')}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('form.salaryCode')} <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.salaryCodeId}
                  onChange={(e) => setFormData(prev => ({ ...prev, salaryCodeId: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-orange-500 focus:outline-none transition-colors duration-200"
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('form.description')}
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-orange-500 focus:outline-none transition-colors duration-200"
                  placeholder={t('form.descriptionPlaceholder')}
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false)
                    setEditingRule(null)
                  }}
                  className="w-full sm:flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 font-medium transition-colors duration-200"
                >
                  {t('buttons.cancel')}
                </button>
                <button
                  type="submit"
                  className="w-full sm:flex-1 px-4 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl hover:from-orange-600 hover:to-amber-600 font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  {editingRule ? t('buttons.update') : t('buttons.create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Overtime Rules List */}
      {filteredRules.length === 0 ? (
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-12 border border-gray-200/50 shadow-lg text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            {searchTerm ? (
              <MagnifyingGlassIcon className="w-8 h-8 text-gray-400" />
            ) : (
              <ClockIcon className="w-8 h-8 text-gray-400" />
            )}
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchTerm ? t('noRulesFound') : t('emptyState.title')}
          </h3>
          <p className="text-gray-500 mb-6">
            {searchTerm ? t('adjustSearch') : t('emptyState.description')}
          </p>
          {!searchTerm && (
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center px-6 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-medium hover:from-orange-600 hover:to-amber-600 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              <PlusIcon className="w-5 h-5 mr-2" />
              {t('emptyState.addFirstOvertimeRule')}
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRules.map((rule) => (
            <div
              key={rule.id}
              className="group bg-white/80 backdrop-blur-xl rounded-2xl p-6 border border-gray-200/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] hover:border-orange-500/30"
            >
              {/* Rule Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 group-hover:text-orange-500 transition-colors duration-200">
                    {rule.payRule.name}
                  </h3>
                  {rule.payRule.description && (
                    <p className="text-sm text-gray-500 mt-1">
                      {rule.payRule.description}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => toggleActive(rule.id, rule.payRule.isActive)}
                  className={`ml-2 inline-flex px-2 py-1 rounded-full text-xs font-medium transition-colors duration-200 ${
                    rule.payRule.isActive
                      ? 'bg-green-100 text-green-800 hover:bg-green-200'
                      : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                  }`}
                >
                  {rule.payRule.isActive ? t('status.active') : t('status.inactive')}
                </button>
              </div>

              {/* Rule Stats */}
              <div className="space-y-3 mb-4">
                <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-orange-500/10 rounded-lg flex items-center justify-center mr-3">
                        <ClockIcon className="w-5 h-5 text-orange-500" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">{t('table.threshold')}</p>
                        <p className="text-lg font-bold text-gray-900">
                          {rule.triggerAfterHours}{t('table.hours')}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">{t('table.multiplier')}</p>
                      <p className="text-lg font-bold text-orange-600">
                        {rule.rateMultiplier}x
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-500 mb-1">{t('table.maxHours')}</p>
                    <p className="text-sm font-medium text-gray-900">
                      {rule.maxHoursPerDay ? `${rule.maxHoursPerDay}${t('table.hours')}` : t('table.unlimited')}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3">
                    <div className="flex items-center">
                      <CurrencyDollarIcon className="w-4 h-4 text-gray-400 mr-1" />
                      <p className="text-xs text-gray-500">{t('table.salaryCode')}</p>
                    </div>
                    <p className="text-sm font-medium text-gray-900 mt-1">
                      {rule.payRule.salaryCode.code}
                    </p>
                  </div>
                </div>

                <div className="text-xs text-gray-500 bg-gray-50 rounded-lg p-2">
                  {rule.payRule.salaryCode.name}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t border-gray-200/50">
                <button
                  onClick={() => handleEdit(rule)}
                  className="flex-1 inline-flex items-center justify-center px-4 py-2 rounded-xl bg-gray-50 text-gray-700 font-medium hover:bg-orange-500 hover:text-white transition-all duration-200 group/btn"
                >
                  <PencilIcon className="w-4 h-4 mr-2 group-hover/btn:scale-110 transition-transform duration-200" />
                  {t('actions.edit')}
                </button>
                <button
                  onClick={() => handleDelete(rule.id)}
                  className="px-4 py-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200"
                  title={t('actions.delete')}
                >
                  <TrashIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
