'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import {
  ChevronLeftIcon,
  DocumentTextIcon,
  UserIcon,
  CalendarIcon,
  BanknotesIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  PencilIcon,
  DocumentArrowDownIcon,
} from '@heroicons/react/24/outline'
import Swal from 'sweetalert2'
import { downloadBlob } from '@/shared/utils/download'

interface PayrollEntry {
  id: string
  employeeId: string
  payrollPeriodId: string
  regularHours: number
  overtimeHours: number
  regularRate: number
  overtimeRate: number
  grossPay: number
  deductions: number
  netPay: number
  bonuses: number
  status: 'DRAFT' | 'APPROVED' | 'PAID'
  notes?: string
  createdAt: string
  updatedAt: string
  employee: {
    id: string
    firstName: string
    lastName: string
    employeeNo?: string
    email?: string
  }
  payrollPeriod: {
    id: string
    name: string
    startDate: string
    endDate: string
    status: string
  }
  dailyBreakdown?: Array<{
    date: string
    scheduledHours: number
    payableHours: number
    totalBreakHours: number
    totalShifts: number
    regularHours: number
    overtimeHours: number
    shiftTypes: string[]
    shiftTypeLabel: string
    payCalculationRules?: Array<{
      type: 'BASE' | 'HOURLY_PLUS_FIXED' | 'FIXED_AMOUNT' | 'PERCENTAGE' | 'UNPAID'
      value: number
    }>
    payCalculationLabel: string
    baseRate: number
    effectiveRate: number | null
    effectiveRateLabel: string
    shiftPremiumRate: number
    earned: number
    bonus: number
    deduction: number
    net: number
  }>
  breakdownTotals?: {
    scheduledHours: number
    workedHours: number
    breakHours: number
    totalShifts: number
    basicSalaryRate: number
    averageEffectiveRate: number
    regularHours: number
    overtimeHours: number
    earned: number
    bonus: number
    deduction: number
    net: number
  }
}

