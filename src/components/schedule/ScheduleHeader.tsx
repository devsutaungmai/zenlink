import { format } from 'date-fns'
import { ArrowLeftIcon, ArrowRightIcon, FunnelIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { useTranslation } from 'react-i18next'
import { useState, useRef, useEffect } from 'react'

interface Employee {
  id: string
  firstName: string
  lastName: string
  employeeGroupId?: string | null
}

interface EmployeeGroup {
  id: string
  name: string
}

interface ShiftType {
  id: string
  name: string
}

interface Department {
  id: string
  name: string
}

interface Category {
  id: string
  name: string
  color?: string | null
}

interface FunctionItem {
  id: string
  name: string
  color?: string | null
  categoryId: string
}

interface FilterOptions {
  employeeIds: string[]
  employeeGroupIds: string[]
  shiftTypeIds: string[]
  statuses: string[]
  timeFrom: string
  timeTo: string
}

interface ScheduleHeaderProps {
  startDate: Date
  endDate: Date
  viewMode: 'week' | 'day'
  onPreviousWeek: () => void
  onNextWeek: () => void
  onTodayClick: () => void
  onViewModeChange: (mode: 'week' | 'day') => void
  employees: Employee[]
  selectedEmployeeId: string | null
  onEmployeeChange: (employeeId: string | null) => void
  departments?: Department[]
  employeeGroups?: EmployeeGroup[]
  shiftTypes?: ShiftType[]
  categories?: Category[]
  functions?: FunctionItem[]
  selectedDepartmentId?: string | null
  selectedCategoryId?: string | null
  selectedFunctionId?: string | null
  onDepartmentChange?: (departmentId: string | null) => void
  onCategoryChange?: (categoryId: string | null) => void
  onFunctionChange?: (functionId: string | null) => void
  filters?: FilterOptions
  onFiltersChange?: (filters: FilterOptions) => void
  scheduleViewType?: 'time' | 'employees' | 'groups' | 'functions'
  onScheduleViewTypeChange?: (type: 'time' | 'employees' | 'groups' | 'functions') => void
}

export default function ScheduleHeader({
  startDate,
  endDate,
  viewMode,
  onPreviousWeek,
  onNextWeek,
  onTodayClick,
  onViewModeChange,
  employees,
  selectedEmployeeId,
  onEmployeeChange,
  departments = [],
  employeeGroups = [],
  shiftTypes = [],
  categories = [],
  functions = [],
  selectedDepartmentId = null,
  selectedCategoryId = null,
  selectedFunctionId = null,
  onDepartmentChange = () => {},
  onCategoryChange = () => {},
  onFunctionChange = () => {},
  filters = { employeeIds: [], employeeGroupIds: [], shiftTypeIds: [], statuses: [], timeFrom: '', timeTo: '' },
  onFiltersChange = () => {},
  scheduleViewType = 'time',
  onScheduleViewTypeChange = () => {}
}: ScheduleHeaderProps) {
  const { t } = useTranslation('schedule')
  const [showFilters, setShowFilters] = useState(false)
  const filterRef = useRef<HTMLDivElement>(null)
  
  const safeEmployees = Array.isArray(employees) ? employees : []
  const safeDepartments = Array.isArray(departments) ? departments : []
  const safeEmployeeGroups = Array.isArray(employeeGroups) ? employeeGroups : []
  const safeShiftTypes = Array.isArray(shiftTypes) ? shiftTypes : []
  const safeCategories = Array.isArray(categories) ? categories : []
  const safeFunctions = Array.isArray(functions) ? functions : []
  
  // Close filter dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setShowFilters(false)
      }
    }
    
    if (showFilters) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showFilters])
  
  // Filter functions based on selected category
  const filteredFunctions = selectedCategoryId
    ? safeFunctions.filter(f => f.categoryId === selectedCategoryId)
    : safeFunctions
  
  const handleFilterChange = (key: keyof FilterOptions, value: any) => {
    onFiltersChange({ ...filters, [key]: value })
  }
  
  const toggleEmployeeFilter = (employeeId: string) => {
    const newIds = filters.employeeIds.includes(employeeId)
      ? filters.employeeIds.filter(id => id !== employeeId)
      : [...filters.employeeIds, employeeId]
    handleFilterChange('employeeIds', newIds)
  }
  
  const toggleEmployeeGroupFilter = (groupId: string) => {
    const newIds = filters.employeeGroupIds.includes(groupId)
      ? filters.employeeGroupIds.filter(id => id !== groupId)
      : [...filters.employeeGroupIds, groupId]
    handleFilterChange('employeeGroupIds', newIds)
  }
  
  const toggleShiftTypeFilter = (shiftTypeId: string) => {
    const newIds = filters.shiftTypeIds.includes(shiftTypeId)
      ? filters.shiftTypeIds.filter(id => id !== shiftTypeId)
      : [...filters.shiftTypeIds, shiftTypeId]
    handleFilterChange('shiftTypeIds', newIds)
  }
  
  const toggleStatusFilter = (status: string) => {
    const newStatuses = filters.statuses.includes(status)
      ? filters.statuses.filter(s => s !== status)
      : [...filters.statuses, status]
    handleFilterChange('statuses', newStatuses)
  }
  
  const clearAllFilters = () => {
    onFiltersChange({ employeeIds: [], employeeGroupIds: [], shiftTypeIds: [], statuses: [], timeFrom: '', timeTo: '' })
  }
  
  const activeFilterCount = 
    filters.employeeIds.length + 
    filters.employeeGroupIds.length + 
    filters.shiftTypeIds.length + 
    filters.statuses.length + 
    (filters.timeFrom ? 1 : 0) + 
    (filters.timeTo ? 1 : 0)
  
  const shiftStatuses = [
    { value: 'SCHEDULED', label: 'Scheduled' },
    { value: 'IN_PROGRESS', label: 'In Progress' },
    { value: 'COMPLETED', label: 'Completed' },
    { value: 'CANCELLED', label: 'Cancelled' }
  ]
  
  return (
    <div className="space-y-3">
      {/* Mobile Layout - Stacked */}
      <div className="md:hidden space-y-3">
        {/* Row 1: Department Filter and Filters Button */}
        <div className="flex items-center gap-2">
          <select
            value={selectedDepartmentId || ""}
            onChange={(e) => {
              const value = e.target.value === "" ? null : e.target.value
              onDepartmentChange(value)
            }}
            className="flex-1 px-3 py-2 text-sm rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#31BCFF] bg-white"
          >
            <option value="">All Departments</option>
            {safeDepartments.map(department => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </select>

          {/* Filters Button - Mobile */}
          <div className="relative" ref={filterRef}>
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className="px-3 py-2 rounded-md border border-gray-300 hover:bg-gray-50 bg-white flex items-center gap-2"
            >
              <FunnelIcon className="w-4 h-4" />
              {activeFilterCount > 0 && (
                <span className="bg-[#31BCFF] text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {/* Filter Dropdown - Mobile */}
            {showFilters && (
              <div className="fixed inset-x-0 top-0 bottom-0 bg-white z-50 overflow-y-auto">
                <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between z-10">
                  <h3 className="font-semibold text-gray-900">Filters</h3>
                  <div className="flex items-center gap-3">
                    {activeFilterCount > 0 && (
                      <button
                        onClick={clearAllFilters}
                        className="text-sm text-[#31BCFF] hover:text-[#28a8e6]"
                      >
                        Clear all
                      </button>
                    )}
                    <button onClick={() => setShowFilters(false)} className="text-gray-400 hover:text-gray-600">
                      <XMarkIcon className="w-6 h-6" />
                    </button>
                  </div>
                </div>

                <div className="p-4 space-y-4 pb-20">
                  {/* Employees Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Employees</label>
                    <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-md">
                      {safeEmployees.map(employee => (
                        <label key={employee.id} className="flex items-center px-3 py-2.5 hover:bg-gray-50 cursor-pointer active:bg-gray-100">
                          <input
                            type="checkbox"
                            checked={filters.employeeIds.includes(employee.id)}
                            onChange={() => toggleEmployeeFilter(employee.id)}
                            className="rounded border-gray-300 text-[#31BCFF] focus:ring-[#31BCFF] w-5 h-5"
                          />
                          <span className="ml-3 text-sm text-gray-700">
                            {employee.firstName} {employee.lastName}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Employee Groups Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Employee Groups</label>
                    <div className="space-y-2">
                      {safeEmployeeGroups.map(group => (
                        <label key={group.id} className="flex items-center cursor-pointer p-2 rounded hover:bg-gray-50 active:bg-gray-100">
                          <input
                            type="checkbox"
                            checked={filters.employeeGroupIds.includes(group.id)}
                            onChange={() => toggleEmployeeGroupFilter(group.id)}
                            className="rounded border-gray-300 text-[#31BCFF] focus:ring-[#31BCFF] w-5 h-5"
                          />
                          <span className="ml-3 text-sm text-gray-700">{group.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Shift Types Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Shift Types</label>
                    <div className="space-y-2">
                      {safeShiftTypes.map(shiftType => (
                        <label key={shiftType.id} className="flex items-center cursor-pointer p-2 rounded hover:bg-gray-50 active:bg-gray-100">
                          <input
                            type="checkbox"
                            checked={filters.shiftTypeIds.includes(shiftType.id)}
                            onChange={() => toggleShiftTypeFilter(shiftType.id)}
                            className="rounded border-gray-300 text-[#31BCFF] focus:ring-[#31BCFF] w-5 h-5"
                          />
                          <span className="ml-3 text-sm text-gray-700">{shiftType.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Status Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                    <div className="space-y-2">
                      {shiftStatuses.map(status => (
                        <label key={status.value} className="flex items-center cursor-pointer p-2 rounded hover:bg-gray-50 active:bg-gray-100">
                          <input
                            type="checkbox"
                            checked={filters.statuses.includes(status.value)}
                            onChange={() => toggleStatusFilter(status.value)}
                            className="rounded border-gray-300 text-[#31BCFF] focus:ring-[#31BCFF] w-5 h-5"
                          />
                          <span className="ml-3 text-sm text-gray-700">{status.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Time Range Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Shift Time</label>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">From</label>
                        <input
                          type="time"
                          value={filters.timeFrom}
                          onChange={(e) => handleFilterChange('timeFrom', e.target.value)}
                          className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-[#31BCFF] focus:border-[#31BCFF]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">To</label>
                        <input
                          type="time"
                          value={filters.timeTo}
                          onChange={(e) => handleFilterChange('timeTo', e.target.value)}
                          className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-[#31BCFF] focus:border-[#31BCFF]"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Fixed bottom button */}
                <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
                  <button
                    onClick={() => setShowFilters(false)}
                    className="w-full bg-[#31BCFF] text-white py-3 rounded-md font-medium hover:bg-[#28a8e6]"
                  >
                    Apply Filters
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Row 2: Date Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={onTodayClick}
            className="px-4 py-2 text-sm rounded-md border border-gray-300 hover:bg-gray-50 bg-white"
          >
            Today
          </button>

          <div className="flex items-center gap-2">
            <button 
              onClick={onPreviousWeek}
              className="p-2 hover:bg-gray-100 rounded-md border border-gray-300 bg-white"
            >
              <ArrowLeftIcon className="h-5 w-5 text-gray-600" />
            </button>
            
            <div className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-50 rounded-md min-w-[140px] text-center">
              {format(startDate, 'MMM d')} - {format(endDate, 'd')}
            </div>
            
            <button 
              onClick={onNextWeek}
              className="p-2 hover:bg-gray-100 rounded-md border border-gray-300 bg-white"
            >
              <ArrowRightIcon className="h-5 w-5 text-gray-600" />
            </button>
          </div>
        </div>
      </div>

      {/* Desktop Layout - Horizontal */}
      <div className="hidden md:flex items-center gap-3">
        {/* Department Filter */}
        <select
          value={selectedDepartmentId || ""}
          onChange={(e) => {
            const value = e.target.value === "" ? null : e.target.value
            onDepartmentChange(value)
          }}
          className="px-3 py-2 text-sm rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#31BCFF] bg-white min-w-[200px]"
        >
          <option value="">All Departments</option>
          {safeDepartments.map(department => (
            <option key={department.id} value={department.id}>
              {department.name}
            </option>
          ))}
        </select>

        {/* Week Dropdown */}
        <select
          className="px-3 py-2 text-sm rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#31BCFF] bg-white"
        >
          <option>Week</option>
        </select>

        {/* Today Button */}
        <button
          onClick={onTodayClick}
          className="px-4 py-2 text-sm rounded-md border border-gray-300 hover:bg-gray-50 whitespace-nowrap bg-white"
        >
          Today
        </button>

        {/* Navigation: Arrows and Date Range */}
        <div className="flex items-center gap-2">
          <button 
            onClick={onPreviousWeek}
            className="p-2 hover:bg-gray-100 rounded-md"
          >
            <ArrowLeftIcon className="h-4 w-4 text-gray-600" />
          </button>
          
          <div className="px-3 py-2 text-sm text-gray-700 whitespace-nowrap">
            {format(startDate, 'MMM d')} - {format(endDate, 'MMM d')}
          </div>
          
          <button 
            onClick={onNextWeek}
            className="p-2 hover:bg-gray-100 rounded-md"
          >
            <ArrowRightIcon className="h-4 w-4 text-gray-600" />
          </button>
        </div>

        {/* Spacer */}
        <div className="flex-1"></div>

        {/* Right side actions - Templates, Tools, Filters, Publish */}
        <div className="flex items-center gap-2">
          <button className="p-2 hover:bg-gray-100 rounded-md">
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
          </button>

          {/* Filters Button with Dropdown - Desktop */}
          <div className="relative">
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className="px-4 py-2 text-sm rounded-md border border-gray-300 hover:bg-gray-50 bg-white flex items-center gap-2"
            >
              <FunnelIcon className="w-4 h-4" />
              Filters
              {activeFilterCount > 0 && (
                <span className="bg-[#31BCFF] text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {/* Filter Dropdown - Desktop */}
            {showFilters && (
              <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-[600px] overflow-y-auto">
                <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between z-10">
                  <h3 className="font-semibold text-gray-900">Filters</h3>
                  <div className="flex items-center gap-2">
                    {activeFilterCount > 0 && (
                      <button
                        onClick={clearAllFilters}
                        className="text-xs text-[#31BCFF] hover:text-[#28a8e6]"
                      >
                        Clear all
                      </button>
                    )}
                    <button onClick={() => setShowFilters(false)} className="text-gray-400 hover:text-gray-600">
                      <XMarkIcon className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="p-4 space-y-4">
                  {/* Employees Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Employees</label>
                    <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-md">
                      {safeEmployees.map(employee => (
                        <label key={employee.id} className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={filters.employeeIds.includes(employee.id)}
                            onChange={() => toggleEmployeeFilter(employee.id)}
                            className="rounded border-gray-300 text-[#31BCFF] focus:ring-[#31BCFF]"
                          />
                          <span className="ml-2 text-sm text-gray-700">
                            {employee.firstName} {employee.lastName}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Employee Groups Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Employee Groups</label>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {safeEmployeeGroups.map(group => (
                        <label key={group.id} className="flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={filters.employeeGroupIds.includes(group.id)}
                            onChange={() => toggleEmployeeGroupFilter(group.id)}
                            className="rounded border-gray-300 text-[#31BCFF] focus:ring-[#31BCFF]"
                          />
                          <span className="ml-2 text-sm text-gray-700">{group.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Shift Types Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Shift Types</label>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {safeShiftTypes.map(shiftType => (
                        <label key={shiftType.id} className="flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={filters.shiftTypeIds.includes(shiftType.id)}
                            onChange={() => toggleShiftTypeFilter(shiftType.id)}
                            className="rounded border-gray-300 text-[#31BCFF] focus:ring-[#31BCFF]"
                          />
                          <span className="ml-2 text-sm text-gray-700">{shiftType.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Status Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                    <div className="space-y-2">
                      {shiftStatuses.map(status => (
                        <label key={status.value} className="flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={filters.statuses.includes(status.value)}
                            onChange={() => toggleStatusFilter(status.value)}
                            className="rounded border-gray-300 text-[#31BCFF] focus:ring-[#31BCFF]"
                          />
                          <span className="ml-2 text-sm text-gray-700">{status.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Time Range Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Shift Time</label>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">From</label>
                        <input
                          type="time"
                          value={filters.timeFrom}
                          onChange={(e) => handleFilterChange('timeFrom', e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-[#31BCFF] focus:border-[#31BCFF]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">To</label>
                        <input
                          type="time"
                          value={filters.timeTo}
                          onChange={(e) => handleFilterChange('timeTo', e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-[#31BCFF] focus:border-[#31BCFF]"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}