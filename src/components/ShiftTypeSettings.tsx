'use client'

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import Swal from 'sweetalert2'
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'

interface ShiftType {
  id: string
  name: string
  salaryCode: string
  payCalculationType: 'HOURLY_PLUS_FIXED' | 'FIXED_AMOUNT' | 'PERCENTAGE' | 'UNPAID'
  payCalculationValue: number | null
  autoBreakType: 'AUTO_BREAK' | 'MANUAL_BREAK'
  autoBreakValue: number | null
  description: string | null
  isActive: boolean
}

interface SalaryCode {
  id: string
  code: string
  name: string
}

export default function ShiftTypeSettings() {
  const { t } = useTranslation('shift-types')
  const [shiftTypes, setShiftTypes] = useState<ShiftType[]>([])
  const [salaryCodes, setSalaryCodes] = useState<SalaryCode[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    name: '',
    salaryCode: '',
    payCalculationType:'UNPAID' as ShiftType['payCalculationType'],
    payCalculationValue: '',
    autoBreakType: 'MANUAL_BREAK' as ShiftType['autoBreakType'],
    autoBreakValue: '',
    description: '',
  })

  useEffect(() => {
    fetchShiftTypes()
    fetchSalaryCodes()
  }, [])

  const fetchShiftTypes = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/shift-types')
      
      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: 'Unknown error' }))
        console.error('API Error Response:', {
          status: response.status,
          statusText: response.statusText,
          data
        })
        throw new Error(data.error || `Failed to fetch shift types (Status: ${response.status})`)
      }
      
      const data = await response.json()
      console.log('Fetched shift types:', data)
      setShiftTypes(data.shiftTypes || [])
    } catch (error) {
      console.error('Error fetching shift types:', error)
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'error',
        title: error instanceof Error ? error.message : 'Failed to load shift types',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchSalaryCodes = async () => {
    try {
      const response = await fetch('/api/salary-codes')
      const data = await response.json()
      
      if (response.ok) {
        setSalaryCodes(data.salaryCodes || [])
      }
    } catch (error) {
      console.error('Error fetching salary codes:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const payload = {
        name: formData.name,
        salaryCode: formData.salaryCode,
        payCalculationType: formData.payCalculationType,
        payCalculationValue: formData.payCalculationValue 
          ? parseFloat(formData.payCalculationValue)
          : null,
        autoBreakType: formData.autoBreakType,
        autoBreakValue: formData.autoBreakValue 
          ? parseFloat(formData.autoBreakValue)
          : null,
        description: formData.description || null,
      }

      const url = editingId 
        ? `/api/shift-types/${editingId}`
        : '/api/shift-types'
      
      const response = await fetch(url, {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (response.ok) {
        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: editingId 
            ? t('success.updated') 
            : t('success.created'),
          showConfirmButton: false,
          timer: 3000,
          timerProgressBar: true,
        })
        
        resetForm()
        fetchShiftTypes()
      } else {
        throw new Error(data.error || 'Failed to save shift type')
      }
    } catch (error) {
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'error',
        title: error instanceof Error ? error.message : 'Failed to save shift type',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
      })
    }
  }

  const handleEdit = (shiftType: ShiftType) => {
    setEditingId(shiftType.id)
    setFormData({
      name: shiftType.name,
      salaryCode: shiftType.salaryCode,
      payCalculationType: shiftType.payCalculationType,
      payCalculationValue: shiftType.payCalculationValue?.toString() || '',
      autoBreakType: shiftType.autoBreakType,
      autoBreakValue: shiftType.autoBreakValue?.toString() || '',
      description: shiftType.description || '',
    })
    setShowForm(true)
  }

  const handleDelete = async (id: string, name: string) => {
    const result = await Swal.fire({
      title: t('delete.confirm_title'),
      text: t('delete.confirm_text', { name }),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#31BCFF',
      cancelButtonColor: '#d33',
      confirmButtonText: t('delete.confirm_button'),
      cancelButtonText: t('delete.cancel_button'),
    })

    if (result.isConfirmed) {
      try {
        const response = await fetch(`/api/shift-types/${id}`, {
          method: 'DELETE',
        })

        if (response.ok) {
          Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'success',
            title: t('success.deleted'),
            showConfirmButton: false,
            timer: 3000,
            timerProgressBar: true,
          })
          fetchShiftTypes()
        } else {
          const data = await response.json()
          throw new Error(data.error || 'Failed to delete shift type')
        }
      } catch (error) {
        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'error',
          title: error instanceof Error ? error.message : 'Failed to delete shift type',
          showConfirmButton: false,
          timer: 3000,
          timerProgressBar: true,
        })
      }
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      salaryCode: '',
      payCalculationType: 'UNPAID',
      payCalculationValue: '',
      autoBreakType: 'MANUAL_BREAK',
      autoBreakValue: '',
      description: '',
    })
    setEditingId(null)
    setShowForm(false)
  }

  const getPayCalculationLabel = (type: ShiftType['payCalculationType']) => {
    const labels = {
      HOURLY_PLUS_FIXED: t('pay_calculation.hourly_plus_fixed'),
      FIXED_AMOUNT: t('pay_calculation.fixed_amount'),
      PERCENTAGE: t('pay_calculation.percentage'),
      UNPAID: t('pay_calculation.unpaid'),
    }
    return labels[type]
  }

  const getAutoBreakLabel = (type: ShiftType['autoBreakType']) => {
    const labels = {
      AUTO_BREAK: t('auto_break_options.auto_break'),
      MANUAL_BREAK: t('auto_break_options.manual_break'),
    }
    return labels[type]
  }

  const needsValueInput = (payType?: ShiftType['payCalculationType'] | null,
    breakType?: ShiftType['autoBreakType'] | null
  ) => {
    return !(payType === 'UNPAID' || breakType === 'MANUAL_BREAK')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#31BCFF]"></div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {t('title')}
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              {t('subtitle')}
            </p>
          </div>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center px-4 py-2 bg-[#31BCFF] text-white rounded-lg hover:bg-[#31BCFF]/90 transition-colors"
            >
              <PlusIcon className="w-5 h-5 mr-2" />
              {t('add_button')}
            </button>
          )}
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="p-6 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              {editingId ? t('form.edit_title') : t('form.create_title')}
            </h3>
            <button
              onClick={resetForm}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('form.name')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#31BCFF] focus:border-[#31BCFF]"
                  placeholder={t('form.name_placeholder')}
                />
              </div>

              {/* Salary Code */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('form.salary_code')} <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={formData.salaryCode}
                  onChange={(e) => setFormData({ ...formData, salaryCode: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#31BCFF] focus:border-[#31BCFF]"
                >
                  <option value="">{t('form.select_salary_code')}</option>
                  {salaryCodes.map((code) => (
                    <option key={code.id} value={code.code}>
                      {code.code} - {code.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Pay Calculation Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('form.pay_calculation_type')} <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={formData.payCalculationType}
                  onChange={(e) => {
                    setFormData({ 
                      ...formData, 
                      payCalculationType: e.target.value as ShiftType['payCalculationType'],
                      payCalculationValue: e.target.value === 'UNPAID' ? '' : formData.payCalculationValue
                    })
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#31BCFF] focus:border-[#31BCFF]"
                >
                  <option value="HOURLY_PLUS_FIXED">{t('pay_calculation.hourly_plus_fixed')}</option>
                  <option value="FIXED_AMOUNT">{t('pay_calculation.fixed_amount')}</option>
                  <option value="PERCENTAGE">{t('pay_calculation.percentage')}</option>
                  <option value="UNPAID">{t('pay_calculation.unpaid')}</option>
                </select>
              </div>

              {/* Calculation Value */}
              {needsValueInput(formData.payCalculationType,null) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {formData.payCalculationType === 'PERCENTAGE' 
                      ? t('form.percentage_value')
                      : t('form.amount_value')
                    } <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      required
                      step="0.01"
                      min={formData.payCalculationType === 'PERCENTAGE' ? 0 : undefined}
                      value={formData.payCalculationValue}
                      onChange={(e) => {
                        let raw = e.target.value
                        // treat any form of negative zero ("-0", "-0.0", "-00.00", etc.) as "0"
                        const isNegativeZero = /^-0+(\.0+)?$/.test(raw)

                        if (isNegativeZero) {
                          raw = '0'
                        }

                        // for PERCENTAGE, enforce non-negative values
                        if (formData.payCalculationType === 'PERCENTAGE' && raw !== '') {
                          if (parseFloat(raw) < 0) {
                            raw = raw.replace(/-/g, '')
                          }
                        }

                        setFormData({ ...formData, payCalculationValue: raw })
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#31BCFF] focus:border-[#31BCFF]"
                      placeholder={formData.payCalculationType === 'PERCENTAGE' ? '0.00' : '0.00'}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                      {formData.payCalculationType === 'PERCENTAGE' ? '%' : '$'}
                    </span>
                  </div>
                </div>
              )}
            </div>
            <div className='grid md:grid-cols-2 gap-4'>
             {/* Auto Break Value */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('form.auto_break_setting')} <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={formData.autoBreakType}
                  onChange={(e) => {
                    setFormData({ 
                      ...formData, 
                      autoBreakType: e.target.value as ShiftType['autoBreakType'],
                      autoBreakValue: e.target.value === 'MANUAL_BREAK' ? '' : formData.autoBreakValue
                    })
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#31BCFF] focus:border-[#31BCFF]"
                >
                  <option value="MANUAL_BREAK">{t('auto_break_options.manual_break')}</option>
                  <option value="AUTO_BREAK">{t('auto_break_options.auto_break')}</option>
                </select>
              </div>
                  {/* Calculation Value */}
              {needsValueInput(null,formData.autoBreakType) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('form.amount_value')} <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      required
                      step="0.01"
                      min="0"
                      value={formData.autoBreakValue}
                      onChange={(e) => {
                        let raw = e.target.value
                        // treat any form of negative zero ("-0", "-0.0", "-00.00", etc.) as "0"
                        const isNegativeZero = /^-0+(\.0+)?$/.test(raw)

                        if (isNegativeZero) {
                          raw = '0'
                        }

                        setFormData({ ...formData, autoBreakValue: raw })
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#31BCFF] focus:border-[#31BCFF]"
                      placeholder='15'
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                      {t('form.minutes')}
                    </span>
                  </div>
                </div>
              )}
              </div>
            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('form.description')}
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#31BCFF] focus:border-[#31BCFF]"
                placeholder={t('form.description_placeholder')}
              />
            </div>

            {/* Form Actions */}
            <div className="flex gap-3">
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-[#31BCFF] text-white rounded-lg hover:bg-[#31BCFF]/90 transition-colors font-medium"
              >
                {editingId ? t('form.update_button') : t('form.create_button')}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                {t('form.cancel_button')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* List */}
      <div className="p-6">
        {shiftTypes.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">{t('no_shift_types')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {shiftTypes.map((shiftType) => (
              <div
                key={shiftType.id}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">{shiftType.name}</h4>
                  <div className="mt-1 space-y-1">
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">{t('list.salary_code')}:</span> {shiftType.salaryCode}
                    </p>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">{t('list.calculation')}:</span>{' '}
                      {getPayCalculationLabel(shiftType.payCalculationType)}
                      {shiftType.payCalculationValue && (
                        <span>
                          {' '}({shiftType.payCalculationType === 'PERCENTAGE' 
                            ? `${shiftType.payCalculationValue}%` 
                            : `$${shiftType.payCalculationValue}`})
                        </span>
                      )}
                    </p>
                    
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">{t('list.calculation')}:</span>
                      {getAutoBreakLabel(shiftType.autoBreakType)}{''}
                      {shiftType.autoBreakValue && (
                        <span>
                         ({shiftType.autoBreakValue} {t('form.minutes')})
                        </span>
                      )}
                    </p>
                    {shiftType.description && (
                      <p className="text-sm text-gray-500">{shiftType.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => handleEdit(shiftType)}
                    className="p-2 text-gray-400 hover:text-[#31BCFF] hover:bg-blue-50 rounded-lg transition-all"
                    title={t('actions.edit')}
                  >
                    <PencilIcon className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(shiftType.id, shiftType.name)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                    title={t('actions.delete')}
                  >
                    <TrashIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
