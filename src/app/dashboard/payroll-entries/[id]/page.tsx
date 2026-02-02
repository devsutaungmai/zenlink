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
            <button
              onClick={handleDownloadPayslip}
              className="inline-flex items-center justify-center px-4 py-2 text-xs sm:text-sm font-medium text-white bg-[#31BCFF] rounded-lg hover:bg-[#31BCFF]/90 transition-colors"
            >
              <DocumentArrowDownIcon className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">{t('view_page.download_payslip')}</span>
              <span className="sm:hidden">{t('view_page.payslip')}</span>
            </button>
            <button
              onClick={handleEdit}
              className="inline-flex items-center justify-center px-4 py-2 text-xs sm:text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <PencilIcon className="w-4 h-4 mr-2" />
              {t('view_page.edit')}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Left Column - Main Details */}
        <div className="lg:col-span-2 space-y-4 sm:space-y-6">
          {/* Status Card */}
          <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 sm:gap-3">
                {getStatusIcon(entry.status)}
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900">{t('view_page.status')}</h3>
                  <p className="text-xs sm:text-sm text-gray-500">{t('view_page.current_status')}</p>
                </div>
              </div>
              <span className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium ${getStatusColor(entry.status)}`}>
                {entry.status === 'DRAFT' ? t('status.draft') : entry.status === 'APPROVED' ? t('status.approved') : t('status.paid')}
              </span>
            </div>
          </div>

          {/* Hours & Rates */}
          <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
            <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
              <ClockIcon className="w-5 h-5 sm:w-6 sm:h-6 text-[#31BCFF]" />
              <h3 className="text-base sm:text-lg font-semibold text-gray-900">{t('view_page.hours_rates')}</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <div className="space-y-3 sm:space-y-4">
                <div>
                  <label className="text-xs sm:text-sm font-medium text-gray-500">{t('view_page.regular_hours')}</label>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900">{entry.regularHours.toFixed(2)}</p>
                </div>
                <div>
                  <label className="text-xs sm:text-sm font-medium text-gray-500">{t('view_page.regular_rate')}</label>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900">{formatCurrency(entry.regularRate)}</p>
                </div>
                <div className="pt-3 sm:pt-4 border-t border-gray-200">
                  <label className="text-xs sm:text-sm font-medium text-gray-500">{t('view_page.regular_pay')}</label>
                  <p className="text-xl sm:text-2xl font-bold text-[#31BCFF]">
                    {formatCurrency(entry.regularHours * entry.regularRate)}
                  </p>
                </div>
              </div>

              <div className="space-y-3 sm:space-y-4">
                <div>
                  <label className="text-xs sm:text-sm font-medium text-gray-500">{t('view_page.overtime_hours')}</label>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900">{entry.overtimeHours.toFixed(2)}</p>
                </div>
                <div>
                  <label className="text-xs sm:text-sm font-medium text-gray-500">{t('view_page.overtime_rate')}</label>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900">{formatCurrency(entry.overtimeRate)}</p>
                </div>
                <div className="pt-3 sm:pt-4 border-t border-gray-200">
                  <label className="text-xs sm:text-sm font-medium text-gray-500">{t('view_page.overtime_pay')}</label>
                  <p className="text-xl sm:text-2xl font-bold text-[#31BCFF]">
                    {formatCurrency(entry.overtimeHours * entry.overtimeRate)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Breakdown */}
          <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
            <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
              <BanknotesIcon className="w-5 h-5 sm:w-6 sm:h-6 text-[#31BCFF]" />
              <h3 className="text-base sm:text-lg font-semibold text-gray-900">{t('view_page.payment_breakdown')}</h3>
            </div>

            <div className="space-y-3 sm:space-y-4">
              <div className="flex justify-between items-center pb-2">
                <span className="text-sm sm:text-base text-gray-600">{t('view_page.gross_pay')}</span>
                <span className="text-base sm:text-lg font-semibold text-gray-900">{formatCurrency(entry.grossPay)}</span>
              </div>
              
              <div className="flex justify-between items-center pb-2">
                <span className="text-sm sm:text-base text-gray-600">{t('view_page.bonuses')}</span>
                <span className="text-base sm:text-lg font-semibold text-green-600">+{formatCurrency(entry.bonuses)}</span>
              </div>
              
              <div className="flex justify-between items-center pb-3 sm:pb-4 border-b border-gray-200">
                <span className="text-sm sm:text-base text-gray-600">{t('view_page.deductions')}</span>
                <span className="text-base sm:text-lg font-semibold text-red-600">-{formatCurrency(entry.deductions)}</span>
              </div>
              
              <div className="flex justify-between items-center pt-2">
                <span className="text-base sm:text-lg font-bold text-gray-900">{t('view_page.net_pay')}</span>
                <span className="text-xl sm:text-2xl font-bold text-[#31BCFF]">{formatCurrency(entry.netPay)}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {entry.notes && (
            <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
              <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                <DocumentTextIcon className="w-5 h-5 sm:w-6 sm:h-6 text-[#31BCFF]" />
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">{t('view_page.notes')}</h3>
              </div>
              <p className="text-sm sm:text-base text-gray-700 whitespace-pre-wrap">{entry.notes}</p>
            </div>
          )}
        </div>

        {/* Right Column - Employee & Period Info */}
        <div className="space-y-4 sm:space-y-6">
          {/* Employee Information */}
          <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
            <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
              <UserIcon className="w-5 h-5 sm:w-6 sm:h-6 text-[#31BCFF]" />
              <h3 className="text-base sm:text-lg font-semibold text-gray-900">{t('view_page.employee')}</h3>
            </div>

            <div className="space-y-3 sm:space-y-4">
              <div>
                <label className="text-xs sm:text-sm font-medium text-gray-500">{t('view_page.name')}</label>
                <p className="text-sm sm:text-base font-medium text-gray-900">
                  {entry.employee.firstName} {entry.employee.lastName}
                </p>
              </div>

              {entry.employee.employeeNo && (
                <div>
                  <label className="text-xs sm:text-sm font-medium text-gray-500">{t('view_page.employee_no')}</label>
                  <p className="text-sm sm:text-base text-gray-900">{entry.employee.employeeNo}</p>
                </div>
              )}

              {entry.employee.email && (
                <div>
                  <label className="text-xs sm:text-sm font-medium text-gray-500">{t('view_page.email')}</label>
                  <p className="text-sm sm:text-base text-gray-900 break-all">{entry.employee.email}</p>
                </div>
              )}

              <div className="pt-3 sm:pt-4 border-t border-gray-200">
                <button
                  onClick={() => router.push(`/dashboard/employees/${entry.employee.id}/edit`)}
                  className="text-[#31BCFF] hover:text-[#31BCFF]/80 text-xs sm:text-sm font-medium"
                >
                  {t('view_page.view_employee_profile')} →
                </button>
              </div>
            </div>
          </div>

          {/* Payroll Period Information */}
          <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
            <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
              <CalendarIcon className="w-5 h-5 sm:w-6 sm:h-6 text-[#31BCFF]" />
              <h3 className="text-base sm:text-lg font-semibold text-gray-900">{t('view_page.payroll_period')}</h3>
            </div>

            <div className="space-y-3 sm:space-y-4">
              <div>
                <label className="text-xs sm:text-sm font-medium text-gray-500">{t('view_page.period_name')}</label>
                <p className="text-sm sm:text-base font-medium text-gray-900">{entry.payrollPeriod.name}</p>
              </div>

              <div>
                <label className="text-xs sm:text-sm font-medium text-gray-500">{t('view_page.start_date')}</label>
                <p className="text-sm sm:text-base text-gray-900">{formatDate(entry.payrollPeriod.startDate)}</p>
              </div>

              <div>
                <label className="text-xs sm:text-sm font-medium text-gray-500">{t('view_page.end_date')}</label>
                <p className="text-sm sm:text-base text-gray-900">{formatDate(entry.payrollPeriod.endDate)}</p>
              </div>

              <div>
                <label className="text-xs sm:text-sm font-medium text-gray-500">{t('view_page.period_status')}</label>
                <p className="text-sm sm:text-base text-gray-900">
                  <span className={`inline-block px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium ${
                    entry.payrollPeriod.status === 'CLOSED' ? 'bg-gray-100 text-gray-800' :
                    entry.payrollPeriod.status === 'FINALIZED' ? 'bg-blue-100 text-blue-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {entry.payrollPeriod.status === 'DRAFT' ? t('status.draft') : entry.payrollPeriod.status === 'FINALIZED' ? t('status.approved') : t('status.paid')}
                  </span>
                </p>
              </div>

              <div className="pt-3 sm:pt-4 border-t border-gray-200">
                <button
                  onClick={() => router.push(`/dashboard/payroll-periods`)}
                  className="text-[#31BCFF] hover:text-[#31BCFF]/80 text-xs sm:text-sm font-medium"
                >
                  {t('view_page.view_all_periods')} →
                </button>
              </div>
            </div>
          </div>

          {/* Metadata */}
          <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 sm:mb-4">{t('view_page.record_info')}</h3>
            
            <div className="space-y-2 sm:space-y-3 text-xs sm:text-sm">
              <div>
                <label className="text-gray-500">{t('view_page.created')}</label>
                <p className="text-gray-900">{formatDateTime(entry.createdAt)}</p>
              </div>
              
              <div>
                <label className="text-gray-500">{t('view_page.last_updated')}</label>
                <p className="text-gray-900">{formatDateTime(entry.updatedAt)}</p>
              </div>
              
              <div>
                <label className="text-gray-500">{t('view_page.entry_id')}</label>
                <p className="text-gray-900 font-mono text-[10px] sm:text-xs break-all">{entry.id}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
