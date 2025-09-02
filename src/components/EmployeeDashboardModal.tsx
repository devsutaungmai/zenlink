'use client'

import React, { useState, useEffect } from 'react'
import { 
  XMarkIcon, 
  ClockIcon, 
  PlayIcon,
  StopIcon,
  CalendarIcon,
  UserIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'
import { LocationValidationResult, validatePunchLocation } from '@/lib/locationValidation'
import LocationValidationModal from '@/components/LocationValidationModal'

interface Employee {
  id: string
  firstName: string
  lastName: string
  employeeNo: string
  department: {
    name: string
  }
  employeeGroup?: {
    name: string
  }
  email: string
  mobile: string
  isTeamLeader: boolean
}

interface Shift {
  id: string
  date: string
  startTime: string
  endTime: string | null
  shiftType: string
  approved: boolean
  wage: number
  wageType: string
  note?: string
  employee: {
    id: string
    firstName: string
    lastName: string
    employeeNo: string
  }
  employeeGroup?: {
    name: string
  }
}

interface EmployeeDashboardModalProps {
  isOpen: boolean
  onClose: () => void
  employee: Employee | null
}

export default function EmployeeDashboardModal({ isOpen, onClose, employee }: EmployeeDashboardModalProps) {
  const [todayShifts, setTodayShifts] = useState<Shift[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [punchAction, setPunchAction] = useState<'in' | 'out' | null>(null)
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [showLocationModal, setShowLocationModal] = useState(false)
  const [pendingPunchAction, setPendingPunchAction] = useState<{
    action: 'in' | 'out'
    shift: Shift
  } | null>(null)

  useEffect(() => {
    if (isOpen && employee) {
      fetchTodayShifts()
    }
    
    // Update current time every second
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(timeInterval)
  }, [isOpen, employee])

  const fetchTodayShifts = async () => {
    if (!employee) return

    setLoading(true)
    setError('')

    try {
      const today = new Date()
      const startDate = today.toISOString().split('T')[0]
      const endDate = startDate

      const response = await fetch(`/api/shifts?employeeId=${employee.id}&startDate=${startDate}&endDate=${endDate}`)
      
      if (response.ok) {
        const shifts = await response.json()
        setTodayShifts(shifts)
      } else {
        setError('Failed to load today\'s shifts')
      }
    } catch (error) {
      console.error('Error fetching shifts:', error)
      setError('Failed to load shifts')
    } finally {
      setLoading(false)
    }
  }

  const handlePunchIn = async (shift: Shift) => {
    // Set pending action and show location modal for validation
    setPendingPunchAction({ action: 'in', shift })
    setShowLocationModal(true)
  }

  const handlePunchOut = async (shift: Shift) => {
    // Set pending action and show location modal for validation
    setPendingPunchAction({ action: 'out', shift })
    setShowLocationModal(true)
  }

  const executePunchAction = async () => {
    if (!pendingPunchAction) return

    const { action, shift } = pendingPunchAction
    setSelectedShift(shift)
    setPunchAction(action)
    
    try {
      const now = new Date()
      const currentTime = now.toTimeString().substring(0, 5) // HH:MM format

      const response = await fetch('/api/shifts/punch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          shiftId: shift.id,
          action: action,
          time: currentTime
        })
      })

      if (response.ok) {
        // Refresh shifts after successful punch
        await fetchTodayShifts()
        alert(`Successfully punched ${action}!`)
      } else {
        const data = await response.json()
        alert(data.error || `Failed to punch ${action}`)
      }
    } catch (error) {
      console.error(`Error punching ${action}:`, error)
      alert(`Failed to punch ${action}`)
    } finally {
      setPunchAction(null)
      setSelectedShift(null)
      setPendingPunchAction(null)
      setShowLocationModal(false)
    }
  }

  const handleLocationValidationSuccess = () => {
    // Location validation passed, execute the punch action
    setShowLocationModal(false)
    executePunchAction()
  }

  const handleLocationValidationFailed = (result: LocationValidationResult) => {
    // Location validation failed, show error and reset state
    setPendingPunchAction(null)
    setShowLocationModal(false)
    alert(result.message)
  }

  const formatTime = (timeString: string) => {
    return timeString.substring(0, 5) // Returns HH:MM format
  }

  const calculateShiftDuration = (startTime: string, endTime?: string | null) => {
    if (!endTime) {
      // Calculate current duration for active shifts
      const now = new Date()
      const currentTime = now.toTimeString().substring(0, 5)
      return calculateTimeDifference(startTime, currentTime)
    }
    return calculateTimeDifference(startTime, endTime)
  }

  const calculateTimeDifference = (start: string, end: string) => {
    const [startHours, startMinutes] = start.split(':').map(Number)
    const [endHours, endMinutes] = end.split(':').map(Number)
    
    const startTotalMinutes = startHours * 60 + startMinutes
    let endTotalMinutes = endHours * 60 + endMinutes
    
    // Handle next day scenario
    if (endTotalMinutes < startTotalMinutes) {
      endTotalMinutes += 24 * 60
    }
    
    const diffMinutes = endTotalMinutes - startTotalMinutes
    const hours = Math.floor(diffMinutes / 60)
    const minutes = diffMinutes % 60
    
    return `${hours}h ${minutes}m`
  }

  const getShiftStatus = (shift: Shift) => {
    if (!shift.endTime) return { text: 'Active', color: 'text-green-600 bg-green-100' }
    if (shift.approved) return { text: 'Completed', color: 'text-blue-600 bg-blue-100' }
    return { text: 'Pending', color: 'text-yellow-600 bg-yellow-100' }
  }

  if (!isOpen || !employee) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <UserIcon className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900">
                  Welcome, {employee.firstName}!
                </h3>
                <p className="text-sm text-gray-600">
                  {employee.employeeNo} • {employee.department.name}
                </p>
                {employee.employeeGroup && (
                  <p className="text-xs text-blue-600">
                    {employee.employeeGroup.name}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
          
          {/* Current Time */}
          <div className="mt-4 text-center">
            <div className="text-2xl font-bold text-blue-600">
              {currentTime.toLocaleTimeString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit',
                second: '2-digit',
                hour12: true
              })}
            </div>
            <div className="text-sm text-gray-500">
              {currentTime.toLocaleDateString('en-US', { 
                weekday: 'long', 
                month: 'long', 
                day: 'numeric',
                year: 'numeric'
              })}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          <div className="flex items-center gap-2 mb-4">
            <CalendarIcon className="w-5 h-5 text-gray-500" />
            <h4 className="text-lg font-semibold text-gray-900">Today's Shifts</h4>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : error ? (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
              <ExclamationTriangleIcon className="w-5 h-5 text-red-500 flex-shrink-0" />
              <span className="text-sm text-red-700">{error}</span>
            </div>
          ) : todayShifts.length === 0 ? (
            <div className="text-center py-8">
              <ClockIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">No shifts scheduled for today</p>
            </div>
          ) : (
            <div className="space-y-4">
              {todayShifts.map((shift) => {
                const status = getShiftStatus(shift)
                const isActive = !shift.endTime
                
                return (
                  <div
                    key={shift.id}
                    className="bg-gray-50 rounded-xl p-4 border border-gray-200 hover:border-blue-300 transition-all duration-200 cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <ClockIcon className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <h5 className="font-medium text-gray-900">{shift.shiftType}</h5>
                          <p className="text-sm text-gray-600">
                            {formatTime(shift.startTime)} - {shift.endTime ? formatTime(shift.endTime) : 'Active'}
                          </p>
                        </div>
                      </div>
                      <span className={`px-3 py-1 text-xs rounded-full font-medium ${status.color}`}>
                        {status.text}
                      </span>
                    </div>

                    {shift.note && (
                      <p className="text-sm text-gray-600 mb-3 italic">
                        Note: {shift.note}
                      </p>
                    )}

                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-500">
                        Duration: {calculateShiftDuration(shift.startTime, shift.endTime)}
                      </div>
                      
                      <div className="flex gap-2">
                        {!shift.endTime ? (
                          <button
                            onClick={() => handlePunchOut(shift)}
                            disabled={punchAction === 'out' && selectedShift?.id === shift.id}
                            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-lg transition-colors text-sm font-medium"
                          >
                            {punchAction === 'out' && selectedShift?.id === shift.id ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                Punching Out...
                              </>
                            ) : (
                              <>
                                <StopIcon className="w-4 h-4" />
                                Punch Out
                              </>
                            )}
                          </button>
                        ) : (
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <CheckCircleIcon className="w-4 h-4" />
                            Completed
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
          <div className="flex justify-between items-center">
            <p className="text-xs text-gray-500">
              Tap on a shift to punch in/out
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors text-sm font-medium"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Location Validation Modal */}
      <LocationValidationModal
        isOpen={showLocationModal}
        onClose={() => {
          setShowLocationModal(false)
          setPendingPunchAction(null)
        }}
        onValidationSuccess={handleLocationValidationSuccess}
        onValidationFailed={handleLocationValidationFailed}
      />
    </div>
  )
}
