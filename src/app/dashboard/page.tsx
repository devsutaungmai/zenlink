'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState, useEffect } from 'react'
import { CalendarIcon, ClockIcon, CheckCircleIcon } from '@heroicons/react/24/outline'
import { useUser } from '@/shared/lib/useUser'
import PunchClockModal from '@/components/PunchClockModal'
import { LocationValidationResult, validatePunchLocation } from '@/shared/lib/locationValidation'
import LocationValidationModal from '@/components/LocationValidationModal'
import DepartmentSelectionModal from '@/components/DepartmentSelectionModal'
import { useTranslation } from 'react-i18next'
import { DashboardStatsSkeleton } from '@/components/skeletons/CommonSkeletons'

interface Employee {
  id: string
  firstName: string
  lastName: string
  userId: string
  department?: {
    id: string
    name: string
    businessId: string
  }
  employeeGroup?: {
    id: string
    name: string
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

interface WeeklyShift {
  id: string
  date: string
  startTime: string
  endTime: string | null
  shiftType: string
  status: 'SCHEDULED' | 'WORKING' | 'COMPLETED' | 'CANCELLED'
  approved?: boolean
  employee?: {
    firstName?: string | null
    lastName?: string | null
    department?: {
      name?: string | null
    } | null
  } | null
  employeeGroup?: {
    name?: string | null
  } | null
  department?: {
    name?: string | null
  } | null
  shiftTypeConfig?: {
    name?: string | null
  } | null
}

interface Attendance {
  id: string
  employeeId: string
  businessId: string
  shiftId?: string | null
  punchInTime: string
  punchOutTime?: string | null
  shift?: TodayShift | null
  employee?: {
    firstName?: string | null
    lastName?: string | null
    employeeNo?: string | null
    profilePhoto?: string | null
    department?: {
      name?: string | null
    } | null
    employeeGroup?: {
      name?: string | null
    } | null
  }
}

interface DashboardStats {
  activeEmployees: number
  shiftsInProgress: number
  pendingApprovals: number
  hoursWorkedThisWeek: number
}

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
  const [showLocationModal, setShowLocationModal] = useState(false)
  const [showDepartmentModal, setShowDepartmentModal] = useState(false)
  const [pendingPunchAction, setPendingPunchAction] = useState<'in' | 'out' | null>(null)
  const [pendingUnscheduledWork, setPendingUnscheduledWork] = useState(false)
  const [adminStats, setAdminStats] = useState<DashboardStats | null>(null)
  const [adminStatsLoading, setAdminStatsLoading] = useState(false)
  const [workDuration, setWorkDuration] = useState('')
  const [liveTimer, setLiveTimer] = useState('')
  const [recentAttendances, setRecentAttendances] = useState<Attendance[]>([])
  const [recentAttendanceLoading, setRecentAttendanceLoading] = useState(false)
  const [weeklyShifts, setWeeklyShifts] = useState<WeeklyShift[]>([])
  const [weeklyShiftsLoading, setWeeklyShiftsLoading] = useState(false)
  const {t} = useTranslation();
  const isEmployeeUser = user?.role === 'EMPLOYEE' || Boolean(user?.employee)
  const showAdminQuickCards = !isEmployeeUser
  const canAutoStartExtraShift = !todayShift || todayShift.status === 'COMPLETED'

  const formatDurationText = (ms: number) => {
    const totalMinutes = Math.floor(ms / (1000 * 60))
    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60
    if (hours <= 0) {
      return `${minutes}m`
    }
    return `${hours}h ${minutes}m`
  }

  const formatLiveTimerText = (seconds: number) => {
    if (seconds < 60) {
      return `${seconds.toString().padStart(2, '0')}s`
    }

    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }

    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

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

  useEffect(() => {
    if (!user || isEmployeeUser) {
      setAdminStats(null)
      return
    }

    let ignore = false
    const fetchAdminStats = async () => {
      setAdminStatsLoading(true)
      try {
        const response = await fetch('/api/dashboard/stats')
        if (!response.ok) {
          throw new Error('Failed to fetch dashboard stats')
        }
        const data = await response.json()
        if (!ignore) {
          setAdminStats(data)
        }
      } catch (error) {
        console.error('Error fetching dashboard stats:', error)
        if (!ignore) {
          setAdminStats(null)
        }
      } finally {
        if (!ignore) {
          setAdminStatsLoading(false)
        }
      }
    }

    fetchAdminStats()

    return () => {
      ignore = true
    }
  }, [user, isEmployeeUser])

  useEffect(() => {
    if (!showAdminQuickCards) {
      setRecentAttendances([])
      return
    }

    let ignore = false

    const fetchRecentAttendance = async () => {
      setRecentAttendanceLoading(true)
      try {
        const params = new URLSearchParams({ limit: '2' })
        const response = await fetch(`/api/attendance?${params.toString()}`)
        if (!response.ok) {
          throw new Error('Failed to fetch recent attendance')
        }
        const data = await response.json()
        if (!ignore) {
          setRecentAttendances(Array.isArray(data) ? data.slice(0, 2) : [])
        }
      } catch (error) {
        console.error('Error fetching recent attendance:', error)
        if (!ignore) {
          setRecentAttendances([])
        }
      } finally {
        if (!ignore) {
          setRecentAttendanceLoading(false)
        }
      }
    }

    fetchRecentAttendance()

    return () => {
      ignore = true
    }
  }, [showAdminQuickCards])

  useEffect(() => {
    if (!user) {
      return
    }

    const resolvedEmployeeId = isEmployeeUser
      ? user.employee?.id || employees.find(emp => emp.userId === user.id)?.id
      : null

    if (isEmployeeUser && !resolvedEmployeeId) {
      return
    }

    let ignore = false

    const fetchWeeklyShifts = async () => {
      setWeeklyShiftsLoading(true)
      try {
        const { start, end } = getCurrentWeekRange()
        const params = new URLSearchParams({
          startDate: start.toISOString().split('T')[0],
          endDate: end.toISOString().split('T')[0]
        })

        if (resolvedEmployeeId) {
          params.append('employeeId', resolvedEmployeeId)
        }

        const response = await fetch(`/api/shifts?${params.toString()}`)
        if (!response.ok) {
          throw new Error('Failed to fetch weekly shifts')
        }

        const data = await response.json()
        if (!ignore) {
          setWeeklyShifts(Array.isArray(data) ? data : [])
        }
      } catch (error) {
        console.error('Error fetching weekly shifts:', error)
        if (!ignore) {
          setWeeklyShifts([])
        }
      } finally {
        if (!ignore) {
          setWeeklyShiftsLoading(false)
        }
      }
    }

    fetchWeeklyShifts()

    return () => {
      ignore = true
    }
  }, [user, isEmployeeUser, employees])

  useEffect(() => {
    if (!currentAttendance) {
      setWorkDuration('')
      setLiveTimer('')
      return
    }

    const updateDuration = () => {
      try {
        const start = new Date(currentAttendance.punchInTime).getTime()
        const now = Date.now()
        const diffMs = now - start
        if (Number.isNaN(diffMs) || diffMs < 0) {
          setWorkDuration('')
          setLiveTimer('')
          return
        }

        setWorkDuration(formatDurationText(diffMs))
        setLiveTimer(formatLiveTimerText(Math.floor(diffMs / 1000)))
      } catch (error) {
        console.error('Error calculating work duration:', error)
        setWorkDuration('')
        setLiveTimer('')
      }
    }

    updateDuration()
    const interval = setInterval(updateDuration, 1000)
    return () => clearInterval(interval)
  }, [currentAttendance])

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
        
        const todayApprovedShift = shifts.find((shift: TodayShift) => 
          shift.date.substring(0, 10) === today && 
          shift.approved === true &&
          shift.status !== 'COMPLETED'
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

  const handlePrimaryShiftAction = () => {
    if (canAutoStartExtraShift && !currentAttendance) {
      handlePunchIn()
      return
    }

    handleStartNewShift()
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

    // Check if this is for unscheduled work (no todayShift)
    if (!todayShift) {
      // For unscheduled work, validate location first, then show department selection
      setPendingUnscheduledWork(true)
      setPendingPunchAction('in')
      setShowLocationModal(true)
    } else {
      // For scheduled shifts, just validate location and punch in
      setPendingPunchAction('in')
      setShowLocationModal(true)
    }
  }

  const handlePunchOut = async () => {
    if (!currentAttendance) return

    // Punch out directly without location validation
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

  const executePunchAction = async () => {
    if (!pendingPunchAction) return

    const currentEmployee = employees.find(emp => emp.userId === user?.id)
    if (!currentEmployee) return

    if (pendingPunchAction === 'in') {
      setClockingIn(true)
      try {
        const now = new Date()
        const punchInData = {
          employeeId: currentEmployee.id,
          businessId: currentEmployee.department?.businessId,
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

    // Reset state
    setPendingPunchAction(null)
    setShowLocationModal(false)
  }

  const handleLocationValidationSuccess = () => {
    // Location validation passed
    setShowLocationModal(false)
    
    // If this is for unscheduled work, show department selection
    if (pendingUnscheduledWork && pendingPunchAction === 'in') {
      setShowDepartmentModal(true)
    } else {
      // For scheduled shifts, execute punch action directly
      executePunchAction()
    }
  }

  const handleLocationValidationFailed = (result: LocationValidationResult) => {
    // Location validation failed, show error and reset state
    setPendingPunchAction(null)
    setPendingUnscheduledWork(false)
    setShowLocationModal(false)
    alert(result.message)
  }

  const handleDepartmentSelected = async (departmentId: string) => {
    // Department selected for validation, now execute punch in for unscheduled work
    setShowDepartmentModal(false)
    
    const currentEmployee = employees.find(emp => emp.userId === user?.id)
    if (!currentEmployee) return

    // Validate that the selected department is allowed at this location
    // This would typically involve checking location access settings
    // For now, we'll proceed with the punch in
    
    await executePunchActionWithDepartment()
    setPendingUnscheduledWork(false)
    setPendingPunchAction(null)
  }

  const executePunchActionWithDepartment = async () => {
    const currentEmployee = employees.find(emp => emp.userId === user?.id)
    if (!currentEmployee) return

    setClockingIn(true)
    try {
      const now = new Date()
      const punchInData = {
        employeeId: currentEmployee.id,
        businessId: currentEmployee.department?.businessId,
        shiftId: null, // No shift for unscheduled work
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

  const formatShiftTime = (time?: string | null) => {
    if (!time) return null
    return time.substring(0, 5)
  }

  const formatPunchTime = (iso?: string | null) => {
    if (!iso) return null
    try {
      return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
    } catch (error) {
      console.error('Error formatting time:', error)
      return null
    }
  }

  const formatPunchDate = (iso?: string | null) => {
    if (!iso) return null
    try {
      return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric' })
    } catch (error) {
      console.error('Error formatting date:', error)
      return null
    }
  }

  const getCurrentWeekRange = () => {
    const now = new Date()
    const day = now.getDay() // 0 (Sun) - 6 (Sat)
    const diff = day === 0 ? -6 : 1 - day
    const start = new Date(now)
    start.setDate(start.getDate() + diff)
    start.setHours(0, 0, 0, 0)
    const end = new Date(start)
    end.setDate(start.getDate() + 6)
    end.setHours(23, 59, 59, 999)
    return { start, end }
  }

  const formatWeekRangeDate = (date: Date) => {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
  }

  const getWeekRangeLabel = () => {
    const { start, end } = getCurrentWeekRange()
    return t('dashboard.weekly_shifts.range_label', {
      start: formatWeekRangeDate(start),
      end: formatWeekRangeDate(end)
    })
  }

  const formatShiftDateLabel = (iso?: string | null) => {
    if (!iso) return '--'
    try {
      return new Date(iso).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
    } catch (error) {
      console.error('Error formatting shift date label:', error)
      return '--'
    }
  }

  const getWeeklyShiftTimeLabel = (shift: WeeklyShift) => {
    const start = formatShiftTime(shift.startTime) || '--:--'
    const end = shift.endTime ? formatShiftTime(shift.endTime) : t('dashboard.cards.punch_clock.active')
    return `${start} - ${end}`
  }

  const getShiftStatusInfo = (status?: WeeklyShift['status']) => {
    const statusClasses: Record<string, string> = {
      WORKING: 'bg-green-100 text-green-700',
      COMPLETED: 'bg-blue-100 text-blue-700',
      CANCELLED: 'bg-red-100 text-red-700',
      SCHEDULED: 'bg-slate-200 text-slate-700'
    }

    if (!status) {
      return {
        label: t('dashboard.weekly_shifts.status.SCHEDULED'),
        classes: statusClasses.SCHEDULED
      }
    }

    return {
      label: t(`dashboard.weekly_shifts.status.${status}`),
      classes: statusClasses[status] || statusClasses.SCHEDULED
    }
  }

  const getWeeklyShiftSecondaryLine = (shift: WeeklyShift) => {
    if (isEmployeeUser) {
      const label = [shift.employeeGroup?.name, shift.department?.name].filter(Boolean).join(' • ')
      return label || t('dashboard.weekly_shifts.no_assignment')
    }

    const name = `${shift.employee?.firstName || ''} ${shift.employee?.lastName || ''}`.trim()
    const dept = shift.department?.name
    const label = [name || null, dept || null].filter(Boolean).join(' • ')
    return label || t('dashboard.weekly_shifts.unassigned_employee')
  }

  const getEmployeeDisplayName = (record: Attendance) => {
    const first = record.employee?.firstName?.trim() || ''
    const last = record.employee?.lastName?.trim() || ''
    const fullName = `${first} ${last}`.trim()
    return fullName || t('dashboard.attendance_feed.unknown_employee')
  }

  const getEmployeeInitials = (record: Attendance) => {
    const firstInitial = record.employee?.firstName?.[0]?.toUpperCase() || ''
    const lastInitial = record.employee?.lastName?.[0]?.toUpperCase() || ''
    const initials = `${firstInitial}${lastInitial}`.trim()
    return initials || '??'
  }

  const getWorkDurationLabel = (record: Attendance) => {
    try {
      const start = new Date(record.punchInTime).getTime()
      const end = record.punchOutTime ? new Date(record.punchOutTime).getTime() : Date.now()
      if (Number.isNaN(start) || Number.isNaN(end) || end <= start) {
        return '--'
      }
      return formatDurationText(end - start)
    } catch (error) {
      console.error('Error formatting work duration:', error)
      return '--'
    }
  }

  const getShiftSummary = (record: Attendance) => {
    if (record.shift?.startTime) {
      const start = formatShiftTime(record.shift.startTime) || '--:--'
      const end = record.shift.endTime ? formatShiftTime(record.shift.endTime) : t('dashboard.cards.punch_clock.active')
      const context = [record.shift.employeeGroup?.name, record.shift.department?.name].filter(Boolean).join(' • ')
      return context ? `${start} - ${end} • ${context}` : `${start} - ${end}`
    }

    const deptLine = [record.employee?.department?.name, record.employee?.employeeGroup?.name].filter(Boolean).join(' • ')
    return deptLine || t('dashboard.cards.attendance.unscheduled_label')
  }

  const hasScheduledShift = Boolean(todayShift && todayShift.status !== 'COMPLETED')

  const attendanceShiftWindow = currentAttendance?.shift
    ? `${formatShiftTime(currentAttendance.shift.startTime) || '--:--'} - ${currentAttendance.shift.endTime ? formatShiftTime(currentAttendance.shift.endTime) : t('dashboard.cards.punch_clock.active')}`
    : null
  const disablePrimaryShiftAction = clockingIn || !!currentAttendance
  const roleLabel = [
    currentEmployee?.employeeGroup?.name || t('dashboard.cards.attendance.default_role'),
    currentEmployee?.department?.name
  ]
    .filter(Boolean)
    .join(', ')

  const shiftWindowLabel = attendanceShiftWindow
    ? [
        attendanceShiftWindow,
        currentAttendance?.shift?.employeeGroup?.name,
        currentAttendance?.shift?.department?.name
      ].filter(Boolean).join(' • ')
    : (todayShift && todayShift.status !== 'COMPLETED'
        ? [
            `${formatShiftTime(todayShift.startTime) || '--:--'} - ${todayShift.endTime ? formatShiftTime(todayShift.endTime) : t('dashboard.cards.punch_clock.active')}`,
            todayShift.employeeGroup?.name,
            todayShift.department?.name
          ].filter(Boolean).join(' • ')
        : t('dashboard.cards.attendance.unscheduled_label'))

  const weeklyShiftsSubtitle = isEmployeeUser
    ? t('dashboard.weekly_shifts.subtitle_employee')
    : t('dashboard.weekly_shifts.subtitle_admin')
  const weeklyRangeLabel = getWeekRangeLabel()

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
        <DashboardStatsSkeleton />
      </div>
    )
  }

  return (
    <div className="bg-slate-50 min-h-screen py-2 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        {/* <div className="flex flex-col gap-1">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h1 className="text-3xl font-bold text-slate-900">{t('dashboard.overview_title')}</h1>
          </div>
        </div> */}
        <section className="mt-4 rounded-3xl bg-gradient-to-r from-[#1f3b73] via-[#1f5fdb] to-[#22a3ff] p-6 text-white shadow-[0_20px_60px_rgba(30,64,175,0.35)]">
              <p className="text-sm uppercase tracking-wide text-white/80">{t('dashboard.hero.caption')}</p>
              <h2 className="mt-2 text-2xl font-semibold">{t('dashboard.hero.title')}</h2>
              <p className="mt-2 max-w-2xl text-sm text-white/90">{t('dashboard.hero.description')}</p>
        </section>

        <section className="mt-6 rounded-3xl border border-slate-100 bg-white p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">{t('dashboard.weekly_shifts.title')}</p>
              <h3 className="text-2xl font-semibold text-slate-900">{weeklyShiftsSubtitle}</h3>
              <p className="text-xs text-slate-500">{weeklyRangeLabel}</p>
            </div>
            <Link href="/dashboard/schedule" className="text-sm font-semibold text-[#2563eb] hover:text-[#1d4ed8]">
              {t('dashboard.weekly_shifts.view_schedule')}
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {weeklyShiftsLoading ? (
              <div className="space-y-3">
                {[0, 1, 2].map((item) => (
                  <div key={item} className="h-20 rounded-2xl bg-slate-100 animate-pulse" />
                ))}
              </div>
            ) : weeklyShifts.length === 0 ? (
              <p className="text-sm text-slate-500">{t('dashboard.weekly_shifts.empty')}</p>
            ) : (
              weeklyShifts.map((shift) => {
                const statusInfo = getShiftStatusInfo(shift.status)
                const dateLabel = formatShiftDateLabel(shift.date)
                const timeLabel = getWeeklyShiftTimeLabel(shift)
                const secondaryLine = getWeeklyShiftSecondaryLine(shift)
                const typeLabel = shift.shiftTypeConfig?.name || shift.shiftType

                return (
                  <div
                    key={shift.id}
                    className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-slate-50/80 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="text-xs uppercase text-slate-500">{dateLabel}</p>
                      <p className="text-base font-semibold text-slate-900">{timeLabel}</p>
                      <p className="text-sm text-slate-500">{secondaryLine}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-500">{typeLabel}</span>
                      <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${statusInfo.classes}`}>
                        {statusInfo.label}
                      </span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </section>

        {showAdminQuickCards && (
          <section className="mt-6 rounded-3xl border border-slate-100 bg-white p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-xl font-semibold text-slate-900">{t('dashboard.attendance_feed.subtitle')}</h3>
              </div>
              <Link href="/dashboard/punch-clock" className="text-sm font-semibold text-[#2563eb] hover:text-[#1d4ed8]">
                {t('dashboard.attendance_feed.view_punch_clock')}
              </Link>
            </div>
            <div className="mt-4 space-y-4">
              {recentAttendanceLoading ? (
                <div className="space-y-3">
                  <div className="h-24 rounded-2xl bg-slate-100 animate-pulse" />
                  <div className="h-24 rounded-2xl bg-slate-100 animate-pulse" />
                </div>
              ) : recentAttendances.length === 0 ? (
                <p className="text-sm text-slate-500">{t('dashboard.attendance_feed.empty')}</p>
              ) : (
                recentAttendances.map((record) => {
                  const inTime = formatPunchTime(record.punchInTime) || '--:--'
                  const outTime = record.punchOutTime ? formatPunchTime(record.punchOutTime) : null
                  const isWorking = !record.punchOutTime
                  const statusClasses = isWorking ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-700'
                  const statusLabel = isWorking
                    ? t('dashboard.cards.attendance.status_working')
                    : t('dashboard.cards.attendance.status_idle')
                  const shiftSummary = getShiftSummary(record)
                  const durationLabel = getWorkDurationLabel(record)

                  return (
                    <div
                      key={record.id}
                      className="rounded-2xl border border-slate-100 bg-white/80 p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden">
                            {record.employee?.profilePhoto ? (
                              <Image
                                src={record.employee.profilePhoto}
                                alt={getEmployeeDisplayName(record)}
                                width={48}
                                height={48}
                                className="h-12 w-12 object-cover"
                              />
                            ) : (
                              <span className="text-sm font-semibold text-slate-600">
                                {getEmployeeInitials(record)}
                              </span>
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{getEmployeeDisplayName(record)}</p>
                            <p className="text-xs text-slate-500">#{record.employee?.employeeNo || '—'}</p>
                          </div>
                        </div>
                        <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${statusClasses}`}>
                          {statusLabel}
                        </span>
                      </div>

                      <div className="mt-4 grid grid-cols-3 gap-3 text-xs text-slate-500">
                        <div>
                          <p className="font-semibold text-slate-900 text-sm">{inTime}</p>
                          <p>{t('dashboard.attendance_feed.punch_in')}</p>
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 text-sm">{outTime || t('dashboard.cards.punch_clock.active')}</p>
                          <p>{t('dashboard.attendance_feed.punch_out')}</p>
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 text-sm">{durationLabel}</p>
                          <p>{t('dashboard.attendance_feed.duration')}</p>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                        <CalendarIcon className="h-4 w-4 text-slate-400" />
                        <span className="truncate">
                          {formatPunchDate(record.punchInTime)} • {shiftSummary}
                        </span>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </section>
        )}

        {isEmployeeUser && (
          <section className="mt-6 rounded-3xl border border-slate-100 bg-white p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">{t('dashboard.punch_clock.title')}</p>
                <h3 className="text-2xl font-semibold text-slate-900">{t('dashboard.cards.punch_clock.headline')}</h3>
                {!hasScheduledShift && (
                  <p className="text-sm text-slate-500">{t('dashboard.punch_clock.description')}</p>
                )}
              </div>
              {!hasScheduledShift && (
                <button
                  onClick={handlePrimaryShiftAction}
                  disabled={disablePrimaryShiftAction}
                  className="inline-flex items-center justify-center rounded-full border border-[#2563eb] px-5 py-2 text-sm font-semibold text-[#2563eb] transition hover:bg-[#2563eb] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563eb] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {clockingIn
                    ? t('dashboard.cards.punch_clock.punching_in')
                    : currentAttendance
                      ? t('dashboard.cards.attendance.status_working')
                      : t('dashboard.punch_clock.start_new_shift')}
                </button>
              )}
            </div>

            {currentAttendance && (
              <div className="mt-6">
                <div className="rounded-3xl border border-slate-100 bg-white p-6 text-center shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
                  <div className="inline-flex items-center justify-center gap-2 text-sm font-semibold text-slate-500">
                    <ClockIcon className="h-5 w-5" />
                    <span>{t('dashboard.punch_clock.title')}</span>
                  </div>
                  <p className="mt-4 text-4xl font-bold tracking-tight text-slate-900">
                    {liveTimer || '--'}
                  </p>
                  <p className="text-sm text-slate-500">
                    {formatPunchTime(currentAttendance.punchInTime) || '--:--'} - {currentAttendance.punchOutTime ? formatPunchTime(currentAttendance.punchOutTime) : '?'}
                  </p>
                  <p className="mt-4 text-sm font-semibold text-slate-600">
                    {roleLabel}
                  </p>
                  <p className="text-xs text-slate-400">{shiftWindowLabel}</p>
                  <div className="mt-6 flex flex-col gap-2">
                    <button
                      onClick={handlePunchOut}
                      disabled={clockingOut}
                      className="inline-flex items-center justify-center rounded-full bg-red-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 disabled:opacity-60"
                    >
                      <ClockIcon className="mr-1 h-4 w-4" />
                      {clockingOut ? t('dashboard.cards.punch_clock.punching_out') : t('dashboard.cards.punch_clock.punch_out')}
                    </button>
                    {(activeShift || currentAttendance?.shiftId || todayShift) && (
                      <button
                        onClick={isOnBreak ? handleEndBreak : handleStartBreak}
                        disabled={breakLoading}
                        className="inline-flex items-center justify-center rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900 disabled:opacity-60"
                      >
                        <ClockIcon className="mr-1 h-4 w-4" />
                        {breakLoading
                          ? isOnBreak
                            ? t('dashboard.cards.punch_clock.ending_break')
                            : t('dashboard.cards.punch_clock.starting_break')
                          : isOnBreak
                            ? t('dashboard.cards.punch_clock.end_break')
                            : t('dashboard.cards.punch_clock.start_break')}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="mt-6">
              {loadingTodayShift ? (
                <div className="space-y-2">
                  <div className="h-4 w-1/4 animate-pulse rounded bg-slate-200" />
                  <div className="h-4 w-1/2 animate-pulse rounded bg-slate-200" />
                </div>
              ) : todayShift && todayShift.status !== 'COMPLETED' ? (
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-white text-[#2563eb]">
                        <CalendarIcon className="h-6 w-6" />
                      </span>
                      <div>
                        <p className="text-sm font-medium text-slate-500">{t('dashboard.cards.punch_clock.today')}</p>
                        <p className="text-lg font-semibold text-slate-900">
                          {todayShift.startTime.substring(0, 5)} - {todayShift.endTime ? todayShift.endTime.substring(0, 5) : t('dashboard.cards.punch_clock.active')}
                        </p>
                        <p className="text-sm text-slate-500">
                          {todayShift.shiftType} {todayShift.employeeGroup && `• ${todayShift.employeeGroup.name}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                          todayShift.status === 'WORKING'
                            ? 'bg-green-100 text-green-700'
                            : todayShift.status === 'CANCELLED'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {todayShift.status}
                      </span>
                      {todayShift.approved && (
                        <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                          <CheckCircleIcon className="mr-1 h-3 w-3" />
                          {t('dashboard.cards.punch_clock.approved')}
                        </span>
                      )}
                    </div>
                  </div>

                </div>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-center">
                    <CalendarIcon className="mx-auto h-10 w-10 text-slate-400" />
                    <p className="mt-3 text-base font-semibold text-slate-900">{t('dashboard.cards.punch_clock.no_shift')}</p>
                    <p className="text-sm text-slate-500">{t('dashboard.cards.punch_clock.no_shift_hint')}</p>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}
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

      {/* Location Validation Modal */}
      <LocationValidationModal
        isOpen={showLocationModal}
        onClose={() => {
          setShowLocationModal(false)
          setPendingPunchAction(null)
          setPendingUnscheduledWork(false)
        }}
        onValidationSuccess={handleLocationValidationSuccess}
        onValidationFailed={handleLocationValidationFailed}
        employeeId={currentEmployee?.id}
      />

      {/* Department Selection Modal */}
      <DepartmentSelectionModal
        isOpen={showDepartmentModal}
        onClose={() => {
          setShowDepartmentModal(false)
          setPendingPunchAction(null)
          setPendingUnscheduledWork(false)
        }}
        onDepartmentSelected={handleDepartmentSelected}
        employeeId={currentEmployee?.id || ''}
        title="Select Department"
        description="Please select the department for this unscheduled work session."
      />
    </div>
  )
}