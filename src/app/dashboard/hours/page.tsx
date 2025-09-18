'use client'

import { useState, useEffect } from 'react'
import { ClockIcon, CalendarIcon, ChartBarIcon, CheckCircleIcon } from '@heroicons/react/24/outline'
import { useUser } from '@/app/lib/useUser'

interface HoursData {
  dateRange: {
    startDate: string
    endDate: string
  }
  totalHours: {
    hours: number
    minutes: number
    total: number
    formatted: string
  }
  approvedShiftHours: {
    hours: number
    minutes: number
    total: number
    formatted: string
  }
  shifts: {
    approved: number
    scheduled: number
    completed: number
    active: number
  }
  attendanceRecords: number
  summary: {
    workingSessions: number
    completedSessions: number
    activeSessions: number
  }
}

export default function EmployeeHoursPage() {
  const { user, loading: userLoading } = useUser()
  const [hoursData, setHoursData] = useState<HoursData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // Set default to today
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0]
    setStartDate(today)
    setEndDate(today)
  }, [])

  // Fetch hours data when dates change
  useEffect(() => {
    if (startDate && endDate) {
      fetchHoursData()
    }
  }, [startDate, endDate])

  const fetchHoursData = async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      if (startDate) params.append('startDate', startDate)
      if (endDate) params.append('endDate', endDate)

      const response = await fetch(`/api/employee/hours?${params.toString()}`)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch hours data')
      }

      const data = await response.json()
      setHoursData(data)
    } catch (error) {
      console.error('Error fetching hours data:', error)
      setError(error instanceof Error ? error.message : 'Failed to load hours data')
    } finally {
      setLoading(false)
    }
  }

  const setDateRange = (range: 'today' | 'week' | 'month') => {
    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]
    
    switch (range) {
      case 'today':
        setStartDate(todayStr)
        setEndDate(todayStr)
        break
      case 'week':
        const weekStart = new Date(today)
        weekStart.setDate(today.getDate() - today.getDay()) // Start of week (Sunday)
        const weekEnd = new Date(today)
        weekEnd.setDate(weekStart.getDate() + 6) // End of week (Saturday)
        setStartDate(weekStart.toISOString().split('T')[0])
        setEndDate(weekEnd.toISOString().split('T')[0])
        break
      case 'month':
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
        const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0)
        setStartDate(monthStart.toISOString().split('T')[0])
        setEndDate(monthEnd.toISOString().split('T')[0])
        break
    }
  }

  if (userLoading) {
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

  if (user?.role !== 'EMPLOYEE') {
    return (
      <div className="py-8 px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-gray-900">Access Denied</h1>
          <p className="mt-2 text-gray-600">This page is only available to employees.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Your Hours</h1>
          <p className="mt-1 text-sm text-gray-600">
            Track your working hours and shift statistics
          </p>
        </div>
      </div>

      {/* Date Range Controls */}
      <div className="bg-white shadow rounded-lg p-6 mb-8">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Date Range</h3>
        
        {/* Quick Date Buttons */}
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => setDateRange('today')}
            className="px-3 py-2 text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 transition-colors"
          >
            Today
          </button>
          <button
            onClick={() => setDateRange('week')}
            className="px-3 py-2 text-sm font-medium rounded-md text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            This Week
          </button>
          <button
            onClick={() => setDateRange('month')}
            className="px-3 py-2 text-sm font-medium rounded-md text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            This Month
          </button>
        </div>

        {/* Custom Date Range */}
        <div className="flex flex-wrap gap-4 items-center">
          <div>
            <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
              Start Date
            </label>
            <input
              type="date"
              id="startDate"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">
              End Date
            </label>
            <input
              type="date"
              id="endDate"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading hours data...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hours Data */}
      {hoursData && !loading && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
            {/* Total Hours Worked */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <ClockIcon className="h-6 w-6 text-blue-400" aria-hidden="true" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Total Hours Worked
                      </dt>
                      <dd className="flex items-baseline">
                        <div className="text-2xl font-semibold text-gray-900">
                          {hoursData.totalHours.formatted}
                        </div>
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            {/* Approved Shift Hours */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <CheckCircleIcon className="h-6 w-6 text-green-400" aria-hidden="true" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Approved Shift Hours
                      </dt>
                      <dd className="flex items-baseline">
                        <div className="text-2xl font-semibold text-gray-900">
                          {hoursData.approvedShiftHours.formatted}
                        </div>
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            {/* Approved Shifts */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <CalendarIcon className="h-6 w-6 text-indigo-400" aria-hidden="true" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Approved / Scheduled
                      </dt>
                      <dd className="flex items-baseline">
                        <div className="text-2xl font-semibold text-gray-900">
                          {hoursData.shifts.approved} / {hoursData.shifts.scheduled}
                        </div>
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            {/* Working Sessions */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <ChartBarIcon className="h-6 w-6 text-purple-400" aria-hidden="true" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Work Sessions
                      </dt>
                      <dd className="flex items-baseline">
                        <div className="text-2xl font-semibold text-gray-900">
                          {hoursData.summary.workingSessions}
                        </div>
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Breakdown */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Detailed Breakdown
              </h3>
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* Hours Summary */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-3">Hours Summary</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Total Hours Worked:</span>
                        <span className="text-sm font-medium text-gray-900">
                          {hoursData.totalHours.formatted}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Approved Shift Hours:</span>
                        <span className="text-sm font-medium text-gray-900">
                          {hoursData.approvedShiftHours.formatted}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Shift Summary */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-3">Shift Summary</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Approved Shifts:</span>
                        <span className="text-sm font-medium text-green-600">
                          {hoursData.shifts.approved}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Total Scheduled:</span>
                        <span className="text-sm font-medium text-gray-900">
                          {hoursData.shifts.scheduled}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Completed Sessions:</span>
                        <span className="text-sm font-medium text-blue-600">
                          {hoursData.summary.completedSessions}
                        </span>
                      </div>
                      {hoursData.summary.activeSessions > 0 && (
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-500">Active Sessions:</span>
                          <span className="text-sm font-medium text-orange-600">
                            {hoursData.summary.activeSessions}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Date Range Info */}
                <div className="border-t border-gray-200 pt-4">
                  <div className="flex items-center text-sm text-gray-500">
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    <span>
                      Showing data from {new Date(hoursData.dateRange.startDate).toLocaleDateString()} 
                      {hoursData.dateRange.startDate !== hoursData.dateRange.endDate && 
                        ` to ${new Date(hoursData.dateRange.endDate).toLocaleDateString()}`
                      }
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
