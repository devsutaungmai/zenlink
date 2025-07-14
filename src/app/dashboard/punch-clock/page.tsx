'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { 
  ClockIcon, 
  UserGroupIcon,
  CalendarIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  PlayIcon,
  StopIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline'

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
  employee: {
    firstName: string
    lastName: string
    employeeNo: string
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
  const [business, setBusiness] = useState<Business | null>(null)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [attendanceRecords, setAttendanceRecords] = useState<Attendance[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedFilter, setSelectedFilter] = useState('all')
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    fetchData()
    
    // Update current time every second
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(timeInterval)
  }, [selectedDate])

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

      const url = businessId 
        ? `/api/attendance?businessId=${businessId}&date=${selectedDate}`
        : `/api/attendance?date=${selectedDate}`
        
      const res = await fetch(url)
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
      hour12: true
    })
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
                  hour12: true
                })}</span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('header.select_date')}
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="block px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#31BCFF] focus:border-[#31BCFF]"
            />
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm mb-6">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
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
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAttendance.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div>
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
                      <div className="text-sm text-gray-900">{formatTime(record.punchInTime)}</div>
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
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(record)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {record.shift ? (
                        <div>
                          <div className="text-sm text-gray-900">
                            {record.shift.startTime} - {record.shift.endTime || 'Active'}
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
                        <span className="text-sm text-gray-500">{t('status.no_shift')}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
