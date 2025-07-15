import React, { useState, useEffect } from 'react'
import { 
  ClockIcon, 
  UserIcon,
  CheckCircleIcon,
  XCircleIcon,
  CalendarIcon
} from '@heroicons/react/24/outline'
import Swal from 'sweetalert2'

interface Employee {
  id: string
  firstName: string
  lastName: string
  employeeNo?: string
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
  type: 'SWAP' | 'HANDOVER'
  status: string
  reason?: string
  requestedAt: string
  fromEmployee: Employee
  toEmployee: Employee
  shift: Shift
}

interface PendingRequestsModalProps {
  isOpen: boolean
  onClose: () => void
  employeeId: string
  onUpdate?: () => void
}

export default function PendingRequestsModal({ 
  isOpen, 
  onClose, 
  employeeId, 
  onUpdate 
}: PendingRequestsModalProps) {
  const [pendingRequests, setPendingRequests] = useState<ShiftExchange[]>([])
  const [rejectedRequests, setRejectedRequests] = useState<ShiftExchange[]>([])
  const [loading, setLoading] = useState(false)
  const [responding, setResponding] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'pending' | 'rejected'>('pending')

  useEffect(() => {
    if (isOpen) {
      fetchPendingRequests()
    }
  }, [isOpen])

  const fetchPendingRequests = async () => {
    try {
      setLoading(true)
      console.log('Fetching pending requests...')
      
      // Fetch pending requests
      const pendingResponse = await fetch('/api/employee/pending-requests')
      console.log('Pending response status:', pendingResponse.status)
      
      if (pendingResponse.ok) {
        const pendingData = await pendingResponse.json()
        console.log('Pending requests data:', pendingData)
        setPendingRequests(pendingData)
      } else {
        const errorData = await pendingResponse.json().catch(() => ({ error: 'Unknown error' }))
        console.error('Failed to fetch pending requests:', pendingResponse.status, errorData)
      }
      
      // Fetch rejected requests
      const rejectedResponse = await fetch('/api/employee/rejected-requests')
      console.log('Rejected response status:', rejectedResponse.status)
      
      if (rejectedResponse.ok) {
        const rejectedData = await rejectedResponse.json()
        console.log('Rejected requests data:', rejectedData)
        setRejectedRequests(rejectedData)
      } else {
        const errorData = await rejectedResponse.json().catch(() => ({ error: 'Unknown error' }))
        console.error('Failed to fetch rejected requests:', rejectedResponse.status, errorData)
      }
    } catch (error) {
      console.error('Error fetching requests:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleResponse = async (exchangeId: string, action: 'accept' | 'reject') => {
    try {
      setResponding(exchangeId)
      
      console.log(`Attempting to ${action} exchange ${exchangeId}`)
      
      const response = await fetch(`/api/shift-exchanges/${exchangeId}/employee-response`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action }),
      })

      console.log(`Response status: ${response.status}`)

      if (response.ok) {
        await Swal.fire({
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 3000,
          timerProgressBar: true,
          icon: 'success',
          title: `Request ${action}ed successfully!`
        })
        
        await fetchPendingRequests()
        if (onUpdate) onUpdate()
      } else {
        const errorText = await response.text()
        console.error('Error response:', errorText)
        
        let errorData
        try {
          errorData = JSON.parse(errorText)
        } catch (e) {
          errorData = { error: errorText || `Failed to ${action} request` }
        }
        
        throw new Error(errorData.error || `Failed to ${action} request`)
      }
    } catch (error) {
      console.error(`Error ${action}ing request:`, error)
      await Swal.fire({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        icon: 'error',
        title: error instanceof Error ? error.message : `Failed to ${action} request`
      })
    } finally {
      setResponding(null)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const formatTime = (timeString: string) => {
    return timeString.substring(0, 5) // HH:MM format
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <ClockIcon className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Shift Requests
                </h3>
                <p className="text-sm text-gray-600">
                  Review and respond to shift exchange requests
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 px-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('pending')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'pending'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <ClockIcon className="w-4 h-4" />
                Active Requests
                {pendingRequests.length > 0 && (
                  <span className="bg-blue-100 text-blue-600 text-xs px-2 py-0.5 rounded-full">
                    {pendingRequests.length}
                  </span>
                )}
              </div>
            </button>
            <button
              onClick={() => setActiveTab('rejected')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'rejected'
                  ? 'border-red-500 text-red-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <XCircleIcon className="w-4 h-4" />
                Rejected
                {rejectedRequests.length > 0 && (
                  <span className="bg-red-100 text-red-600 text-xs px-2 py-0.5 rounded-full">
                    {rejectedRequests.length}
                  </span>
                )}
              </div>
            </button>
          </nav>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Loading requests...</span>
            </div>
          ) : activeTab === 'pending' ? (
            pendingRequests.length === 0 ? (
              <div className="text-center py-8">
                <ClockIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Requests</h3>
                <p className="text-gray-500">You don't have any shift requests requiring your attention or waiting for admin approval.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingRequests.map((request) => (
                  <div key={request.id} className="bg-gray-50 rounded-xl border border-gray-200 p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                        {request.type === 'SWAP' ? (
                          <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m0-4l4-4" />
                          </svg>
                        ) : (
                          <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                          </svg>
                        )}
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">
                          Shift {request.type === 'SWAP' ? 'Swap' : 'Handover'} Request
                        </h4>
                        <p className="text-sm text-gray-600">
                          From: {request.fromEmployee.firstName} {request.fromEmployee.lastName}
                        </p>
                        <p className="text-xs text-gray-500">
                          {request.fromEmployee.department.name}
                        </p>
                      </div>
                    </div>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      request.status === 'EMPLOYEE_PENDING' 
                        ? 'bg-yellow-100 text-yellow-800' 
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {request.status === 'EMPLOYEE_PENDING' ? 'Pending Response' : 'Accepted - Waiting for Admin Approval'}
                    </span>
                  </div>

                  {/* Shift Details */}
                  <div className="bg-white rounded-lg p-4 mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <CalendarIcon className="w-4 h-4 text-gray-500" />
                      <span className="font-medium text-gray-900">Shift Details</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Date:</span>
                        <p className="font-medium">{formatDate(request.shift.date)}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Time:</span>
                        <p className="font-medium">
                          {formatTime(request.shift.startTime)} - {request.shift.endTime ? formatTime(request.shift.endTime) : 'Open End'}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-600">Type:</span>
                        <p className="font-medium">{request.shift.shiftType}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Requested:</span>
                        <p className="font-medium">{formatDate(request.requestedAt)}</p>
                      </div>
                    </div>
                    {request.reason && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <span className="text-gray-600 text-sm">Reason:</span>
                        <p className="text-sm text-gray-800 mt-1">{request.reason}</p>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons - Only show for EMPLOYEE_PENDING status */}
                  {request.status === 'EMPLOYEE_PENDING' && (
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleResponse(request.id, 'accept')}
                        disabled={responding === request.id}
                        className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                      >
                        {responding === request.id ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            Accepting...
                          </>
                        ) : (
                          <>
                            <CheckCircleIcon className="w-5 h-5" />
                            Accept Request
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => handleResponse(request.id, 'reject')}
                        disabled={responding === request.id}
                        className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                      >
                        {responding === request.id ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            Rejecting...
                          </>
                        ) : (
                          <>
                            <XCircleIcon className="w-5 h-5" />
                            Reject Request
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {/* Status message for EMPLOYEE_ACCEPTED */}
                  {request.status === 'EMPLOYEE_ACCEPTED' && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-center gap-2">
                        <CheckCircleIcon className="w-5 h-5 text-green-600" />
                        <span className="text-green-800 font-medium">Request Accepted</span>
                      </div>
                      <p className="text-green-700 text-sm mt-1">
                        You have accepted this request. It's now waiting for admin approval.
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )) : (
            // Rejected tab content
            rejectedRequests.length === 0 ? (
              <div className="text-center py-8">
                <XCircleIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Rejected Requests</h3>
                <p className="text-gray-500">You don't have any rejected shift requests.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {rejectedRequests.map((request) => (
                  <div key={request.id} className="bg-red-50 rounded-xl border border-red-200 p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                          {request.type === 'SWAP' ? (
                            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m0-4l4-4" />
                            </svg>
                          ) : (
                            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                            </svg>
                          )}
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">
                            Shift {request.type === 'SWAP' ? 'Swap' : 'Handover'} Request
                          </h4>
                          <p className="text-sm text-gray-600">
                            From: {request.fromEmployee.firstName} {request.fromEmployee.lastName}
                          </p>
                          <p className="text-xs text-gray-500">
                            {request.fromEmployee.department.name}
                          </p>
                        </div>
                      </div>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        request.status === 'EMPLOYEE_REJECTED' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {request.status === 'EMPLOYEE_REJECTED' ? 'Rejected by You' : 'Rejected by Admin'}
                      </span>
                    </div>

                    {/* Shift Details */}
                    <div className="bg-white rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <CalendarIcon className="w-4 h-4 text-gray-500" />
                        <span className="font-medium text-gray-900">Shift Details</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Date:</span>
                          <p className="font-medium">{formatDate(request.shift.date)}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Time:</span>
                          <p className="font-medium">
                            {formatTime(request.shift.startTime)} - {request.shift.endTime ? formatTime(request.shift.endTime) : 'Open End'}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-600">Type:</span>
                          <p className="font-medium">{request.shift.shiftType}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Requested:</span>
                          <p className="font-medium">{formatDate(request.requestedAt)}</p>
                        </div>
                      </div>
                      {request.reason && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <span className="text-gray-600 text-sm">Reason:</span>
                          <p className="text-sm text-gray-800 mt-1">{request.reason}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  )
}
