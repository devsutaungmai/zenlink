import { format } from 'date-fns'
import { ArrowLeftIcon, ArrowRightIcon, FunnelIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { useTranslation } from 'react-i18next'
import { formatDate } from '@/shared/lib/dateLocale'
import { useState, useRef, useEffect } from 'react'
import TemplatesDropdown, { TemplateAction } from './TemplatesDropdown'
import { Send } from 'lucide-react'

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
  category?: {
    id: string
    name: string
    color?: string | null
  } | null
  employeeGroups?: Array<{
    id: string
    name: string
  }>
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
  viewMode: 'week' | 'two-week' | 'day' | 'month'
  onPreviousWeek: () => void
  onNextWeek: () => void
  onTodayClick: () => void
  onViewModeChange: (mode: 'week' | 'two-week' | 'day' | 'month') => void
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
  onTemplateAction?: (action: TemplateAction) => void
  canUseTemplates?: boolean
  onBulkPublishDrafts?: () => void
  draftShiftCount?: number
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
  onScheduleViewTypeChange = () => {},
  onTemplateAction = () => {},
  canUseTemplates = true,
  onBulkPublishDrafts,
  draftShiftCount = 0,
}: ScheduleHeaderProps) {
  const { t, i18n } = useTranslation('schedule')
  const [showFilters, setShowFilters] = useState(false)
  const [showActionsMenu, setShowActionsMenu] = useState(false)
  const [employeeSearchQuery, setEmployeeSearchQuery] = useState('')
  const filterButtonRef = useRef<HTMLDivElement>(null)
  const filterDropdownRef = useRef<HTMLDivElement>(null)
  const mobileFilterRef = useRef<HTMLDivElement>(null)
  const actionsMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(event.target as Node)) {
        setShowActionsMenu(false)
      }
    }
    if (showActionsMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showActionsMenu])
  
  const safeEmployees = Array.isArray(employees) ? employees : []
  const safeDepartments = Array.isArray(departments) ? departments : []
  const safeEmployeeGroups = Array.isArray(employeeGroups) ? employeeGroups : []
  const safeShiftTypes = Array.isArray(shiftTypes) ? shiftTypes : []
  const safeCategories = Array.isArray(categories) ? categories : []
  const safeFunctions = Array.isArray(functions) ? functions : []
  
  // Close filter dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node

      if (filterButtonRef.current && filterButtonRef.current.contains(target)) {
        return
      }

      if (filterDropdownRef.current && filterDropdownRef.current.contains(target)) {
        return
      }

      if (mobileFilterRef.current && mobileFilterRef.current.contains(target)) {
        return
      }

      setShowFilters(false)
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
  
  const employeeGroupFilterIds = filters?.employeeGroupIds ?? []

  // Filter employees based on search query and selected employee groups (if any)
  const filteredEmployees = safeEmployees.filter(employee => {
    const fullName = `${employee.firstName} ${employee.lastName}`.toLowerCase()
    const matchesSearch = fullName.includes(employeeSearchQuery.toLowerCase())
    if (!matchesSearch) {
      return false
    }

    if (employeeGroupFilterIds.length === 0) {
      return true
    }

    if (!employee.employeeGroupId) {
      return false
    }

    return employeeGroupFilterIds.includes(employee.employeeGroupId)
  })
  
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
  
  const handleTemplateAction = (action: TemplateAction) => {
    onTemplateAction(action)
  }
  
  const activeFilterCount = 
    filters.employeeIds.length + 
    filters.employeeGroupIds.length + 
    filters.shiftTypeIds.length + 
    filters.statuses.length + 
    (filters.timeFrom ? 1 : 0) + 
    (filters.timeTo ? 1 : 0)
  
  const shiftStatuses = [
    { value: 'SCHEDULED', label: t('header.statuses.scheduled') },
    { value: 'IN_PROGRESS', label: t('header.statuses.in_progress') },
    { value: 'COMPLETED', label: t('header.statuses.completed') },
    { value: 'CANCELLED', label: t('header.statuses.cancelled') }
  ]
  const mobileViewModeOptions: Array<{ value: 'week' | 'month' | 'day'; label: string }> = [
    { value: 'week', label: t('header.view_modes.week') },
    { value: 'month', label: t('header.view_modes.month') },
    { value: 'day', label: t('header.view_modes.day') }
  ]
  const viewModeOptions: Array<{ value: 'week' | 'two-week' | 'month' | 'day'; label: string }> = [
    { value: 'week', label: t('header.view_modes.week') },
    { value: 'two-week', label: t('header.view_modes.two_week') },
    { value: 'month', label: t('header.view_modes.month') },
    { value: 'day', label: t('header.view_modes.day') }
  ]
  
  return (
    <div className="space-y-3">
      {/* Mobile Layout - Stacked */}
      <div className="md:hidden space-y-3">
        {/* Row 1: Department, Category, and Function Filters */}
        <div className="space-y-2">
          <select
            value={selectedDepartmentId || ""}
            onChange={(e) => {
              const value = e.target.value === "" ? null : e.target.value
              onDepartmentChange(value)
            }}
            className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#31BCFF] bg-white"
          >
            <option value="">{t('header.all_departments')}</option>
            {safeDepartments.map(department => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </select>

          <select
            value={selectedCategoryId || ""}
            onChange={(e) => {
              const value = e.target.value === "" ? null : e.target.value
              onCategoryChange(value)
              // Clear function selection when category changes
              if (value !== selectedCategoryId) {
                onFunctionChange(null)
              }
            }}
            className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#31BCFF] bg-white"
          >
            <option value="">{t('header.all_categories')}</option>
            {safeCategories.map(category => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>

          <select
            value={selectedFunctionId || ""}
            onChange={(e) => {
              const value = e.target.value === "" ? null : e.target.value
              onFunctionChange(value)
            }}
            disabled={!selectedCategoryId && filteredFunctions.length === 0}
            className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#31BCFF] bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            <option value="">{selectedCategoryId ? t('header.all_functions') : t('header.select_category_first')}</option>
            {filteredFunctions.map(func => (
              <option key={func.id} value={func.id}>
                {func.name}
              </option>
            ))}
          </select>
        </div>

        {/* Row 2: Filters Button */}
        <div className="flex items-center gap-2">
          {/* Templates Button - Mobile */}
          {canUseTemplates && <TemplatesDropdown onAction={handleTemplateAction} />}
          
          {/* Filters Button - Mobile */}
          <div className="relative flex-1" ref={filterButtonRef}>
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className="px-3 py-2 rounded-md border border-gray-300 hover:bg-gray-50 bg-white flex items-center gap-2"
            >
              <FunnelIcon className="w-4 h-4" />
              <span>{t('header.filters')}</span>
              {activeFilterCount > 0 && (
                <span className="bg-[#31BCFF] text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {/* Filter Dropdown - Mobile */}
            {showFilters && (
              <div 
                ref={mobileFilterRef}
                className="fixed inset-x-0 top-0 bottom-0 bg-white z-50 overflow-y-auto"
              >
                <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between z-10">
                  <h3 className="font-semibold text-gray-900">{t('header.filters')}</h3>
                  <div className="flex items-center gap-3">
                    {activeFilterCount > 0 && (
                      <button
                        onClick={clearAllFilters}
                        className="text-sm text-[#31BCFF] hover:text-[#28a8e6]"
                      >
                        {t('header.clear_all')}
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('header.employees')}</label>
                    {/* Search Input */}
                    <input
                      type="text"
                      placeholder={t('header.search_employees_placeholder')}
                      value={employeeSearchQuery}
                      onChange={(e) => setEmployeeSearchQuery(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md mb-2 focus:ring-2 focus:ring-[#31BCFF] focus:border-[#31BCFF]"
                    />
                    <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-md">
                      {filteredEmployees.length > 0 ? (
                        filteredEmployees.map(employee => (
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
                        ))
                      ) : (
                        <div className="px-3 py-2.5 text-sm text-gray-500 text-center">
                          {t('header.no_employees_found')}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Employee Groups Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('header.employee_groups')}</label>
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('header.shift_types')}</label>
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('header.status')}</label>
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('header.shift_time')}</label>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">{t('header.time_from')}</label>
                        <input
                          type="time"
                          value={filters.timeFrom}
                          onChange={(e) => handleFilterChange('timeFrom', e.target.value)}
                          className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-[#31BCFF] focus:border-[#31BCFF]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">{t('header.time_to')}</label>
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
                    {t('header.apply_filters')}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Row 3: View mode toggle */}
        <div className="bg-white border border-gray-200 rounded-2xl p-1 flex gap-1 overflow-x-auto scrollbar-hide" role="tablist" aria-label="Schedule view modes">
          {mobileViewModeOptions.map(option => {
            const isActive = viewMode === option.value
            return (
              <button
                key={`mobile-view-${option.value}`}
                onClick={() => onViewModeChange(option.value)}
                role="tab"
                aria-selected={isActive}
                className={`flex-1 whitespace-nowrap px-3 py-2 text-sm font-semibold rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#31BCFF] ${
                  isActive ? 'bg-[#31BCFF] text-white shadow-sm' : 'bg-transparent text-gray-600'
                }`}
              >
                {option.label}
              </button>
            )
          })}
        </div>

        {/* Row 4: Date Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={onTodayClick}
            className="px-4 py-2 text-sm rounded-md border border-gray-300 hover:bg-gray-50 bg-white"
          >
            {t('header.today')}
          </button>

          <div className="flex items-center gap-2">
            <button 
              onClick={onPreviousWeek}
              className="p-2 hover:bg-gray-100 rounded-md border border-gray-300 bg-white"
            >
              <ArrowLeftIcon className="h-5 w-5 text-gray-600" />
            </button>
            
            <div className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-50 rounded-md min-w-[140px] text-center">
              {formatDate(startDate, 'MMM d', i18n.language)} - {format(endDate, 'd')}
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

      {/* Desktop Layout - Responsive */}
      <div className="hidden md:block">
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            <select
              value={selectedDepartmentId || ""}
              onChange={(e) => {
                const value = e.target.value === "" ? null : e.target.value
                onDepartmentChange(value)
              }}
              className="px-3 py-2 text-sm rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#31BCFF] bg-white w-full"
            >
              <option value="">{t('header.all_departments')}</option>
              {safeDepartments.map(department => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </select>

            <select
              value={selectedCategoryId || ""}
              onChange={(e) => {
                const value = e.target.value === "" ? null : e.target.value
                onCategoryChange(value)
                if (value !== selectedCategoryId) {
                  onFunctionChange(null)
                }
              }}
              className="px-3 py-2 text-sm rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#31BCFF] bg-white w-full"
            >
              <option value="">{t('header.all_categories')}</option>
              {safeCategories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>

            <select
              value={selectedFunctionId || ""}
              onChange={(e) => {
                const value = e.target.value === "" ? null : e.target.value
                onFunctionChange(value)
              }}
              disabled={!selectedCategoryId && filteredFunctions.length === 0}
              className="px-3 py-2 text-sm rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#31BCFF] bg-white w-full disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="">{selectedCategoryId ? t('header.all_functions') : t('header.select_category_first')}</option>
              {filteredFunctions.map(func => (
                <option key={func.id} value={func.id}>
                  {func.name}
                </option>
              ))}
            </select>

            <div className="w-full">
              <div className="grid grid-cols-2 sm:grid-cols-4 rounded-xl border border-gray-300 bg-white overflow-hidden">
                {viewModeOptions.map((option, index) => {
                  const isActive = viewMode === option.value
                  return (
                    <button
                      key={`desktop-view-${option.value}`}
                      onClick={() => onViewModeChange(option.value)}
                      className={`px-3 py-2 text-sm font-semibold transition-colors ${
                        index === 0 ? '' : 'border-l border-gray-200'
                      } ${
                        isActive ? 'bg-[#31BCFF] text-white' : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {option.label}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={onTodayClick}
                className="px-4 py-2 text-sm rounded-md border border-gray-300 hover:bg-gray-50 whitespace-nowrap bg-white"
              >
                {t('header.today')}
              </button>

              <div className="flex items-center gap-2 flex-wrap md:flex-nowrap">
                <button
                  onClick={onPreviousWeek}
                  className="p-2 hover:bg-gray-100 rounded-md border border-gray-200"
                >
                  <ArrowLeftIcon className="h-4 w-4 text-gray-600" />
                </button>

                <div className="px-3 py-2 text-sm text-gray-800 bg-white rounded-md min-w-[180px] text-center border border-gray-200">
                  {viewMode === 'month'
                    ? formatDate(startDate, 'MMMM yyyy', i18n.language)
                    : viewMode === 'day'
                      ? formatDate(startDate, 'EEEE, MMM d', i18n.language)
                      : `${formatDate(startDate, 'MMM d', i18n.language)} - ${formatDate(endDate, 'MMM d', i18n.language)}`}
                </div>

                <button
                  onClick={onNextWeek}
                  className="p-2 hover:bg-gray-100 rounded-md border border-gray-200"
                >
                  <ArrowRightIcon className="h-4 w-4 text-gray-600" />
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 justify-end">
              <div className="relative" ref={actionsMenuRef}>
                <button
                  onClick={() => setShowActionsMenu(prev => !prev)}
                  className="p-2 hover:bg-gray-100 rounded-md border border-gray-200"
                >
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                  </svg>
                </button>
                {showActionsMenu && (
                  <div className="absolute right-0 mt-1 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                    {onBulkPublishDrafts && draftShiftCount > 0 && (
                      <button
                        onClick={() => { setShowActionsMenu(false); onBulkPublishDrafts() }}
                        className="w-full px-4 py-2 text-left text-sm text-blue-600 hover:bg-blue-50 flex items-center gap-2"
                      >
                        <Send className="w-4 h-4" />
                        Publish All Drafts ({draftShiftCount})
                      </button>
                    )}
                    {(!onBulkPublishDrafts || draftShiftCount === 0) && (
                      <p className="px-4 py-2 text-sm text-gray-400">No actions available</p>
                    )}
                  </div>
                )}
              </div>

              {canUseTemplates && <TemplatesDropdown onAction={handleTemplateAction} />}

              <div className="relative w-full sm:w-auto">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="w-full sm:w-auto px-4 py-2 text-sm rounded-md border border-gray-300 hover:bg-gray-50 bg-white flex items-center justify-center sm:justify-start gap-2"
                >
                  <FunnelIcon className="w-4 h-4" />
                  {t('header.filters')}
                  {activeFilterCount > 0 && (
                    <span className="bg-[#31BCFF] text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {activeFilterCount}
                    </span>
                  )}
                </button>

                {showFilters && (
                  <div
                    ref={filterDropdownRef}
                    className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-[600px] overflow-y-auto"
                  >
                    <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between z-10">
                      <h3 className="font-semibold text-gray-900">{t('header.filters')}</h3>
                      <div className="flex items-center gap-2">
                        {activeFilterCount > 0 && (
                          <button
                            onClick={clearAllFilters}
                            className="text-xs text-[#31BCFF] hover:text-[#28a8e6]"
                          >
                            {t('header.clear_all')}
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
                        <label className="block text-sm font-medium text-gray-700 mb-2">{t('header.employees')}</label>
                        <input
                          type="text"
                          placeholder={t('header.search_employees_placeholder')}
                          value={employeeSearchQuery}
                          onChange={(e) => setEmployeeSearchQuery(e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md mb-2 focus:ring-2 focus:ring-[#31BCFF] focus:border-[#31BCFF]"
                        />
                        <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-md">
                          {filteredEmployees.length > 0 ? (
                            filteredEmployees.map(employee => (
                              <label
                                key={employee.id}
                                className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer"
                              >
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
                            ))
                          ) : (
                            <div className="px-3 py-2 text-sm text-gray-500 text-center">
                              {t('header.no_employees_found')}
                            </div>
                          )}
                        </div>
                      </div>

                  {/* Employee Groups Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('header.employee_groups')}</label>
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('header.shift_types')}</label>
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('header.status')}</label>
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('header.shift_time')}</label>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">{t('header.time_from')}</label>
                        <input
                          type="time"
                          value={filters.timeFrom}
                          onChange={(e) => handleFilterChange('timeFrom', e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-[#31BCFF] focus:border-[#31BCFF]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">{t('header.time_to')}</label>
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
  </div>
</div>
  )
}