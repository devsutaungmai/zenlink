'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCurrency } from '@/hooks/useCurrency'
import { LocationValidationResult, validatePunchLocation } from '@/lib/locationValidation'
import LocationValidationModal from '@/components/LocationValidationModal'
import { 
  ClockIcon, 
  PlayIcon,
  StopIcon,
  CalendarIcon,
  UserIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowLeftIcon,
  PlusIcon,
  XMarkIcon,
  MapPinIcon
} from '@heroicons/react/24/outline'

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

function EmployeeDashboardContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const employeeId = searchParams.get('employeeId')
  const { currencySymbol } = useCurrency()
  
  const [employee, setEmployee] = useState<Employee | null>(null)
  const [todayShifts, setTodayShifts] = useState<Shift[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [punchAction, setPunchAction] = useState<'in' | 'out' | null>(null)
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [showPunchForm, setShowPunchForm] = useState(false)
  const [isNewShift, setIsNewShift] = useState(false)
  const [showLocationModal, setShowLocationModal] = useState(false)
  const [pendingPunchAction, setPendingPunchAction] = useState<{
    action: 'in' | 'out'
    shift?: Shift
  } | null>(null)
  const [punchFormData, setPunchFormData] = useState({
    shiftType: '',
    startTime: '',
    note: '',
    wage: '',
    wageType: 'hourly'
  })

  useEffect(() => {
    if (!employeeId) {
      router.push('/time-tracking')
      return
    }

    fetchEmployeeData()
    fetchTodayShifts()
    
    // Update current time every second
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(timeInterval)
  }, [employeeId, router])

  const fetchEmployeeData = async () => {
    if (!employeeId) return

    try {
      const response = await fetch(`/api/employees/${employeeId}`)
      if (response.ok) {
        const employeeData = await response.json()
        setEmployee(employeeData)
      } else {
        setError('Failed to load employee data')
      }
    } catch (error) {
      console.error('Error fetching employee:', error)
      setError('Failed to load employee data')
    }
  }

  const fetchTodayShifts = async () => {
    if (!employeeId) return

    try {
      const today = new Date()
      const startDate = today.toISOString().split('T')[0]
      const endDate = startDate

      const response = await fetch(`/api/shifts?employeeId=${employeeId}&startDate=${startDate}&endDate=${endDate}`)
      
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

  const handleOpenPunchForm = (shift?: Shift) => {
    if (shift) {
      // Pre-fill form with shift data
      setIsNewShift(false)
      setSelectedShift(shift)
      setPunchFormData({
        shiftType: shift.shiftType,
        startTime: shift.startTime,
        note: shift.note || '',
        wage: shift.wage.toString(),
        wageType: shift.wageType
      })
    } else {
      // Empty form for new shift
      setIsNewShift(true)
      setSelectedShift(null)
      const now = new Date()
      const currentTime = now.toTimeString().substring(0, 5)
      setPunchFormData({
        shiftType: '',
        startTime: currentTime,
        note: '',
        wage: '',
        wageType: 'hourly'
      })
    }
    setShowPunchForm(true)
  }

  const handleClosePunchForm = () => {
    setShowPunchForm(false)
    setIsNewShift(false)
    setSelectedShift(null)
    setPunchFormData({
      shiftType: '',
      startTime: '',
      note: '',
      wage: '',
      wageType: 'hourly'
    })
  }

  const handlePunchFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!employee) return

    try {
      if (isNewShift) {
        // For new shifts, validate location first
        const locationValidation = await validatePunchLocation()
        
        if (!locationValidation.isAllowed) {
          alert(locationValidation.message)
          return
        }

        // Create new shift and punch in
        const response = await fetch('/api/shifts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            employeeId: employee.id,
            date: new Date().toISOString().split('T')[0],
            startTime: punchFormData.startTime,
            shiftType: punchFormData.shiftType,
            wage: parseFloat(punchFormData.wage) || 0,
            wageType: punchFormData.wageType,
            note: punchFormData.note,
            approved: false
          })
        })

        if (response.ok) {
          alert('Successfully punched in!')
          await fetchTodayShifts()
          handleClosePunchForm()
        } else {
          const data = await response.json()
          alert(data.error || 'Failed to create shift')
        }
      } else if (selectedShift) {
        // Punch in to existing shift - this will trigger location validation via modal
        await handlePunchIn(selectedShift)
        handleClosePunchForm()
      }
    } catch (error) {
      console.error('Error in punch form submit:', error)
      alert('Failed to process punch in')
    }
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#31BCFF]"></div>
      </div>
    )
  }

  if (error || !employee) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-red-600 mb-4">
            {error || 'Employee not found'}
          </div>
          <button 
            onClick={() => router.push('/time-tracking')}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Back to Time Tracking
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100 mb-6">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => router.push('/time-tracking')}
              className="flex items-center gap-2 px-4 py-2 bg-white/70 hover:bg-white rounded-lg transition-colors"
            >
              <ArrowLeftIcon className="w-4 h-4" />
              Back to Portal
            </button>
            
            <div className="text-center">
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
          
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
              <UserIcon className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Welcome, {employee.firstName}!
              </h1>
              <p className="text-gray-600">
                {employee.employeeNo} • {employee.department.name}
              </p>
              {employee.employeeGroup && (
                <p className="text-sm text-blue-600">
                  {employee.employeeGroup.name}
                </p>
              )}
              {employee.isTeamLeader && (
                <span className="inline-block mt-1 px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full font-medium">
                  Team Leader
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Today's Shifts */}
        <div className="bg-white/90 backdrop-blur-xl rounded-2xl border border-gray-200/50 shadow-lg p-6">
          <div className="flex items-center gap-3 mb-6">
            <CalendarIcon className="w-6 h-6 text-gray-500" />
            <h2 className="text-xl font-semibold text-gray-900">Today's Shifts</h2>
          </div>

          {error ? (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
              <ExclamationTriangleIcon className="w-5 h-5 text-red-500 flex-shrink-0" />
              <span className="text-sm text-red-700">{error}</span>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {/* Scheduled Shifts */}
              {todayShifts.map((shift) => {
                const status = getShiftStatus(shift)
                const isActive = !shift.endTime
                
                return (
                  <div
                    key={shift.id}
                    className="bg-gray-50 rounded-xl p-6 border border-gray-200 hover:border-blue-300 transition-all duration-200 cursor-pointer"
                    onClick={() => !isActive && handleOpenPunchForm(shift)}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                          <ClockIcon className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{shift.shiftType}</h3>
                          <p className="text-sm text-gray-600">
                            {formatTime(shift.startTime)} - {shift.endTime ? formatTime(shift.endTime) : 'Active'}
                          </p>
                        </div>
                      </div>
                      <span className={`px-3 py-1 text-sm rounded-full font-medium ${status.color}`}>
                        {status.text}
                      </span>
                    </div>

                    {shift.note && (
                      <p className="text-sm text-gray-600 mb-4 italic bg-white p-3 rounded-lg">
                        Note: {shift.note}
                      </p>
                    )}

                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-500">
                        Duration: {calculateShiftDuration(shift.startTime, shift.endTime)}
                      </div>
                      
                      <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                        {!shift.endTime ? (
                          <button
                            onClick={() => handlePunchOut(shift)}
                            disabled={punchAction === 'out' && selectedShift?.id === shift.id}
                            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-lg transition-colors font-medium"
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
                          <>
                            <button
                              onClick={() => handleOpenPunchForm(shift)}
                              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium"
                            >
                              <PlayIcon className="w-4 h-4" />
                              Punch In
                            </button>
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                              <CheckCircleIcon className="w-4 h-4" />
                              {!isActive && 'Tap to punch in'}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}

              {/* Non-Scheduled Shift Card */}
              <div
                className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border-2 border-dashed border-green-300 hover:border-green-400 transition-all duration-200 cursor-pointer"
                onClick={() => handleOpenPunchForm()}
              >
                <div className="text-center">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <PlusIcon className="w-6 h-6 text-green-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">Punch In for Non-Scheduled Shift</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Start working on a shift that wasn't scheduled
                  </p>
                  <button className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium mx-auto">
                    <PlayIcon className="w-4 h-4" />
                    Punch In Now
                  </button>
                </div>
              </div>

              {todayShifts.length === 0 && (
                <div className="col-span-full text-center py-8">
                  <ClockIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No shifts scheduled today</h3>
                  <p className="text-gray-500 mb-4">Use the punch-in card above to start a non-scheduled shift</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Punch In Form Modal */}
        {showPunchForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div 
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={handleClosePunchForm}
            />
            
            {/* Modal */}
            <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <PlayIcon className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {isNewShift ? 'Punch In - New Shift' : 'Punch In - Scheduled Shift'}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {isNewShift ? 'Create and start a new shift' : 'Start your scheduled shift'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleClosePunchForm}
                    className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                  >
                    <XMarkIcon className="w-6 h-6" />
                  </button>
                </div>
              </div>

              {/* Form */}
              <form onSubmit={handlePunchFormSubmit} className="p-6 space-y-4">
                {/* Shift Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Shift Type
                  </label>
                  <input
                    type="text"
                    value={punchFormData.shiftType}
                    onChange={(e) => setPunchFormData(prev => ({ ...prev, shiftType: e.target.value }))}
                    placeholder="e.g., Morning Shift, Evening Shift"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                    disabled={!isNewShift}
                  />
                </div>

                {/* Start Time */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={punchFormData.startTime}
                    onChange={(e) => setPunchFormData(prev => ({ ...prev, startTime: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                {/* Wage (only for new shifts) */}
                {isNewShift && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Wage
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          step="0.01"
                          value={punchFormData.wage}
                          onChange={(e) => setPunchFormData(prev => ({ ...prev, wage: e.target.value }))}
                          placeholder="0.00"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          required
                        />
                        <select
                          value={punchFormData.wageType}
                          onChange={(e) => setPunchFormData(prev => ({ ...prev, wageType: e.target.value }))}
                          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="hourly">Hourly</option>
                          <option value="fixed">Fixed</option>
                        </select>
                      </div>
                    </div>
                  </>
                )}

                {/* Note */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Note (Optional)
                  </label>
                  <textarea
                    value={punchFormData.note}
                    onChange={(e) => setPunchFormData(prev => ({ ...prev, note: e.target.value }))}
                    placeholder="Add any notes about this shift..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  />
                </div>

                {/* Current Time Display */}
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-center">
                    <p className="text-sm text-gray-600 mb-1">Current Time</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {currentTime.toLocaleTimeString('en-US', { 
                        hour: '2-digit', 
                        minute: '2-digit',
                        second: '2-digit',
                        hour12: true
                      })}
                    </p>
                    <p className="text-sm text-gray-500">
                      {currentTime.toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        month: 'short', 
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                </div>

                {/* Form Actions */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={handleClosePunchForm}
                    className="flex-1 py-3 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 px-4 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium flex items-center justify-center gap-2"
                  >
                    <PlayIcon className="w-5 h-5" />
                    Punch In
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

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
    </div>
  )
}

// Loading component for Suspense fallback
function LoadingEmployeeDashboard() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ backgroundColor: '#E5F1FF' }}>
      <div className="w-full max-w-md">
        <div className="bg-white p-8 rounded-xl shadow-md">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold mb-2" style={{ color: '#0369A1' }}>Loading Dashboard...</h1>
          </div>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function EmployeeDashboardPage() {
  return (
    <Suspense fallback={<LoadingEmployeeDashboard />}>
      <EmployeeDashboardContent />
    </Suspense>
  )
}
