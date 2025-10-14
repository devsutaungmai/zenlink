'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import EmployeeForm from '@/components/EmployeeForm'
import { Department, EmployeeGroup } from '@prisma/client'
import { useCurrency } from '@/shared/hooks/useCurrency'
import { 
  EmployeeFormTabs, 
  defaultEmployeeTabs, 
  contractTab,
  EmployeeTabType 
} from '@/components/employee-form/EmployeeFormTabs'
import { ContractsTabContent } from '@/components/employee-form/ContractsTabContent'
import { 
  CalendarIcon,
  ArrowDownTrayIcon,
  EyeIcon,
  ChevronLeftIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  ClockIcon,
  DocumentTextIcon,
  HeartIcon
} from '@heroicons/react/24/outline'

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
  employeeGroup?: {
    name: string
  }
}

export default function EditEmployeePage({ params }: { params: Promise<{ id: string }> }) {
  const employeeId = React.use(params).id
  const { t } = useTranslation()
  const router = useRouter()
  const { currencySymbol } = useCurrency()
  const [employee, setEmployee] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [departments, setDepartments] = useState<Department[]>([])
  const [employeeGroups, setEmployeeGroups] = useState<EmployeeGroup[]>([])
  const [activeTab, setActiveTab] = useState<EmployeeTabType>('details')
  
  // Shifts related state
  const [shifts, setShifts] = useState<Shift[]>([])
  const [shiftsLoading, setShiftsLoading] = useState(false)
  const [shiftsSearchTerm, setShiftsSearchTerm] = useState('')
  const [selectedMonth, setSelectedMonth] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [contracts, setContracts] = useState<any[]>([])
  const [contractsLoading, setContractsLoading] = useState(false)
  const [availableTabs, setAvailableTabs] = useState(defaultEmployeeTabs)

  useEffect(() => {
    if (!employeeId) return

    const fetchData = async () => {
      try {
        const [employeeRes, deptsRes, groupsRes] = await Promise.all([
          fetch(`/api/employees/${employeeId}`),
          fetch('/api/departments'),
          fetch('/api/employee-groups')
        ])

        if (!employeeRes.ok || !deptsRes.ok || !groupsRes.ok) {
          throw new Error('Failed to fetch required data')
        }

        setEmployee(await employeeRes.json())
        setDepartments(await deptsRes.json())
        setEmployeeGroups(await groupsRes.json())
        
        fetchContracts()
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Failed to load form data')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [employeeId])

  const fetchShifts = async () => {
    if (!employeeId) return
    
    setShiftsLoading(true)
    try {
      let url = `/api/shifts?employeeId=${employeeId}`
      
      if (startDate && endDate) {
        url += `&startDate=${startDate}&endDate=${endDate}`
      } else if (selectedMonth) {
        const year = new Date().getFullYear()
        const monthStart = new Date(year, parseInt(selectedMonth) - 1, 1)
        const monthEnd = new Date(year, parseInt(selectedMonth), 0)
        url += `&startDate=${monthStart.toISOString().split('T')[0]}&endDate=${monthEnd.toISOString().split('T')[0]}`
      }
      
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setShifts(data)
      }
    } catch (error) {
      console.error('Error fetching shifts:', error)
    } finally {
      setShiftsLoading(false)
    }
  }

  const fetchContracts = async () => {
    if (!employeeId) return
    
    setContractsLoading(true)
    try {
      const response = await fetch(`/api/contracts?employeeId=${employeeId}`)
      if (response.ok) {
        const data = await response.json()
        setContracts(data)
        
        if (data && data.length > 0) {
          setAvailableTabs([...defaultEmployeeTabs, contractTab])
        } else {
          setAvailableTabs(defaultEmployeeTabs)
        }
      }
    } catch (error) {
      console.error('Error fetching contracts:', error)
    } finally {
      setContractsLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'shifts') {
      fetchShifts()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, employeeId, selectedMonth, startDate, endDate])

  const handleSubmit = async (formData: any) => {
    setSaving(true)
    setError(null)

    try {
      const res = await fetch(`/api/employees/${employeeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          birthday: new Date(formData.birthday).toISOString(),
          dateOfHire: new Date(formData.dateOfHire).toISOString()
        }),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to update employee')
      }

      router.push('/dashboard/employees')
      router.refresh()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setSaving(false)
    }
  }

  const getShiftStatusBadge = (shift: Shift) => {
    if (!shift.endTime) {
      return <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">Active</span>
    }
    if (shift.approved) {
      return <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">Completed</span>
    }
    return <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">Pending</span>
  }

  const getShiftTypeBadge = (shiftType: string) => {
    const colors = {
      NORMAL: 'bg-gray-100 text-gray-800',
      OVERTIME: 'bg-orange-100 text-orange-800',
      HOLIDAY: 'bg-purple-100 text-purple-800',
      TRAINING: 'bg-blue-100 text-blue-800'
    }
    return (
      <span className={`px-2 py-1 text-xs rounded-full ${colors[shiftType as keyof typeof colors] || colors.NORMAL}`}>
        {shiftType}
      </span>
    )
  }

  const formatShiftTime = (date: string, startTime: string, endTime?: string | null) => {
    const shiftDate = new Date(date).toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    })
    const timeRange = endTime ? `${startTime} - ${endTime}` : `${startTime} - Ongoing`
    return { date: shiftDate, time: timeRange }
  }

  const filteredShifts = shifts.filter(shift => {
    if (!shiftsSearchTerm) return true
    const searchLower = shiftsSearchTerm.toLowerCase()
    return (
      shift.shiftType.toLowerCase().includes(searchLower) ||
      shift.employeeGroup?.name.toLowerCase().includes(searchLower) ||
      shift.note?.toLowerCase().includes(searchLower) ||
      new Date(shift.date).toLocaleDateString().includes(searchLower)
    )
  })

  const getCurrentMonth = () => {
    return new Date().getMonth() + 1
  }

  const months = [
    { value: '1', label: 'January' },
    { value: '2', label: 'February' },
    { value: '3', label: 'March' },
    { value: '4', label: 'April' },
    { value: '5', label: 'May' },
    { value: '6', label: 'June' },
    { value: '7', label: 'July' },
    { value: '8', label: 'August' },
    { value: '9', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' }
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#31BCFF]"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-md max-w-md text-center">
          {error}
          <div className="mt-4 space-y-2">
            <button
              onClick={() => router.push('/dashboard/employees')}
              className="w-full px-4 py-2 text-sm font-medium text-white bg-[#31BCFF] rounded-md hover:bg-[#31BCFF]/90"
            >
              {t('employees.edit_page.back_to_employees')}
            </button>
            <button
              onClick={() => {}}
              className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              {t('employees.edit_page.try_again')}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/dashboard/employees')}
            className="p-2 hover:bg-white/50 rounded-xl transition-colors duration-200"
          >
            <ChevronLeftIcon className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
              {employee ? `${employee.firstName} ${employee.lastName}` : t('employees.edit_page.title')}
            </h1>
            <p className="mt-2 text-gray-600">
              {t('employees.edit_page.employee_info')}
            </p>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4">
          {error}
        </div>
      )}

      {/* Tabs Navigation */}
      <EmployeeFormTabs 
        activeTab={activeTab}
        onTabChange={setActiveTab}
        tabs={availableTabs}
      />

      {/* Tab Content */}
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 shadow-lg p-6">
        {activeTab === 'details' && (
          <div>
            {employee ? (
              <EmployeeForm 
                initialData={employee}
                onSubmit={handleSubmit} 
                loading={saving}
                departments={departments}
                  employeeGroups={employeeGroups}
                />
              ) : (
                <div className="p-4 text-gray-500 text-center">
                  Employee data not available
                </div>
              )}
            </div>
          )}

          {activeTab === 'shifts' && (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Employee Shifts</h3>
                <div className="text-sm text-gray-500">
                  Showing shifts for {employee?.firstName} {employee?.lastName}
                </div>
              </div>

              {/* Filters */}
              <div className="bg-gray-50/50 rounded-xl p-4 space-y-4">
                <div className="flex items-center gap-2 mb-3">
                  <FunnelIcon className="w-5 h-5 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">Filter Shifts</span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Search */}
                  <div className="relative">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search shifts..."
                      value={shiftsSearchTerm}
                      onChange={(e) => setShiftsSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 w-full rounded-lg border border-gray-300 bg-white text-sm focus:ring-2 focus:ring-[#31BCFF]/50 focus:border-[#31BCFF] transition-all duration-200"
                    />
                  </div>

                  {/* Month Filter */}
                  <select
                    value={selectedMonth}
                    onChange={(e) => {
                      setSelectedMonth(e.target.value)
                      if (e.target.value) {
                        setStartDate('')
                        setEndDate('')
                      }
                    }}
                    className="px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm focus:ring-2 focus:ring-[#31BCFF]/50 focus:border-[#31BCFF] transition-all duration-200"
                  >
                    <option value="">All Months</option>
                    {months.map((month) => (
                      <option key={month.value} value={month.value}>
                        {month.label} 2025
                      </option>
                    ))}
                  </select>

                  {/* Custom Date Range */}
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => {
                        setStartDate(e.target.value)
                        if (e.target.value) setSelectedMonth('')
                      }}
                      className="flex-1 px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm focus:ring-2 focus:ring-[#31BCFF]/50 focus:border-[#31BCFF] transition-all duration-200"
                    />
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => {
                        setEndDate(e.target.value)
                        if (e.target.value) setSelectedMonth('')
                      }}
                      className="flex-1 px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm focus:ring-2 focus:ring-[#31BCFF]/50 focus:border-[#31BCFF] transition-all duration-200"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>Showing {filteredShifts.length} of {shifts.length} shifts</span>
                  {(selectedMonth || startDate || endDate || shiftsSearchTerm) && (
                    <button
                      onClick={() => {
                        setSelectedMonth('')
                        setStartDate('')
                        setEndDate('')
                        setShiftsSearchTerm('')
                      }}
                      className="text-[#31BCFF] hover:text-[#31BCFF]/80 font-medium"
                    >
                      Clear Filters
                    </button>
                  )}
                </div>
              </div>

              {/* Shifts List */}
              {shiftsLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#31BCFF]"></div>
                </div>
              ) : filteredShifts.length === 0 ? (
                <div className="bg-gray-50 rounded-xl p-8 text-center">
                  <ClockIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h4 className="text-lg font-medium text-gray-900 mb-2">No Shifts Found</h4>
                  <p className="text-gray-500">
                    {shifts.length === 0 
                      ? 'This employee has no shifts assigned yet.'
                      : 'No shifts match your current filters. Try adjusting the search criteria.'
                    }
                  </p>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Date & Time
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Type
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Group
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Wage
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Notes
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {filteredShifts.map((shift) => {
                          const { date, time } = formatShiftTime(shift.date, shift.startTime, shift.endTime)
                          return (
                            <tr key={shift.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4">
                                <div>
                                  <div className="text-sm font-medium text-gray-900">{date}</div>
                                  <div className="text-sm text-gray-500">{time}</div>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                {getShiftTypeBadge(shift.shiftType)}
                              </td>
                              <td className="px-6 py-4">
                                <div className="text-sm text-gray-900">
                                  {shift.employeeGroup?.name || '-'}
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="text-sm text-gray-900">
                                  {currencySymbol}{shift.wage.toFixed(2)}
                                  <span className="text-xs text-gray-500 ml-1">
                                    ({shift.wageType.toLowerCase()})
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                {getShiftStatusBadge(shift)}
                              </td>
                              <td className="px-6 py-4">
                                <div className="text-sm text-gray-500 max-w-xs truncate">
                                  {shift.note || '-'}
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'payslips' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Employee Payslips</h3>
                <div className="text-sm text-gray-500">
                  Download and view payslips
                </div>
              </div>
              
              {/* Payslips List - UI Only for now */}
              <div className="bg-gray-50 rounded-xl p-8 text-center">
                <DocumentTextIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h4 className="text-lg font-medium text-gray-900 mb-2">Payslips Archive</h4>
                <p className="text-gray-500 mb-6">
                  Access and download payslips for this employee
                </p>
                <div className="space-y-3">
                  {/* Sample payslip entries - will be replaced with real data */}
                  {[1, 2, 3, 4].map((item) => (
                    <div key={item} className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <DocumentTextIcon className="w-8 h-8 text-[#31BCFF]" />
                        <div className="text-left">
                          <div className="font-medium text-gray-900">
                            Payslip - June {item * 7}, 2025
                          </div>
                          <div className="text-sm text-gray-500">
                            Period: June {item * 7 - 6} - June {item * 7}, 2025
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button className="p-2 text-gray-400 hover:text-[#31BCFF] hover:bg-blue-50 rounded-lg transition-all duration-200">
                          <EyeIcon className="w-4 h-4" />
                        </button>
                        <button className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all duration-200">
                          <ArrowDownTrayIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'sickleave' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Sick Leave Records</h3>
                <div className="text-sm text-gray-500">
                  Track sick leave history and requests
                </div>
              </div>
              
              {/* Sick Leave List - UI Only for now */}
              <div className="bg-gray-50 rounded-xl p-8 text-center">
                <HeartIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h4 className="text-lg font-medium text-gray-900 mb-2">Sick Leave Management</h4>
                <p className="text-gray-500 mb-6">
                  View and manage sick leave requests for this employee
                </p>
                <div className="space-y-3">
                  {/* Sample sick leave entries - will be replaced with real data */}
                  {[1, 2, 3].map((item) => (
                    <div key={item} className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <HeartIcon className="w-6 h-6 text-red-400" />
                          <div className="text-left">
                            <div className="font-medium text-gray-900">
                              Sick Leave Request #{item}
                            </div>
                            <div className="text-sm text-gray-500">
                              June {item * 5}, 2025 - June {item * 5 + 2}, 2025
                            </div>
                          </div>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          item === 1 ? 'bg-green-100 text-green-800' : 
                          item === 2 ? 'bg-yellow-100 text-yellow-800' : 
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {item === 1 ? 'Approved' : item === 2 ? 'Pending' : 'Completed'}
                        </span>
                      </div>
                      <div className="text-sm text-gray-500">
                        Reason: {item === 1 ? 'Flu symptoms' : item === 2 ? 'Medical appointment' : 'Recovery'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'contracts' && (
            <ContractsTabContent
              contracts={contracts}
              employeeName={employee ? `${employee.firstName} ${employee.lastName}` : undefined}
              loading={contractsLoading}
            />
          )}
        </div>
      </div>
  )
}
