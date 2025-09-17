'use client'

import { useState, useEffect } from 'react'
import { CalendarIcon, UserGroupIcon, ClockIcon, ChartBarIcon, PlayIcon, CheckCircleIcon } from '@heroicons/react/24/outline'
import { useUser } from '@/app/lib/useUser'
import PunchClockModal from '@/components/PunchClockModal'
import ActiveShiftTimer from '@/components/ActiveShiftTimer'

interface Employee {
  id: string
  firstName: string
  lastName: string
  userId: string
  businessId?: string
  department?: {
    id: string
    name: string
    businessId: string
  }
}

interface EmployeeGroup {
  id: string
  name: string
}

interface Department {
  id: string
  name: string
}

interface ActiveShift {
  id: string
  startTime: string
  date: string
  approved?: boolean
  status?: 'SCHEDULED' | 'WORKING' | 'COMPLETED' | 'CANCELLED'
  shiftType?: string
  breakStart?: string | null
  breakEnd?: string | null
  department?: {
    name: string
  }
  employeeGroup?: {
    name: string
  }
}

interface TodayShift {
  id: string
  date: string
  startTime: string
  endTime: string | null
  shiftType: string
  approved: boolean
  status: 'SCHEDULED' | 'WORKING' | 'COMPLETED' | 'CANCELLED'
  breakStart?: string | null
  breakEnd?: string | null
  employeeGroup?: {
    name: string
  }
  department?: {
    name: string
  }
}

interface Attendance {
  id: string
  employeeId: string
  businessId: string
  shiftId?: string | null
  punchInTime: string
  punchOutTime?: string | null
  shift?: TodayShift | null
}

const stats = [
  { name: 'Total Employees', value: '25', icon: UserGroupIcon },
  { name: 'Hours Scheduled', value: '156', icon: ClockIcon },
  { name: 'Shifts Today', value: '12', icon: CalendarIcon },
  { name: 'Weekly Hours', value: '480', icon: ChartBarIcon },
]

