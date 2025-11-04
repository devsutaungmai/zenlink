'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { useUser } from '@/shared/lib/useUser'
import Image from 'next/image'
import Swal from 'sweetalert2'
import { 
  ClockIcon, 
  UserGroupIcon,
  CalendarIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  PlayIcon,
  StopIcon,
  CheckCircleIcon,
  XCircleIcon,
  PencilIcon,
  ArrowDownTrayIcon,
  DocumentTextIcon,
  TableCellsIcon
} from '@heroicons/react/24/outline'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface Business {
  id: string
  name: string
  address: string
  type: string
}

interface Employee {
  id: string
  firstName: string
  lastName: string
  employeeNo: string
  profilePhoto?: string | null
  department: {
    name: string
  }
  employeeGroup?: {
    name: string
  }
}

interface Shift {
  id: string
  date: string
  startTime: string
  endTime: string | null
  status: string
  employee: {
    firstName: string
    lastName: string
    employeeNo: string
  }
}

interface Attendance {
  id: string
  punchInTime: string
  punchOutTime: string | null
  approved: boolean
  employee: {
    firstName: string
    lastName: string
    employeeNo: string
    profilePhoto?: string | null
    department: {
      name: string
    }
    employeeGroup?: {
      name: string
    }
  }
  shift?: {
    id: string
    date: string
    startTime: string
    endTime: string | null
    status: string
  }
}

