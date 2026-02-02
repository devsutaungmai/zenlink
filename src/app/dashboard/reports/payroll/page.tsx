'use client'

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import Link from 'next/link'
import {
  ChartBarIcon,
  DocumentArrowDownIcon,
  EyeIcon,
  CalendarIcon,
  UsersIcon,
  BuildingOfficeIcon,
  CurrencyDollarIcon,
  ClockIcon,
  TableCellsIcon,
  AdjustmentsHorizontalIcon
} from '@heroicons/react/24/outline'
import Swal from 'sweetalert2'
import { downloadBlob } from '@/shared/utils/download'

interface Employee {
  id: string
  firstName: string
  lastName: string
  employeeNo?: string
  department: {
    id: string
    name: string
  }
  employeeGroup?: {
    id: string
    name: string
  }
}

interface Department {
  id: string
  name: string
  _count: {
    employees: number
  }
}

interface PayrollReportEntry {
  id: string
  regularHours: number
  overtimeHours: number
  regularRate: number
  overtimeRate: number
  grossPay: number
  deductions: number
  netPay: number
  bonuses: number
  status: 'DRAFT' | 'APPROVED' | 'PAID'
  employee: {
    id: string
    firstName: string
    lastName: string
    employeeNo?: string
    department: {
      id: string
      name: string
    }
    employeeGroup?: {
      id: string
      name: string
    }
  }
  payrollPeriod: {
    id: string
    name: string
    startDate: string
    endDate: string
  }
}

interface PayrollReportSummary {
  totalEntries: number
  totalEmployees: number
  totalRegularHours: number
  totalOvertimeHours: number
  totalGrossPay: number
  totalDeductions: number
  totalNetPay: number
  totalBonuses: number
  byStatus: {
    draft: number
    approved: number
    paid: number
  }
  byDepartment: Record<string, {
    name: string
    count: number
    totalHours: number
    totalGrossPay: number
    totalNetPay: number
  }>
}

interface PayrollReportData {
  entries: PayrollReportEntry[]
  summary: PayrollReportSummary
  dateRange: {
    startDate: string
    endDate: string
  }
}

