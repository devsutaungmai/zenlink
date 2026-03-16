'use client'

import { useState, useEffect } from 'react'
import { PayrollEntryFormData, Employee } from '@/shared/types'
import { useCurrency } from '@/shared/hooks/useCurrency'
import { useTranslation } from 'react-i18next'

interface PayrollEntryFormProps {
  initialData?: Partial<PayrollEntryFormData>
  onSubmit: (data: PayrollEntryFormData) => Promise<void>
  isLoading?: boolean
  mode?: 'create' | 'edit'
  payrollPeriodId: string
}

export default function PayrollEntryForm({
  initialData,
  onSubmit,
  isLoading = false,
  mode = 'create',
  payrollPeriodId
}: PayrollEntryFormProps) {
  const { currencySymbol } = useCurrency()
  const { t } = useTranslation('payroll-entries')

  const [formData, setFormData] = useState<PayrollEntryFormData>({
    employeeId: initialData?.employeeId || '',
    regularHours: initialData?.regularHours || 0,
    overtimeHours: initialData?.overtimeHours || 0,
    regularRate: initialData?.regularRate || 0,
    overtimeRate: initialData?.overtimeRate || 0,
    deductions: initialData?.deductions || 0,
    bonuses: initialData?.bonuses || 0,
    status: initialData?.status || 'DRAFT',
    notes: initialData?.notes || ''
  })

  const [employees, setEmployees] = useState<Employee[]>([])
  const [loadingEmployees, setLoadingEmployees] = useState(true)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [calculatingHours, setCalculatingHours] = useState(false)
  const [shiftData, setShiftData] = useState<any>(null)

  // Calculate computed values
  const grossPay = (formData.regularHours * formData.regularRate) + 
                   (formData.overtimeHours * formData.overtimeRate) + 
                   formData.bonuses
  const netPay = grossPay - formData.deductions

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        // Use the optimized form-data endpoint to get employees data efficiently
        const response = await fetch('/api/employees')
        const data = await response.json()
        
        if (response.ok) {
          setEmployees(data.employees || data || [])
        } else {
          console.error('Error fetching employees:', data.error)
        }
      } catch (error) {
        console.error('Error fetching employees:', error)
      } finally {
        setLoadingEmployees(false)
      }
    }

    // Debounce the API call to avoid rapid requests
    const timeoutId = setTimeout(() => {
      fetchEmployees()
    }, 100) // Small delay for immediate user needs
    
    return () => clearTimeout(timeoutId)
  }, [])

  const handleAutoCalculate = async () => {
    if (!formData.employeeId || !payrollPeriodId) {
      alert('Please select an employee first')
      return
    }

    setCalculatingHours(true)
    try {
      const response = await fetch('/api/payroll-entries/calculate-hours', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          employeeId: formData.employeeId,
          payrollPeriodId: payrollPeriodId,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setShiftData(data)
        setFormData(prev => ({
          ...prev,
          regularHours: data.regularHours,
          overtimeHours: data.overtimeHours,
          regularRate: data.regularRate,
          overtimeRate: data.overtimeRate,
        }))
      } else {
        alert(data.error || 'Failed to calculate hours')
      }
    } catch (error) {
      console.error('Error calculating hours:', error)
      alert('Failed to calculate hours')
    } finally {
      setCalculatingHours(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    const processedValue = type === 'number' ? parseFloat(value) || 0 : value
    
    setFormData(prev => ({ ...prev, [name]: processedValue }))
    
    // Clear shift data when employee changes
    if (name === 'employeeId') {
      setShiftData(null)
    }
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.employeeId) {
      newErrors.employeeId = 'Employee is required'
    }

    if (formData.regularRate <= 0) {
      newErrors.regularRate = 'Regular rate must be greater than 0'
    }

    if (formData.overtimeRate <= 0) {
      newErrors.overtimeRate = 'Overtime rate must be greater than 0'
    }

    if (formData.regularHours < 0) {
      newErrors.regularHours = 'Regular hours cannot be negative'
    }

    if (formData.overtimeHours < 0) {
      newErrors.overtimeHours = 'Overtime hours cannot be negative'
    }

    if (formData.deductions < 0) {
      newErrors.deductions = 'Deductions cannot be negative'
    }

    if (formData.bonuses < 0) {
      newErrors.bonuses = 'Bonuses cannot be negative'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    try {
      await onSubmit(formData)
    } catch (error) {
      console.error('Form submission error:', error)
    }
  }

  return (
    <div className="p-8">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Employee Selection */}
        <div>
          <label htmlFor="employeeId" className="block text-sm font-medium text-gray-700 mb-2">
            {t('form.employee')} <span className="text-red-500">*</span>
          </label>
          {loadingEmployees ? (
            <div className="animate-pulse h-12 bg-gray-200 rounded-xl"></div>
          ) : (
            <select
              id="employeeId"
              name="employeeId"
              value={formData.employeeId}
              onChange={handleChange}
              disabled={isLoading || mode === 'edit'}
              className={`block w-full px-4 py-3 rounded-xl border-2 bg-white/70 backdrop-blur-sm text-gray-900 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#31BCFF]/50 ${
                errors.employeeId 
                  ? 'border-red-300 focus:border-red-500' 
                  : 'border-gray-200 focus:border-[#31BCFF] hover:border-gray-300'
              } ${mode === 'edit' ? 'bg-gray-100 cursor-not-allowed' : ''}`}
            >
              <option value="">{t('form.select_employee')}</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.firstName} {employee.lastName} 
                  {employee.employeeNo && ` (#${employee.employeeNo})`}
                </option>
              ))}
            </select>
          )}
          {errors.employeeId && <p className="mt-1 text-sm text-red-600">{errors.employeeId}</p>}
        </div>

        {/* Auto-Calculate / Recalculate Section */}
        {formData.employeeId && (
          <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-blue-900">{mode === 'edit' ? t('form.recalculate_title') : t('form.auto_calculate_title')}</h3>
                <p className="text-sm text-blue-700">{mode === 'edit' ? t('form.recalculate_desc') : t('form.auto_calculate_desc')}</p>
              </div>
              <button
                type="button"
                onClick={handleAutoCalculate}
                disabled={calculatingHours}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              >
                {calculatingHours ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {t('form.calculating')}
                  </div>
                ) : (
                  mode === 'edit' ? t('form.recalculate_button') : t('form.calculate_button')
                )}
              </button>
            </div>

            {/* Summary */}
            {shiftData && (
              <div className="bg-white rounded-lg p-4 border border-blue-200">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">
                  {shiftData.wageCalculationMethod?.includes('attendance') ? t('form.attendance_summary') : t('form.shift_summary')}
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">
                      {shiftData.wageCalculationMethod?.includes('attendance') ? t('form.attendance_records') : t('form.total_shifts')}
                    </p>
                    <p className="font-semibold text-gray-900">{shiftData.totalShifts}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">{t('form.total_hours')}</p>
                    <p className="font-semibold text-gray-900">{shiftData.totalHours.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">{t('form.regular_hours')}</p>
                    <p className="font-semibold text-gray-900">{shiftData.regularHours.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">{t('form.overtime_hours')}</p>
                    <p className="font-semibold text-gray-900">{shiftData.overtimeHours.toFixed(2)}</p>
                  </div>
                </div>

                {/* Attendance Details */}
                {shiftData.attendanceDetails && shiftData.attendanceDetails.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <h5 className="text-sm font-medium text-gray-700 mb-2">{t('form.attendance_records')}</h5>
                    <div className="max-h-40 overflow-y-auto">
                      <div className="space-y-2">
                        {shiftData.attendanceDetails.map((attendance: any, index: number) => (
                          <div key={index} className={`rounded p-2 text-xs ${
                            attendance.isApproved ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'
                          }`}>
                            <div className="flex justify-between items-start">
                              <div>
                                <div className="font-medium text-gray-700">
                                  {new Date(attendance.date).toLocaleDateString()}
                                </div>
                                <div className="text-gray-600">
                                  {new Date(attendance.punchInTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - 
                                  {attendance.punchOutTime 
                                    ? new Date(attendance.punchOutTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
                                    : t('form.still_clocked_in')
                                  }
                                </div>
                                {attendance.shift && (
                                  <div className="text-gray-500 mt-1">
                                    {t('form.scheduled')}: {attendance.shift.startTime} - {attendance.shift.endTime || t('form.open')}
                                  </div>
                                )}
                              </div>
                              <div className="text-right">
                                <div className="font-medium text-gray-900">
                                  {attendance.duration.toFixed(2)}h
                                </div>
                                <span className={`px-1 py-0.5 rounded text-xs ${
                                  attendance.isApproved 
                                    ? 'bg-green-100 text-green-700' 
                                    : 'bg-yellow-100 text-yellow-700'
                                }`}>
                                  {attendance.isApproved ? t('form.approved') : t('form.pending')}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Shift Details (legacy fallback) */}
                {shiftData.shiftDetails && shiftData.shiftDetails.length > 0 && !shiftData.attendanceDetails && (
                  <div className="mt-4">
                    <h5 className="text-sm font-medium text-gray-700 mb-2">{t('form.individual_shifts')}</h5>
                    <div className="max-h-40 overflow-y-auto">
                      <div className="space-y-2">
                        {shiftData.shiftDetails.map((shift: any, index: number) => (
                          <div key={index} className="bg-gray-50 rounded p-2 text-xs">
                            <div className="flex justify-between items-start">
                              <div>
                                <div className="font-medium text-gray-700">
                                  {new Date(shift.date).toLocaleDateString()}
                                </div>
                                <div className="text-gray-600">
                                  {shift.startTime} - {shift.endTime}
                                </div>
                                {shift.breakStart && shift.breakEnd && (
                                  <div className="text-gray-500 mt-1">
                                    {t('form.break')}: {shift.breakStart} - {shift.breakEnd}
                                    <span className={`ml-1 px-1 py-0.5 rounded text-xs ${
                                      shift.breakPaid 
                                        ? 'bg-green-100 text-green-700' 
                                        : 'bg-yellow-100 text-yellow-700'
                                    }`}>
                                      {shift.breakPaid ? t('form.paid') : t('form.unpaid')}
                                    </span>
                                  </div>
                                )}
                              </div>
                              <div className="text-right">
                                <div className="font-medium text-gray-900">
                                  {shift.hours.toFixed(2)}h
                                </div>
                                {shift.breakDuration > 0 && (
                                  <div className="text-gray-500">
                                    {t('form.break')}: {shift.breakDuration}min
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Hours and Rates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Regular Hours */}
          <div>
            <label htmlFor="regularHours" className="block text-sm font-medium text-gray-700 mb-2">
              {t('form.regular_hours')}
            </label>
            <input
              type="number"
              id="regularHours"
              name="regularHours"
              value={formData.regularHours}
              onChange={handleChange}
              min="0"
              step="0.01"
              className={`block w-full px-4 py-3 rounded-xl border-2 bg-white/70 backdrop-blur-sm text-gray-900 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#31BCFF]/50 ${
                errors.regularHours 
                  ? 'border-red-300 focus:border-red-500' 
                  : 'border-gray-200 focus:border-[#31BCFF] hover:border-gray-300'
              }`}
              disabled={isLoading}
            />
            {errors.regularHours && <p className="mt-1 text-sm text-red-600">{errors.regularHours}</p>}
          </div>

          {/* Regular Rate */}
          <div>
            <label htmlFor="regularRate" className="block text-sm font-medium text-gray-700 mb-2">
              {t('form.regular_rate')} ({currencySymbol}/hour) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              id="regularRate"
              name="regularRate"
              value={formData.regularRate}
              onChange={handleChange}
              min="0"
              step="0.01"
              className={`block w-full px-4 py-3 rounded-xl border-2 bg-white/70 backdrop-blur-sm text-gray-900 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#31BCFF]/50 ${
                errors.regularRate 
                  ? 'border-red-300 focus:border-red-500' 
                  : 'border-gray-200 focus:border-[#31BCFF] hover:border-gray-300'
              }`}
              disabled={isLoading}
            />
            {errors.regularRate && <p className="mt-1 text-sm text-red-600">{errors.regularRate}</p>}
          </div>

          {/* Overtime Hours */}
          <div>
            <label htmlFor="overtimeHours" className="block text-sm font-medium text-gray-700 mb-2">
              {t('form.overtime_hours')}
            </label>
            <input
              type="number"
              id="overtimeHours"
              name="overtimeHours"
              value={formData.overtimeHours}
              onChange={handleChange}
              min="0"
              step="0.01"
              className={`block w-full px-4 py-3 rounded-xl border-2 bg-white/70 backdrop-blur-sm text-gray-900 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#31BCFF]/50 ${
                errors.overtimeHours 
                  ? 'border-red-300 focus:border-red-500' 
                  : 'border-gray-200 focus:border-[#31BCFF] hover:border-gray-300'
              }`}
              disabled={isLoading}
            />
            {errors.overtimeHours && <p className="mt-1 text-sm text-red-600">{errors.overtimeHours}</p>}
          </div>

          {/* Overtime Rate */}
          <div>
            <label htmlFor="overtimeRate" className="block text-sm font-medium text-gray-700 mb-2">
              {t('form.overtime_rate')} ({currencySymbol}/hour) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              id="overtimeRate"
              name="overtimeRate"
              value={formData.overtimeRate}
              onChange={handleChange}
              min="0"
              step="0.01"
              className={`block w-full px-4 py-3 rounded-xl border-2 bg-white/70 backdrop-blur-sm text-gray-900 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#31BCFF]/50 ${
                errors.overtimeRate 
                  ? 'border-red-300 focus:border-red-500' 
                  : 'border-gray-200 focus:border-[#31BCFF] hover:border-gray-300'
              }`}
              disabled={isLoading}
            />
            {errors.overtimeRate && <p className="mt-1 text-sm text-red-600">{errors.overtimeRate}</p>}
          </div>

          {/* Bonuses */}
          <div>
            <label htmlFor="bonuses" className="block text-sm font-medium text-gray-700 mb-2">
              {t('form.bonuses')} ({currencySymbol})
            </label>
            <input
              type="number"
              id="bonuses"
              name="bonuses"
              value={formData.bonuses}
              onChange={handleChange}
              min="0"
              step="0.01"
              className={`block w-full px-4 py-3 rounded-xl border-2 bg-white/70 backdrop-blur-sm text-gray-900 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#31BCFF]/50 ${
                errors.bonuses 
                  ? 'border-red-300 focus:border-red-500' 
                  : 'border-gray-200 focus:border-[#31BCFF] hover:border-gray-300'
              }`}
              disabled={isLoading}
            />
            {errors.bonuses && <p className="mt-1 text-sm text-red-600">{errors.bonuses}</p>}
          </div>

          {/* Deductions */}
          <div>
            <label htmlFor="deductions" className="block text-sm font-medium text-gray-700 mb-2">
              {t('form.deductions')} ({currencySymbol})
            </label>
            <input
              type="number"
              id="deductions"
              name="deductions"
              value={formData.deductions}
              onChange={handleChange}
              min="0"
              step="0.01"
              className={`block w-full px-4 py-3 rounded-xl border-2 bg-white/70 backdrop-blur-sm text-gray-900 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#31BCFF]/50 ${
                errors.deductions 
                  ? 'border-red-300 focus:border-red-500' 
                  : 'border-gray-200 focus:border-[#31BCFF] hover:border-gray-300'
              }`}
              disabled={isLoading}
            />
            {errors.deductions && <p className="mt-1 text-sm text-red-600">{errors.deductions}</p>}
          </div>
        </div>

        {/* Status Selection - Only show in edit mode */}
        {mode === 'edit' && (
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
              {t('form.status')}
            </label>
            <select
              id="status"
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="block w-full px-4 py-3 rounded-xl border-2 border-gray-200 bg-white/70 backdrop-blur-sm text-gray-900 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#31BCFF]/50 focus:border-[#31BCFF] hover:border-gray-300"
              disabled={isLoading}
            >
              <option value="DRAFT">{t('status.draft')}</option>
              <option value="APPROVED">{t('status.approved')}</option>
              <option value="PAID">{t('status.paid')}</option>
            </select>
            <p className="mt-1 text-xs text-gray-500">
              {t('form.status_hint')}
            </p>
          </div>
        )}

        {/* Calculation Summary */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('form.pay_calculation')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-gray-600">{t('form.regular_pay')}</p>
              <p className="text-lg font-bold text-gray-900">
                {currencySymbol}{(formData.regularHours * formData.regularRate).toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-gray-600">{t('form.overtime_pay')}</p>
              <p className="text-lg font-bold text-gray-900">
                {currencySymbol}{(formData.overtimeHours * formData.overtimeRate).toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-gray-600">{t('form.bonuses')}</p>
              <p className="text-lg font-bold text-gray-900">
                {currencySymbol}{formData.bonuses.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-gray-600">{t('form.gross_pay')}</p>
              <p className="text-xl font-bold text-[#31BCFF]">
                {currencySymbol}{grossPay.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-gray-600">{t('form.deductions')}</p>
              <p className="text-lg font-bold text-red-600">
                -{currencySymbol}{formData.deductions.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-gray-600">{t('form.net_pay')}</p>
              <p className="text-xl font-bold text-green-600">
                {currencySymbol}{netPay.toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
            {t('form.notes')}
          </label>
          <textarea
            id="notes"
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows={3}
            className="block w-full px-4 py-3 rounded-xl border-2 border-gray-200 bg-white/70 backdrop-blur-sm text-gray-900 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#31BCFF]/50 focus:border-[#31BCFF] hover:border-gray-300"
            placeholder={t('form.notes_placeholder')}
            disabled={isLoading}
          />
        </div>

        {/* Submit Button */}
        <div className="flex justify-end pt-6">
          <button
            type="submit"
            disabled={isLoading}
            className="inline-flex items-center justify-center px-8 py-3 rounded-2xl bg-gradient-to-r from-[#31BCFF] to-[#0EA5E9] text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none group"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {mode === 'create' ? t('form.creating') : t('form.updating')}
              </>
            ) : (
              <>
                <svg className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {mode === 'create' ? t('form.create_entry') : t('form.update_entry')}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
