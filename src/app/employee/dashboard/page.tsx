"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import PunchClockModal from "@/components/PunchClockModal"
import ShiftExchangeInfo from "@/components/ShiftExchangeInfo"
import ShiftDetailsModal from "@/components/ShiftDetailsModal"
import PendingRequestsModal from "@/components/PendingRequestsModal"
import NotificationCenter from "@/components/NotificationCenter"
import LanguageSwitcher from "@/components/LanguageSwitcher"
import {
  Building2,
  Clock,
  Calendar,
  User,
  LogOut,
  Play,
  Square,
  Coffee,
  Bell,
  MapPin,
  Users,
  CheckCircle,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react"

interface Employee {
  id: string
  firstName: string
  lastName: string
  employeeNo: string
  department: {
    id: string
    name: string
    businessId: string
  }
  departmentId: string
  employeeGroup?: {
    id: string
    name: string
  }
  employeeGroupId?: string
}

interface Shift {
  id: string
  date: string
  startTime: string
  endTime: string | null
  shiftType: string
  breakStart?: string | null
  breakEnd?: string | null
  employeeId: string
  approved: boolean
  status: 'SCHEDULED' | 'WORKING' | 'COMPLETED' | 'CANCELLED'
  note?: string | null
  employee: {
    firstName: string
    lastName: string
  }
  employeeGroup?: {
    name: string
  }
  department?: {
    name: string
  }
  shiftExchanges?: Array<{
    id: string
    approved: boolean
    fromEmployee: {
      firstName: string
      lastName: string
      department: {
        name: string
      }
    }
    toEmployee: {
      firstName: string
      lastName: string
      department: {
        name: string
      }
    }
  }>
}

interface Attendance {
  id: string
  employeeId: string
  businessId: string
  shiftId?: string | null
  punchInTime: string
  punchOutTime?: string | null
  shift?: Shift | null
}

const events = [
  {
    id: 1,
    title: "Team Meeting",
    time: "02:00 PM",
    date: "Today",
    type: "meeting",
    location: "Conference Room A",
  },
  {
    id: 2,
    title: "Safety Training",
    time: "10:00 AM",
    date: "June 2",
    type: "training",
    location: "Training Center",
  },
  {
    id: 3,
    title: "Company Lunch",
    time: "12:00 PM",
    date: "June 5",
    type: "event",
    location: "Cafeteria",
  },
]

function EmployeeDashboardContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const employeeId = searchParams.get('employeeId')
  const { t } = useTranslation('employee-dashboard')
  
  const [employee, setEmployee] = useState<Employee | null>(null)
  const [activeShift, setActiveShift] = useState<Shift | null>(null)
  const [todayShift, setTodayShift] = useState<Shift | null>(null)
  const [upcomingShifts, setUpcomingShifts] = useState<Shift[]>([])
  const [currentAttendance, setCurrentAttendance] = useState<Attendance | null>(null)
  const [loading, setLoading] = useState(true)
  const [clockingIn, setClockingIn] = useState(false)
  const [clockingOut, setClockingOut] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [isOnBreak, setIsOnBreak] = useState(false)
  const [breakLoading, setBreakLoading] = useState(false)
  const [showShiftModal, setShowShiftModal] = useState(false)
  const [showShiftDetailsModal, setShowShiftDetailsModal] = useState(false)
  const [selectedShiftForDetails, setSelectedShiftForDetails] = useState<Shift | null>(null)
  const [employees, setEmployees] = useState([])
  const [employeeGroups, setEmployeeGroups] = useState([])
  const [departments, setDepartments] = useState([])
  const [pendingExchanges, setPendingExchanges] = useState<any[]>([])
  const [showPendingRequestsModal, setShowPendingRequestsModal] = useState(false)
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0)
  // Location validation temporarily disabled
  
  // Schedule view state
  const [showScheduleView, setShowScheduleView] = useState(false)
  const [scheduleDate, setScheduleDate] = useState(new Date())
  const [monthlyShifts, setMonthlyShifts] = useState<Shift[]>([])

  // Schedule navigation functions
  const navigateScheduleMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(scheduleDate)
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1)
    } else {
      newDate.setMonth(newDate.getMonth() + 1)
    }
    setScheduleDate(newDate)
    if (employee) {
      fetchMonthlyShifts(employee.id, newDate)
    }
  }

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()
    
    const days = []
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null)
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day)
    }
    
    return days
  }

  const getShiftForDay = (day: number) => {
    if (!day) return null
    const dateStr = new Date(scheduleDate.getFullYear(), scheduleDate.getMonth(), day)
      .toISOString().split('T')[0]
    return monthlyShifts.find(shift => shift.date.startsWith(dateStr))
  }

  const isToday = (day: number) => {
    if (!day) return false
    const today = new Date()
    return today.getDate() === day &&
           today.getMonth() === scheduleDate.getMonth() &&
           today.getFullYear() === scheduleDate.getFullYear()
  }

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    fetchEmployeeData()
  }, [])

  // Location validation temporarily disabled

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour12: true,
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
    })
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  // Helper function to format shift date consistently
  const formatShiftDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        month: 'long', 
        day: 'numeric' 
      })
    } catch (error) {
      return dateString
    }
  }

  const calculateWorkedTime = () => {
    if (!activeShift?.startTime || !activeShift?.date) return "0h 0m"

    const shiftDate = new Date(activeShift.date)
    const [hours, minutes] = activeShift.startTime.split(':').map(Number)
    const startDateTime = new Date(shiftDate)
    startDateTime.setHours(hours, minutes, 0, 0)
    
    const diff = currentTime.getTime() - startDateTime.getTime()
    const hoursWorked = Math.floor(diff / (1000 * 60 * 60))
    const minutesWorked = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    return `${hoursWorked}h ${minutesWorked}m`
  }

  const formatShiftStartTime = (date: string, startTime: string) => {
    if (!date || !startTime) return "N/A"
   
    const shiftDate = new Date(date)
    const [hours, minutes] = startTime.split(':').map(Number)
    const startDateTime = new Date(shiftDate)
    startDateTime.setHours(hours, minutes, 0, 0)
    
    return formatTime(startDateTime)
  }

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case "meeting":
        return "bg-blue-100 text-blue-800"
      case "training":
        return "bg-green-100 text-green-800"
      case "event":
        return "bg-purple-100 text-purple-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const fetchEmployeeData = async () => {
    try {
      const url = employeeId 
        ? `/api/employee/dashboard?employeeId=${employeeId}`
        : '/api/employee/dashboard'
      
      const res = await fetch(url)
      
      if (!res.ok) {
        if (res.status === 401) {
          router.push('/employee/login')
          return
        }
        throw new Error('Failed to fetch dashboard data')
      }
      
      const data = await res.json()
      
      setEmployee(data.employee)
      setActiveShift(data.activeShift)
      setTodayShift(data.todayShift)
      setUpcomingShifts(data.upcomingShifts || [])
      setPendingExchanges(data.pendingExchanges || [])
      setPendingRequestsCount(data.pendingRequestsCount || 0)
      setCurrentAttendance(data.currentAttendance)
      
      if (data.activeShift?.breakStart && !data.activeShift?.breakEnd) {
        setIsOnBreak(true)
      } else {
        setIsOnBreak(false)
      }
    } catch (error) {
      console.error('Error fetching employee data:', error)
      setError('Failed to load employee data')
    } finally {
      setLoading(false)
    }
  }

  const fetchTodayShift = async (employeeId: string) => {
    try {
      const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD format
      const res = await fetch(`/api/shifts?startDate=${today}&endDate=${today}&employeeId=${employeeId}`)
      
      if (res.ok) {
        const shifts = await res.json()
        // Find today's approved shift assigned to this employee
        const todayApprovedShift = shifts.find((shift: Shift) => 
          shift.date.substring(0, 10) === today && 
          shift.employeeId === employeeId &&
          shift.approved === true
        )
        setTodayShift(todayApprovedShift || null)
      }
    } catch (error) {
      console.error('Error fetching today\'s shift:', error)
    }
  }

  const fetchUpcomingShifts = async (employeeId: string) => {
    try {
      const today = new Date()
      const nextWeek = new Date(today)
      nextWeek.setDate(today.getDate() + 7)
      
      const startDate = new Date(today)
      startDate.setDate(today.getDate() + 1) // Start from tomorrow
      
      const res = await fetch(
        `/api/shifts?startDate=${startDate.toISOString().split('T')[0]}&endDate=${nextWeek.toISOString().split('T')[0]}&employeeId=${employeeId}`
      )
      
      if (res.ok) {
        const shifts = await res.json()
        // Filter to only include approved shifts for this employee
        const employeeApprovedShifts = shifts.filter((shift: Shift) => 
          shift.employeeId === employeeId && shift.approved === true
        )
        setUpcomingShifts(employeeApprovedShifts)
        
        // Fetch pending exchanges for these shifts
        await fetchPendingExchangesForShifts(employeeId)
      }
    } catch (error) {
      console.error('Error fetching upcoming shifts:', error)
    }
  }

  const fetchPendingExchangesForShifts = async (employeeId: string) => {
    try {
      const response = await fetch(`/api/shift-exchanges?employeeId=${employeeId}&status=PENDING`)
      if (response.ok) {
        const exchanges = await response.json()
        setPendingExchanges(exchanges)
      }
    } catch (error) {
      console.error('Error fetching pending exchanges:', error)
    }
  }

  const fetchPendingRequestsCount = async (employeeId: string) => {
    try {
      const response = await fetch('/api/employee/pending-requests')
      if (response.ok) {
        const requests = await response.json()
        setPendingRequestsCount(requests.length)
      }
    } catch (error) {
      console.error('Error fetching pending requests count:', error)
      setPendingRequestsCount(0)
    }
  }

  const fetchMonthlyShifts = async (employeeId: string, date: Date) => {
    try {
      const year = date.getFullYear()
      const month = date.getMonth()
      const startDate = new Date(year, month, 1).toISOString().split('T')[0]
      const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0]
      
      const res = await fetch(`/api/shifts?startDate=${startDate}&endDate=${endDate}&employeeId=${employeeId}`)
      
      if (res.ok) {
        const shifts = await res.json()
        // Filter to only include approved shifts for this employee
        const employeeApprovedShifts = shifts.filter((shift: Shift) => 
          shift.employeeId === employeeId && shift.approved === true
        )
        setMonthlyShifts(employeeApprovedShifts)
      }
    } catch (error) {
      console.error('Error fetching monthly shifts:', error)
    }
  }

  const fetchCurrentAttendance = async (employeeId: string) => {
    try {
      const today = new Date().toISOString().split('T')[0]
      const res = await fetch(`/api/attendance?employeeId=${employeeId}&date=${today}`)
      
      if (res.ok) {
        const attendances = await res.json()
        // Find current attendance (punched in but not out)
        const currentAtt = attendances.find((att: Attendance) => !att.punchOutTime)
        setCurrentAttendance(currentAtt || null)
      }
    } catch (error) {
      console.error('Error fetching current attendance:', error)
    }
  }

  const handleClockIn = () => {
    setShowShiftModal(true)
  }

  const handleShiftSubmit = async (formData: any) => {
    if (!employee) return

    setClockingIn(true)
    setError(null)

    try {
      const now = new Date()
      
      const currentTime = now.toTimeString().slice(0, 5) 
      
      const shiftData = {
        employeeId: employee.id,
        date: now.toISOString().split('T')[0], // Today's date (YYYY-MM-DD)
        startTime: currentTime, // Current time in HH:MM format
        shiftType: 'NORMAL', // Default shift type
        wage: 0,
        wageType: 'HOURLY',
        note: formData.note || '',
        approved: false,
        ...(employee.employeeGroupId && { employeeGroupId: employee.employeeGroupId }), // Include if available
      }

      console.log('🕐 Sending shift data:', shiftData)

      const res = await fetch('/api/shifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(shiftData),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to clock in')
      }

      const newShift = await res.json()
      setActiveShift(newShift)
      setShowShiftModal(false)
      
      if (employee) {
        await fetchTodayShift(employee.id)
        await fetchUpcomingShifts(employee.id)
      }
      
      if (employee) {
        await fetchTodayShift(employee.id)
        await fetchUpcomingShifts(employee.id)
      }
    } catch (error: any) {
      setError(error.message)
    } finally {
      setClockingIn(false)
    }
  }

  const handleClockOut = async () => {
    if (!activeShift) return

    setClockingOut(true)
    setError(null)

    try {
      // Format current time as HH:MM
      const now = new Date()
      const currentTime = now.toTimeString().slice(0, 5) // Gets "HH:MM" from "HH:MM:SS GMT..."
      
      const res = await fetch(`/api/shifts/${activeShift.id}/end`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endTime: currentTime, // Send time in HH:MM format
        }),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to clock out')
      }

      setActiveShift(null)
      
      // Refresh today's shift data after clocking out
      if (employee) {
        await fetchTodayShift(employee.id)
        await fetchUpcomingShifts(employee.id)
      }
    } catch (error: any) {
      setError(error.message)
    } finally {
      setClockingOut(false)
    }
  }

  const handleShiftDetails = (shift: Shift) => {
    setSelectedShiftForDetails(shift)
    setShowShiftDetailsModal(true)
  }

  const handleCloseShiftDetails = async () => {
    setShowShiftDetailsModal(false)
    setSelectedShiftForDetails(null)
    
    // Refresh both pending exchanges and upcoming shifts when modal is closed
    if (employee) {
      await fetchPendingExchangesForShifts(employee.id)
      await fetchUpcomingShifts(employee.id)
    }
  }

  const handlePendingRequestsUpdate = async () => {
    // Refresh data when pending requests are updated
    if (employee) {
      await fetchPendingExchangesForShifts(employee.id)
      await fetchUpcomingShifts(employee.id)
      await fetchPendingRequestsCount(employee.id)
    }
  }

  const handleLogout = () => {
    // Clear both employee and admin tokens to ensure clean logout
    document.cookie = 'employee_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;'
    document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;'
    router.push('/time-tracking')
  }

  const handlePunchIn = async () => {
    if (!employee) return

    setClockingIn(true)
    setError(null)

    try {
      const now = new Date()
      const punchInData = {
        employeeId: employee.id,
        businessId: employee.department.businessId,
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
      
      // Update today's shift data to reflect the new status
      if (employee) {
        await fetchTodayShift(employee.id)
        await fetchUpcomingShifts(employee.id)
      }
    } catch (error: any) {
      setError(error.message)
    } finally {
      setClockingIn(false)
    }
  }

  const handlePunchOut = async () => {
    if (!currentAttendance) return

    setClockingOut(true)
    setError(null)

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

      const result = await res.json()
      setCurrentAttendance(null)
      
      // Update today's shift data to reflect the new status
      if (employee) {
        await fetchTodayShift(employee.id)
        await fetchUpcomingShifts(employee.id)
      }
    } catch (error: any) {
      setError(error.message)
    } finally {
      setClockingOut(false)
    }
  }

  const handleStartBreak = async () => {
    if (!activeShift) return

    setBreakLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/shifts/${activeShift.id}/break`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to start break')
      }

      const updatedShift = await res.json()
      setActiveShift(updatedShift)
      setIsOnBreak(true)
    } catch (error: any) {
      setError(error.message)
    } finally {
      setBreakLoading(false)
    }
  }

  const handleEndBreak = async () => {
    if (!activeShift) return

    setBreakLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/shifts/${activeShift.id}/break`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to end break')
      }

      const updatedShift = await res.json()
      setActiveShift(updatedShift)
      setIsOnBreak(false)
    } catch (error: any) {
      setError(error.message)
    } finally {
      setBreakLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-50 to-blue-100">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-sky-500"></div>
      </div>
    )
  }

  if (!employee) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-50 to-blue-100">
        <div className="text-center">
          <p className="text-sky-600 mb-4">{t('errors.failed_to_load')}</p>
          <button
            onClick={() => router.push('/employee/login')}
            className="bg-sky-500 text-white px-4 py-2 rounded-md hover:bg-sky-600"
          >
            {t('errors.return_to_login')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 to-blue-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-6">
            {/* <div className="w-16 h-16 bg-sky-500 rounded-full flex items-center justify-center">
              <Building2 className="w-8 h-8 text-white" />
            </div> */}
            <div>
              <h1 className="text-4xl font-bold text-sky-700">{t('title')}</h1>
              <p className="text-sky-600 text-lg">{t('welcome_back', { firstName: employee.firstName, lastName: employee.lastName })}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <LanguageSwitcher />
            <NotificationCenter employeeId={employee.id} />
            <Button 
              variant="outline" 
              className="border-sky-300 text-sky-700 hover:bg-sky-50 px-6 py-3"
              onClick={handleLogout}
            >
              <LogOut className="w-5 h-5 mr-2" />
              {t('header.logout')}
            </Button>
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Current Time & Date */}
        <Card className="bg-white/95 backdrop-blur border-sky-200 mb-8">
          <CardContent className="text-center py-8">
            <div className="text-6xl font-bold text-sky-700 mb-2" suppressHydrationWarning>
              {formatTime(currentTime)}
            </div>
            <p className="text-sky-600 text-xl" suppressHydrationWarning>
              {formatDate(currentTime)}
            </p>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Time Card & Profile */}
          <div className="space-y-6">
             {/* Quick Actions */}
            <Card className="bg-white/95 backdrop-blur border-sky-200">
              <CardHeader>
                <CardTitle className="text-sky-700">{t('quick_actions.title')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  <Button 
                    variant="outline" 
                    className="border-sky-300 text-sky-700 hover:bg-sky-50 py-3 relative"
                    onClick={() => setShowPendingRequestsModal(true)}
                  >
                    <Bell className="w-4 h-4 mr-2" />
                    {t('quick_actions.requests')}
                    {pendingRequestsCount > 0 && (
                      <Badge className="absolute -top-2 -right-2 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full min-w-[20px] h-5 flex items-center justify-center">
                        {pendingRequestsCount}
                      </Badge>
                    )}
                  </Button>
                  <Button 
                    variant="outline" 
                    className="border-sky-300 text-sky-700 hover:bg-sky-50 py-3"
                    onClick={() => router.push('/dashboard/teams')}
                  >
                    <Users className="w-4 h-4 mr-2" />
                    {t('quick_actions.team')}
                  </Button>
                  <Button 
                    variant="outline" 
                    className="border-sky-300 text-sky-700 hover:bg-sky-50 py-3"
                    onClick={() => {
                      setShowScheduleView(true)
                      if (employee) fetchMonthlyShifts(employee.id, scheduleDate)
                    }}
                  >
                    <Calendar className="w-4 h-4 mr-2" />
                    {t('quick_actions.my_schedule')}
                  </Button>
                  <Button 
                    variant="outline" 
                    className="border-sky-300 text-sky-700 hover:bg-sky-50 py-3"
                    onClick={() => router.push('/employee/availability')}
                  >
                    <Clock className="w-4 h-4 mr-2" />
                    {t('quick_actions.availability')}
                  </Button>
                  <Button 
                    variant="outline" 
                    className="border-sky-300 text-sky-700 hover:bg-sky-50 py-3"
                    onClick={() => router.push('/dashboard/sick-leaves')}
                  >
                    <Bell className="w-4 h-4 mr-2" />
                    {t('quick_actions.sick_leave')}
                  </Button>
                </div>
              </CardContent>
            </Card>
            {/* Employee Profile */}
            <Card className="bg-white/95 backdrop-blur border-sky-200">
              <CardHeader>
                <CardTitle className="text-sky-700 flex items-center gap-2">
                  <User className="w-6 h-6" />
                  {t('profile.title')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-sky-100 rounded-full flex items-center justify-center">
                      <User className="w-8 h-8 text-sky-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sky-700">{employee.firstName} {employee.lastName}</h3>
                      <p className="text-sky-600">{t('profile.employee')}</p>
                      <p className="text-sky-500 text-sm">{employee.department.name}</p>
                    </div>
                  </div>
                  <Separator />
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-sky-600">{t('profile.employee_id')}</span>
                      <span className="font-medium">{employee.employeeNo}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sky-600">{t('profile.department')}</span>
                      <span className="font-medium">{employee.department.name}</span>
                    </div>
                    {employee.employeeGroup && (
                      <div className="flex justify-between">
                        <span className="text-sky-600">{t('profile.group')}</span>
                        <span className="font-medium">{employee.employeeGroup.name}</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Middle Column - Today's Shift */}
          <div className="space-y-6">
            <Card className="bg-white/95 backdrop-blur border-sky-200">
              <CardHeader>
                <CardTitle className="text-sky-700 flex items-center gap-2">
                  <Calendar className="w-6 h-6" />
                  {t('todays_shift.title')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {todayShift ? (
                  <>
                    <div className="text-center p-4 bg-sky-50 rounded-lg">
                      <h3 className="font-semibold text-sky-700 mb-2">
                        {formatShiftDate(todayShift.date)}
                      </h3>
                      <div className="text-2xl font-bold text-sky-600 mb-2">
                        {todayShift.startTime.substring(0, 5)} - {todayShift.endTime ? todayShift.endTime.substring(0, 5) : 'Active'}
                      </div>
                      {todayShift.employeeGroup && (
                        <div className="flex justify-center gap-4 text-sm text-sky-600">
                          <span className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            {todayShift.employeeGroup.name}
                          </span>
                        </div>
                      )}
                      
                      {/* Shift Status Badges */}
                      <div className="mt-3 flex flex-wrap justify-center gap-2">
                        <Badge className={`${
                          todayShift.status === 'WORKING' ? 'bg-green-100 text-green-800' :
                          todayShift.status === 'COMPLETED' ? 'bg-blue-100 text-blue-800' :
                          todayShift.status === 'CANCELLED' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {todayShift.status === 'SCHEDULED' ? t('shift_status.scheduled') :
                           todayShift.status === 'WORKING' ? t('shift_status.working') :
                           todayShift.status === 'COMPLETED' ? t('shift_status.completed') :
                           todayShift.status === 'CANCELLED' ? t('shift_status.cancelled') : todayShift.status}
                        </Badge>
                        {todayShift.approved && (
                          <Badge className="bg-emerald-100 text-emerald-800">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            {t('shift_status.approved')}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Attendance Section */}
                    <div className="space-y-3">
                      <h4 className="font-medium text-sky-700">{t('todays_shift.attendance')}</h4>
                      
                      {currentAttendance ? (
                        <div className="space-y-3">
                          <div className="text-center p-3 bg-green-50 rounded-lg">
                            <p className="text-green-700 font-medium">{t('todays_shift.currently_punched_in')}</p>
                            <p className="text-green-600 text-sm">
                              {t('time_card.since', { time: new Date(currentAttendance.punchInTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) })}
                            </p>
                          </div>
                          
                          <Button
                            onClick={handlePunchOut}
                            disabled={clockingOut}
                            className="w-full bg-red-500 hover:bg-red-600 text-white py-3"
                          >
                            <Square className="w-5 h-5 mr-2" />
                            {clockingOut ? t('time_card.punching_out') : t('time_card.punch_out')}
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {todayShift.status === 'COMPLETED' ? (
                            <div className="text-center p-3 bg-blue-50 rounded-lg">
                              <p className="text-blue-700 font-medium">{t('todays_shift.shift_completed')}</p>
                              <p className="text-blue-600 text-sm">
                                {todayShift.startTime.substring(0, 5)} - {todayShift.endTime!.substring(0, 5)}
                              </p>
                            </div>
                          ) : (
                            <>
                              <div className="text-center p-3 bg-gray-50 rounded-lg">
                                <p className="text-gray-700 font-medium">{t('todays_shift.ready_to_start')}</p>
                                <p className="text-gray-600 text-sm">
                                  {t('todays_shift.ready_to_start_description')}
                                </p>
                              </div>
                              
                              <Button
                                onClick={handlePunchIn}
                                disabled={clockingIn}
                                className="w-full bg-green-500 hover:bg-green-600 text-white py-3 disabled:bg-gray-400 disabled:cursor-not-allowed"
                              >
                                <Play className="w-5 h-5 mr-2" />
                                {clockingIn ? t('time_card.punching_in') : t('time_card.punch_in')}
                              </Button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="text-center p-8 bg-gray-50 rounded-lg">
                    <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="font-semibold text-gray-700 mb-2">{t('todays_shift.no_shift')}</h3>
                    <p className="text-gray-600 text-sm">{t('todays_shift.no_shift_description')}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Upcoming Shifts */}
            <Card className="bg-white/95 backdrop-blur border-sky-200">
              <CardHeader>
                <CardTitle className="text-sky-700">{t('upcoming_shifts.title')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {upcomingShifts.length > 0 ? (
                    upcomingShifts.map((shift) => {
                      const shiftDate = new Date(shift.date)
                      const today = new Date()
                      const tomorrow = new Date(today)
                      tomorrow.setDate(today.getDate() + 1)
                      
                      const isTomorrow = shiftDate.toDateString() === tomorrow.toDateString()
                      
                      const dayOfWeek = shiftDate.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()
                      const formattedDate = isTomorrow 
                        ? t('upcoming_shifts.tomorrow')
                        : shiftDate.toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric' 
                          })
                      const timeRange = `${shift.startTime.substring(0, 5)} - ${shift.endTime ? shift.endTime.substring(0, 5) : t('common.tbd')}`
                      
                      // Check for approved shift exchanges
                      const approvedExchange = shift.shiftExchanges?.find(exchange => exchange.approved)
                      
                      // Check for pending exchanges for this shift
                      const hasPendingExchange = pendingExchanges.some(exchange => exchange.shiftId === shift.id)
                      
                      // Check if shift is for sale
                      const isForSale = shift.note && shift.note.includes('[FOR SALE]')
                      
                      // Determine background color based on status
                      let bgColor, hoverColor, dayBadgeColor, textColor, subtextColor, statusLabel, borderClass
                      
                      if (isForSale) {
                        bgColor = 'bg-orange-50'
                        hoverColor = 'hover:bg-orange-100'
                        dayBadgeColor = 'bg-orange-500'
                        textColor = 'text-orange-700'
                        subtextColor = 'text-orange-600'
                        statusLabel = t('upcoming_shifts.for_sale')
                        borderClass = 'border border-orange-200'
                      } else if (hasPendingExchange) {
                        bgColor = 'bg-yellow-50'
                        hoverColor = 'hover:bg-yellow-100'
                        dayBadgeColor = 'bg-yellow-500'
                        textColor = 'text-yellow-700'
                        subtextColor = 'text-yellow-600'
                        statusLabel = t('upcoming_shifts.pending_exchange')
                        borderClass = 'border border-yellow-200'
                      } else {
                        bgColor = 'bg-sky-50'
                        hoverColor = 'hover:bg-sky-100'
                        dayBadgeColor = 'bg-sky-500'
                        textColor = 'text-sky-700'
                        subtextColor = 'text-sky-600'
                        statusLabel = null
                        borderClass = ''
                      }
                      
                      return (
                        <div 
                          key={shift.id} 
                          className={`p-3 ${bgColor} rounded-lg space-y-3 cursor-pointer ${hoverColor} transition-colors ${borderClass}`}
                          onClick={() => handleShiftDetails(shift)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`w-12 h-12 ${dayBadgeColor} rounded-lg flex items-center justify-center text-white font-bold text-xs`}>
                                {dayOfWeek}
                              </div>
                              <div>
                                <p className={`font-medium ${textColor}`}>{formattedDate}</p>
                                <p className={`text-sm ${subtextColor}`}>{timeRange}</p>
                                {statusLabel && (
                                  <p className={`text-xs font-medium ${textColor}`}>{statusLabel}</p>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className={`text-sm ${subtextColor}`}>
                                {shift.employeeGroup?.name || t('common.general')}
                              </div>
                              <div className={`text-xs mt-1 ${isForSale ? 'text-orange-500' : hasPendingExchange ? 'text-yellow-500' : 'text-sky-500'}`}>
                                {t('upcoming_shifts.click_for_options')}
                              </div>
                            </div>
                          </div>
                          
                          {/* Show exchange information if there's an approved exchange */}
                          {approvedExchange && (
                            <div className="pl-15">
                              <ShiftExchangeInfo 
                                shift={{
                                  id: shift.id,
                                  approved: true,
                                  shiftExchanges: [{
                                    ...approvedExchange,
                                    status: 'APPROVED' // Transform approved boolean to status string
                                  }]
                                }} 
                              />
                            </div>
                          )}
                        </div>
                      )
                    })
                  ) : (
                    <div className="text-center p-6 bg-gray-50 rounded-lg">
                      <Calendar className="w-8 h-8 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-600 text-sm">{t('upcoming_shifts.no_shifts')}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Events & Notifications */}
          <div className="space-y-6">
            <Card className="bg-white/95 backdrop-blur border-sky-200">
              <CardHeader>
                <CardTitle className="text-sky-700 flex items-center gap-2">
                  <Bell className="w-6 h-6" />
                  {t('events.title')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {events.map((event) => (
                    <div key={event.id} className="p-4 border border-sky-200 rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-sky-700">{event.title}</h4>
                        <Badge className={getEventTypeColor(event.type)}>{t(`events.${event.type}`)}</Badge>
                      </div>
                      <div className="space-y-1 text-sm text-sky-600">
                        <p className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {event.date} at {event.time}
                        </p>
                        <p className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {event.location}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Shift Modal */}
      <PunchClockModal
        isOpen={showShiftModal}
        onClose={() => setShowShiftModal(false)}
        initialData={{
          note: '',
        }}
        employees={employees}
        employeeGroups={employeeGroups}
        departments={departments}
        onSubmit={handleShiftSubmit}
        loading={clockingIn}
      />

      {/* Shift Details Modal */}
      <ShiftDetailsModal
        isOpen={showShiftDetailsModal}
        onClose={handleCloseShiftDetails}
        shift={selectedShiftForDetails}
        currentEmployeeId={employee?.id || ''}
      />

      {/* Schedule View Modal */}
      {showScheduleView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center space-x-4">
                <h2 className="text-xl font-semibold text-sky-700">
                  {t('schedule.title')}
                </h2>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigateScheduleMonth('prev')}
                    className="border-sky-300 text-sky-700 hover:bg-sky-50"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-lg font-medium text-sky-700 min-w-[140px] text-center">
                    {t(`schedule.months.${scheduleDate.toLocaleString('en', { month: 'long' }).toLowerCase()}`)} {scheduleDate.getFullYear()}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigateScheduleMonth('next')}
                    className="border-sky-300 text-sky-700 hover:bg-sky-50"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowScheduleView(false)}
                className="border-sky-300 text-sky-700 hover:bg-sky-50"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            {/* Calendar Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-100px)]">
              {/* Days of week header */}
              <div className="grid grid-cols-7 gap-2 mb-4">
                {['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].map((day) => (
                  <div key={day} className="p-2 text-center text-sm font-medium text-sky-600 bg-sky-50 rounded">
                    {t(`schedule.days.${day}`)}
                  </div>
                ))}
              </div>
              
              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-2">
                {getDaysInMonth(scheduleDate).map((day, index) => {
                  const shift = day ? getShiftForDay(day) : null
                  const isCurrentDay = day ? isToday(day) : false
                  
                  return (
                    <div
                      key={index}
                      className={`min-h-[100px] p-2 border rounded-lg ${
                        day 
                          ? isCurrentDay
                            ? 'bg-sky-100 border-sky-300'
                            : shift 
                              ? 'bg-green-50 border-green-200 hover:bg-green-100 cursor-pointer'
                              : 'bg-white border-gray-200'
                          : 'bg-gray-50 border-gray-100'
                      }`}
                      onClick={() => {
                        if (shift) {
                          setSelectedShiftForDetails(shift)
                          setShowShiftDetailsModal(true)
                        }
                      }}
                    >
                      {day && (
                        <>
                          <div className={`text-sm font-medium mb-2 ${
                            isCurrentDay ? 'text-sky-700' : 'text-gray-700'
                          }`}>
                            {day}
                            {isCurrentDay && (
                              <span className="ml-1 text-xs bg-sky-500 text-white px-1 rounded">
                                {t('schedule.today')}
                              </span>
                            )}
                          </div>
                          {shift && (
                            <div className="space-y-1">
                              <div className="text-xs font-medium text-green-700 truncate">
                                {shift.department?.name || t('common.general')}
                              </div>
                              <div className="text-xs text-green-600">
                                {shift.startTime} - {shift.endTime || t('common.tbd')}
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
              
              {/* No shifts message */}
              {monthlyShifts.length === 0 && (
                <div className="text-center py-8">
                  <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">{t('schedule.no_shifts')}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Pending Requests Modal */}
      <PendingRequestsModal
        isOpen={showPendingRequestsModal}
        onClose={() => setShowPendingRequestsModal(false)}
        employeeId={employee?.id || ''}
        onUpdate={handlePendingRequestsUpdate}
      />
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

export default function EmployeeDashboard() {
  return (
    <Suspense fallback={<LoadingEmployeeDashboard />}>
      <EmployeeDashboardContent />
    </Suspense>
  )
}
