'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  ClockIcon, 
  UserIcon, 
  CalendarIcon,
  ArrowsRightLeftIcon,
  HandRaisedIcon,
  CheckIcon,
  XMarkIcon,
  EyeIcon
} from '@heroicons/react/24/outline'
import Swal from 'sweetalert2'
import { useTranslation } from 'react-i18next'

interface Employee {
  id: string
  firstName: string
  lastName: string
  employeeNo: string
  department: {
    name: string
  }
}

interface Shift {
  id: string
  date: string
  startTime: string
  endTime: string | null
  shiftType: string
  employee: Employee
}

interface ShiftExchange {
  id: string
  status: 'EMPLOYEE_PENDING' | 'EMPLOYEE_ACCEPTED' | 'EMPLOYEE_REJECTED' | 'ADMIN_PENDING' | 'APPROVED' | 'REJECTED'
  type: 'SWAP' | 'HANDOVER'
  reason: string
  requestedAt: string
  approvedAt?: string | null
  approvedBy?: string | null
  employeeResponseAt?: string | null
  employeeResponseBy?: string | null
  fromEmployee: Employee
  toEmployee: Employee
  shift: Shift
}

export default function PendingRequestsPage() {
  const { t } = useTranslation('pending-requests')
  const [pendingExchanges, setPendingExchanges] = useState<ShiftExchange[]>([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [selectedExchange, setSelectedExchange] = useState<ShiftExchange | null>(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [activeTab, setActiveTab] = useState<'swap' | 'handover'>('swap')

  useEffect(() => {
    fetchPendingExchanges()
  }, [])

  const fetchPendingExchanges = async () => {
    try {
      setLoading(true)
      // Only fetch exchanges that have been accepted by employees and are pending admin approval
      const response = await fetch('/api/shift-exchanges?status=EMPLOYEE_ACCEPTED')
      if (response.ok) {
        const data = await response.json()
        setPendingExchanges(data)
      } else {
        console.error(t('errors.fetch_failed'))
      }
    } catch (error) {
      console.error('Error fetching pending exchanges:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleApproveReject = async (exchangeId: string, status: 'APPROVED' | 'REJECTED') => {
    setProcessingId(exchangeId)
    try {
      const response = await fetch(`/api/shift-exchanges/${exchangeId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      })

      if (response.ok) {
        Swal.fire({
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 3000,
          timerProgressBar: true,
          icon: 'success',
          title: t(status === 'APPROVED' ? 'success.approved' : 'success.rejected')
        })
        await fetchPendingExchanges() // Refresh the list
      } else {
        const error = await response.json()
        Swal.fire({
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 3000,
          timerProgressBar: true,
          icon: 'error',
          title: error.error || t(status === 'APPROVED' ? 'errors.approve_failed' : 'errors.reject_failed')
        })
      }
    } catch (error) {
      console.error(`Error ${status.toLowerCase()}ing exchange:`, error)
      Swal.fire({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        icon: 'error',
        title: t(status === 'APPROVED' ? 'errors.approve_failed' : 'errors.reject_failed')
      })
    } finally {
      setProcessingId(null)
    }
  }

  const showDetails = (exchange: ShiftExchange) => {
    setSelectedExchange(exchange)
    setShowDetailsModal(true)
  }

  const getExchangeType = (exchange: ShiftExchange): 'SWAP' | 'HANDOVER' => {
    // Use the type field if available, otherwise fall back to reason inference
    if (exchange.type) {
      return exchange.type
    }
    
    if (exchange.reason.toLowerCase().includes('swap')) {
      return 'SWAP'
    } else if (exchange.reason.toLowerCase().includes('handover')) {
      return 'HANDOVER'
    }
    // Default to SWAP if we can't determine
    return 'SWAP'
  }

  // Filter exchanges based on active tab
  const filteredExchanges = pendingExchanges.filter(exchange => {
    const type = getExchangeType(exchange)
    return activeTab === 'swap' ? type === 'SWAP' : type === 'HANDOVER'
  })

  const swapCount = pendingExchanges.filter(exchange => getExchangeType(exchange) === 'SWAP').length
  const handoverCount = pendingExchanges.filter(exchange => getExchangeType(exchange) === 'HANDOVER').length

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const formatTime = (timeString: string) => {
    return timeString.substring(0, 5) // Returns HH:MM format
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'SWAP':
        return <ArrowsRightLeftIcon className="w-5 h-5 text-blue-600" />
      case 'HANDOVER':
        return <HandRaisedIcon className="w-5 h-5 text-green-600" />
      default:
        return <ClockIcon className="w-5 h-5 text-gray-600" />
    }
  }

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'SWAP':
        return 'bg-blue-100 text-blue-800'
      case 'HANDOVER':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-sky-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-6">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-blue-100">
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
              {t('title')}
            </h1>
            <p className="mt-2 text-sm sm:text-base text-gray-600">
              {t('subtitle')}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="px-2 sm:px-3 py-1 text-xs sm:text-sm">
                {pendingExchanges.length} {t('total')}
              </Badge>
              <Badge variant="outline" className="px-2 sm:px-3 py-1 text-xs sm:text-sm">
                {swapCount} {t('swaps')}
              </Badge>
              <Badge variant="outline" className="px-2 sm:px-3 py-1 text-xs sm:text-sm">
                {handoverCount} {t('handovers')}
              </Badge>
            </div>
            <Button 
              onClick={fetchPendingExchanges}
              variant="outline"
              className="flex items-center justify-center gap-2 text-sm"
              size="sm"
            >
              <ClockIcon className="w-4 h-4" />
              {t('refresh')}
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white/80 backdrop-blur-xl rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-gray-200/50 shadow-lg">
        <div className="border-b border-gray-200 overflow-x-auto">
          <nav className="-mb-px flex space-x-4 sm:space-x-8">
            <button
              onClick={() => setActiveTab('swap')}
              className={`py-2 px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap ${
                activeTab === 'swap'
                  ? 'border-sky-500 text-sky-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-1 sm:gap-2">
                <ArrowsRightLeftIcon className="w-4 h-4 flex-shrink-0" />
                <span className="hidden sm:inline">{t('tabs.swap_requests')}</span>
                <span className="sm:hidden">Swaps</span>
                {swapCount > 0 && (
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {swapCount}
                  </Badge>
                )}
              </div>
            </button>
            <button
              onClick={() => setActiveTab('handover')}
              className={`py-2 px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap ${
                activeTab === 'handover'
                  ? 'border-sky-500 text-sky-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-1 sm:gap-2">
                <HandRaisedIcon className="w-4 h-4 flex-shrink-0" />
                <span className="hidden sm:inline">{t('tabs.shift_requests')}</span>
                <span className="sm:hidden">Handovers</span>
                {handoverCount > 0 && (
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {handoverCount}
                  </Badge>
                )}
              </div>
            </button>
          </nav>
        </div>
        <div className="flex items-center justify-between mt-4 text-xs sm:text-sm text-gray-500">
          <span>{t('showing', { count: filteredExchanges.length, total: pendingExchanges.length })}</span>
        </div>
      </div>

      {/* Pending Requests List */}
      {filteredExchanges.length === 0 ? (
        <div className="bg-white/80 backdrop-blur-xl rounded-xl sm:rounded-2xl p-8 sm:p-12 border border-gray-200/50 shadow-lg text-center">
          <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            {activeTab === 'swap' ? (
              <ArrowsRightLeftIcon className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" />
            ) : (
              <HandRaisedIcon className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" />
            )}
          </div>
          <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">
            {activeTab === 'swap' ? t('empty.no_swap_requests') : t('empty.no_shift_requests')}
          </h3>
          <p className="text-sm sm:text-base text-gray-500">
            {activeTab === 'swap' ? t('empty.swap_processed') : t('empty.shift_processed')}
          </p>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden lg:block bg-white/80 backdrop-blur-xl rounded-xl sm:rounded-2xl border border-gray-200/50 shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50/80">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('table.type')}
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('table.from_employee')}
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('table.to_employee')}
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('table.shift_date_time')}
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('table.requested')}
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('table.actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200/50">
                  {filteredExchanges.map((exchange) => (
                    <tr key={exchange.id} className="hover:bg-blue-50/30 transition-colors duration-200">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {getTypeIcon(getExchangeType(exchange))}
                        <Badge className={getTypeBadgeColor(getExchangeType(exchange))}>
                          {getExchangeType(exchange)}
                        </Badge>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {exchange.fromEmployee.firstName} {exchange.fromEmployee.lastName}
                        </div>
                        <div className="text-sm text-gray-500">
                          {exchange.fromEmployee.employeeNo} • {exchange.fromEmployee.department.name}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {exchange.toEmployee.firstName} {exchange.toEmployee.lastName}
                        </div>
                        <div className="text-sm text-gray-500">
                          {exchange.toEmployee.employeeNo} • {exchange.toEmployee.department.name}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {new Date(exchange.shift.date).toLocaleDateString()}
                        </div>
                        <div className="text-sm text-gray-500">
                          {formatTime(exchange.shift.startTime)} - {exchange.shift.endTime ? formatTime(exchange.shift.endTime) : t('shift_details.open_end')}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {new Date(exchange.requestedAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => showDetails(exchange)}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
                          title={t('actions.view_details')}
                        >
                          <EyeIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleApproveReject(exchange.id, 'REJECTED')}
                          disabled={processingId === exchange.id}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200 disabled:opacity-50"
                          title={t('actions.reject_request')}
                        >
                          <XMarkIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleApproveReject(exchange.id, 'APPROVED')}
                          disabled={processingId === exchange.id}
                          className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all duration-200 disabled:opacity-50"
                          title={t('actions.approve_request')}
                        >
                          <CheckIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Card View */}
          <div className="lg:hidden space-y-4">
            {filteredExchanges.map((exchange) => (
              <div key={exchange.id} className="bg-white/80 backdrop-blur-xl rounded-xl border border-gray-200/50 shadow-lg p-4">
                {/* Type Badge */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {getTypeIcon(getExchangeType(exchange))}
                    <Badge className={getTypeBadgeColor(getExchangeType(exchange))}>
                      {getExchangeType(exchange)}
                    </Badge>
                  </div>
                  <button
                    onClick={() => showDetails(exchange)}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
                  >
                    <EyeIcon className="w-5 h-5" />
                  </button>
                </div>

                {/* From Employee */}
                <div className="mb-3 pb-3 border-b border-gray-100">
                  <div className="text-xs text-gray-500 mb-1">{t('table.from_employee')}</div>
                  <div className="text-sm font-medium text-gray-900">
                    {exchange.fromEmployee.firstName} {exchange.fromEmployee.lastName}
                  </div>
                  <div className="text-xs text-gray-500">
                    {exchange.fromEmployee.employeeNo} • {exchange.fromEmployee.department.name}
                  </div>
                </div>

                {/* To Employee */}
                <div className="mb-3 pb-3 border-b border-gray-100">
                  <div className="text-xs text-gray-500 mb-1">{t('table.to_employee')}</div>
                  <div className="text-sm font-medium text-gray-900">
                    {exchange.toEmployee.firstName} {exchange.toEmployee.lastName}
                  </div>
                  <div className="text-xs text-gray-500">
                    {exchange.toEmployee.employeeNo} • {exchange.toEmployee.department.name}
                  </div>
                </div>

                {/* Shift Info */}
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <div className="text-xs text-gray-500 mb-1">{t('table.shift_date_time')}</div>
                    <div className="text-sm font-medium text-gray-900">
                      {new Date(exchange.shift.date).toLocaleDateString()}
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatTime(exchange.shift.startTime)} - {exchange.shift.endTime ? formatTime(exchange.shift.endTime) : t('shift_details.open_end')}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">{t('table.requested')}</div>
                    <div className="text-sm font-medium text-gray-900">
                      {new Date(exchange.requestedAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-3 border-t border-gray-100">
                  <button
                    onClick={() => handleApproveReject(exchange.id, 'REJECTED')}
                    disabled={processingId === exchange.id}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-all duration-200 disabled:opacity-50"
                  >
                    <XMarkIcon className="w-4 h-4" />
                    {t('actions.reject')}
                  </button>
                  <button
                    onClick={() => handleApproveReject(exchange.id, 'APPROVED')}
                    disabled={processingId === exchange.id}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-all duration-200 disabled:opacity-50"
                  >
                    <CheckIcon className="w-4 h-4" />
                    {t('actions.approve')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedExchange && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowDetailsModal(false)}
          />
          
          {/* Modal */}
          <div className="relative bg-white rounded-xl sm:rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-sky-50 to-blue-50 p-4 sm:p-6 border-b border-gray-200">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2 sm:gap-3 flex-1 min-w-0">
                  <div className="flex-shrink-0 mt-0.5">
                    {getTypeIcon(getExchangeType(selectedExchange))}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg sm:text-xl font-semibold text-gray-900">
                      {t('modal.request_details')}
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-600 mt-1">
                      {getExchangeType(selectedExchange) === 'SWAP' ? t('modal.shift_swap') : t('modal.shift_handover')} {t('modal.request')}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-1 flex-shrink-0"
                >
                  <XMarkIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-4 sm:p-6 overflow-y-auto max-h-[60vh]">
              <div className="space-y-4 sm:space-y-6">
                {/* Request Information */}
                <div>
                  <h4 className="text-sm sm:text-base font-medium text-gray-900 mb-2 sm:mb-3">{t('request_info.title')}</h4>
                  <div className="bg-gray-50 rounded-lg p-3 sm:p-4 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">{t('request_info.request_type')}:</span>
                        <p className="font-medium">{t(`types.${getExchangeType(selectedExchange).toLowerCase()}`)}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">{t('request_info.status')}:</span>
                        <p className="font-medium">{selectedExchange.status}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">{t('request_info.requested_date')}:</span>
                        <p className="font-medium">{new Date(selectedExchange.requestedAt).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">{t('request_info.request_time')}:</span>
                        <p className="font-medium">{new Date(selectedExchange.requestedAt).toLocaleTimeString()}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Employee Information */}
                <div>
                  <h4 className="text-sm sm:text-base font-medium text-gray-900 mb-2 sm:mb-3">{t('employee_info.title')}</h4>
                  <div className="grid grid-cols-1 gap-3 sm:gap-4">
                    <div className="bg-blue-50 rounded-lg p-3 sm:p-4">
                      <h5 className="text-sm font-medium text-blue-900 mb-2">{t('employee_info.from_employee')}</h5>
                      <div className="space-y-1 text-xs sm:text-sm">
                        <p><span className="font-medium">{t('employee_info.name')}:</span> {selectedExchange.fromEmployee.firstName} {selectedExchange.fromEmployee.lastName}</p>
                        <p><span className="font-medium">{t('employee_info.employee_no')}:</span> {selectedExchange.fromEmployee.employeeNo}</p>
                        <p><span className="font-medium">{t('employee_info.department')}:</span> {selectedExchange.fromEmployee.department.name}</p>
                      </div>
                    </div>
                    
                    <div className="bg-green-50 rounded-lg p-3 sm:p-4">
                      <h5 className="text-sm font-medium text-green-900 mb-2">{t('employee_info.to_employee')}</h5>
                      <div className="space-y-1 text-xs sm:text-sm">
                        <p><span className="font-medium">{t('employee_info.name')}:</span> {selectedExchange.toEmployee.firstName} {selectedExchange.toEmployee.lastName}</p>
                        <p><span className="font-medium">{t('employee_info.employee_no')}:</span> {selectedExchange.toEmployee.employeeNo}</p>
                        <p><span className="font-medium">{t('employee_info.department')}:</span> {selectedExchange.toEmployee.department.name}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Shift Details */}
                <div>
                  <h4 className="text-sm sm:text-base font-medium text-gray-900 mb-2 sm:mb-3">{t('shift_details.title')}</h4>
                  <div className="bg-sky-50 rounded-lg p-3 sm:p-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm">
                      <div>
                        <span className="text-gray-500">{t('shift_details.date')}:</span>
                        <p className="font-medium">{formatDate(selectedExchange.shift.date)}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">{t('shift_details.time')}:</span>
                        <p className="font-medium">
                          {formatTime(selectedExchange.shift.startTime)} - {selectedExchange.shift.endTime ? formatTime(selectedExchange.shift.endTime) : t('shift_details.open_end')}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500">{t('shift_details.shift_type')}:</span>
                        <p className="font-medium">{selectedExchange.shift.shiftType || t('shift_details.regular_shift')}</p>
                      </div>
                      {selectedExchange.shift.employee && selectedExchange.shift.employee.department && (
                        <div>
                          <span className="text-gray-500">{t('employee_info.department')}:</span>
                          <p className="font-medium">{selectedExchange.shift.employee.department.name}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Request Reason */}
                {selectedExchange.reason && (
                  <div>
                    <h4 className="text-sm sm:text-base font-medium text-gray-900 mb-2 sm:mb-3">{t('request_reason.title')}</h4>
                    <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                      <p className="text-xs sm:text-sm text-gray-700">{selectedExchange.reason}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer with Actions */}
            <div className="bg-gray-50 px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-200">
              <div className="flex flex-col-reverse sm:flex-row justify-between gap-3">
                <Button
                  onClick={() => setShowDetailsModal(false)}
                  variant="outline"
                  size="sm"
                  className="w-full sm:w-auto"
                >
                  {t('modal.close')}
                </Button>
                
                <div className="flex items-center gap-2 sm:gap-3">
                  <Button
                    onClick={() => {
                      handleApproveReject(selectedExchange.id, 'REJECTED')
                      setShowDetailsModal(false)
                    }}
                    disabled={processingId === selectedExchange.id}
                    variant="outline"
                    size="sm"
                    className="flex-1 sm:flex-none text-red-600 border-red-300 hover:bg-red-50"
                  >
                    <XMarkIcon className="w-4 h-4 mr-1 sm:mr-2" />
                    {t('actions.reject')}
                  </Button>
                  
                  <Button
                    onClick={() => {
                      handleApproveReject(selectedExchange.id, 'APPROVED')
                      setShowDetailsModal(false)
                    }}
                    disabled={processingId === selectedExchange.id}
                    size="sm"
                    className="flex-1 sm:flex-none bg-green-600 hover:bg-green-700"
                  >
                    <CheckIcon className="w-4 h-4 mr-1 sm:mr-2" />
                    {t('actions.approve')}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