export default function PunchClockPage() {
  const router = useRouter()
  const { t } = useTranslation('punch-clock')
  const { user } = useUser() // Add user context
  const [business, setBusiness] = useState<Business | null>(null)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [attendanceRecords, setAttendanceRecords] = useState<Attendance[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedFilter, setSelectedFilter] = useState('all')
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedEndDate, setSelectedEndDate] = useState(new Date().toISOString().split('T')[0])
  const [dateRangeType, setDateRangeType] = useState<'single' | 'week' | 'month'>('single')
  const [weekStartDate, setWeekStartDate] = useState('')
  const [monthYear, setMonthYear] = useState('')
  const [selectedEmployee, setSelectedEmployee] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [editingRecord, setEditingRecord] = useState<Attendance | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editFormData, setEditFormData] = useState({
    punchInTime: '',
    punchOutTime: ''
  })

  const isAdmin = user?.role === 'ADMIN'

  useEffect(() => {
    fetchData()
    
    // Update current time every second
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(timeInterval)
  }, [selectedDate,selectedEndDate, weekStartDate, monthYear, dateRangeType])

  const getDateRange = () => {
    switch (dateRangeType) {
      case 'week':
        if (!weekStartDate) return null
        const startDate = new Date(weekStartDate)
        const endDate = new Date(startDate)
        endDate.setDate(startDate.getDate() + 6)
        return {
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0]
        }
      case 'month':
        if (!monthYear) return null
        const [year, month] = monthYear.split('-')
        const firstDay = new Date(parseInt(year), parseInt(month) - 1, 1)
        const lastDay = new Date(parseInt(year), parseInt(month), 0)
        return {
          startDate: firstDay.toISOString().split('T')[0],
          endDate: lastDay.toISOString().split('T')[0]
        }
      default:
        return {
          startDate: selectedDate,
          endDate: selectedEndDate
        }
    }
  }

  const fetchData = async () => {
    try {
      setLoading(true)
      await Promise.all([
        fetchBusiness(),
        fetchEmployees(),
        fetchAttendance()
      ])
    } catch (error) {
      console.error('Error fetching data:', error)
      setError('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const fetchBusiness = async () => {
    try {
      const res = await fetch('/api/business')
      if (res.ok) {
        const businessData = await res.json()
        setBusiness(businessData)
      }
    } catch (error) {
      console.error('Error fetching business:', error)
    }
  }

  const fetchEmployees = async () => {
    try {
      const res = await fetch('/api/employees')
      if (res.ok) {
        const employeesData = await res.json()
        setEmployees(employeesData)
      }
    } catch (error) {
      console.error('Error fetching employees:', error)
    }
  }

  const fetchAttendance = async () => {
    try {
      // First get the business info to get the business ID
      const businessRes = await fetch('/api/business')
      let businessId = ''
      
      if (businessRes.ok) {
        const businessData = await businessRes.json()
        businessId = businessData.id
      }
      
      // If no business found, try to get first business or use fallback
      if (!businessId) {
        console.warn('No business ID found, fetching all attendance records')
        // For now, let's try without business ID to see if we get data
      }

      // Build query parameters
      const dateRange = getDateRange()
      if (!dateRange) {
        setAttendanceRecords([])
        return
      }

      const params = new URLSearchParams()
      if (businessId) params.append('businessId', businessId)
      params.append('startDate', dateRange.startDate)
      params.append('endDate', dateRange.endDate)
      if (selectedEmployee) params.append('employeeId', selectedEmployee)
        
      const res = await fetch(`/api/attendance?${params.toString()}`)
      if (res.ok) {
        const attendanceData = await res.json()
        setAttendanceRecords(attendanceData)
      } else {
        console.error('Failed to fetch attendance:', await res.text())
        setAttendanceRecords([])
      }
    } catch (error) {
      console.error('Error fetching attendance:', error)
      setAttendanceRecords([])
    }
  }

  const filteredAttendance = attendanceRecords.filter(record => {
    const searchLower = searchTerm.toLowerCase()
    const matchesSearch = 
      `${record.employee.firstName || ''} ${record.employee.lastName || ''}`.toLowerCase().includes(searchLower) ||
      (record.employee.employeeNo || '').toLowerCase().includes(searchLower) ||
      (record.employee.department?.name || '').toLowerCase().includes(searchLower) ||
      (record.employee.employeeGroup?.name || '').toLowerCase().includes(searchLower)

    if (selectedFilter === 'all') return matchesSearch
    if (selectedFilter === 'working') {
      return matchesSearch && !record.punchOutTime
    }
    if (selectedFilter === 'completed') {
      return matchesSearch && record.punchOutTime
    }
    
    return matchesSearch
  })

  const formatTime = (timeString: string) => {
    return new Date(timeString).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false
    })
  }

  const formatShiftTime = (timeString: string) => {
    // Return time string as is since it's already in HH:MM format
    return timeString
  }

  const formatDate = (timeString: string) => {
    return new Date(timeString).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    })
  }

  const calculateWorkDuration = (punchIn: string, punchOut?: string | null) => {
    const startTime = new Date(punchIn)
    const endTime = punchOut ? new Date(punchOut) : new Date()
    
    const diffMs = endTime.getTime() - startTime.getTime()
    const hours = Math.floor(diffMs / (1000 * 60 * 60))
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
    
    return `${hours}h ${minutes}m`
  }

  const getEarlyLateStatus = (record: Attendance) => {
    if (!record.shift) return null

    const punchInTime = new Date(record.punchInTime)
    
    // Parse shift start time properly
    let shiftStartTime: Date
    if (record.shift.date && record.shift.startTime) {
      const shiftDate = new Date(record.shift.date)
      const datePart = shiftDate.toISOString().split('T')[0]
      const timePart = record.shift.startTime.includes(':') ? record.shift.startTime : `${record.shift.startTime}:00`
      const timeWithSeconds = timePart.split(':').length === 2 ? `${timePart}:00` : timePart
      
      shiftStartTime = new Date(`${datePart}T${timeWithSeconds}`)
    } else {
      return null
    }

    if (isNaN(shiftStartTime.getTime())) {
      return null
    }
    
    let status = []

    // Check if punched in early or late
    const timeDiffIn = punchInTime.getTime() - shiftStartTime.getTime()
    if (timeDiffIn < -300000) { // 5 minutes early
      status.push({ type: 'early-in', text: 'Early In', color: 'bg-blue-100 text-blue-800' })
    } else if (timeDiffIn > 300000) { // 5 minutes late
      status.push({ type: 'late-in', text: 'Late In', color: 'bg-red-100 text-red-800' })
    }

    // Check if punched out early (only if punched out and shift has end time)
    if (record.punchOutTime && record.shift.endTime) {
      const punchOutTime = new Date(record.punchOutTime)
      
      const shiftDate = new Date(record.shift.date)
      const datePart = shiftDate.toISOString().split('T')[0]
      const timePart = record.shift.endTime.includes(':') ? record.shift.endTime : `${record.shift.endTime}:00`
      const timeWithSeconds = timePart.split(':').length === 2 ? `${timePart}:00` : timePart
      
      const shiftEndTime = new Date(`${datePart}T${timeWithSeconds}`)
      
      if (!isNaN(shiftEndTime.getTime())) {
        const timeDiffOut = shiftEndTime.getTime() - punchOutTime.getTime()
        
        if (timeDiffOut > 300000) { // 5 minutes early
          status.push({ type: 'early-out', text: 'Early Out', color: 'bg-orange-100 text-orange-800' })
        }
      }
    }

    return status.length > 0 ? status : null
  }

  // Helper function to get punch in time styling based on late status
  const getPunchInTimeStyle = (record: Attendance) => {
    if (!record.shift) {
      return 'text-gray-900'
    }

    const punchInTime = new Date(record.punchInTime)
    
    let shiftStartTime: Date
    
    if (record.shift.date && record.shift.startTime) {
      const shiftDate = new Date(record.shift.date)
      const datePart = shiftDate.toISOString().split('T')[0]
      const timePart = record.shift.startTime.includes(':') ? record.shift.startTime : `${record.shift.startTime}:00`
      const timeWithSeconds = timePart.split(':').length === 2 ? `${timePart}:00` : timePart
      
      const isoString = `${datePart}T${timeWithSeconds}`
      shiftStartTime = new Date(isoString)
    } else {
      return 'text-gray-900'
    }

    if (isNaN(shiftStartTime.getTime())) {
      return 'text-gray-900'
    }

    const timeDiffIn = punchInTime.getTime() - shiftStartTime.getTime()

    if (timeDiffIn > 900000) { // More than 15 minutes late
      return 'text-red-700 font-semibold'
    } else if (timeDiffIn > 300000) { // 5-15 minutes late
      return 'text-orange-600 font-medium'
    } else if (timeDiffIn < -300000) { // 5+ minutes early
      return 'text-blue-600'
    }

    return 'text-gray-900'
  }

  const getStatusBadge = (record: Attendance) => {
    if (!record.punchOutTime) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <div className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse"></div>
          {t('status.working')}
        </span>
      )
    }
    
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
        <CheckCircleIcon className="w-3 h-3 mr-1" />
        {t('status.completed')}
      </span>
    )
  }

  const activeCount = attendanceRecords.filter(record => !record.punchOutTime).length
  const completedCount = attendanceRecords.filter(record => record.punchOutTime).length

  // Admin functions
  const handleEditRecord = (record: Attendance) => {
    if (!isAdmin) return
    setEditingRecord(record)
    
    // Format time to HH:MM for input fields
    const formatTimeForInput = (timeString: string) => {
      const date = new Date(timeString)
      // Get hours and minutes in HH:MM format for time input
      const hours = date.getHours().toString().padStart(2, '0')
      const minutes = date.getMinutes().toString().padStart(2, '0')
      return `${hours}:${minutes}`
    }
    
    setEditFormData({
      punchInTime: record.punchInTime ? formatTimeForInput(record.punchInTime) : '',
      punchOutTime: record.punchOutTime ? formatTimeForInput(record.punchOutTime) : ''
    })
    setShowEditModal(true)
  }

  const handleSaveEdit = async () => {
    if (!editingRecord || !isAdmin) return

    try {
      // Convert time strings to full datetime strings
      const today = new Date(editingRecord.punchInTime).toDateString()
      
      const punchInDateTime = new Date(`${today} ${editFormData.punchInTime}`)
      const punchOutDateTime = editFormData.punchOutTime ? new Date(`${today} ${editFormData.punchOutTime}`) : null

      const response = await fetch(`/api/attendance/${editingRecord.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          punchInTime: punchInDateTime.toISOString(),
          punchOutTime: punchOutDateTime ? punchOutDateTime.toISOString() : null
        })
      })

      if (response.ok) {
        setShowEditModal(false)
        setEditingRecord(null)
        // Show success toast
        Swal.fire({
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 3000,
          timerProgressBar: true,
          icon: 'success',
          title: 'Attendance record updated successfully'
        })
        await fetchAttendance() // Refresh data
      } else {
        const errorData = await response.json()
        // Show error toast
        Swal.fire({
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 3000,
          timerProgressBar: true,
          icon: 'error',
          title: errorData.error || 'Failed to update record'
        })
      }
    } catch (error) {
      console.error('Error updating attendance record:', error)
      // Show error toast
      Swal.fire({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        icon: 'error',
        title: 'Failed to update record'
      })
    }
  }

  // Add attendance approval handler
  const handleAttendanceApproval = async (attendanceId: string, approved: boolean) => {
    if (!isAdmin) return

    try {
      const adminId = user?.id || 'admin'
      const response = await fetch('/api/attendance/pending', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          attendanceId, 
          approved,
          adminId 
        }),
      })

      if (response.ok) {
        // Show success toast
        Swal.fire({
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 3000,
          timerProgressBar: true,
          icon: 'success',
          title: approved ? 'Attendance approved successfully' : 'Attendance rejected successfully'
        })
        await fetchAttendance() // Refresh the list
      } else {
        const error = await response.json()
        // Show error toast
        Swal.fire({
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 3000,
          timerProgressBar: true,
          icon: 'error',
          title: error.error || (approved ? 'Failed to approve attendance' : 'Failed to reject attendance')
        })
      }
    } catch (error) {
      console.error(`Error ${approved ? 'approving' : 'rejecting'} attendance:`, error)
      // Show error toast
      Swal.fire({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        icon: 'error',
        title: approved ? 'Failed to approve attendance' : 'Failed to reject attendance'
      })
    }
  }

  const exportToCSV = () => {
    if (!isAdmin) return
    
    const headers = ['Employee Name', 'Employee No', 'Department', 'Punch In', 'Punch Out', 'Duration', 'Status', 'Shift Info']
    const csvData = filteredAttendance.map(record => [
      `${record.employee.firstName} ${record.employee.lastName}`,
      record.employee.employeeNo,
      record.employee.department.name,
      formatTime(record.punchInTime),
      record.punchOutTime ? formatTime(record.punchOutTime) : 'Still working',
      calculateWorkDuration(record.punchInTime, record.punchOutTime),
      record.punchOutTime ? 'Completed' : 'Working',
      record.shift ? `${record.shift.startTime} - ${record.shift.endTime || 'Active'}` : 'No shift'
    ])

    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `attendance_${getDateRange()?.startDate || selectedDate}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const exportToPDF = async () => {
    if (!isAdmin) return
    
    try {
      const dateRange = getDateRange()
      const params = new URLSearchParams({
        startDate: dateRange?.startDate || selectedDate,
        endDate: dateRange?.endDate || selectedEndDate,
        ...(selectedEmployee && { employeeId: selectedEmployee })
      })

      const response = await fetch(`/api/attendance/export/pdf?${params.toString()}`)
      
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `attendance_${dateRange?.startDate || selectedDate}.pdf`
        a.click()
        window.URL.revokeObjectURL(url)
      } else {
        alert('Failed to export PDF')
      }
    } catch (error) {
      console.error('Error exporting PDF:', error)
      alert('Failed to export PDF')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#31BCFF]"></div>
        <div className="ml-4 text-gray-600">{t('loading')}</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="text-center text-red-600">
          {t('error.failed_to_load')}: {error}
          <button 
            onClick={fetchData}
            className="ml-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            {t('error.retry')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-2">
              {t('title')}
            </h1>
            <p className="text-gray-600 text-base mb-4">
              {t('subtitle')}
            </p>
            <div className="flex items-center gap-8 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <UserGroupIcon className="w-4 h-4" />
                <span>{attendanceRecords.length} {t('header.records_today')}</span>
              </div>
              <div className="flex items-center gap-2">
                <PlayIcon className="w-4 h-4" />
                <span>{activeCount} {t('header.currently_working')}</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircleIcon className="w-4 h-4" />
                <span>{completedCount} {t('header.completed')}</span>
              </div>
              <div className="flex items-center gap-2 text-blue-600 font-medium">
                <ClockIcon className="w-4 h-4" />
                <span>{currentTime.toLocaleTimeString('en-US', { 
                  hour: '2-digit', 
                  minute: '2-digit',
                  second: '2-digit',
                  hour12: false
                })}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date Range Type
              </label>
              <select
                value={dateRangeType}
                onChange={(e) => setDateRangeType(e.target.value as 'single' | 'week' | 'month')}
                className="block px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#31BCFF] focus:border-[#31BCFF] mr-2"
              >
                <option value="single">Single Day</option>
                <option value="week">Week</option>
                <option value="month">Month</option>
              </select>
            </div>
            {dateRangeType === 'single' && (
            <div className="flex items-center gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('header.select_start_date')}
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="block px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#31BCFF] focus:border-[#31BCFF]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('header.select_end_date')}
                </label>
                <input
                  type="date"
                  value={selectedEndDate}
                  onChange={(e) => setSelectedEndDate(e.target.value)}
                  className="block px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#31BCFF] focus:border-[#31BCFF]"
                />
              </div>
          </div>

            )}
            
            {dateRangeType === 'week' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Week Starting
                </label>
                <input
                  type="date"
                  value={weekStartDate}
                  onChange={(e) => setWeekStartDate(e.target.value)}
                  className="block px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#31BCFF] focus:border-[#31BCFF]"
                />
              </div>
            )}
            
            {dateRangeType === 'month' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Month
                </label>
                <input
                  type="month"
                  value={monthYear}
                  onChange={(e) => setMonthYear(e.target.value)}
                  className="block px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#31BCFF] focus:border-[#31BCFF]"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm mb-6">
        <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
          <div className="flex flex-col md:flex-row gap-4 items-center flex-1">
            <div className="relative flex-1 max-w-md">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={t('search.placeholder')}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#31BCFF] focus:border-[#31BCFF]"
              />
            </div>
            
            <div className="flex items-center gap-3">
              <select
                value={selectedEmployee}
                onChange={(e) => setSelectedEmployee(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#31BCFF] focus:border-[#31BCFF]"
              >
                <option value="">All Employees</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.firstName} {employee.lastName}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <FunnelIcon className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-500">{t('search.filter_label')}</span>
              </div>
              {[
                { value: 'all', label: t('filters.all') },
                { value: 'working', label: t('filters.working') },
                { value: 'completed', label: t('filters.completed') }
              ].map((filter) => (
                <button
                  key={filter.value}
                  onClick={() => setSelectedFilter(filter.value)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 min-w-[80px] ${
                    selectedFilter === filter.value
                      ? 'bg-[#31BCFF] text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          {/* Export Options - Admin Only */}
          {isAdmin && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={exportToCSV}
                className="inline-flex items-center"
              >
                <TableCellsIcon className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
              <Button
                onClick={exportToPDF}
                className="inline-flex items-center bg-red-600 hover:bg-red-700 text-white"
              >
                <DocumentTextIcon className="w-4 h-4 mr-2" />
                Export PDF
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Attendance Records Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            {t('table.title')} ({filteredAttendance.length})
          </h3>
        </div>
        
        {filteredAttendance.length === 0 ? (
          <div className="text-center py-12">
            <ClockIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">{t('empty_state.title')}</h3>
            <p className="text-gray-500">
              {searchTerm ? t('empty_state.subtitle_search') : t('empty_state.subtitle_no_data')}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('table.columns.employee')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('table.columns.department')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('table.columns.punch_in')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('table.columns.punch_out')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('table.columns.duration')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('table.columns.status')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('table.columns.shift_info')}
                  </th>
                  {isAdmin && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAttendance.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          {record.employee.profilePhoto ? (
                            <Image
                              src={record.employee.profilePhoto}
                              alt={`${record.employee.firstName} ${record.employee.lastName}`}
                              width={40}
                              height={40}
                              className="rounded-full object-cover"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-gradient-to-r from-[#31BCFF] to-[#0EA5E9] flex items-center justify-center">
                              <span className="text-sm font-medium text-white">
                                {record.employee.firstName.charAt(0)}{record.employee.lastName.charAt(0)}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {record.employee.firstName} {record.employee.lastName}
                          </div>
                          <div className="text-sm text-gray-500">
                            #{record.employee.employeeNo}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{record.employee.department.name}</div>
                      {record.employee.employeeGroup && (
                        <div className="text-sm text-gray-500">{record.employee.employeeGroup.name}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm ${getPunchInTimeStyle(record)}`}>
                        {formatTime(record.punchInTime)}
                      </div>
                      <div className="text-sm text-gray-500">{formatDate(record.punchInTime)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {record.punchOutTime ? (
                        <div>
                          <div className="text-sm text-gray-900">{formatTime(record.punchOutTime)}</div>
                          <div className="text-sm text-gray-500">{formatDate(record.punchOutTime)}</div>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500">{t('status.still_working')}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {calculateWorkDuration(record.punchInTime, record.punchOutTime)}
                      </div>
                      {/* Show early/late status indicators */}
                      {getEarlyLateStatus(record)?.map((status, index) => (
                        <span key={index} className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mt-1 mr-1 ${status.color}`}>
                          {status.text}
                        </span>
                      ))}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(record)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {record.shift ? (
                        <div>
                          <div className="text-sm text-gray-900">
                            {formatShiftTime(record.shift.startTime)} - {record.shift.endTime ? formatShiftTime(record.shift.endTime) : 'Active'}
                          </div>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            record.shift.status === 'WORKING' ? 'bg-green-100 text-green-800' :
                            record.shift.status === 'COMPLETED' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {record.shift.status}
                          </span>
                        </div>
                      ) : (
                        <div>
                          <span className="text-sm text-gray-500">{t('status.no_shift')}</span>
                          {!record.approved && (
                            <div className="mt-1">
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                Pending Approval
                              </span>
                            </div>
                          )}
                          {record.approved && !record.shift && (
                            <div className="mt-1">
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                <CheckCircleIcon className="w-3 h-3 mr-1" />
                                Approved
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                    {isAdmin && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEditRecord(record)}
                            className="inline-flex items-center px-3 py-1 text-sm font-medium rounded-lg text-blue-600 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                          >
                            <PencilIcon className="w-4 h-4 mr-1" />
                            Edit
                          </button>
                          
                          {/* Show approval buttons for unscheduled work that needs approval */}
                          {!record.shift && !record.approved && (
                            <>
                              <button
                                onClick={() => handleAttendanceApproval(record.id, true)}
                                className="inline-flex items-center px-3 py-1 text-sm font-medium rounded-lg text-green-600 bg-green-50 hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                              >
                                <CheckCircleIcon className="w-4 h-4 mr-1" />
                                Approve
                              </button>
                              <button
                                onClick={() => handleAttendanceApproval(record.id, false)}
                                className="inline-flex items-center px-3 py-1 text-sm font-medium rounded-lg text-red-600 bg-red-50 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                              >
                                <XCircleIcon className="w-4 h-4 mr-1" />
                                Reject
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Modal - Admin Only */}
      <Dialog open={isAdmin && showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Attendance Record</DialogTitle>
            <DialogDescription>
              {editingRecord && (
                <>Employee: {editingRecord.employee.firstName} {editingRecord.employee.lastName}</>
              )}
            </DialogDescription>
          </DialogHeader>

          {editingRecord && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Punch In Time
                </label>
                <Input
                  type="time"
                  step="60"
                  value={editFormData.punchInTime}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, punchInTime: e.target.value }))}
                  className="font-mono text-lg tracking-wider"
                  placeholder="HH:MM"
                  pattern="^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$"
                  title="Please enter time in 24-hour format (HH:MM)"
                />
                <p className="text-xs text-gray-500 mt-1">Format: 15:30 (3:30 PM)</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Punch Out Time
                </label>
                <Input
                  type="time"
                  step="60"
                  value={editFormData.punchOutTime}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, punchOutTime: e.target.value }))}
                  className="font-mono text-lg tracking-wider"
                  placeholder="HH:MM"
                  pattern="^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$"
                  title="Please enter time in 24-hour format (HH:MM)"
                />
                <p className="text-xs text-gray-500 mt-1">Format: 21:15 (9:15 PM)</p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowEditModal(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveEdit}
              className="bg-[#31BCFF] hover:bg-[#0EA5E9]"
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