export default function DashboardPage() {
  const { user, loading } = useUser()
  const [showShiftModal, setShowShiftModal] = useState(false)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [employeeGroups, setEmployeeGroups] = useState<EmployeeGroup[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [submittingShift, setSubmittingShift] = useState(false)
  const [activeShift, setActiveShift] = useState<ActiveShift | null>(null)
  const [loadingActiveShift, setLoadingActiveShift] = useState(false)
  const [endingShift, setEndingShift] = useState(false)
  const [todayShift, setTodayShift] = useState<TodayShift | null>(null)
  const [loadingTodayShift, setLoadingTodayShift] = useState(false)
  const [currentAttendance, setCurrentAttendance] = useState<Attendance | null>(null)
  const [clockingIn, setClockingIn] = useState(false)
  const [clockingOut, setClockingOut] = useState(false)
  const [isOnBreak, setIsOnBreak] = useState(false)
  const [breakLoading, setBreakLoading] = useState(false)

  // Fetch data needed for the shift form and check for active shifts
  useEffect(() => {
    if (user?.role === 'EMPLOYEE') {
      fetchEmployees()
      fetchEmployeeGroups()
      fetchDepartments()
      fetchActiveShift()
    }
  }, [user])

  // Fetch today's shift after employees are loaded
  useEffect(() => {
    if (user?.role === 'EMPLOYEE' && employees.length > 0) {
      fetchTodayShift()
      fetchCurrentAttendance()
    }
  }, [employees, user])

  const fetchEmployees = async () => {
    try {
      const response = await fetch('/api/employees')
      if (response.ok) {
        const data = await response.json()
        setEmployees(data)
      }
    } catch (error) {
      console.error('Error fetching employees:', error)
    }
  }

  const fetchEmployeeGroups = async () => {
    try {
      const response = await fetch('/api/employee-groups')
      if (response.ok) {
        const data = await response.json()
        setEmployeeGroups(data)
      }
    } catch (error) {
      console.error('Error fetching employee groups:', error)
    }
  }

  const fetchDepartments = async () => {
    try {
      const response = await fetch('/api/departments')
      if (response.ok) {
        const data = await response.json()
        setDepartments(data)
      }
    } catch (error) {
      console.error('Error fetching departments:', error)
    }
  }

  const fetchActiveShift = async () => {
    setLoadingActiveShift(true)
    try {
      const response = await fetch('/api/shifts/active')
      if (response.ok) {
        const data = await response.json()
        const activeShiftData = data.activeShift
        setActiveShift(activeShiftData || null)
        
        // Check if user is currently on break
        if (activeShiftData && activeShiftData.breakStart && !activeShiftData.breakEnd) {
          setIsOnBreak(true)
        } else {
          setIsOnBreak(false)
        }
      } else {
        setActiveShift(null)
        setIsOnBreak(false)
      }
    } catch (error) {
      console.error('Error fetching active shift:', error)
      setActiveShift(null)
      setIsOnBreak(false)
    } finally {
      setLoadingActiveShift(false)
    }
  }

  const fetchTodayShift = async () => {
    const currentEmployee = employees.find(emp => emp.userId === user?.id)
    
    if (!currentEmployee) {
      return
    }

    setLoadingTodayShift(true)
    try {
      const today = new Date().toISOString().split('T')[0]
      const response = await fetch(`/api/shifts?startDate=${today}&endDate=${today}&employeeId=${currentEmployee.id}`)
      
      if (response.ok) {
        const shifts = await response.json()
        
        // Find today's approved shift assigned to this employee
        const todayApprovedShift = shifts.find((shift: TodayShift) => 
          shift.date.substring(0, 10) === today && 
          shift.approved === true
        )
        
        setTodayShift(todayApprovedShift || null)
        
        // Also check if this scheduled shift has break status
        if (todayApprovedShift && todayApprovedShift.breakStart && !todayApprovedShift.breakEnd) {
          setIsOnBreak(true)
        }
      }
    } catch (error) {
      console.error('Error fetching today\'s shift:', error)
    } finally {
      setLoadingTodayShift(false)
    }
  }

  const fetchCurrentAttendance = async () => {
    const currentEmployee = employees.find(emp => emp.userId === user?.id)
    
    if (!currentEmployee) {
      return
    }

    try {
      const today = new Date().toISOString().split('T')[0]
      const response = await fetch(`/api/attendance?employeeId=${currentEmployee.id}&date=${today}`)
      
      if (response.ok) {
        const attendances = await response.json()
        // Find current attendance (punched in but not out)
        const currentAtt = attendances.find((att: Attendance) => !att.punchOutTime)
        setCurrentAttendance(currentAtt || null)
      }
    } catch (error) {
      console.error('Error fetching current attendance:', error)
    }
  }

  const handleStartNewShift = () => {
    setShowShiftModal(true)
  }

  const handleShiftFormSubmit = async (formData: any) => {
    console.log('🚀 Submitting shift form with data:', formData)
    setSubmittingShift(true)
    try {
      const response = await fetch('/api/shifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        const result = await response.json()
        console.log('✅ Shift created successfully:', result)
        setShowShiftModal(false)
        await fetchActiveShift()
      } else {
        const errorData = await response.json()
        console.error('❌ Failed to create shift:', errorData)
        throw new Error('Failed to create shift')
      }
    } catch (error) {
      console.error('Error creating shift:', error)
    } finally {
      setSubmittingShift(false)
    }
  }

  const handleEndShift = async (shiftId: string) => {
    setEndingShift(true)
    try {
      const response = await fetch(`/api/shifts/${shiftId}/end`, {
        method: 'PATCH',
      })

      if (response.ok) {
        setActiveShift(null)
      } else {
        throw new Error('Failed to end shift')
      }
    } catch (error) {
      console.error('Error ending shift:', error)
    } finally {
      setEndingShift(false)
    }
  }

  const handlePunchIn = async () => {
    const currentEmployee = employees.find(emp => emp.userId === user?.id)
    if (!currentEmployee) return

    setClockingIn(true)
    try {
      const now = new Date()
      const punchInData = {
        employeeId: currentEmployee.id,
        businessId: currentEmployee.businessId || currentEmployee.department?.businessId,
        shiftId: todayShift?.id || null,
        punchInTime: now.toISOString()
      }

      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(punchInData),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to punch in')
      }

      const result = await res.json()
      setCurrentAttendance(result.attendance)
      
      // Refresh today's shift and attendance data
      await fetchTodayShift()
      await fetchCurrentAttendance()
    } catch (error: any) {
      console.error('Error punching in:', error)
      alert(error.message || 'Failed to punch in')
    } finally {
      setClockingIn(false)
    }
  }

  const handlePunchOut = async () => {
    if (!currentAttendance) return

    setClockingOut(true)
    try {
      const now = new Date()
      const res = await fetch(`/api/attendance/${currentAttendance.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          punchOutTime: now.toISOString()
        }),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to punch out')
      }

      setCurrentAttendance(null)
      
      // Refresh today's shift and attendance data
      await fetchTodayShift()
      await fetchCurrentAttendance()
    } catch (error: any) {
      console.error('Error punching out:', error)
      alert(error.message || 'Failed to punch out')
    } finally {
      setClockingOut(false)
    }
  }

  const handleStartBreak = async () => {
    // Determine which approach to use based on available data
    if (activeShift) {
      // Use existing shift break endpoint for "Start New Shift" scenarios
      await handleStartBreakForShift(activeShift.id)
    } else if (currentAttendance?.shiftId && todayShift) {
      // Use existing shift break endpoint for scheduled shifts
      await handleStartBreakForShift(todayShift.id)
    } else if (currentAttendance && !currentAttendance.shiftId) {
      // Use attendance break endpoint for unscheduled work
      await handleStartBreakForAttendance(currentAttendance.id)
    } else {
      alert('No active work session found to start break')
      return
    }
  }

  const handleStartBreakForShift = async (shiftId: string) => {
    setBreakLoading(true)
    try {
      const res = await fetch(`/api/shifts/${shiftId}/break`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to start break')
      }

      const updatedShift = await res.json()
      
      // Update the appropriate shift state
      if (activeShift && activeShift.id === shiftId) {
        setActiveShift(updatedShift)
      }
      
      setIsOnBreak(true)
    } catch (error: any) {
      console.error('Error starting break for shift:', error)
      alert(error.message || 'Failed to start break')
    } finally {
      setBreakLoading(false)
    }
  }

  const handleStartBreakForAttendance = async (attendanceId: string) => {
    setBreakLoading(true)
    try {
      const res = await fetch(`/api/attendance/${attendanceId}/break`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to start break')
      }

      const result = await res.json()
      
      // Refresh attendance and shift data since a shift was auto-created
      await fetchCurrentAttendance()
      await fetchTodayShift()
      
      setIsOnBreak(true)
    } catch (error: any) {
      console.error('Error starting break for attendance:', error)
      alert(error.message || 'Failed to start break')
    } finally {
      setBreakLoading(false)
    }
  }

  const handleEndBreak = async () => {
    setBreakLoading(true)
    
    try {
      let shiftToUse = null
      
      // Priority 1: Use activeShift (from "Start New Shift")
      if (activeShift) {
        shiftToUse = activeShift
      }
      // Priority 2: If attendance has a shiftId, fetch that shift (for auto-created shifts from unscheduled work)
      else if (currentAttendance?.shiftId) {
        try {
          const shiftRes = await fetch(`/api/shifts/${currentAttendance.shiftId}`)
          if (shiftRes.ok) {
            shiftToUse = await shiftRes.json()
          }
        } catch (error) {
          console.error('Error fetching attendance shift:', error)
        }
      }
      // Priority 3: Use todayShift (scheduled shift)
      else if (todayShift) {
        shiftToUse = todayShift
      }
      
      if (!shiftToUse) {
        alert('No active shift found to end break')
        return
      }

      const res = await fetch(`/api/shifts/${shiftToUse.id}/break`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to end break')
      }

      const updatedShift = await res.json()
      
      // Update the appropriate shift state
      if (activeShift && updatedShift.id === activeShift.id) {
        setActiveShift(updatedShift)
      }
      // Refresh attendance and shift data if this was an auto-created shift
      else if (currentAttendance?.shiftId === updatedShift.id) {
        await fetchCurrentAttendance()
        await fetchTodayShift()
      }
      
      setIsOnBreak(false)
    } catch (error: any) {
      console.error('Error ending break:', error)
      alert(error.message || 'Failed to end break')
    } finally {
      setBreakLoading(false)
    }
  }

  const currentEmployee = employees.find(emp => 
    emp.userId === user?.id
  )

  const getInitialShiftData = () => {
    const now = new Date()
    const today = now.toISOString().split('T')[0]
    const currentTime = now.toTimeString().split(' ')[0].substring(0, 5)

    return {
      date: today,
      startTime: currentTime,
      employeeId: currentEmployee?.id || '',
      employeeGroupId: '',
      shiftType: 'NORMAL',
      wage: 0,
      wageType: 'HOURLY',
      approved: false,
      note: ''
    }
  }

  if (loading) {
    return (
      <div className="py-8 px-4 sm:px-6 lg:px-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-gray-200 h-24 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
      </div>

      {/* Today's Shift Section - Only for Employees */}
      {user?.role === 'EMPLOYEE' && (
        <div className="mt-8">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Today's Schedule</h3>
              {loadingTodayShift ? (
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              ) : todayShift ? (
                <div className="bg-sky-50 border border-sky-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <CalendarIcon className="h-8 w-8 text-sky-600" />
                      <div>
                        <h4 className="font-semibold text-sky-800">
                          {todayShift.startTime.substring(0, 5)} - {todayShift.endTime ? todayShift.endTime.substring(0, 5) : 'Active'}
                        </h4>
                        <p className="text-sm text-sky-600">
                          {todayShift.shiftType} {todayShift.employeeGroup && `• ${todayShift.employeeGroup.name}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end space-y-2">
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          todayShift.status === 'WORKING' ? 'bg-green-100 text-green-800' :
                          todayShift.status === 'COMPLETED' ? 'bg-blue-100 text-blue-800' :
                          todayShift.status === 'CANCELLED' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {todayShift.status}
                        </span>
                        {todayShift.approved && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                            <CheckCircleIcon className="w-3 h-3 mr-1" />
                            Approved
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Punch In/Out Buttons */}
                  <div className="mt-4 pt-4 border-t border-sky-200">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-sky-600">
                        {currentAttendance ? (
                          <span className="flex items-center">
                            <CheckCircleIcon className="w-4 h-4 mr-1 text-green-500" />
                            Punched in at {new Date(currentAttendance.punchInTime).toLocaleTimeString('en-US', { 
                              hour: 'numeric', 
                              minute: '2-digit' 
                            })}
                            {isOnBreak && (
                              <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                On Break
                              </span>
                            )}
                          </span>
                        ) : (
                          <span>Ready to punch in</span>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        {!currentAttendance ? (
                          <button
                            onClick={handlePunchIn}
                            disabled={clockingIn}
                            className="inline-flex items-center px-3 py-2 text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                          >
                            <PlayIcon className="w-4 h-4 mr-1" />
                            {clockingIn ? 'Punching In...' : 'Punch In'}
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={handlePunchOut}
                              disabled={clockingOut}
                              className="inline-flex items-center px-3 py-2 text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                            >
                              <ClockIcon className="w-4 h-4 mr-1" />
                              {clockingOut ? 'Punching Out...' : 'Punch Out'}
                            </button>
                            
                            {/* Break buttons - show if there's an active shift or if attendance is linked to a shift */}
                            {(activeShift || currentAttendance?.shiftId) && (
                              !isOnBreak ? (
                                <button
                                  onClick={handleStartBreak}
                                  disabled={breakLoading}
                                  className="inline-flex items-center px-3 py-2 text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50"
                                >
                                  <ClockIcon className="w-4 h-4 mr-1" />
                                  {breakLoading ? 'Starting...' : 'Start Break'}
                                </button>
                              ) : (
                                <button
                                  onClick={handleEndBreak}
                                  disabled={breakLoading}
                                  className="inline-flex items-center px-3 py-2 text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                                >
                                  <PlayIcon className="w-4 h-4 mr-1" />
                                  {breakLoading ? 'Ending...' : 'End Break'}
                                </button>
                              )
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                // No scheduled shift - allow punch in/out for unscheduled work
                <div className="space-y-4">
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <CalendarIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-600">No approved shift scheduled for today</p>
                    <p className="text-sm text-gray-500 mt-1">You can still punch in for unscheduled work</p>
                  </div>
                  
                  {/* Punch In/Out for Unscheduled Work */}
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold text-orange-800 mb-1">Unscheduled Work</h4>
                        <div className="text-sm text-orange-600">
                          {currentAttendance ? (
                            <span className="flex items-center">
                              <CheckCircleIcon className="w-4 h-4 mr-1 text-green-500" />
                              Punched in at {new Date(currentAttendance.punchInTime).toLocaleTimeString('en-US', { 
                                hour: 'numeric', 
                                minute: '2-digit' 
                              })}
                              {isOnBreak && (
                                <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                  On Break
                                </span>
                              )}
                            </span>
                          ) : (
                            <span>Ready to punch in for unscheduled work</span>
                          )}
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        {!currentAttendance ? (
                          <button
                            onClick={handlePunchIn}
                            disabled={clockingIn}
                            className="inline-flex items-center px-3 py-2 text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                          >
                            <PlayIcon className="w-4 h-4 mr-1" />
                            {clockingIn ? 'Punching In...' : 'Punch In'}
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={handlePunchOut}
                              disabled={clockingOut}
                              className="inline-flex items-center px-3 py-2 text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                            >
                              <ClockIcon className="w-4 h-4 mr-1" />
                              {clockingOut ? 'Punching Out...' : 'Punch Out'}
                            </button>
                            
                            {/* Break buttons are available for all punched in work */}
                            {!isOnBreak ? (
                              <button
                                onClick={handleStartBreak}
                                disabled={breakLoading}
                                className="inline-flex items-center px-3 py-2 text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50"
                              >
                                <ClockIcon className="w-4 h-4 mr-1" />
                                {breakLoading ? 'Starting...' : 'Start Break'}
                              </button>
                            ) : (
                              <button
                                onClick={handleEndBreak}
                                disabled={breakLoading}
                                className="inline-flex items-center px-3 py-2 text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                              >
                                <PlayIcon className="w-4 h-4 mr-1" />
                                {breakLoading ? 'Ending...' : 'End Break'}
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.name}
            className="bg-white overflow-hidden shadow rounded-lg"
          >
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <stat.icon className="h-6 w-6 text-gray-400" aria-hidden="true" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      {stat.name}
                    </dt>
                    <dd className="flex items-baseline">
                      <div className="text-2xl font-semibold text-gray-900">
                        {stat.value}
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="mt-8">
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Recent Activity
            </h3>
            <div className="mt-4">
              <div className="border-t border-gray-200">
                <p className="py-4 text-sm text-gray-500">No recent activity</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Punch Clock Modal */}
      {user?.role === 'EMPLOYEE' && (
        <PunchClockModal
          isOpen={showShiftModal}
          onClose={() => setShowShiftModal(false)}
          initialData={getInitialShiftData()}
          employees={employees}
          employeeGroups={employeeGroups}
          departments={departments}
          onSubmit={handleShiftFormSubmit}
          loading={submittingShift}
        />
      )}
    </div>
  )
}