export default function PayrollEntryViewPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const { t } = useTranslation('payroll-entries')
  const [entryId, setEntryId] = useState<string | null>(null)
  const [entry, setEntry] = useState<PayrollEntry | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    params.then(({ id }) => {
      setEntryId(id)
    })
  }, [params])

  useEffect(() => {
    if (entryId) {
      fetchEntry()
    }
  }, [entryId])

  const fetchEntry = async () => {
    if (!entryId) return

    try {
      setLoading(true)
      const response = await fetch(`/api/payroll-entries/${entryId}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch payroll entry')
      }

      const data = await response.json()
      setEntry(data)
    } catch (error) {
      console.error('Error fetching payroll entry:', error)
      setError(error instanceof Error ? error.message : 'Failed to load payroll entry')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatDay = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const formatAmount = (value: number) => {
    if (!Number.isFinite(value)) return '0'
    const rounded = Math.round(value * 100) / 100
    return Number.isInteger(rounded) ? rounded.toString() : rounded.toFixed(2)
  }

  const getPayCalculationText = (
    rules?: Array<{ type: 'BASE' | 'HOURLY_PLUS_FIXED' | 'FIXED_AMOUNT' | 'PERCENTAGE' | 'UNPAID'; value: number }>
  ) => {
    const safeRules = (rules || []).filter((rule) => rule?.type)
    if (safeRules.length === 0) {
      return t('view_page.pay_calculation.hourly_wage')
    }

    return safeRules.map((rule) => {
      switch (rule.type) {
        case 'HOURLY_PLUS_FIXED':
          return t('view_page.pay_calculation.hourly_plus_fixed', { amount: formatAmount(rule.value) })
        case 'FIXED_AMOUNT':
          return t('view_page.pay_calculation.fixed_amount', { amount: formatAmount(rule.value) })
        case 'PERCENTAGE':
          return t('view_page.pay_calculation.percentage', { percentage: formatAmount(rule.value) })
        case 'UNPAID':
          return t('view_page.pay_calculation.unpaid')
        default:
          return t('view_page.pay_calculation.hourly_wage')
      }
    }).join(' | ')
  }

  const getRateSummaryText = (
    day: NonNullable<PayrollEntry['dailyBreakdown']>[number]
  ) => {
    const safeRules = (day.payCalculationRules || []).filter((rule) => rule?.type)

    if (safeRules.length !== 1) {
      return t('view_page.rate_summary_line.mixed', {
        base: formatAmount(day.baseRate ?? 0),
        effective: formatAmount(day.effectiveRate ?? 0)
      })
    }

    const rule = safeRules[0]

    switch (rule.type) {
      case 'HOURLY_PLUS_FIXED':
        return t('view_page.rate_summary_line.hourly_plus_fixed', {
          base: formatAmount(day.baseRate ?? 0),
          amount: formatAmount(rule.value ?? 0),
          effective: formatAmount(day.effectiveRate ?? 0)
        })
      case 'FIXED_AMOUNT':
        return t('view_page.rate_summary_line.fixed_amount', {
          amount: formatAmount(rule.value ?? day.effectiveRate ?? 0)
        })
      case 'PERCENTAGE':
        return t('view_page.rate_summary_line.percentage', {
          base: formatAmount(day.baseRate ?? 0),
          percentage: formatAmount(rule.value ?? 0),
          effective: formatAmount(day.effectiveRate ?? 0)
        })
      case 'UNPAID':
        return t('view_page.rate_summary_line.unpaid')
      default:
        return t('view_page.rate_summary_line.base', {
          amount: formatAmount(day.baseRate ?? 0)
        })
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PAID':
        return 'bg-green-100 text-green-800'
      case 'APPROVED':
        return 'bg-blue-100 text-blue-800'
      case 'DRAFT':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PAID':
        return <CheckCircleIcon className="w-5 h-5 text-green-600" />
      case 'APPROVED':
        return <CheckCircleIcon className="w-5 h-5 text-blue-600" />
      case 'DRAFT':
        return <DocumentTextIcon className="w-5 h-5 text-gray-600" />
      default:
        return <DocumentTextIcon className="w-5 h-5 text-gray-600" />
    }
  }

  const handleEdit = () => {
    router.push(`/dashboard/payroll-entries/${entryId}/edit`)
  }

  const handleDownloadPayslip = async () => {
    try {
      const downloadUrl = `/api/payroll-entries/${entryId}/payslip`
      const filename = `payslip_${entry?.employee.firstName}_${entry?.employee.lastName}_${entry?.payrollPeriod.name}.pdf`

      const response = await fetch(downloadUrl)
      
      if (!response.ok) {
        throw new Error('Failed to generate payslip')
      }

      const blob = await response.blob()
      downloadBlob(blob, filename)

      Swal.fire({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        icon: 'success',
        title: t('view_page.payslip_downloaded')
      })
    } catch (error) {
      console.error('Error downloading payslip:', error)
      Swal.fire({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        icon: 'error',
        title: t('view_page.payslip_failed')
      })
    }
  }

  const handleChangeStatus = async () => {
    const statusOptions = ['DRAFT', 'APPROVED', 'PAID']
    const currentStatus = entry?.status || 'DRAFT'

    const statusLabels: Record<string, string> = {
      'DRAFT': t('status.draft'),
      'APPROVED': t('status.approved'),
      'PAID': t('status.paid')
    }

    const { value: newStatus } = await Swal.fire({
      title: t('view_page.change_status_title'),
      html: `
        <div class="space-y-2">
          ${statusOptions.map(status => `
            <label class="flex items-center p-3 border rounded cursor-pointer hover:bg-gray-50">
              <input type="radio" name="status" value="${status}" ${status === currentStatus ? 'checked' : ''} class="mr-3">
              <span class="font-medium">${statusLabels[status] || status}</span>
            </label>
          `).join('')}
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: t('view_page.update'),
      confirmButtonColor: '#31BCFF',
      preConfirm: () => {
        const selected = document.querySelector('input[name="status"]:checked') as HTMLInputElement
        return selected?.value
      }
    })

    if (newStatus && newStatus !== currentStatus) {
      try {
        const response = await fetch(`/api/payroll-entries/${entryId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus })
        })

        if (!response.ok) {
          throw new Error('Failed to update status')
        }

        Swal.fire({
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 3000,
          timerProgressBar: true,
          icon: 'success',
          title: t('view_page.status_updated')
        })

        fetchEntry()
      } catch (error) {
        console.error('Error updating status:', error)
        Swal.fire({
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 3000,
          timerProgressBar: true,
          icon: 'error',
          title: t('view_page.status_update_failed')
        })
      }
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#31BCFF]"></div>
      </div>
    )
  }

  if (error || !entry) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-md max-w-md text-center">
          {error || t('view_page.not_found')}
          <div className="mt-4 space-y-2">
            <button
              onClick={() => router.push('/dashboard/payroll-entries')}
              className="w-full px-4 py-2 text-sm font-medium text-white bg-[#31BCFF] rounded-md hover:bg-[#31BCFF]/90"
            >
              {t('view_page.back_button')}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6 py-4 sm:py-6">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-blue-100">
        <div className="flex flex-col space-y-4">
          <div className="flex items-start sm:items-center gap-3 sm:gap-4">
            <button
              onClick={() => router.push('/dashboard/payroll-entries')}
              className="p-2 hover:bg-white/50 rounded-lg sm:rounded-xl transition-colors duration-200 flex-shrink-0"
            >
              <ChevronLeftIcon className="w-5 h-5 text-gray-600" />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                {t('view_page.title')}
              </h1>
              <p className="mt-1 sm:mt-2 text-sm sm:text-base text-gray-600 truncate">
                {entry.employee.firstName} {entry.employee.lastName} - {entry.payrollPeriod.name}
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={handleChangeStatus}
              className="inline-flex items-center justify-center px-4 py-2 text-xs sm:text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {t('view_page.change_status')}
            </button>
            {/* <button
              onClick={handleDownloadPayslip}
              className="inline-flex items-center justify-center px-4 py-2 text-xs sm:text-sm font-medium text-white bg-[#31BCFF] rounded-lg hover:bg-[#31BCFF]/90 transition-colors"
            >
              <DocumentArrowDownIcon className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">{t('view_page.download_payslip')}</span>
              <span className="sm:hidden">{t('view_page.payslip')}</span>
            </button> */}
            {/* <button
              onClick={handleEdit}
              className="inline-flex items-center justify-center px-4 py-2 text-xs sm:text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <PencilIcon className="w-4 h-4 mr-2" />
              {t('view_page.edit')}
            </button> */}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="space-y-4 sm:space-y-6">

          {/* Hours & Rates */}
          <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
            <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
              <ClockIcon className="w-5 h-5 sm:w-6 sm:h-6 text-[#31BCFF]" />
              <h3 className="text-base sm:text-lg font-semibold text-gray-900">{t('view_page.work_summary')}</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-lg border border-gray-200 p-4 bg-gray-50">
                <p className="text-xs text-gray-500">{t('view_page.total_work_hours')}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{(entry.breakdownTotals?.workedHours ?? 0).toFixed(2)}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {t('view_page.hours_summary_line', {
                    scheduled: (entry.breakdownTotals?.scheduledHours ?? entry.breakdownTotals?.workedHours ?? 0).toFixed(2),
                    break: (entry.breakdownTotals?.breakHours ?? 0).toFixed(2)
                  })}
                </p>
              </div>
              <div className="rounded-lg border border-gray-200 p-4 bg-gray-50">
                <p className="text-xs text-gray-500">{t('view_page.salary_amount')}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(entry.grossPay)}</p>
              </div>
              <div className="rounded-lg border border-gray-200 p-4 bg-gray-50">
                <p className="text-xs text-gray-500">{t('view_page.total_shifts')}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{(entry.breakdownTotals?.totalShifts ?? 0).toFixed(0)}</p>
              </div>
              <div className="rounded-lg border border-gray-200 p-4 bg-gray-50">
                <p className="text-xs text-gray-500">{t('view_page.basic_salary_rate')}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(entry.breakdownTotals?.basicSalaryRate ?? entry.regularRate)}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {t('view_page.effective_rate_summary', {
                    amount: formatAmount(entry.breakdownTotals?.averageEffectiveRate ?? entry.regularRate)
                  })}
                </p>
              </div>
            </div>
          </div>

          {/* Payment Breakdown */}
          
          {/* Daily Breakdown */}
          <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
            <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
              <CalendarIcon className="w-5 h-5 sm:w-6 sm:h-6 text-[#31BCFF]" />
              <h3 className="text-base sm:text-lg font-semibold text-gray-900">{t('view_page.daily_earnings_deductions')}</h3>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-xs sm:text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">{t('view_page.date')}</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">{t('view_page.shift_types')}</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-600">{t('view_page.rate_per_hour')}</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-600">{t('view_page.worked_hours')}</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-600">{t('view_page.earned')}</th>
                    {/* <th className="px-3 py-2 text-right font-medium text-gray-600">{t('view_page.reduced')}</th> */}
                    <th className="px-3 py-2 text-right font-medium text-gray-600">{t('view_page.net')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(entry.dailyBreakdown || []).map((day) => (
                    <tr key={day.date}>
                      <td className="px-3 py-2 text-gray-900">{formatDay(day.date)}</td>
                      <td className="px-3 py-2 text-gray-900">
                        <div className="font-medium">{day.shiftTypeLabel || t('view_page.normal_shift')}</div>
                        <div className="text-[11px] text-gray-500 mt-0.5">{getPayCalculationText(day.payCalculationRules)}</div>
                      </td>
                      <td className="px-3 py-2 text-right text-gray-900">
                        <div>{day.effectiveRateLabel || '-'}</div>
                        <div className="text-[11px] text-gray-500 mt-0.5">
                          {getRateSummaryText(day)}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right text-gray-900">
                        <div>{day.payableHours.toFixed(2)}</div>
                        <div className="text-[11px] text-gray-500 mt-0.5">
                          {t('view_page.hours_summary_line', {
                            scheduled: day.scheduledHours.toFixed(2),
                            break: day.totalBreakHours.toFixed(2)
                          })}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right text-green-700">
                        <div>{formatCurrency(day.earned + day.bonus)}</div>
                        <div className="text-[11px] text-gray-500 mt-0.5">
                          {t('view_page.earned_summary_line', {
                            hours: day.payableHours.toFixed(2),
                            rate: formatAmount(day.effectiveRate ?? 0)
                          })}
                        </div>
                      </td>
                      {/* <td className="px-3 py-2 text-right text-red-700">-{formatCurrency(day.deduction)}</td> */}
                      <td className="px-3 py-2 text-right font-semibold text-gray-900">{formatCurrency(day.net)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 border-t border-gray-200">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold text-gray-900">{t('view_page.totals')}</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-900">-</th>
                    <th className="px-3 py-2 text-right font-semibold text-gray-900">
                      {formatAmount(entry.breakdownTotals?.averageEffectiveRate ?? entry.regularRate)}
                    </th>
                    <th className="px-3 py-2 text-right font-semibold text-gray-900">
                      {(entry.breakdownTotals?.workedHours ?? 0).toFixed(2)}
                    </th>
                    <th className="px-3 py-2 text-right font-semibold text-green-700">
                      {formatCurrency((entry.breakdownTotals?.earned ?? 0) + (entry.breakdownTotals?.bonus ?? 0))}
                    </th>
                    {/* <th className="px-3 py-2 text-right font-semibold text-red-700">
                      -{formatCurrency(entry.breakdownTotals?.deduction ?? 0)}
                    </th> */}
                    <th className="px-3 py-2 text-right font-semibold text-gray-900">
                      {formatCurrency(entry.breakdownTotals?.net ?? 0)}
                    </th>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
      </div>
    </div>
  )
}
