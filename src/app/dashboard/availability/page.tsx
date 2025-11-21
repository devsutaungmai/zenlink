'use client'

import React, { useEffect, useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useUser } from '@/shared/lib/useUser'
import Swal from 'sweetalert2'
import {
  CalendarIcon,
  CheckCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  UserGroupIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import { AvailabilitySkeleton } from '@/components/skeletons/AvailabilitySkeleton'

interface Department {
  id: string
  name: string
}

interface EmployeeGroup {
  id: string
  name: string
}

interface Employee {
  id: string
  userId?: string
  firstName: string
  lastName: string
  employeeNo: string
  department: Department
  employeeGroup?: EmployeeGroup
}

interface Availability {
  id: string
  date: string
  isAvailable: boolean
  note?: string
  employee: Employee
}

interface AvailabilityStats {
  totalEmployees: number
  availableToday: number
  unavailableToday: number
  pendingRequests: number
}

export default function AdminAvailabilityPage() {
  const { t } = useTranslation('availability')
  const { user, loading: userLoading } = useUser()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [employees, setEmployees] = useState<Employee[]>([])
  const [availabilities, setAvailabilities] = useState<Availability[]>([])
  const [stats, setStats] = useState<AvailabilityStats>({
    totalEmployees: 0,
    availableToday: 0,
    unavailableToday: 0,
    pendingRequests: 0
  })
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedFilter, setSelectedFilter] = useState('all')
  const [selectedDepartment, setSelectedDepartment] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [employeesPerPage] = useState(10) // Reduced from 20 to 10 for better scrolling
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar') // Add view mode toggle
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Interactive functionality for employees
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set())
  const [submitting, setSubmitting] = useState(false)
  const [employeeRecordId, setEmployeeRecordId] = useState<string | null>(null)

  // Simple cache to prevent redundant API calls
  const [dataCache, setDataCache] = useState<{
    employees?: any[]
    availabilities?: any[]
    lastFetch?: string
    cacheKey?: string
  }>({})

  const currentMonth = currentDate.getMonth()
  const currentYear = currentDate.getFullYear()

  // Check if user is authenticated (admin or employee)
  const isEmployee = user?.role === 'EMPLOYEE' || !!user?.employee
  const isAuthenticated = !userLoading && user
  
  // Get current employee ID for filtering and interactions
  // Priority: user.employee.id (if exists), then user.id (if user is employee role)
  const currentEmployeeUserId = user?.id ?? null

  // Helper functions for employee interaction
  const formatDateKey = (date: Date) => {
    return date.toISOString().split('T')[0]
  }

  const isDateSelected = (date: Date) => {
    return selectedDates.has(formatDateKey(date))
  }

  const toggleDateSelection = (date: Date) => {
    const dateKey = formatDateKey(date)
    const newSelected = new Set(selectedDates)
    
    if (newSelected.has(dateKey)) {
      newSelected.delete(dateKey)
    } else {
      newSelected.add(dateKey)
    }
    
    setSelectedDates(newSelected)
  }

  const submitAvailability = async (isAvailable: boolean) => {
    if (selectedDates.size === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'No dates selected',
        text: 'Please select at least one date to update availability.',
      })
      return
    }

    const employeeRecord = isEmployee
      ? employees[0]
      : employees.find((emp: Employee) => emp.userId === currentEmployeeUserId)

    const employeeId = isEmployee
      ? (employeeRecordId || employeeRecord?.id)
      : employeeRecord?.id
    
    if (!employeeId) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Unable to identify employee. Please try logging in again.',
      })
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch('/api/availability', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          employeeId: employeeId,
          dates: Array.from(selectedDates),
          isAvailable
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update availability')
      }

      await fetchAvailabilities()
      setSelectedDates(new Set())

      Swal.fire({
        icon: 'success',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        title: `Marked ${selectedDates.size} day(s) as ${isAvailable ? 'available' : 'unavailable'}`
      })

    } catch (error) {
      console.error('Error updating availability:', error)
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to update availability. Please try again.',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const clearSelection = () => {
    setSelectedDates(new Set()) 
  }

  const selectAllDaysInMonth = () => {
    setSelectedDates(new Set())
    const days = getDaysInMonth(currentDate)
    const dateKeys = days
      .filter(day => day !== null)
      .map(day => formatDateKey(day as Date))
    setSelectedDates(new Set(dateKeys))
  }

  useEffect(() => {
    if (isAuthenticated) {
      fetchData()
    }
  }, [currentMonth, currentYear, isAuthenticated, isEmployee, currentEmployeeUserId])

  const fetchData = async () => {
    try {
      setLoading(true)

  const employeeCacheKey = isEmployee ? (employeeRecordId || currentEmployeeUserId || 'unknown') : 'all'
  const cacheKey = `${isEmployee ? 'employee' : 'admin'}-${employeeCacheKey}-${currentMonth}-${currentYear}`
      const now = Date.now().toString()

      const cacheExpiry = 30000 // 30 seconds
      if (dataCache.cacheKey === cacheKey &&
          dataCache.lastFetch &&
          (Date.now() - parseInt(dataCache.lastFetch)) < cacheExpiry &&
          dataCache.employees &&
          dataCache.availabilities) {

        setEmployees(dataCache.employees)
        setAvailabilities(dataCache.availabilities)
        return
      }

      if (isEmployee && (employeeRecordId || currentEmployeeUserId)) {
        try {
          const employeeRes = await fetch('/api/employee/me')
          let resolvedEmployee: Employee | null = null

          if (employeeRes.ok) {
            const employeeData = await employeeRes.json()
            resolvedEmployee = {
              id: employeeData.id,
              userId: currentEmployeeUserId || undefined,
              firstName: employeeData.firstName || 'Employee',
              lastName: employeeData.lastName || '',
              employeeNo: employeeData.employeeNo || '',
              department: {
                id: employeeData.department?.id || '',
                name: employeeData.department?.name || 'Unknown'
              },
              employeeGroup: employeeData.employeeGroup
                ? { id: employeeData.employeeGroupId || '', name: employeeData.employeeGroup }
                : undefined
            }
            setEmployeeRecordId(employeeData.id)
          } else {
            const fallbackEmployeeId = user?.employee?.id || employeeRecordId || null

            resolvedEmployee = {
              id: fallbackEmployeeId || '',
              userId: currentEmployeeUserId || undefined,
              firstName: user?.firstName || 'Employee',
              lastName: user?.lastName || '',
              employeeNo: user?.employee?.employeeNo || '',
              department: { id: user?.employee?.departmentId || '', name: 'Unknown' }
            }

            if (fallbackEmployeeId) {
              setEmployeeRecordId(fallbackEmployeeId)
            }
          }

          if ((!resolvedEmployee || !resolvedEmployee.id) && currentEmployeeUserId) {
            // Attempt targeted lookup as final fallback
            try {
              const targetedRes = await fetch(`/api/employees?userId=${currentEmployeeUserId}`)
              if (targetedRes.ok) {
                const targetedData = await targetedRes.json()
                const match = Array.isArray(targetedData) ? targetedData[0] : null
                if (match) {
                  resolvedEmployee = {
                    id: match.id,
                    userId: match.userId,
                    firstName: match.firstName,
                    lastName: match.lastName,
                    employeeNo: match.employeeNo,
                    department: match.department,
                    employeeGroup: match.employeeGroup
                  }
                  setEmployeeRecordId(match.id)
                }
              }
            } catch (fallbackError) {
              console.error('Fallback employee lookup failed:', fallbackError)
            }
          }

          if (!resolvedEmployee || !resolvedEmployee.id) {
            setError(t('error.failed_to_load'))
            return
          }

          setEmployees([resolvedEmployee])

          const employeeAvailabilities = await fetchAvailabilities([resolvedEmployee])
          await fetchStats([resolvedEmployee], employeeAvailabilities)

          setDataCache(prev => ({
            ...prev,
            employees: [resolvedEmployee],
            lastFetch: now,
            cacheKey
          }))
        } catch (error) {
          console.error('Error fetching employee data:', error)
          setError(t('error.failed_to_load'))
        }
      } else {
        // For admins, fetch all employees and full data
        const employeesRes = await fetch('/api/employees')
        let employeesData: Employee[] = []
        
        if (employeesRes.ok) {
          employeesData = await employeesRes.json()
          setEmployees(employeesData)
        }

        const adminAvailabilities = await fetchAvailabilities(employeesData)
        await fetchStats(employeesData, adminAvailabilities)

        setDataCache(prev => ({
          ...prev,
          employees: employeesData,
          lastFetch: now,
          cacheKey
        }))
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      setError(t('error.failed_to_load'))
    } finally {
      setLoading(false)
    }
  }



  const fetchAvailabilities = async (employeesData?: Employee[]) => {
    try {
      let url = `/api/availability?month=${currentMonth + 1}&year=${currentYear}`
      
      // If user is an employee, add employeeId parameter to filter their data
      if (isEmployee) {
        let employeeId = employeeRecordId

        if (!employeeId && employeesData && employeesData.length > 0) {
          const employeeRecord = employeesData.find((emp: any) => {
            return emp.id === employeeRecordId || emp.userId === currentEmployeeUserId
          })
          employeeId = employeeRecord?.id || employeeId
        }

        if (!employeeId && currentEmployeeUserId) {
          try {
            const empRes = await fetch(`/api/employees?userId=${currentEmployeeUserId}`)
            if (empRes.ok) {
              const empData = await empRes.json()
              employeeId = empData.length > 0 ? empData[0].id : null
              if (employeeId) {
                setEmployeeRecordId(employeeId)
              }
            }
          } catch (error) {
            console.error('Error fetching employee ID:', error)
          }
        }

        if (employeeId) {
          url += `&employeeId=${employeeId}`
        }
      }
      const res = await fetch(url)
      if (res.ok) {
        const availabilitiesData: Availability[] = await res.json()
        setAvailabilities(availabilitiesData)
        
        // Update cache with availability data
        setDataCache(prev => ({
          ...prev,
          availabilities: availabilitiesData
        }))

        return availabilitiesData
      }
    } catch (error) {
      console.error('Error fetching availabilities:', error)
    }

    return undefined
  }

  const fetchStats = async (employeesData?: Employee[], availabilitiesData?: Availability[]) => {
    try {
      const today = new Date().toISOString().split('T')[0]
      const sourceEmployees = employeesData ?? employees
      const sourceAvailabilities = availabilitiesData ?? availabilities

      const todayAvailabilities = sourceAvailabilities.filter(a => 
        a.date.split('T')[0] === today
      )
      
      setStats({
        totalEmployees: sourceEmployees.length,
        availableToday: todayAvailabilities.filter(a => a.isAvailable).length,
        unavailableToday: todayAvailabilities.filter(a => !a.isAvailable).length,
        pendingRequests: 0 // Can be enhanced based on business logic
      })
    } catch (error) {
      console.error('Error calculating stats:', error)
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
 
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null)
    }

    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day))
    }
    
    return days
  }

  const getAvailabilityForDate = useMemo(() => {
    const availabilityMap = new Map<string, Availability>()
    availabilities.forEach(availability => {
      const key = `${availability.employee.id}-${availability.date.split('T')[0]}`
      availabilityMap.set(key, availability)
    })
    
    return (employeeId: string, date: Date) => {
      const dateStr = date.toISOString().split('T')[0]
      const key = `${employeeId}-${dateStr}`
      return availabilityMap.get(key)
    }
  }, [availabilities])

  const previousMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1))
  }

  const nextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1))
  }

  const filteredEmployees = useMemo(() => {
    return employees.filter(employee => {
      const searchLower = searchTerm.toLowerCase()
      const matchesSearch = 
        `${employee.firstName} ${employee.lastName}`.toLowerCase().includes(searchLower) ||
        employee.employeeNo.toLowerCase().includes(searchLower) ||
        employee.department.name.toLowerCase().includes(searchLower)

      const matchesDepartment = selectedDepartment === 'all' || employee.department.id === selectedDepartment

      if (selectedFilter === 'all') return matchesSearch && matchesDepartment
      
      const today = new Date().toISOString().split('T')[0]
      const todayAvailability = availabilities.find(a => 
        a.employee.id === employee.id && 
        a.date.split('T')[0] === today
      )

      if (selectedFilter === 'available') {
        return matchesSearch && matchesDepartment && (!todayAvailability || todayAvailability.isAvailable)
      }
      if (selectedFilter === 'unavailable') {
        return matchesSearch && matchesDepartment && (todayAvailability && !todayAvailability.isAvailable)
      }

      return matchesSearch && matchesDepartment
    })
  }, [employees, searchTerm, selectedFilter, selectedDepartment, availabilities])

  // Pagination calculations
  const { totalPages, currentEmployees } = useMemo(() => {
    const totalPages = Math.ceil(filteredEmployees.length / employeesPerPage)
    const startIndex = (currentPage - 1) * employeesPerPage
    const endIndex = startIndex + employeesPerPage
    const currentEmployees = filteredEmployees.slice(startIndex, endIndex)
    
    return { totalPages, currentEmployees }
  }, [filteredEmployees, currentPage, employeesPerPage])

  const uniqueDepartments = useMemo(() => {
    return Array.from(new Set(employees.map(e => e.department.id)))
      .map(id => employees.find(e => e.department.id === id)?.department)
      .filter(Boolean)
  }, [employees])

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, selectedFilter, selectedDepartment])

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    // Scroll to top when page changes
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const monthNames = t('calendar.months', { returnObjects: true }) as string[]
  const weekDays = t('calendar.week_days', { returnObjects: true }) as string[]
  const days = getDaysInMonth(currentDate)

  if (userLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#31BCFF]"></div>
        <div className="ml-4 text-gray-600">Checking permissions...</div>
      </div>
    )
  }

  if (loading && isAuthenticated) {
    return <AvailabilitySkeleton />
  }

  if (!isAuthenticated) {
    return (
      <div className="p-6">
        <div className="text-center text-red-600">
          <ExclamationTriangleIcon className="w-12 h-12 mx-auto mb-4" />
          <p className="text-lg font-semibold">Access Denied</p>
          <p className="mt-2">Please log in to access this page.</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="text-center text-red-600">
          <ExclamationTriangleIcon className="w-12 h-12 mx-auto mb-4" />
          <p className="text-lg font-semibold">{error}</p>
          <Button onClick={fetchData} className="mt-4">
            {t('error.try_again')}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col space-y-4 sm:space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-blue-100">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
              {isEmployee ? 'My Availability' : t('title')}
            </h1>
            <p className="text-sm sm:text-base text-gray-600 mt-2">
              {isEmployee ? 'View and manage your availability calendar' : t('subtitle')}
            </p>
          </div>
          <CalendarIcon className="w-10 h-10 sm:w-12 sm:h-12 text-[#31BCFF] self-start sm:self-auto" />
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <UserGroupIcon className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-xl sm:text-2xl font-bold text-gray-900 truncate">{stats.totalEmployees}</p>
                  <p className="text-xs sm:text-sm text-gray-600 truncate">{t('header.total_employees')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <CheckCircleIcon className="w-6 h-6 sm:w-8 sm:h-8 text-green-600 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-xl sm:text-2xl font-bold text-green-600 truncate">{stats.availableToday}</p>
                  <p className="text-xs sm:text-sm text-gray-600 truncate">{t('header.available_today')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <XCircleIcon className="w-6 h-6 sm:w-8 sm:h-8 text-red-600 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-xl sm:text-2xl font-bold text-red-600 truncate">{stats.unavailableToday}</p>
                  <p className="text-xs sm:text-sm text-gray-600 truncate">Unavailable Today</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <ClockIcon className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-600 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-xl sm:text-2xl font-bold text-yellow-600 truncate">{stats.pendingRequests}</p>
                  <p className="text-xs sm:text-sm text-gray-600 truncate">Pending Requests</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col gap-3 sm:gap-4">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <div className="flex-1">
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder={isEmployee ? "Search availability..." : "Search employees..."}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 text-sm"
                  />
                </div>
              </div>
              
              <select 
                value={selectedFilter} 
                onChange={(e) => setSelectedFilter(e.target.value)}
                className="w-full sm:w-48 h-10 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#31BCFF] focus:border-[#31BCFF]"
              >
                <option value="all">All Employees</option>
                <option value="available">Available Today</option>
                <option value="unavailable">Unavailable Today</option>
              </select>
              
              {!isEmployee && (
                <select 
                  value={selectedDepartment} 
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  className="w-full sm:w-48 h-10 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#31BCFF] focus:border-[#31BCFF]"
                >
                  <option key="all-depts" value="all">All Departments</option>
                  {uniqueDepartments.map(dept => dept && (
                    <option key={`dept-${dept.id}`} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          
            {/* Results summary and view toggle */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs sm:text-sm text-gray-600">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                <span className="truncate">
                  {currentEmployees.length > 0 
                    ? (isEmployee 
                        ? `Showing your availability calendar`
                        : t('showing_paginated', { 
                            start: (currentPage - 1) * employeesPerPage + 1, 
                            end: Math.min(currentPage * employeesPerPage, filteredEmployees.length), 
                            total: filteredEmployees.length 
                          })
                      )
                    : (isEmployee 
                        ? `No availability data found`
                        : `Showing 0 of ${filteredEmployees.length} employees`
                      )
                  }
                </span>
                
                {/* View mode toggle */}
                <div className="flex items-center gap-2">
                  <span className="flex-shrink-0">View:</span>
                  <div className="flex rounded-md border border-gray-300 overflow-hidden">
                    <button
                      onClick={() => setViewMode('calendar')}
                      className={`px-2 sm:px-3 py-1 text-xs font-medium transition-colors ${
                        viewMode === 'calendar' 
                          ? 'bg-[#31BCFF] text-white' 
                          : 'bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      Calendar
                    </button>
                    <button
                      onClick={() => setViewMode('list')}
                      className={`px-2 sm:px-3 py-1 text-xs font-medium transition-colors ${
                        viewMode === 'list' 
                          ? 'bg-[#31BCFF] text-white' 
                          : 'bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      List
                    </button>
                  </div>
                </div>
              </div>
              
              {totalPages > 1 && (
                <span className="text-xs text-gray-400">
                  {t('page_info', { current: currentPage, total: totalPages })}
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calendar or List View */}
      {viewMode === 'calendar' ? (
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <CardTitle className="text-lg sm:text-xl">
                {monthNames[currentMonth]} {currentYear}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={previousMonth}>
                  <ChevronLeftIcon className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={nextMonth}>
                  <ChevronRightIcon className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-3 sm:p-6">
            {/* Calendar Cards */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
              {currentEmployees.map(employee => (
                <div key={`calendar-card-${employee.id}`} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="text-base font-semibold text-gray-900">
                        {employee.firstName} {employee.lastName}
                      </div>
                      <div className="text-xs text-gray-500">
                        {employee.employeeNo}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="secondary" className="text-xs">
                        {employee.department.name}
                      </Badge>
                      {employee.employeeGroup && (
                        <Badge className="text-xs bg-blue-50 text-blue-700">
                          {employee.employeeGroup.name}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="grid grid-cols-7 gap-1 text-[11px] sm:text-xs text-center text-gray-500 font-semibold">
                      {weekDays.map(day => (
                        <div key={`card-header-${employee.id}-${day}`}>{day}</div>
                      ))}
                    </div>
                    <div className="grid grid-cols-7 gap-1 mt-1">
                      {days.map((day, dayIndex) => {
                        if (!day) {
                          return (
                            <div key={`card-empty-${employee.id}-${dayIndex}`} className="p-2 border border-transparent" />
                          )
                        }

                        const availability = getAvailabilityForDate(employee.id, day)
                        const isToday = day.toDateString() === new Date().toDateString()
                        const isSelected = isEmployee && isDateSelected(day)
                        const isClickable = isEmployee && (!!employeeRecordId && employee.id === employeeRecordId)

                        return (
                          <div
                            key={`card-${employee.id}-${dayIndex}`}
                            onClick={() => isClickable && toggleDateSelection(day)}
                            className={`p-1.5 text-center text-[11px] sm:text-xs border rounded transition-all ${
                              isToday
                                ? 'border-blue-500 bg-blue-50'
                                : isSelected
                                  ? 'border-purple-500 bg-purple-100'
                                  : 'border-gray-200'
                            } ${isClickable ? 'cursor-pointer hover:bg-gray-50' : ''}`}
                          >
                            <div className="font-semibold text-gray-700">{day.getDate()}</div>
                            {!isSelected && availability && (
                              <div className={`mt-0.5 rounded text-white text-[10px] py-0.5 ${
                                availability.isAvailable ? 'bg-green-500' : 'bg-red-500'
                              }`}>
                                {availability.isAvailable ? '✓' : '✗'}
                              </div>
                            )}
                            {isSelected && (
                              <div className="mt-0.5 rounded bg-purple-500 text-white text-[10px] py-0.5">
                                ●
                              </div>
                            )}
                            {availability?.note && (
                              <div className="mt-0.5 text-[10px] text-gray-500 truncate" title={availability.note}>
                                📝
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        /* List View for better performance with many employees */
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-lg sm:text-xl">Employee Availability List</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-6">
            <div className="space-y-3 sm:space-y-4">
              {currentEmployees.map(employee => {
                const today = new Date().toISOString().split('T')[0]
                const todayAvailability = availabilities.find(a => 
                  a.employee.id === employee.id && 
                  a.date.split('T')[0] === today
                )
                
                return (
                  <div key={employee.id} className="border border-gray-200 rounded-lg p-3 sm:p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm sm:text-base font-semibold text-gray-900 truncate">
                          {employee.firstName} {employee.lastName}
                        </h3>
                        <p className="text-xs sm:text-sm text-gray-600 truncate">
                          {employee.employeeNo} • {employee.department.name}
                        </p>
                        {employee.employeeGroup && (
                          <Badge variant="secondary" className="text-xs mt-1">
                            {employee.employeeGroup.name}
                          </Badge>
                        )}
                      </div>
                      
                      <div className="text-left sm:text-right flex-shrink-0">
                        <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-full text-xs sm:text-sm font-medium ${
                          !todayAvailability || todayAvailability.isAvailable
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {!todayAvailability || todayAvailability.isAvailable ? (
                            <>
                              <CheckCircleIcon className="w-4 h-4 flex-shrink-0" />
                              <span>Available Today</span>
                            </>
                          ) : (
                            <>
                              <XCircleIcon className="w-4 h-4 flex-shrink-0" />
                              <span>Unavailable Today</span>
                            </>
                          )}
                        </div>
                        {todayAvailability?.note && (
                          <p className="text-xs text-gray-500 mt-1 max-w-48 truncate">
                            Note: {todayAvailability.note}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious 
                  onClick={() => currentPage > 1 && handlePageChange(currentPage - 1)}
                  className={currentPage <= 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                />
              </PaginationItem>
              
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                // Show first page, last page, current page, and pages around current page
                if (
                  page === 1 ||
                  page === totalPages ||
                  (page >= currentPage - 1 && page <= currentPage + 1)
                ) {
                  return (
                    <PaginationItem key={page}>
                      <PaginationLink
                        onClick={() => handlePageChange(page)}
                        isActive={page === currentPage}
                        className="cursor-pointer"
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  )
                } else if (
                  page === currentPage - 2 ||
                  page === currentPage + 2
                ) {
                  return (
                    <PaginationItem key={page}>
                      <PaginationEllipsis />
                    </PaginationItem>
                  )
                }
                return null
              })}
              
              <PaginationItem>
                <PaginationNext 
                  onClick={() => currentPage < totalPages && handlePageChange(currentPage + 1)}
                  className={currentPage >= totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

      {/* Employee Action Buttons */}
      {isEmployee && (
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-col gap-4">
              {/* Selection Info */}
              <div className="text-center">
                {selectedDates.size > 0 ? (
                  <span className="text-sm font-medium text-gray-700">{selectedDates.size} day(s) selected</span>
                ) : (
                  <span className="text-sm text-gray-500">Click on calendar days to select them</span>
                )}
              </div>
              
              {/* Action Buttons */}
              {selectedDates.size > 0 && (
                <div className="flex flex-wrap gap-3 justify-center">
                  <Button
                    onClick={() => submitAvailability(true)}
                    disabled={selectedDates.size === 0 || submitting}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    {submitting ? 'Updating...' : 'Mark Available'}
                  </Button>
                  <Button
                    onClick={() => submitAvailability(false)}
                    disabled={selectedDates.size === 0 || submitting}
                    variant="destructive"
                  >
                    {submitting ? 'Updating...' : 'Mark Unavailable'}
                  </Button>
                  <Button
                    onClick={clearSelection}
                    variant="outline"
                  >
                    Clear Selection
                  </Button>
                </div>
              )}
              
              {/* Quick Actions */}
              <div className="flex flex-wrap gap-3 justify-center">
                <Button
                  onClick={selectAllDaysInMonth}
                  variant="outline"
                  size="sm"
                >
                  Select All Days
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Legend */}
      <Card>
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-wrap items-center gap-3 sm:gap-6 text-xs sm:text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 sm:w-4 sm:h-4 bg-green-500 rounded flex-shrink-0"></div>
              <span>Available</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 sm:w-4 sm:h-4 bg-red-500 rounded flex-shrink-0"></div>
              <span>Unavailable</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-blue-500 rounded flex-shrink-0"></div>
              <span>Today</span>
            </div>
            {isEmployee && (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 sm:w-4 sm:h-4 bg-purple-500 rounded flex-shrink-0"></div>
                <span>Selected</span>
              </div>
            )}
            {isEmployee && (
              <div className="flex items-center gap-2 text-xs text-gray-500 w-full mt-2">
                <span>💡 Click on your calendar days to select, then mark as available/unavailable</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