export default function PayrollReportsPage() {
  const { t } = useTranslation('payroll-reports')
  
  // Form state
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([])
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([])
  const [includeApprovedOnly, setIncludeApprovedOnly] = useState(false)
  const [includePaidOnly, setIncludePaidOnly] = useState(false)
  
  // Data state
  const [employees, setEmployees] = useState<Employee[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [reportData, setReportData] = useState<PayrollReportData | null>(null)
  
  // UI state
  const [loading, setLoading] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [previewMode, setPreviewMode] = useState(false)

  // Initialize with current month
  useEffect(() => {
    const now = new Date()
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    
    setStartDate(firstDay.toISOString().split('T')[0])
    setEndDate(lastDay.toISOString().split('T')[0])
  }, [])

  // Load employees and departments
  useEffect(() => {
    fetchEmployees()
    fetchDepartments()
  }, [])

  const fetchEmployees = async () => {
    try {
      const response = await fetch('/api/employees')
      const data = await response.json()
      if (response.ok) {
        setEmployees(data || [])
      }
    } catch (error) {
      console.error('Error fetching employees:', error)
    }
  }

  const fetchDepartments = async () => {
    try {
      const response = await fetch('/api/departments')
      const data = await response.json()
      if (response.ok) {
        setDepartments(data || [])
      }
    } catch (error) {
      console.error('Error fetching departments:', error)
    }
  }

  const generateReport = async (preview = false) => {
    if (!startDate || !endDate) {
      Swal.fire({
        title: t('missing_info_title', 'Missing Information'),
        text: t('missing_dates_text', 'Please select both start and end dates.'),
        icon: 'warning',
        confirmButtonColor: '#31BCFF'
      })
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/reports/payroll', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          startDate,
          endDate,
          employeeIds: selectedEmployees,
          departmentIds: selectedDepartments,
          includeApprovedOnly,
          includePaidOnly
        })
      })

      const data = await response.json()
      
      if (response.ok) {
        setReportData(data)
        setPreviewMode(preview)
        
        if (!preview) {
          Swal.fire({
            title: t('success_title', 'Success!'),
            text: t('report_generated', 'Report generated with {{count}} entries.', { count: data.summary.totalEntries }),
            icon: 'success',
            confirmButtonColor: '#31BCFF'
          })
        }
      } else {
        throw new Error(data.error || 'Failed to generate report')
      }
    } catch (error) {
      console.error('Error generating report:', error)
      Swal.fire({
        title: t('error_title', 'Error!'),
        text: error instanceof Error ? error.message : t('error_generate_report', 'Failed to generate report'),
        icon: 'error',
        confirmButtonColor: '#31BCFF'
      })
    } finally {
      setLoading(false)
    }
  }

  const exportToCSV = () => {
    if (!reportData || reportData.entries.length === 0) {
      Swal.fire({
        title: t('no_data_title', 'No Data'),
        text: t('no_data_text', 'Please generate a report first.'),
        icon: 'info',
        confirmButtonColor: '#31BCFF'
      })
      return
    }

    const headers = [
      'Employee Name',
      'Employee No',
      'Department',
      'Employee Group',
      'Payroll Period',
      'Period Start',
      'Period End',
      'Regular Hours',
      'Overtime Hours',
      'Total Hours',
      'Regular Rate',
      'Overtime Rate',
      'Regular Pay',
      'Overtime Pay',
      'Bonuses',
      'Gross Pay',
      'Deductions',
      'Net Pay',
      'Status'
    ]

    const csvData = reportData.entries.map(entry => [
      `${entry.employee.firstName} ${entry.employee.lastName}`,
      entry.employee.employeeNo || '',
      entry.employee.department.name,
      entry.employee.employeeGroup?.name || '',
      entry.payrollPeriod.name,
      new Date(entry.payrollPeriod.startDate).toLocaleDateString(),
      new Date(entry.payrollPeriod.endDate).toLocaleDateString(),
      entry.regularHours.toString(),
      entry.overtimeHours.toString(),
      (entry.regularHours + entry.overtimeHours).toString(),
      `$${entry.regularRate.toFixed(2)}`,
      `$${entry.overtimeRate.toFixed(2)}`,
      `$${(entry.regularHours * entry.regularRate).toFixed(2)}`,
      `$${(entry.overtimeHours * entry.overtimeRate).toFixed(2)}`,
      `$${entry.bonuses.toFixed(2)}`,
      `$${entry.grossPay.toFixed(2)}`,
      `$${entry.deductions.toFixed(2)}`,
      `$${entry.netPay.toFixed(2)}`,
      entry.status
    ])

    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const filename = `payroll-report-${reportData.dateRange.startDate}-to-${reportData.dateRange.endDate}.csv`
    downloadBlob(blob, filename)

    Swal.fire({
      title: t('export_success_title', 'Success!'),
      text: t('export_success_text', 'Payroll report has been exported successfully.'),
      icon: 'success',
      confirmButtonColor: '#31BCFF'
    })
  }

  const handleSelectAllEmployees = () => {
    const filteredEmployees = selectedDepartments.length > 0 
      ? employees.filter(emp => selectedDepartments.includes(emp.department.id))
      : employees
    
    setSelectedEmployees(filteredEmployees.map(emp => emp.id))
  }

  const handleSelectDepartmentEmployees = (departmentId: string) => {
    const deptEmployees = employees.filter(emp => emp.department.id === departmentId)
    const deptEmployeeIds = deptEmployees.map(emp => emp.id)
    
    const alreadySelected = deptEmployeeIds.every(id => selectedEmployees.includes(id))
    
    if (alreadySelected) {
      // Remove all department employees
      setSelectedEmployees(prev => prev.filter(id => !deptEmployeeIds.includes(id)))
    } else {
      // Add all department employees
      setSelectedEmployees(prev => [...new Set([...prev, ...deptEmployeeIds])])
    }
  }

  const getStatusBadge = (status: string) => {
    const styles = {
      DRAFT: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      APPROVED: 'bg-blue-100 text-blue-800 border-blue-200',
      PAID: 'bg-green-100 text-green-800 border-green-200'
    }
    const statusLabels = {
      DRAFT: t('status_draft', 'Draft'),
      APPROVED: t('status_approved', 'Approved'),
      PAID: t('status_paid', 'Paid')
    }
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${styles[status as keyof typeof styles] || styles.DRAFT}`}>
        {statusLabels[status as keyof typeof statusLabels] || status}
      </span>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6 py-4 sm:py-6">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-blue-100">
        <div className="flex flex-col space-y-4">
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
              {t('title', 'Payroll Reports')}
            </h1>
            <p className="mt-1 sm:mt-2 text-sm sm:text-base text-gray-600">
              {t('subtitle', 'Generate detailed payroll reports with custom filters and date ranges')}
            </p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/dashboard/payroll-entries"
              className="inline-flex items-center justify-center px-4 py-2.5 sm:py-3 text-sm sm:text-base rounded-xl sm:rounded-2xl bg-white border border-gray-200 text-gray-700 font-medium shadow-sm hover:shadow-md transition-all duration-200 sm:hover:scale-105 group"
            >
              <ChartBarIcon className="w-4 h-4 sm:w-5 sm:h-5 mr-2 group-hover:scale-110 transition-transform duration-200" />
              <span className="hidden sm:inline">{t('view_entries', 'View Entries')}</span>
              <span className="sm:hidden">Entries</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Filters Section */}
      <div className="bg-white/80 backdrop-blur-xl rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-gray-200/50 shadow-lg">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center">
            <AdjustmentsHorizontalIcon className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
            {t('report_filters', 'Report Filters')}
          </h2>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="text-xs sm:text-sm text-[#31BCFF] hover:text-[#31BCFF]/80 font-medium"
          >
            {showFilters ? t('hide_filters', 'Hide Filters') : t('show_filters', 'Show Filters')}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
          {/* Date Range */}
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
              <CalendarIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 inline mr-1" />
              {t('start_date', 'Start Date')}
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base rounded-lg sm:rounded-xl border border-gray-300 bg-white/70 backdrop-blur-sm focus:ring-2 focus:ring-[#31BCFF]/50 focus:border-[#31BCFF]"
            />
          </div>
          
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
              <CalendarIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 inline mr-1" />
              {t('end_date', 'End Date')}
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base rounded-lg sm:rounded-xl border border-gray-300 bg-white/70 backdrop-blur-sm focus:ring-2 focus:ring-[#31BCFF]/50 focus:border-[#31BCFF]"
            />
          </div>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="space-y-4 sm:space-y-6 border-t border-gray-200 pt-4 sm:pt-6">
            {/* Department Selection */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2 sm:mb-3">
                <BuildingOfficeIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 inline mr-1" />
                {t('departments', 'Departments')}
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3 max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-3 sm:p-4">
                {departments.map((dept) => (
                  <label key={dept.id} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedDepartments.includes(dept.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedDepartments([...selectedDepartments, dept.id])
                        } else {
                          setSelectedDepartments(selectedDepartments.filter(id => id !== dept.id))
                        }
                      }}
                      className="h-4 w-4 text-[#31BCFF] border-gray-300 rounded focus:ring-[#31BCFF]"
                    />
                    <div className="text-xs sm:text-sm min-w-0">
                      <div className="font-medium text-gray-900 truncate">{dept.name}</div>
                      <div className="text-gray-500">({dept._count.employees} emp.)</div>
                    </div>
                  </label>
                ))}
              </div>
              <div className="mt-2 flex gap-2">
                <button
                  onClick={() => setSelectedDepartments(departments.map(d => d.id))}
                  className="text-[10px] sm:text-xs text-[#31BCFF] hover:underline"
                >
                  {t('select_all_departments', 'Select All')}
                </button>
                <button
                  onClick={() => setSelectedDepartments([])}
                  className="text-[10px] sm:text-xs text-gray-500 hover:underline"
                >
                  {t('clear_departments', 'Clear All')}
                </button>
              </div>
            </div>

            {/* Employee Selection */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2 sm:mb-3">
                <UsersIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 inline mr-1" />
                {t('employees', 'Employees')} 
                {selectedEmployees.length > 0 && (
                  <span className="ml-2 text-[#31BCFF] text-[10px] sm:text-xs">
                    ({selectedEmployees.length} selected)
                  </span>
                )}
              </label>
              
              <div className="flex flex-col sm:flex-row gap-2 mb-2 sm:mb-3">
                <button
                  onClick={handleSelectAllEmployees}
                  className="text-xs bg-[#31BCFF] text-white px-3 py-1.5 sm:py-1 rounded-md hover:bg-[#31BCFF]/90"
                >
                  {t('select_all_employees', 'Select All Employees')}
                </button>
                <button
                  onClick={() => setSelectedEmployees([])}
                  className="text-xs bg-gray-500 text-white px-3 py-1.5 sm:py-1 rounded-md hover:bg-gray-600"
                >
                  {t('clear_employees', 'Clear Selection')}
                </button>
              </div>

              <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg">
                {departments
                  .filter(dept => selectedDepartments.length === 0 || selectedDepartments.includes(dept.id))
                  .map((dept) => {
                    const deptEmployees = employees.filter(emp => emp.department.id === dept.id)
                    if (deptEmployees.length === 0) return null
                    
                    return (
                      <div key={dept.id} className="border-b border-gray-100 last:border-b-0">
                        <div
                          className="bg-gray-50 px-3 sm:px-4 py-2 flex items-center justify-between cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSelectDepartmentEmployees(dept.id)}
                        >
                          <div className="font-medium text-gray-900 text-xs sm:text-sm">
                            {dept.name}
                          </div>
                          <div className="text-[10px] sm:text-xs text-gray-500">
                            {deptEmployees.filter(emp => selectedEmployees.includes(emp.id)).length}/{deptEmployees.length}
                          </div>
                        </div>
                        <div className="p-2 space-y-1">
                          {deptEmployees.map((emp) => (
                            <label key={emp.id} className="flex items-center space-x-2 cursor-pointer text-sm hover:bg-gray-50 p-1 rounded">
                              <input
                                type="checkbox"
                                checked={selectedEmployees.includes(emp.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedEmployees([...selectedEmployees, emp.id])
                                  } else {
                                    setSelectedEmployees(selectedEmployees.filter(id => id !== emp.id))
                                  }
                                }}
                                className="h-3 w-3 text-[#31BCFF] border-gray-300 rounded focus:ring-[#31BCFF]"
                              />
                              <span>
                                {emp.firstName} {emp.lastName}
                                {emp.employeeNo && <span className="text-gray-500"> (#{emp.employeeNo})</span>}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )
                  })}
              </div>
            </div>

            {/* Status Filters */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2 sm:mb-3">
                {t('status_filters', 'Status Filters')}
              </label>
              <div className="space-y-2">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeApprovedOnly}
                    onChange={(e) => {
                      setIncludeApprovedOnly(e.target.checked)
                      if (e.target.checked) setIncludePaidOnly(false)
                    }}
                    className="h-4 w-4 text-[#31BCFF] border-gray-300 rounded focus:ring-[#31BCFF]"
                  />
                  <span className="text-xs sm:text-sm text-gray-700">
                    {t('approved_only', 'Include approved and paid entries only')}
                  </span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includePaidOnly}
                    onChange={(e) => {
                      setIncludePaidOnly(e.target.checked)
                      if (e.target.checked) setIncludeApprovedOnly(false)
                    }}
                    className="h-4 w-4 text-[#31BCFF] border-gray-300 rounded focus:ring-[#31BCFF]"
                  />
                  <span className="text-xs sm:text-sm text-gray-700">
                    {t('paid_only', 'Include paid entries only')}
                  </span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mt-4 sm:mt-6">
          <button
            onClick={() => generateReport(true)}
            disabled={loading}
            className="inline-flex items-center justify-center px-4 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base rounded-xl sm:rounded-2xl bg-white border border-gray-200 text-gray-700 font-medium shadow-sm hover:shadow-md transition-all duration-200 sm:hover:scale-105 group disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <EyeIcon className="w-4 h-4 sm:w-5 sm:h-5 mr-2 group-hover:scale-110 transition-transform duration-200" />
            {loading ? t('generating', 'Generating...') : t('preview_report', 'Preview Report')}
          </button>
          
          <button
            onClick={() => generateReport(false)}
            disabled={loading}
            className="inline-flex items-center justify-center px-4 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base rounded-xl sm:rounded-2xl bg-gradient-to-r from-[#31BCFF] to-[#0EA5E9] text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200 sm:hover:scale-105 group disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChartBarIcon className="w-4 h-4 sm:w-5 sm:h-5 mr-2 group-hover:scale-110 transition-transform duration-200" />
            {loading ? t('generating', 'Generating...') : t('generate_report', 'Generate Report')}
          </button>

          {reportData && (
            <button
              onClick={exportToCSV}
              className="inline-flex items-center justify-center px-4 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base rounded-xl sm:rounded-2xl bg-green-600 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200 sm:hover:scale-105 group"
            >
              <TableCellsIcon className="w-4 h-4 sm:w-5 sm:h-5 mr-2 group-hover:scale-110 transition-transform duration-200" />
              {t('export_csv', 'Export CSV')}
            </button>
          )}
        </div>
      </div>

      {/* Report Results */}
      {reportData && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
            <div className="bg-white/80 backdrop-blur-xl rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-gray-200/50 shadow-lg">
              <div className="flex items-center">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-lg sm:rounded-xl flex items-center justify-center mr-3 sm:mr-4 flex-shrink-0">
                  <UsersIcon className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-lg sm:text-2xl font-bold text-gray-900 truncate">{reportData.summary.totalEmployees}</p>
                  <p className="text-[10px] sm:text-sm text-gray-500 truncate">{t('total_employees', 'Total Employees')}</p>
                </div>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-xl rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-gray-200/50 shadow-lg">
              <div className="flex items-center">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 rounded-lg sm:rounded-xl flex items-center justify-center mr-3 sm:mr-4 flex-shrink-0">
                  <ClockIcon className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-lg sm:text-2xl font-bold text-gray-900 truncate">
                    {(reportData.summary.totalRegularHours + reportData.summary.totalOvertimeHours).toFixed(1)}h
                  </p>
                  <p className="text-[10px] sm:text-sm text-gray-500 truncate">{t('total_hours', 'Total Hours')}</p>
                </div>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-xl rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-gray-200/50 shadow-lg">
              <div className="flex items-center">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-yellow-100 rounded-lg sm:rounded-xl flex items-center justify-center mr-3 sm:mr-4 flex-shrink-0">
                  <CurrencyDollarIcon className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-lg sm:text-2xl font-bold text-gray-900 truncate">
                    ${reportData.summary.totalGrossPay.toFixed(2)}
                  </p>
                  <p className="text-[10px] sm:text-sm text-gray-500 truncate">{t('total_gross_pay', 'Total Gross Pay')}</p>
                </div>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-xl rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-gray-200/50 shadow-lg">
              <div className="flex items-center">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-100 rounded-lg sm:rounded-xl flex items-center justify-center mr-3 sm:mr-4 flex-shrink-0">
                  <CurrencyDollarIcon className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-lg sm:text-2xl font-bold text-gray-900 truncate">
                    ${reportData.summary.totalNetPay.toFixed(2)}
                  </p>
                  <p className="text-[10px] sm:text-sm text-gray-500 truncate">{t('total_net_pay', 'Total Net Pay')}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Department Summary */}
          <div className="bg-white/80 backdrop-blur-xl rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-gray-200/50 shadow-lg">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center">
              <BuildingOfficeIcon className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
              {t('department_summary', 'Department Summary')}
            </h3>
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <div className="inline-block min-w-full align-middle">
                <table className="min-w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase">
                        {t('department', 'Department')}
                      </th>
                      <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase">
                        {t('entries', 'Entries')}
                      </th>
                      <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase">
                        {t('total_hours', 'Total Hours')}
                      </th>
                      <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase">
                        {t('gross_pay', 'Gross Pay')}
                      </th>
                      <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase">
                        {t('net_pay', 'Net Pay')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {Object.entries(reportData.summary.byDepartment).map(([deptId, dept]) => (
                      <tr key={deptId}>
                        <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-medium text-gray-900">{dept.name}</td>
                        <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-900">{dept.count}</td>
                        <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-900">{dept.totalHours.toFixed(1)}h</td>
                        <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-900">${dept.totalGrossPay.toFixed(2)}</td>
                        <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-900">${dept.totalNetPay.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Detailed Report Table */}
          <div className="bg-white/80 backdrop-blur-xl rounded-xl sm:rounded-2xl border border-gray-200/50 shadow-lg overflow-hidden">
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center">
                <DocumentArrowDownIcon className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                {t('detailed_report', 'Detailed Report')} ({reportData.entries.length} entries)
              </h3>
            </div>
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <div className="inline-block min-w-full align-middle">
                <table className="min-w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase whitespace-nowrap">
                        {t('employee', 'Employee')}
                      </th>
                      <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase whitespace-nowrap">
                        {t('department', 'Department')}
                      </th>
                      <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase whitespace-nowrap">
                        {t('period', 'Period')}
                      </th>
                      <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase whitespace-nowrap">
                        {t('hours', 'Hours')}
                      </th>
                      <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase whitespace-nowrap">
                        {t('gross_pay', 'Gross Pay')}
                      </th>
                      <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase whitespace-nowrap">
                        {t('net_pay', 'Net Pay')}
                      </th>
                      <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase whitespace-nowrap">
                        {t('status', 'Status')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {reportData.entries.map((entry) => (
                      <tr key={entry.id} className="hover:bg-blue-50/30 transition-colors duration-200">
                        <td className="px-3 sm:px-6 py-3 sm:py-4">
                          <div>
                            <div className="text-xs sm:text-sm font-medium text-gray-900">
                              {entry.employee.firstName} {entry.employee.lastName}
                            </div>
                            {entry.employee.employeeNo && (
                              <div className="text-[10px] sm:text-sm text-gray-500">#{entry.employee.employeeNo}</div>
                            )}
                          </div>
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4">
                          <div className="text-xs sm:text-sm text-gray-900">{entry.employee.department.name}</div>
                          {entry.employee.employeeGroup && (
                            <div className="text-[10px] sm:text-sm text-gray-500">{entry.employee.employeeGroup.name}</div>
                          )}
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4">
                          <div className="text-xs sm:text-sm text-gray-900">{entry.payrollPeriod.name}</div>
                          <div className="text-[10px] sm:text-sm text-gray-500 whitespace-nowrap">
                            {new Date(entry.payrollPeriod.startDate).toLocaleDateString()} - 
                            {new Date(entry.payrollPeriod.endDate).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4">
                          <div className="text-xs sm:text-sm text-gray-900 whitespace-nowrap">
                            {t('regular', 'Regular')}: {entry.regularHours}h
                          </div>
                          {entry.overtimeHours > 0 && (
                            <div className="text-xs sm:text-sm text-orange-600 whitespace-nowrap">
                              {t('overtime', 'Overtime')}: {entry.overtimeHours}h
                            </div>
                          )}
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4">
                          <div className="text-xs sm:text-sm font-medium text-gray-900 whitespace-nowrap">
                            ${entry.grossPay.toFixed(2)}
                          </div>
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4">
                          <div className="text-xs sm:text-sm font-medium text-green-600 whitespace-nowrap">
                            ${entry.netPay.toFixed(2)}
                          </div>
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4">
                          {getStatusBadge(entry.status)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
