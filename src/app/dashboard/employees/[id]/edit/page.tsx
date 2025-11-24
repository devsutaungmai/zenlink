'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { FormSkeleton } from '@/components/skeletons/CommonSkeletons'
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
  const [payslips, setPayslips] = useState<any[]>([])
  const [payslipsLoading, setPayslipsLoading] = useState(false)

  const [sickLeaves, setSickLeaves] = useState<any[]>([])
  const [sickLeavesLoading, setSickLeavesLoading] = useState(false)

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
        
      }
    } catch (error) {
      console.error('Error fetching contracts:', error)
    } finally {
      setContractsLoading(false)
    }
  }

  useEffect(() => {
    if (employeeId) {
      setAvailableTabs([...defaultEmployeeTabs, contractTab])
    }
  }, [employeeId])

  const fetchPayslips = async () => {
    if (!employeeId) return
    
    setPayslipsLoading(true)
    try {
      const response = await fetch(`/api/payroll-entries?employeeId=${employeeId}`)
      if (response.ok) {
        const data = await response.json()
        // Handle the API response structure properly
        setPayslips(data.payrollEntries || [])
      }
    } catch (error) {
      console.error('Error fetching payslips:', error)
      setPayslips([])
    } finally {
      setPayslipsLoading(false)
    }
  }

  const fetchSickLeaves = async () => {
    if (!employeeId) return
    
    setSickLeavesLoading(true)
    try {
      const response = await fetch(`/api/sick-leaves?employeeId=${employeeId}`)
      if (response.ok) {
        const data = await response.json()
        setSickLeaves(Array.isArray(data) ? data : [])
      }
    } catch (error) {
      console.error('Error fetching sick leaves:', error)
      setSickLeaves([])
    } finally {
      setSickLeavesLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'shifts') {
      fetchShifts()
    } else if (activeTab === 'payslips') {
      fetchPayslips()
    } else if (activeTab === 'sickleave') {
      fetchSickLeaves()
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

  const handleCreateContractNavigation = () => {
    if (!employeeId) return
    router.push(`/dashboard/contracts?employeeId=${employeeId}`)
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
      <div className="p-6">
        <FormSkeleton rows={8} />
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
    <div className="space-y-4 sm:space-y-6">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-blue-100">
        <div className="flex items-center gap-3 sm:gap-4">
          <button
            onClick={() => router.push('/dashboard/employees')}
            className="p-2 hover:bg-white/50 rounded-lg sm:rounded-xl transition-colors duration-200 flex-shrink-0"
          >
            <ChevronLeftIcon className="w-5 h-5 text-gray-600" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent truncate">
              {employee ? `${employee.firstName} ${employee.lastName}` : t('employees.edit_page.title')}
            </h1>
            <p className="mt-1 sm:mt-2 text-sm sm:text-base text-gray-600">
              {t('employees.edit_page.employee_info')}
            </p>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 sm:p-4 text-sm sm:text-base">
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
      <div className="bg-white/80 backdrop-blur-xl rounded-xl sm:rounded-2xl border border-gray-200/50 shadow-lg p-4 sm:p-6">
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
            <div className="space-y-4 sm:space-y-6">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <h3 className="text-base sm:text-lg font-medium text-gray-900">Employee Shifts</h3>
                <div className="text-xs sm:text-sm text-gray-500">
                  Showing shifts for {employee?.firstName} {employee?.lastName}
                </div>
              </div>

              {/* Filters */}
              <div className="bg-gray-50/50 rounded-xl p-3 sm:p-4 space-y-3 sm:space-y-4">
                <div className="flex items-center gap-2 mb-2 sm:mb-3">
                  <FunnelIcon className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500 flex-shrink-0" />
                  <span className="text-xs sm:text-sm font-medium text-gray-700">Filter Shifts</span>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  {/* Search */}
                  <div className="relative sm:col-span-2 lg:col-span-1">
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
                  <div className="flex gap-2 sm:col-span-2 lg:col-span-1">
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => {
                        setStartDate(e.target.value)
                        if (e.target.value) setSelectedMonth('')
                      }}
                      className="flex-1 px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm focus:ring-2 focus:ring-[#31BCFF]/50 focus:border-[#31BCFF] transition-all duration-200"
                      placeholder="Start date"
                    />
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => {
                        setEndDate(e.target.value)
                        if (e.target.value) setSelectedMonth('')
                      }}
                      className="flex-1 px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm focus:ring-2 focus:ring-[#31BCFF]/50 focus:border-[#31BCFF] transition-all duration-200"
                      placeholder="End date"
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs sm:text-sm text-gray-500">
                  <span>Showing {filteredShifts.length} of {shifts.length} shifts</span>
                  {(selectedMonth || startDate || endDate || shiftsSearchTerm) && (
                    <button
                      onClick={() => {
                        setSelectedMonth('')
                        setStartDate('')
                        setEndDate('')
                        setShiftsSearchTerm('')
                      }}
                      className="text-[#31BCFF] hover:text-[#31BCFF]/80 font-medium text-left sm:text-right"
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
                <div className="bg-gray-50 rounded-xl p-6 sm:p-8 text-center">
                  <ClockIcon className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400 mx-auto mb-3 sm:mb-4" />
                  <h4 className="text-base sm:text-lg font-medium text-gray-900 mb-2">No Shifts Found</h4>
                  <p className="text-sm sm:text-base text-gray-500">
                    {shifts.length === 0 
                      ? 'This employee has no shifts assigned yet.'
                      : 'No shifts match your current filters. Try adjusting the search criteria.'
                    }
                  </p>
                </div>
              ) : (
                <>
                  {/* Desktop Table View */}
                  <div className="hidden md:block bg-white rounded-xl border border-gray-200 overflow-hidden">
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

                  {/* Mobile Card View */}
                  <div className="md:hidden space-y-3">
                    {filteredShifts.map((shift) => {
                      const { date, time } = formatShiftTime(shift.date, shift.startTime, shift.endTime)
                      return (
                        <div key={shift.id} className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
                          {/* Header with Date and Status */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-semibold text-gray-900">{date}</div>
                              <div className="text-xs text-gray-500 mt-0.5">{time}</div>
                            </div>
                            {getShiftStatusBadge(shift)}
                          </div>

                          {/* Details Grid */}
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <div className="text-xs text-gray-500 mb-1">Type</div>
                              {getShiftTypeBadge(shift.shiftType)}
                            </div>
                            <div>
                              <div className="text-xs text-gray-500 mb-1">Wage</div>
                              <div className="font-medium text-gray-900">
                                {currencySymbol}{shift.wage.toFixed(2)}
                                <div className="text-xs text-gray-500">
                                  {shift.wageType.toLowerCase()}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Group */}
                          {shift.employeeGroup?.name && (
                            <div>
                              <div className="text-xs text-gray-500 mb-1">Group</div>
                              <div className="text-sm text-gray-900">{shift.employeeGroup.name}</div>
                            </div>
                          )}

                          {/* Notes */}
                          {shift.note && (
                            <div>
                              <div className="text-xs text-gray-500 mb-1">Notes</div>
                              <div className="text-sm text-gray-600 line-clamp-2">{shift.note}</div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </>
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
              
              {payslipsLoading ? (
                <div className="bg-gray-50 rounded-xl p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#31BCFF] mx-auto mb-4"></div>
                  <p className="text-gray-500">Loading payslips...</p>
                </div>
              ) : (Array.isArray(payslips) ? payslips : []).length === 0 ? (
                <div className="bg-gray-50 rounded-xl p-8 text-center">
                  <DocumentTextIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h4 className="text-lg font-medium text-gray-900 mb-2">No Payslips Found</h4>
                  <p className="text-gray-500">
                    This employee has no payslips generated yet.
                  </p>
                </div>
              ) : (
                <div className="bg-gray-50 rounded-xl p-8">
                  <h4 className="text-lg font-medium text-gray-900 mb-6 text-center">Payslips Archive</h4>
                  <div className="space-y-3">
                    {(Array.isArray(payslips) ? payslips : []).map((payslip) => (
                      <div key={payslip.id} className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <DocumentTextIcon className="w-8 h-8 text-[#31BCFF]" />
                          <div className="text-left">
                            <div className="font-medium text-gray-900">
                              Payslip - {payslip.payrollPeriod?.name || 'Unknown Period'}
                            </div>
                            <div className="text-sm text-gray-500">
                              Period: {payslip.payrollPeriod?.startDate ? new Date(payslip.payrollPeriod.startDate).toLocaleDateString() : 'N/A'} - {payslip.payrollPeriod?.endDate ? new Date(payslip.payrollPeriod.endDate).toLocaleDateString() : 'N/A'}
                            </div>
                            <div className="text-xs text-gray-400">
                              Status: {payslip.status || 'N/A'} | Total: {currencySymbol}{payslip.totalGrossPay || 0}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {/* <button 
                            onClick={() => window.open(`/api/payroll-entries/${payslip.id}/payslip`, '_blank')}
                            className="p-2 text-gray-400 hover:text-[#31BCFF] hover:bg-blue-50 rounded-lg transition-all duration-200"
                            title="View Payslip"
                          >
                            <EyeIcon className="w-4 h-4" />
                          </button> */}
                          <button 
                            onClick={() => {
                              const link = document.createElement('a')
                              link.href = `/api/payroll-entries/${payslip.id}/payslip`
                              link.download = `payslip-${payslip.payrollPeriod?.name || payslip.id}.pdf`
                              link.click()
                            }}
                            className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all duration-200"
                            title="Download Payslip"
                          >
                            <ArrowDownTrayIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
              
              {sickLeavesLoading ? (
                <div className="bg-gray-50 rounded-xl p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#31BCFF] mx-auto mb-4"></div>
                  <p className="text-gray-500">Loading sick leave records...</p>
                </div>
              ) : (Array.isArray(sickLeaves) ? sickLeaves : []).length === 0 ? (
                <div className="bg-gray-50 rounded-xl p-8 text-center">
                  <HeartIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h4 className="text-lg font-medium text-gray-900 mb-2">No Sick Leave Records</h4>
                  <p className="text-gray-500">
                    This employee has no sick leave records yet.
                  </p>
                </div>
              ) : (
                <div className="bg-gray-50 rounded-xl p-8">
                  <h4 className="text-lg font-medium text-gray-900 mb-6 text-center">Sick Leave History</h4>
                  <div className="space-y-3">
                    {(Array.isArray(sickLeaves) ? sickLeaves : []).map((sickLeave) => (
                      <div key={sickLeave.id} className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <HeartIcon className="w-6 h-6 text-red-400" />
                            <div className="text-left">
                              <div className="font-medium text-gray-900">
                                Sick Leave Request
                              </div>
                              <div className="text-sm text-gray-500">
                                {new Date(sickLeave.startDate).toLocaleDateString()} - {new Date(sickLeave.endDate).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            sickLeave.approved === true ? 'bg-green-100 text-green-800' : 
                            sickLeave.approved === false ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {sickLeave.approved === true ? 'Approved' : sickLeave.approved === false ? 'Rejected' : 'Pending'}
                          </span>
                        </div>
                        {sickLeave.reason && (
                          <div className="text-sm text-gray-500">
                            Reason: {sickLeave.reason}
                          </div>
                        )}
                        <div className="text-xs text-gray-400 mt-2">
                          Submitted: {new Date(sickLeave.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'contracts' && (
            <ContractsTabContent
              contracts={contracts}
              employeeName={employee ? `${employee.firstName} ${employee.lastName}` : undefined}
              loading={contractsLoading}
              onCreateContract={handleCreateContractNavigation}
            />
          )}
        </div>
      </div>
  )
}
