'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { format, addDays, addWeeks, subWeeks, startOfWeek, endOfWeek, addMonths, subMonths, startOfMonth, endOfMonth } from 'date-fns'
import { Employee, EmployeeGroup } from '@prisma/client'
import { ClockIcon, UsersIcon, UserGroupIcon, Squares2X2Icon } from '@heroicons/react/24/outline'
import { useTranslation } from 'react-i18next'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Swal from 'sweetalert2'
import ScheduleHeader from '@/components/schedule/ScheduleHeader'
import CreateTemplateModal from '@/components/schedule/CreateTemplateModal'
import SelectTemplateModal from '@/components/schedule/template/SelectTemplateModal'
import ApplyTemplateModal from '@/components/schedule/template/ApplyTemplateModal'
import SaveAsTemplateModal from '@/components/schedule/template/SaveAsTemplateModal'
import WeekView from '@/components/schedule/WeekView'
import DayView from '@/components/schedule/DayView'
import DayEmployeeTimeline from '@/components/schedule/DayEmployeeTimeline'
import DayGroupsTimeline from '@/components/schedule/DayGroupsTimeline'
import DayFunctionsTimeline from '@/components/schedule/DayFunctionsTimeline'
import MonthView from '@/components/schedule/MonthView'
import EmployeeGroupedView from '@/components/schedule/EmployeeGroupedView'
import GroupGroupedView from '@/components/schedule/GroupGroupedView'
import FunctionGroupedView from '@/components/schedule/FunctionGroupedView'
import ShiftFormModal from '@/components/schedule/ShiftFormModel'
import { laborLawValidator, formatValidationMessage, separateViolations, type LaborLawViolation } from '@/shared/lib/laborLawValidation'
import { ShiftWithRelations } from '@/types/schedule'
import { 
  WeekViewSkeleton, 
  EmployeeGroupedViewSkeleton, 
  GroupGroupedViewSkeleton,
  FunctionGroupedViewSkeleton 
} from '@/components/skeletons/ScheduleSkeleton'
import { usePermissions } from '@/shared/lib/usePermissions'
import { PERMISSIONS } from '@/shared/lib/permissions'

type ViewTabValue = 'time' | 'employees' | 'groups' | 'functions'

type ViewTabConfig = {
  value: ViewTabValue
  labelKey: string
  descriptionKey: string
  icon: (props: React.ComponentProps<'svg'>) => JSX.Element
}

const VIEW_TAB_CONFIG: ViewTabConfig[] = [
  { value: 'time', labelKey: 'view_tabs.time.label', descriptionKey: 'view_tabs.time.description', icon: ClockIcon },
  { value: 'employees', labelKey: 'view_tabs.employees.label', descriptionKey: 'view_tabs.employees.description', icon: UsersIcon },
  { value: 'groups', labelKey: 'view_tabs.groups.label', descriptionKey: 'view_tabs.groups.description', icon: UserGroupIcon },
  { value: 'functions', labelKey: 'view_tabs.functions.label', descriptionKey: 'view_tabs.functions.description', icon: Squares2X2Icon }
]

export default function SchedulePage() {
  const [showShiftModal, setShowShiftModal] = useState(false)
  const [showCreateTemplateModal, setShowCreateTemplateModal] = useState(false)
  const [showSelectTemplateModal, setShowSelectTemplateModal] = useState(false)
  const [showApplyTemplateModal, setShowApplyTemplateModal] = useState(false)
  const [showSaveAsTemplateModal, setShowSaveAsTemplateModal] = useState(false)
  const [selectTemplateMode, setSelectTemplateMode] = useState<'edit' | 'apply'>('edit')
  const [shiftInitialData, setShiftInitialData] = useState<any>(null)
  const [modalViewType, setModalViewType] = useState<'week' | 'day' | 'month'>('week')
  
  const [showCreateAttendanceModal, setShowCreateAttendanceModal] = useState(false)
  const [attendanceShift, setAttendanceShift] = useState<ShiftWithRelations | null>(null)
  const [attendanceFormData, setAttendanceFormData] = useState({
    punchInTime: '',
    punchOutTime: ''
  })
  const [isCreatingAttendance, setIsCreatingAttendance] = useState(false)
  const [business, setBusiness] = useState<{ id: string } | null>(null)

  const [currentDate, setCurrentDate] = useState(new Date())
  const [employees, setEmployees] = useState<Employee[]>([])
  const [employeeGroups, setEmployeeGroups] = useState<EmployeeGroup[]>([])
  const [shifts, setShifts] = useState<ShiftWithRelations[]>([])
  const [pendingShiftIds, setPendingShiftIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'week' | 'two-week' | 'day' | 'month'>('week')
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [scheduleViewType, setScheduleViewType] = useState<'time' | 'employees' | 'groups' | 'functions'>('employees')
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())

  const { hasPermission, loading: permissionsLoading } = usePermissions()
  const canViewSchedule = hasPermission(PERMISSIONS.SCHEDULE_VIEW) || hasPermission(PERMISSIONS.SHIFTS_VIEW)
  const canCreateShifts = hasPermission(PERMISSIONS.SCHEDULE_CREATE) || hasPermission(PERMISSIONS.SHIFTS_CREATE)
  const canEditShifts = hasPermission(PERMISSIONS.SCHEDULE_EDIT) || hasPermission(PERMISSIONS.SHIFTS_EDIT)
  const canDeleteShifts = hasPermission(PERMISSIONS.SCHEDULE_DELETE) || hasPermission(PERMISSIONS.SHIFTS_DELETE)
  const canUseTemplates = hasPermission(PERMISSIONS.SCHEDULE_TEMPLATES)

  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedFunctionId, setSelectedFunctionId] = useState<string | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [departments, setDepartments] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [functions, setFunctions] = useState<any[]>([])
  const [shiftTypes, setShiftTypes] = useState<any[]>([])
  const [availabilityLookup, setAvailabilityLookup] = useState<Record<string, { isAvailable: boolean; note?: string }>>({})
  const [filters, setFilters] = useState({
    employeeIds: [] as string[],
    employeeGroupIds: [] as string[],
    shiftTypeIds: [] as string[],
    statuses: [] as string[],
    timeFrom: '',
    timeTo: ''
  })

  const applyFunctionGroupFilters = useCallback((functionId: string | null) => {
    if (!functionId) {
      return
    }

    const targetFunction = functions.find(func => func.id === functionId)
    if (!targetFunction) {
      return
    }

    const linkedGroupIds = Array.from(
      new Set((targetFunction.employeeGroups ?? []).map((group: any) => group.id).filter(Boolean))
    )

    setFilters(prevFilters => {
      if (linkedGroupIds.length === 0) {
        return prevFilters
      }

      const groupsChanged =
        linkedGroupIds.length !== prevFilters.employeeGroupIds.length ||
        linkedGroupIds.some(id => !prevFilters.employeeGroupIds.includes(id))

      if (!groupsChanged) {
        return prevFilters
      }

      return {
        ...prevFilters,
        employeeGroupIds: linkedGroupIds
      }
    })
  }, [functions])

  useEffect(() => {
    if (!selectedFunctionId) {
      return
    }
    applyFunctionGroupFilters(selectedFunctionId)
  }, [selectedFunctionId, applyFunctionGroupFilters])

  const { t } = useTranslation('schedule')

  const viewTabs = useMemo(
    () =>
      VIEW_TAB_CONFIG.map(tab => ({
        ...tab,
        label: t(tab.labelKey),
        description: t(tab.descriptionKey)
      })),
    [t]
  )

  // Filter shifts based on selected department, category, function, and filters
  const filteredShifts = useMemo(() => {
    return shifts.filter((shift: any) => {
      if (selectedDepartmentId && shift.departmentId !== selectedDepartmentId) {
        return false
      }
      if (selectedCategoryId && shift.function?.categoryId !== selectedCategoryId) {
        return false
      }
      if (selectedFunctionId && shift.functionId !== selectedFunctionId) {
        return false
      }
      if (filters.employeeIds.length > 0 && !filters.employeeIds.includes(shift.employeeId || '')) {
        return false
      }
      if (filters.employeeGroupIds.length > 0) {
        const employee = employees.find(emp => emp.id === shift.employeeId)
        if (!employee || !employee.employeeGroupId || !filters.employeeGroupIds.includes(employee.employeeGroupId)) {
          return false
        }
      }
      if (filters.shiftTypeIds.length > 0 && !filters.shiftTypeIds.includes(shift.shiftTypeId || '')) {
        return false
      }
      if (filters.statuses.length > 0 && !filters.statuses.includes(shift.status || '')) {
        return false
      }
      if (filters.timeFrom && shift.startTime < filters.timeFrom) {
        return false
      }
      if (filters.timeTo && shift.startTime > filters.timeTo) {
        return false
      }
      
      return true
    })
  }, [shifts, filters, employees, selectedDepartmentId, selectedCategoryId, selectedFunctionId])

  // Filter categories based on selected department
  const filteredCategories = useMemo(() => {
    if (!selectedDepartmentId) {
      return categories
    }
    return categories.filter((category: any) => {
      // Check if category has departments array (many-to-many)
      if (category.departments && category.departments.length > 0) {
        return category.departments.some((cd: any) => cd.department?.id === selectedDepartmentId || cd.departmentId === selectedDepartmentId)
      }
      // Fallback to old single department field
      if (category.departmentId) {
        return category.departmentId === selectedDepartmentId
      }
      // Business-wide categories (no department restriction)
      return true
    })
  }, [categories, selectedDepartmentId])

  // Filter functions based on filtered categories
  const filteredFunctions = useMemo(() => {
    if (!selectedDepartmentId) {
      return functions
    }
    const filteredCategoryIds = filteredCategories.map((c: any) => c.id)
    return functions.filter((fn: any) => filteredCategoryIds.includes(fn.categoryId))
  }, [functions, filteredCategories, selectedDepartmentId])

  // Filter employees based on selected department (using many-to-many relationship)
  const filteredEmployees = useMemo(() => {
    if (!selectedDepartmentId) {
      return employees
    }
    return employees.filter((employee: any) => {
      // Check new many-to-many departments relationship
      if (employee.departments && employee.departments.length > 0) {
        return employee.departments.some((ed: any) => 
          ed.departmentId === selectedDepartmentId || ed.department?.id === selectedDepartmentId
        )
      }
      // Fallback to old single departmentId field
      return employee.departmentId === selectedDepartmentId
    })
  }, [employees, selectedDepartmentId])

  const startDate = useMemo(() => {
    if (viewMode === 'month') {
      return startOfMonth(currentDate)
    }
    if (viewMode === 'day') {
      return selectedDate
    }
    return startOfWeek(currentDate, { weekStartsOn: 0 })
  }, [currentDate, viewMode, selectedDate])
  
  const endDate = useMemo(() => {
    if (viewMode === 'month') {
      return endOfMonth(currentDate)
    }
    if (viewMode === 'day') {
      return selectedDate
    }
    if (viewMode === 'two-week') {
      return addDays(startDate, 13)
    }
    return endOfWeek(currentDate, { weekStartsOn: 0 })
  }, [currentDate, viewMode, selectedDate, startDate])
  
  const weekDates = useMemo(() => Array(7).fill(0).map((_, i) => addDays(startDate, i)), [startDate])
  const twoWeekDates = useMemo(() => {
    if (viewMode !== 'two-week') return []
    return Array(14).fill(0).map((_, i) => addDays(startDate, i))
  }, [startDate, viewMode])


  useEffect(() => {
    fetchShifts()
  }, [startDate, endDate, selectedEmployeeId])

  useEffect(() => {
    fetchAvailability()
  }, [startDate, endDate])

  useEffect(() => {
    const fetchStaticData = async () => {
      await Promise.all([
        fetchEmployees(),
        fetchEmployeeGroups(),
        fetchDepartments(),
        fetchCategories(),
        fetchFunctions(),
        fetchShiftTypes(),
        fetchBusiness()
      ])
    }
    fetchStaticData()
  }, [])

  const fetchBusiness = async () => {
    try {
      const res = await fetch('/api/business')
      if (res.ok) {
        const data = await res.json()
        setBusiness(data)
      }
    } catch (error) {
      console.error('Error fetching business:', error)
    }
  }

  const fetchEmployees = async () => {
    try {
      // Check employee settings for BLOCK_SCHEDULING behavior
      const settingsRes = await fetch('/api/employee-settings')
      const settings = settingsRes.ok ? await settingsRes.json() : null
      const useSchedulableFilter = settings?.incompleteProfileBehavior === 'BLOCK_SCHEDULING'
      
      const url = useSchedulableFilter ? '/api/employees?schedulable=true' : '/api/employees'
      const res = await fetch(url, {
        headers: { 'Cache-Control': 'max-age=300' }
      })
      const data = await res.json()
      setEmployees(data)
    } catch (error) {
      console.error('Error fetching employees:', error)
      setEmployees([])
    }
  }

  const fetchEmployeeGroups = async () => {
    try {
      const res = await fetch('/api/employee-groups')
      const data = await res.json()
      setEmployeeGroups(data)
    } catch (error) {
      console.error('Error fetching employee groups:', error)
    }
  }

  const fetchDepartments = async () => {
    try {
      const res = await fetch('/api/departments')
      const data = await res.json()
      setDepartments(data)
    } catch (error) {
      console.error('Error fetching departments:', error)
      setDepartments([])
    }
  }

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/categories')
      const data = await res.json()
      setCategories(data)
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }

  const fetchFunctions = async () => {
    try {
      const res = await fetch('/api/functions')
      const data = await res.json()
      setFunctions(data)
    } catch (error) {
      console.error('Error fetching functions:', error)
    }
  }

  const fetchShiftTypes = async () => {
    try {
      const res = await fetch('/api/shift-types')
      const data = await res.json()
      setShiftTypes(data.shiftTypes || [])
    } catch (error) {
      console.error('Error fetching shift types:', error)
      setShiftTypes([])
    }
  }

  const fetchAvailability = async () => {
    try {
      const start = format(startDate, 'yyyy-MM-dd')
      const end = format(endDate, 'yyyy-MM-dd')
      const res = await fetch(`/api/availability?startDate=${start}&endDate=${end}`, {
        headers: { 'Cache-Control': 'max-age=60' }
      })

      if (!res.ok) {
        throw new Error('Failed to fetch availability')
      }

      const data = await res.json()
      const lookup: Record<string, { isAvailable: boolean; note?: string }> = {}

      data.forEach((entry: any) => {
        if (!entry?.employeeId || !entry?.date) return
        const dateKey = format(new Date(entry.date), 'yyyy-MM-dd')
        lookup[`${entry.employeeId}-${dateKey}`] = {
          isAvailable: Boolean(entry.isAvailable),
          note: entry.note || undefined
        }
      })

      setAvailabilityLookup(lookup)
    } catch (error) {
      console.error('Error fetching availability for schedule:', error)
      setAvailabilityLookup({})
    }
  }

  const fetchShifts = useCallback(async () => {
    try {
      setLoading(true)
      const start = format(startDate, 'yyyy-MM-dd')
      const end = format(endDate, 'yyyy-MM-dd')
      
      let url = `/api/shifts?startDate=${start}&endDate=${end}`
      if (selectedEmployeeId) {
        url += `&employeeId=${selectedEmployeeId}`
      }
      
      const res = await fetch(url, {
        headers: { 'Cache-Control': 'max-age=60' },
        next: { revalidate: 60 }
      })
      
      if (!res.ok) {
        throw new Error(`Failed to fetch shifts: ${res.statusText}`)
      }
      
      const data = await res.json()
      setShifts(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error fetching shifts:', error)
      setShifts([])
    } finally {
      setLoading(false)
    }
  }, [startDate, endDate, selectedEmployeeId])

  const getAvailabilityStatus = useCallback((employeeId: string, date: string) => {
    if (!employeeId || !date) return undefined
    const normalizedDate = format(new Date(date), 'yyyy-MM-dd')
    return availabilityLookup[`${employeeId}-${normalizedDate}`]
  }, [availabilityLookup])

  const notifyEmployeeUnavailable = useCallback((employeeId: string, date: string) => {
    const employee = employees.find(emp => emp.id === employeeId)
    const employeeName = employee ? `${employee.firstName} ${employee.lastName}` : t('labels.this_employee')
    const status = getAvailabilityStatus(employeeId, date)
    const formattedDate = format(new Date(date), 'MMM d, yyyy')

    Swal.fire({
      icon: 'info',
      title: t('alerts.employee_unavailable.title'),
      text: status?.note
        ? t('alerts.employee_unavailable.with_note', {
            name: employeeName,
            date: formattedDate,
            note: status.note
          })
        : t('alerts.employee_unavailable.without_note', {
            name: employeeName,
            date: formattedDate
          }),
      confirmButtonColor: '#31BCFF'
    })
  }, [employees, getAvailabilityStatus, t])

  const shouldPreventShiftCreation = useCallback((employeeId?: string, date?: string) => {
    if (!employeeId || !date) return false
    const status = getAvailabilityStatus(employeeId, date)
    if (status && status.isAvailable === false) {
      notifyEmployeeUnavailable(employeeId, date)
      return true
    }
    return false
  }, [getAvailabilityStatus, notifyEmployeeUnavailable])

  const isEmployeeUnavailableOnDate = useCallback((employeeId?: string, date?: string) => {
    if (!employeeId || !date) return false
    const status = getAvailabilityStatus(employeeId, date)
    return status?.isAvailable === false
  }, [getAvailabilityStatus])

  const attachSelectedEmployee = useCallback((formData?: any | null) => {
    if (!selectedEmployeeId) {
      return formData ? { ...formData } : null
    }

    if (formData) {
      if (!formData.employeeId) {
        return { ...formData, employeeId: selectedEmployeeId }
      }
      return { ...formData }
    }

    return { employeeId: selectedEmployeeId }
  }, [selectedEmployeeId])

  const openShiftModal = useCallback((view: 'week' | 'day' | 'month', formData?: any | null) => {
    const isEditing = formData?.id
    if (isEditing && !canEditShifts) {
      return
    }
    if (!isEditing && !canCreateShifts) {
      return
    }

    const payload = formData ? { ...formData } : null

    if (payload?.employeeId && payload?.date) {
      if (shouldPreventShiftCreation(payload.employeeId, payload.date)) {
        return
      }
    }

    setModalViewType(view)
    setShiftInitialData(payload ?? null)
    setShowShiftModal(true)
  }, [shouldPreventShiftCreation, canCreateShifts, canEditShifts])

  const handlePreviousWeek = () => {
    if (viewMode === 'day') {
      setSelectedDate(prevDate => addDays(prevDate, -1))
    } else {
      const step = viewMode === 'two-week' ? 2 : 1
      setCurrentDate(prevDate => subWeeks(prevDate, step))
    }
  }

  const handleNextWeek = () => {
    if (viewMode === 'day') {
      setSelectedDate(prevDate => addDays(prevDate, 1))
    } else {
      const step = viewMode === 'two-week' ? 2 : 1
      setCurrentDate(prevDate => addWeeks(prevDate, step))
    }
  }

  const handlePreviousMonth = () => {
    setCurrentDate(prevDate => subMonths(prevDate, 1))
  }

  const handleNextMonth = () => {
    setCurrentDate(prevDate => addMonths(prevDate, 1))
  }

  const toMinutes = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number)
    return hours * 60 + minutes
  }

  const normalizeRange = (start: string, end?: string | null) => {
    const startMinutes = toMinutes(start)
    let endMinutes = end ? toMinutes(end) : startMinutes + 24 * 60

    if (endMinutes <= startMinutes) {
      endMinutes += 24 * 60
    }

    return { startMinutes, endMinutes }
  }

  const findOverlappingShift = (
    employeeId: string,
    shiftDate: string,
    startTime?: string,
    endTime?: string,
    excludeShiftId?: string
  ) => {
    if (!startTime || !endTime) return null

    const newDate = shiftDate.substring(0, 10)
    const newRange = normalizeRange(startTime, endTime)

    return shifts.find(shift => {
      if (shift.employeeId !== employeeId) return false

      const shiftDateStr = typeof shift.date === 'string'
        ? (shift.date as string).substring(0, 10)
        : format(new Date(shift.date), 'yyyy-MM-dd')

      if (shiftDateStr !== newDate) return false
      if (excludeShiftId && shift.id === excludeShiftId) return false

      const existingRange = normalizeRange(shift.startTime, shift.endTime ?? undefined)

      const overlaps = !(newRange.endMinutes <= existingRange.startMinutes || newRange.startMinutes >= existingRange.endMinutes)

      return overlaps
    }) || null
  }

  const handleShiftFormSubmit = async (formData: any) => {
    // Check if this is an approval-only update (existing shift with only approval status changing)
    const isApprovalOnlyUpdate = formData.id && shiftInitialData && 
      formData.approved !== shiftInitialData.approved &&
      formData.date === shiftInitialData.date &&
      formData.startTime === shiftInitialData.startTime &&
      formData.endTime === shiftInitialData.endTime &&
      formData.employeeId === shiftInitialData.employeeId;

    // Skip validation for approval-only updates since the shift already exists
    if (!isApprovalOnlyUpdate) {
      if (formData.employeeId && formData.date && formData.startTime && formData.endTime) {
        const existingShift = findOverlappingShift(
          formData.employeeId,
          formData.date,
          formData.startTime,
          formData.endTime,
          formData.id
        )
        
        if (existingShift) {
          const employee = employees.find(emp => emp.id === formData.employeeId);
          const employeeName = employee ? `${employee.firstName} ${employee.lastName}` : t('labels.this_employee');
          const endLabel = existingShift.endTime || t('labels.active_shift')

          const conflictTitle = t('alerts.shift_conflict.title', { name: employeeName });
          const conflictMessage = t('alerts.shift_conflict.message', {
            date: formData.date,
            start: existingShift.startTime,
            end: endLabel
          });

          Swal.fire({
            text: t('alerts.shift_conflict.toast', { title: conflictTitle, message: conflictMessage }),
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 4000,
            timerProgressBar: true,
            customClass: {
              popup: 'swal-toast-wide'
            }
          });
          
          return;
        }
      }
    }

    // Labor Law Validation - Skip for approval-only updates
    if (!isApprovalOnlyUpdate && formData.employeeId && formData.startTime && formData.endTime) {
      try {
        const shiftData = {
          id: formData.id,
          date: formData.date,
          startTime: formData.startTime,
          endTime: formData.endTime,
          breakStart: formData.breakStart,
          breakEnd: formData.breakEnd,
          employeeId: formData.employeeId
        };

        // Get existing shifts for the employee to validate against weekly rules
        const shiftDate = new Date(formData.date);
        const weekStart = new Date(shiftDate);
        weekStart.setDate(shiftDate.getDate() - shiftDate.getDay());
        
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        
        const existingEmployeeShifts = shifts.filter(shift => 
          shift.employeeId === formData.employeeId &&
          shift.id !== formData.id &&
          shift.endTime !== null && // Only include completed shifts
          shift.employeeId !== null && 
          new Date(shift.date) >= weekStart &&
          new Date(shift.date) <= weekEnd
        ).map(shift => ({
          id: shift.id,
          date: typeof shift.date === 'string' ? shift.date : shift.date.toISOString().split('T')[0],
          startTime: shift.startTime,
          endTime: shift.endTime as string,
          breakStart: shift.breakStart ? (typeof shift.breakStart === 'string' ? shift.breakStart : shift.breakStart.toTimeString().substring(0, 5)) : undefined,
          breakEnd: shift.breakEnd ? (typeof shift.breakEnd === 'string' ? shift.breakEnd : shift.breakEnd.toTimeString().substring(0, 5)) : undefined,
          employeeId: shift.employeeId as string
        }));

        const validation = await laborLawValidator.validateShift(shiftData, existingEmployeeShifts);
        
        if (!validation.isValid) {
          // Separate overridable and non-overridable violations
          const { overridable, nonOverridable } = separateViolations(validation.violations);
          
          // If there are non-overridable violations, block the shift creation
          if (nonOverridable.length > 0) {
            const violationMessages = nonOverridable.map(formatValidationMessage).join('\n');
            
            Swal.fire({
              text: violationMessages,
              toast: true,
              position: 'top-end',
              showConfirmButton: false,
              timer: 5000,
              timerProgressBar: true,
              customClass: {
                popup: 'swal-toast-wide'
              }
            });
            
            return;
          }
          
          // If there are only overridable violations, show confirmation dialog
          if (overridable.length > 0) {
            setShowShiftModal(false);

            const violationsList = overridable
              .map(violation => {
                switch (violation.type) {
                  case 'MAX_HOURS_PER_DAY':
                    return t('labor_law.violations.max_hours_per_day', {
                      current: violation.currentValue.toFixed(1),
                      allowed: violation.allowedValue
                    })
                  case 'MAX_OVERTIME_PER_DAY':
                    return t('labor_law.violations.max_overtime_per_day', {
                      current: violation.currentValue.toFixed(1),
                      allowed: violation.allowedValue
                    })
                  case 'MAX_OVERTIME_PER_WEEK':
                    return t('labor_law.violations.max_overtime_per_week', {
                      current: violation.currentValue.toFixed(1),
                      allowed: violation.allowedValue
                    })
                  case 'MISSING_BREAK':
                    return t('labor_law.violations.missing_break', {
                      current: violation.currentValue,
                      allowed: violation.allowedValue
                    })
                  default:
                    return t('labor_law.violations.generic', { message: violation.message })
                }
              })
              .join('<br>')

            const confirmationHtml = `
                <div style="text-align: left; margin: 16px 0;">
                  <p style="margin-bottom: 12px;">${t('labor_law.intro')}</p>
                  <div style="background-color: #fef3cd; border: 1px solid #ffeaa7; border-radius: 6px; padding: 12px; margin: 12px 0;">
                    ${violationsList}
                  </div>
                  <p style="margin-top: 16px;"><strong>${t('labor_law.override_question')}</strong></p>
                  <p style="font-size: 14px; color: #6b7280; margin-top: 8px;">${t('labor_law.override_hint')}</p>
                </div>
              `

            const result = await Swal.fire({
              title: t('labor_law.title'),
              html: confirmationHtml,
              icon: 'warning',
              showCancelButton: true,
              confirmButtonColor: '#31BCFF',
              cancelButtonColor: '#6b7280',
              confirmButtonText: t('labor_law.confirm'),
              cancelButtonText: t('labor_law.cancel'),
              reverseButtons: true,
              heightAuto: false,
              allowOutsideClick: false,
              allowEscapeKey: false,
              customClass: {
                popup: 'swal2-popup-custom',
                title: 'swal2-title-custom',
                htmlContainer: 'swal2-html-custom'
              }
            });
            if (!result.isConfirmed) {
              setShowShiftModal(true);
              return;
            }

            const violationCount = overridable.length;
            Swal.fire({
              text: t('labor_law.override_toast', { count: violationCount }),
              toast: true,
              position: 'top-end',
              showConfirmButton: false,
              timer: 4000,
              timerProgressBar: true,
              icon: 'warning',
              customClass: {
                popup: 'swal-toast-wide'
              }
            });
          }
        } else if (validation.warnings.length > 0) {
          const warningMessages = validation.warnings.map(w => w.message).join('\n');
          
          Swal.fire({
            text: warningMessages,
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 5000,
            timerProgressBar: true,
            customClass: {
              popup: 'swal-toast-wide'
            }
          });
        }
      } catch (error) {
        console.error('Error validating labor laws:', error);
      }
    }

    const successToastKey = formData.id ? 'toasts.shift_updated' : 'toasts.shift_created'
    const failureToastKey = formData.id ? 'toasts.shift_update_failed' : 'toasts.shift_create_failed'
    
    const optimisticShift = {
      ...formData,
      id: formData.id || `temp-${Date.now()}`,
      date: new Date(formData.date),
      employee: formData.employeeId ? employees.find(e => e.id === formData.employeeId) : null,
      department: formData.departmentId ? departments.find(d => d.id === formData.departmentId) : null,
      function: formData.functionId ? functions.find(f => f.id === formData.functionId) : null,
      shiftTypeConfig: formData.shiftTypeId ? shiftTypes.find(st => st.id === formData.shiftTypeId) : null,
    }
    
    if (formData.id) {
      setShifts(prev => prev.map(s => s.id === formData.id ? { ...s, ...optimisticShift } : s))
    } else {
      setShifts(prev => [...prev, optimisticShift as any])
    }
    setShowShiftModal(false)
    
    try {
      const method = formData.id ? 'PUT' : 'POST';
      const url = formData.id 
        ? `/api/shifts/${formData.id}` 
        : '/api/shifts';

      const { _bulkCopyCount, ...submitData } = formData
      const bulkCount = _bulkCopyCount || 1

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData),
      });

      if (res.ok) {
        const savedShift = await res.json()

        if (!submitData.id && bulkCount > 1 && savedShift?.id) {
          try {
            const dupRes = await fetch('/api/shifts/duplicate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ shiftId: savedShift.id, count: bulkCount - 1 }),
            })
            if (dupRes.ok) {
              const dupData = await dupRes.json()
              const dupShifts = Array.isArray(dupData.shifts) ? dupData.shifts : []
              setShifts(prev => {
                const withoutTemp = prev.filter(s => s.id !== optimisticShift.id)
                return [...withoutTemp, savedShift, ...dupShifts]
              })
            } else {
              setShifts(prev => prev.map(s => s.id === optimisticShift.id ? savedShift : s))
            }
          } catch (err) {
            console.error('Bulk duplication failed:', err)
            setShifts(prev => prev.map(s => s.id === optimisticShift.id ? savedShift : s))
          }
        } else if (submitData.id) {
          setShifts(prev => prev.map(s => s.id === submitData.id ? savedShift : s))
        } else {
          setShifts(prev => prev.map(s => s.id === optimisticShift.id ? savedShift : s))
        }
        
        const toastText = bulkCount > 1 && !submitData.id
          ? `${bulkCount} shifts created`
          : t(successToastKey)

        Swal.fire({
          text: toastText,
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 3000,
          timerProgressBar: true,
          customClass: {
            popup: 'swal-toast-wide'
          }
        });
      } else {
        const errorData = await res.json();
        
        if (formData.id) {
          setShifts(prev => prev.map(s => s.id === formData.id ? shifts.find(os => os.id === formData.id) || s : s))
        } else {
          setShifts(prev => prev.filter(s => s.id !== optimisticShift.id))
        }

        if (res.status === 409 && errorData.requiresConfirmation) {
          const violationsList = [
            ...(errorData.violations || []).map((v: string) => `<li style="color:#dc2626">${v}</li>`),
            ...(errorData.warnings || []).map((w: string) => `<li style="color:#d97706">${w}</li>`),
          ].join('')

          const confirmResult = await Swal.fire({
            title: t('labor_law.rule_violations') || 'Rule Violations Detected',
            html: `<p style="margin-bottom:8px">${t('labor_law.override_prompt') || 'Assigning this shift will override the following rules:'}</p><ul style="text-align:left;font-size:13px;list-style:disc;padding-left:20px">${violationsList}</ul>`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: t('labor_law.assign_anyway') || 'Assign Anyway',
            cancelButtonText: t('common.cancel') || 'Cancel',
            confirmButtonColor: '#059669',
          })

          if (confirmResult.isConfirmed) {
            const retryRes = await fetch(url, {
              method,
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ...submitData, _forceAssign: true }),
            })
            if (retryRes.ok) {
              const retryShift = await retryRes.json()
              if (formData.id) {
                setShifts(prev => prev.map(s => s.id === formData.id ? retryShift : s))
              } else {
                setShifts(prev => [...prev, retryShift])
              }
              Swal.fire({
                text: t(successToastKey),
                toast: true, position: 'top-end', showConfirmButton: false,
                timer: 3000, timerProgressBar: true,
                customClass: { popup: 'swal-toast-wide' }
              })
            }
          }
          return
        }

        if (res.status === 422 && (errorData.violations || errorData.warnings)) {
          const violationsList = [
            ...(errorData.violations || []).map((v: string) => `<li>${v}</li>`),
            ...(errorData.warnings || []).map((w: string) => `<li>${w}</li>`),
          ].join('')

          Swal.fire({
            title: t('labor_law.cannot_assign') || 'Cannot Assign Employee',
            html: `<p style="margin-bottom:8px">${t('labor_law.blocking_violations') || 'This shift assignment violates non-overridable rules:'}</p><ul style="text-align:left;font-size:13px;list-style:disc;padding-left:20px;color:#dc2626">${violationsList}</ul>`,
            icon: 'error',
            confirmButtonText: 'OK',
          })
          return
        }
        
        Swal.fire({
          text: errorData.error || t(failureToastKey),
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 4000,
          timerProgressBar: true,
          customClass: {
            popup: 'swal-toast-wide'
          }
        });
      }
    } catch (error) {
      console.error('Error submitting shift form:', error)
      
      if (formData.id) {
        setShifts(prev => prev.map(s => s.id === formData.id ? shifts.find(os => os.id === formData.id) || s : s))
      } else {
        setShifts(prev => prev.filter(s => s.id !== optimisticShift.id))
      }
      
      Swal.fire({
        text: t(failureToastKey),
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 4000,
        timerProgressBar: true,
        customClass: {
          popup: 'swal-toast-wide'
        }
      })
    }
  };

  const handleShiftDelete = async (shiftId: string) => {
    if (!shiftId) return

    setShifts(prev => prev.filter(s => s.id !== shiftId))
    setShowShiftModal(false)

    try {
      const res = await fetch(`/api/shifts/${shiftId}`, {
        method: 'DELETE'
      })

      if (!res.ok) {
        throw new Error(t('toasts.shift_delete_failed'))
      }

      Swal.fire({
        text: t('toasts.shift_deleted'),
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        customClass: {
          popup: 'swal-toast-wide'
        }
      })
    } catch (error) {
      console.error('Error deleting shift:', error)
      await fetchShifts()
      Swal.fire({
        text: t('toasts.shift_delete_failed'),
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 4000,
        timerProgressBar: true,
        customClass: {
          popup: 'swal-toast-wide'
        }
      })
    }
  }

  const handleMoveShift = useCallback(async (shiftId: string, target: { date?: string; employeeId?: string; employeeGroupId?: string; functionId?: string }) => {
    const originalShift = shifts.find(s => s.id === shiftId)

    setShifts(prev => prev.map(s => {
      if (s.id !== shiftId) return s
      return {
        ...s,
        ...(target.date && { date: new Date(target.date) }),
        ...(target.employeeId !== undefined && { employeeId: target.employeeId }),
        ...(target.employeeGroupId !== undefined && { employeeGroupId: target.employeeGroupId }),
        ...(target.functionId !== undefined && { functionId: target.functionId }),
      }
    }))
    setPendingShiftIds(prev => new Set(prev).add(shiftId))

    try {
      const res = await fetch(`/api/shifts/${shiftId}/move`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(target),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to move shift')
      }

      const movedShift = await res.json()
      setShifts(prev => prev.map(s => s.id === shiftId ? movedShift : s))

      Swal.fire({
        text: t('toasts.shift_moved') || 'Shift moved successfully',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 2000,
        timerProgressBar: true,
        customClass: { popup: 'swal-toast-wide' }
      })
    } catch (error: any) {
      console.error('Error moving shift:', error)
      if (originalShift) {
        setShifts(prev => prev.map(s => s.id === shiftId ? originalShift : s))
      }
      Swal.fire({
        text: error.message || t('toasts.shift_move_failed') || 'Failed to move shift',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        customClass: { popup: 'swal-toast-wide' }
      })
    } finally {
      setPendingShiftIds(prev => {
        const next = new Set(prev)
        next.delete(shiftId)
        return next
      })
    }
  }, [shifts, t])

  const handleDuplicateShift = useCallback(async (shiftId: string, targets: Array<{ date?: string; employeeId?: string; employeeGroupId?: string; functionId?: string }>) => {
    setPendingShiftIds(prev => new Set(prev).add(shiftId))
    try {
      const res = await fetch('/api/shifts/duplicate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shiftId, targets }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to duplicate shift')
      }

      const data = await res.json()
      const newShifts = Array.isArray(data.shifts) ? data.shifts : []
      if (newShifts.length > 0) {
        setShifts(prev => [...prev, ...newShifts])
      }

      Swal.fire({
        text: (t('toasts.shift_duplicated') || 'Shift duplicated') + (data.count > 1 ? ` (${data.count} copies)` : ''),
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 2000,
        timerProgressBar: true,
        customClass: { popup: 'swal-toast-wide' }
      })
    } catch (error: any) {
      console.error('Error duplicating shift:', error)
      Swal.fire({
        text: error.message || t('toasts.shift_duplicate_failed') || 'Failed to duplicate shift',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        customClass: { popup: 'swal-toast-wide' }
      })
    } finally {
      setPendingShiftIds(prev => {
        const next = new Set(prev)
        next.delete(shiftId)
        return next
      })
    }
  }, [t])

  const handleBulkDuplicate = useCallback(async (shiftId: string, count: number) => {
    try {
      const res = await fetch('/api/shifts/duplicate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shiftId, count }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to duplicate shifts')
      }

      const data = await res.json()
      const newShifts = Array.isArray(data.shifts) ? data.shifts : []
      if (newShifts.length > 0) {
        setShifts(prev => [...prev, ...newShifts])
      }

      Swal.fire({
        text: `${data.count} shift${data.count !== 1 ? 's' : ''} created`,
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 2000,
        timerProgressBar: true,
        customClass: { popup: 'swal-toast-wide' }
      })
    } catch (error: any) {
      console.error('Error bulk duplicating shifts:', error)
      Swal.fire({
        text: error.message || 'Failed to duplicate shifts',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        customClass: { popup: 'swal-toast-wide' }
      })
    }
  }, [])

  const calculateShiftHours = (startTime: string, endTime: string): number => {
    const getMinutes = (timeStr: string): number => {
      const [hours, minutes] = timeStr.split(':').map(Number)
      return hours * 60 + minutes
    }
    
    const startMinutes = getMinutes(startTime)
    const endMinutes = getMinutes(endTime)
    
    let minutesWorked = endMinutes - startMinutes
    if (minutesWorked < 0) {
      minutesWorked += 24 * 60 
    }
    
    return minutesWorked / 60
  }

  const handleEditShift = (shift: ShiftWithRelations) => {
    setModalViewType('week');
    
    const shiftData = {
      ...shift,
      date: typeof shift.date === 'string'
        ? (shift.date as string).substring(0, 10)
        : format(shift.date, 'yyyy-MM-dd'),
      startTime: shift.startTime || '09:00',
      endTime: shift.endTime || '17:00',
      shiftType: shift.shiftType || 'NORMAL',
      wage: shift.wage || 0,
      wageType: shift.wageType || 'HOURLY',
      approved: shift.approved || false,
      employeeId: shift.employeeId || undefined,
      employeeGroupId: shift.employeeGroupId || undefined,
      departmentId: shift.departmentId || shift.function?.category?.departmentId || undefined,
      categoryId: shift.function?.categoryId || shift.function?.category?.id || undefined,
      functionId: shift.functionId || undefined,
      breakStart: shift.breakStart || undefined,
      breakEnd: shift.breakEnd || undefined,
      note: shift.note || '',
    };
    
    setShiftInitialData(shiftData);
    setShowShiftModal(true);
  };

  const handleOpenCreateAttendance = (shift: ShiftWithRelations) => {
    setAttendanceShift(shift)
    setAttendanceFormData({
      punchInTime: shift.startTime || '09:00',
      punchOutTime: shift.endTime || '17:00'
    })
    setShowCreateAttendanceModal(true)
  }

  const handleCreateAttendance = async () => {
    if (!attendanceShift || !attendanceShift.employeeId) return

    setIsCreatingAttendance(true)
    try {
      const shiftDate = typeof attendanceShift.date === 'string'
        ? (attendanceShift.date as string).substring(0, 10)
        : format(attendanceShift.date as Date, 'yyyy-MM-dd')

      const punchInDateTime = new Date(`${shiftDate}T${attendanceFormData.punchInTime}:00`)
      const punchOutDateTime = attendanceFormData.punchOutTime 
        ? new Date(`${shiftDate}T${attendanceFormData.punchOutTime}:00`)
        : null

      const response = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: attendanceShift.employeeId,
          businessId: business?.id,
          punchInTime: punchInDateTime.toISOString(),
          punchOutTime: punchOutDateTime?.toISOString() || null,
          shiftId: attendanceShift.id
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create attendance')
      }

      await Swal.fire({
        icon: 'success',
        title: t('create_attendance.success'),
        timer: 1500,
        showConfirmButton: false
      })

      setShowCreateAttendanceModal(false)
      setAttendanceShift(null)
    } catch (error: any) {
      await Swal.fire({
        icon: 'error',
        title: t('create_attendance.error'),
        text: error.message
      })
    } finally {
      setIsCreatingAttendance(false)
    }
  }

  const getShiftPosition = (startTime: string, endTime: string) => {
    const startParts = startTime.split(':');
    const endParts = endTime.split(':');

    const startHour = parseInt(startParts[0], 10);
    const startMinutes = parseInt(startParts[1], 10);

    const endHour = parseInt(endParts[0], 10);
    const endMinutes = parseInt(endParts[1], 10);

    // Calculate offsets in minutes since midnight
    const startOffset = startHour * 60 + startMinutes;
    let endOffset = endHour * 60 + endMinutes;
    
    // If end time is earlier than start time, assume it's the next day
    if (endOffset < startOffset) {
      endOffset += 24 * 60; // Add 24 hours
    }

    // Height calculation: 1 hour = 60px
    const height = ((endOffset - startOffset) / 60) * 60;
    
    // Top position: offset from the top of the schedule grid
    // Assuming the grid starts at hour 1 (not 0)
    const top = ((startOffset - 60) / 60) * 60; // Subtract 60 minutes to adjust for grid starting at hour 1
    
    return { top, height };
  };

  const handleTodayClick = () => {
    const today = new Date()
    setCurrentDate(today)
    setSelectedDate(today)
  }

  const handleEmployeeChange = (employeeId: string | null) => {
    setSelectedEmployeeId(employeeId);
  }

  const handleTemplateAction = (action: 'create' | 'save' | 'edit' | 'apply' | 'copy-week') => {
    if (!canUseTemplates) {
      return
    }
    
    switch (action) {
      case 'create':
        setShowCreateTemplateModal(true)
        break
      case 'save':
        setShowSaveAsTemplateModal(true)
        break
      case 'edit':
        setSelectTemplateMode('edit')
        setShowSelectTemplateModal(true)
        break
      case 'apply':
        setShowApplyTemplateModal(true)
        break
      case 'copy-week':
        // TODO: Implement copy week
        console.log('Copy week')
        break
    }
  }

  const isWeekBasedView = viewMode === 'week' || viewMode === 'two-week'

  const renderWeekScopedContent = (dates: Date[]) => {
    if (scheduleViewType === 'time') {
      return (
        <WeekView
          weekDates={dates}
          shifts={filteredShifts}
          employees={filteredEmployees}
          employeeGroups={employeeGroups}
          functions={filteredFunctions}
          categories={filteredCategories}
          scheduleViewType={scheduleViewType}
          onEditShift={handleEditShift}
          isEmployeeUnavailable={isEmployeeUnavailableOnDate}
          onUnavailableClick={notifyEmployeeUnavailable}
          onAddShift={(formData) => {
            const payload = attachSelectedEmployee(formData ?? null)
            openShiftModal('week', payload)
          }}
          canCreateShifts={canCreateShifts}
          canEditShifts={canEditShifts}
        />
      )
    }

    if (scheduleViewType === 'employees') {
      return (
        <EmployeeGroupedView
          weekDates={dates}
          shifts={filteredShifts}
          employees={filteredEmployees}
          expandedGroups={expandedGroups}
          onToggleGroup={(groupId) => {
            const newExpanded = new Set(expandedGroups);
            if (newExpanded.has(groupId)) {
              newExpanded.delete(groupId);
            } else {
              newExpanded.add(groupId);
            }
            setExpandedGroups(newExpanded);
          }}
          onEditShift={handleEditShift}
          onCreateAttendance={handleOpenCreateAttendance}
          isEmployeeUnavailable={isEmployeeUnavailableOnDate}
          onUnavailableClick={notifyEmployeeUnavailable}
          onAddShift={(data) => {
            openShiftModal('week', data ?? null)
          }}
          canCreateShifts={canCreateShifts}
          canEditShifts={canEditShifts}
          canCreateAttendance={canEditShifts}
          onMoveShift={handleMoveShift}
          onDuplicateShift={handleDuplicateShift}
          pendingShiftIds={pendingShiftIds}
        />
      )
    }

    if (scheduleViewType === 'groups') {
      return (
        <GroupGroupedView
          weekDates={dates}
          shifts={filteredShifts}
          employees={filteredEmployees}
          employeeGroups={employeeGroups}
          onEditShift={handleEditShift}
          onCreateAttendance={handleOpenCreateAttendance}
          selectedEmployeeId={selectedEmployeeId}
          isEmployeeUnavailable={isEmployeeUnavailableOnDate}
          onUnavailableClick={notifyEmployeeUnavailable}
          onAddShift={(data) => {
            const payload = attachSelectedEmployee(data ?? null)
            openShiftModal('week', payload)
          }}
          canCreateShifts={canCreateShifts}
          canEditShifts={canEditShifts}
          canCreateAttendance={canEditShifts}
          onMoveShift={handleMoveShift}
          onDuplicateShift={handleDuplicateShift}
          pendingShiftIds={pendingShiftIds}
        />
      )
    }

    if (scheduleViewType === 'functions') {
      return (
        <FunctionGroupedView
          weekDates={dates}
          shifts={filteredShifts}
          employees={filteredEmployees}
          functions={filteredFunctions}
          onEditShift={handleEditShift}
          onCreateAttendance={handleOpenCreateAttendance}
          selectedEmployeeId={selectedEmployeeId}
          isEmployeeUnavailable={isEmployeeUnavailableOnDate}
          onUnavailableClick={notifyEmployeeUnavailable}
          onAddShift={(data) => {
            const payload = attachSelectedEmployee(data ?? null)
            openShiftModal('week', payload)
          }}
          canCreateShifts={canCreateShifts}
          canEditShifts={canEditShifts}
          canCreateAttendance={canEditShifts}
          onMoveShift={handleMoveShift}
          onDuplicateShift={handleDuplicateShift}
          pendingShiftIds={pendingShiftIds}
        />
      )
    }

    return (
      <WeekView
        weekDates={dates}
        shifts={filteredShifts}
        employees={filteredEmployees}
        employeeGroups={employeeGroups}
        functions={filteredFunctions}
        categories={filteredCategories}
        scheduleViewType={scheduleViewType}
        onEditShift={handleEditShift}
        isEmployeeUnavailable={isEmployeeUnavailableOnDate}
        onUnavailableClick={notifyEmployeeUnavailable}
        onAddShift={(formData) => {
          const payload = attachSelectedEmployee(formData ?? null)
          openShiftModal('week', payload)
        }}
        canCreateShifts={canCreateShifts}
        canEditShifts={canEditShifts}
      />
    )
  }

  const formatRangeLabel = (dates: Date[]) => {
    if (!dates || dates.length === 0) return ''
    return `${format(dates[0], 'MMM d')} - ${format(dates[dates.length - 1], 'MMM d')}`
  }

  // Show access denied if user doesn't have view permission
  if (!permissionsLoading && !canViewSchedule) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-50">
        <div className="text-center p-8 bg-white rounded-lg shadow-md">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You do not have permission to view the schedule.</p>
          <p className="text-sm text-gray-500 mt-2">Please contact your administrator if you need access.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header with navigation and filters */}
      <div className="bg-white border-b px-4 sm:px-6 lg:px-8 py-3 lg:py-4">
        <ScheduleHeader
          startDate={startDate}
          endDate={endDate}
          viewMode={viewMode}
          onPreviousWeek={viewMode === 'month' ? handlePreviousMonth : handlePreviousWeek}
          onNextWeek={viewMode === 'month' ? handleNextMonth : handleNextWeek}
          onTodayClick={handleTodayClick}
          onViewModeChange={setViewMode}
          employees={filteredEmployees}
          selectedEmployeeId={selectedEmployeeId}
          onEmployeeChange={handleEmployeeChange}
          departments={departments}
          employeeGroups={employeeGroups}
          shiftTypes={shiftTypes}
          categories={filteredCategories}
          functions={filteredFunctions}
          selectedDepartmentId={selectedDepartmentId}
          selectedCategoryId={selectedCategoryId}
          selectedFunctionId={selectedFunctionId}
          onDepartmentChange={(deptId) => {
            setSelectedDepartmentId(deptId)
            // Clear category and function selections when department changes
            setSelectedCategoryId(null)
            setSelectedFunctionId(null)
          }}
          onCategoryChange={setSelectedCategoryId}
          onFunctionChange={setSelectedFunctionId}
          filters={filters}
          onFiltersChange={setFilters}
          scheduleViewType={scheduleViewType}
          onScheduleViewTypeChange={setScheduleViewType}
          onTemplateAction={handleTemplateAction}
          canUseTemplates={canUseTemplates}
        />
      </div>

      {/* View Type Tabs - Hidden in Month View */}
      {viewMode !== 'month' && (
        <div className="bg-white border-b px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-3 py-3">
            {/* Compact mobile tabs */}
            <div
              className="flex md:hidden gap-2"
              role="tablist"
              aria-label={t('view_tabs.aria_mobile')}
            >
              {viewTabs.map(tab => {
                const isActive = scheduleViewType === tab.value
                return (
                  <button
                    key={`mobile-${tab.value}`}
                    onClick={() => setScheduleViewType(tab.value)}
                    role="tab"
                    aria-selected={isActive}
                    className={`flex-1 rounded-xl border px-2 py-2 text-[11px] font-semibold uppercase tracking-wide transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#31BCFF] focus-visible:ring-offset-2 ${
                      isActive
                        ? 'border-[#31BCFF] bg-[#31BCFF]/10 text-[#0B5CAB]'
                        : 'border-gray-200 bg-white text-gray-500'
                    }`}
                  >
                    {tab.label}
                  </button>
                )
              })}
            </div>

            {/* Rich desktop/tablet tabs */}
            <div
              className="hidden md:flex w-full gap-2 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory"
              role="tablist"
              aria-label={t('view_tabs.aria_desktop')}
            >
              {viewTabs.map(tab => {
                const isActive = scheduleViewType === tab.value
                const Icon = tab.icon
                return (
                  <button
                    key={tab.value}
                    onClick={() => setScheduleViewType(tab.value)}
                    role="tab"
                    aria-selected={isActive}
                    className={`group flex min-w-[170px] flex-1 items-center gap-3 rounded-2xl border px-3 md:px-4 py-2.5 text-left text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#31BCFF] focus-visible:ring-offset-2 snap-start ${
                      isActive
                        ? 'border-[#31BCFF] bg-blue-50 text-[#0B5CAB] shadow-sm'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <span
                      className={`inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border text-base transition-colors ${
                        isActive
                          ? 'border-transparent bg-[#31BCFF]/15 text-[#0B5CAB]'
                          : 'border-gray-200 bg-white text-gray-500'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="flex flex-col">
                      <span className="font-semibold leading-tight">{tab.label}</span>
                      <span className="text-[11px] text-gray-500 hidden lg:inline">{tab.description}</span>
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Main content area */}
      <main className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
        {loading ? (
          isWeekBasedView ? (
            scheduleViewType === 'employees' ? (
              <EmployeeGroupedViewSkeleton />
            ) : scheduleViewType === 'groups' ? (
              <GroupGroupedViewSkeleton />
            ) : scheduleViewType === 'functions' ? (
              <FunctionGroupedViewSkeleton />
            ) : (
              <WeekViewSkeleton />
            )
          ) : (
            <WeekViewSkeleton />
          )
        ) : (
          <>
            {viewMode === 'week' ? (
              renderWeekScopedContent(weekDates)
            ) : viewMode === 'two-week' ? (
              <div className="space-y-4">
                <div className="text-sm font-semibold text-gray-600">
                  {formatRangeLabel(twoWeekDates)}
                </div>
                {renderWeekScopedContent(twoWeekDates)}
              </div>
            ) : viewMode === 'month' ? (
              <MonthView
                currentDate={currentDate}
                shifts={filteredShifts}
                employees={filteredEmployees}
                onEditShift={handleEditShift}
                isEmployeeUnavailable={isEmployeeUnavailableOnDate}
                onUnavailableClick={notifyEmployeeUnavailable}
                onAddShift={(data) => {
                  const payload = attachSelectedEmployee(data ?? null)
                  openShiftModal('month', payload)
                }}
                canEditShifts={canEditShifts}
                onMoveShift={handleMoveShift}
                onDuplicateShift={handleDuplicateShift}
                pendingShiftIds={pendingShiftIds}
              />
            ) : (
              scheduleViewType === 'time' ? (
                <DayView
                  selectedDate={selectedDate}
                  shifts={filteredShifts}
                  employees={filteredEmployees}
                  onEditShift={handleEditShift}
                  onAddShift={(formData) => {
                    const defaultDate = format(selectedDate, 'yyyy-MM-dd')
                    let payload = formData ? { ...formData } : { date: defaultDate }

                    if (!payload.date) {
                      payload.date = defaultDate
                    }

                    const enrichedPayload = attachSelectedEmployee(payload)
                    openShiftModal('day', enrichedPayload)
                  }}
                  canCreateShifts={canCreateShifts}
                  canEditShifts={canEditShifts}
                />
              ) : scheduleViewType === 'employees' ? (
                <DayEmployeeTimeline
                  date={selectedDate}
                  shifts={filteredShifts}
                  employees={filteredEmployees}
                  onEditShift={handleEditShift}
                  onAddShift={(data) => {
                    const payload = data ? { ...data } : {}
                    if (!payload.date) {
                      payload.date = format(selectedDate, 'yyyy-MM-dd')
                    }
                    openShiftModal('day', payload)
                  }}
                  canEditShifts={canEditShifts}
                  onMoveShift={handleMoveShift}
                  onDuplicateShift={handleDuplicateShift}
                  isEmployeeUnavailable={isEmployeeUnavailableOnDate}
                  pendingShiftIds={pendingShiftIds}
                />
              ) : scheduleViewType === 'groups' ? (
                <DayGroupsTimeline
                  date={selectedDate}
                  shifts={filteredShifts}
                  employeeGroups={employeeGroups}
                  onEditShift={handleEditShift}
                  onAddShift={(data) => {
                    const payload = data ? { ...data } : {}
                    if (!payload.date) {
                      payload.date = format(selectedDate, 'yyyy-MM-dd')
                    }
                    openShiftModal('day', payload)
                  }}
                  canEditShifts={canEditShifts}
                  onMoveShift={handleMoveShift}
                  onDuplicateShift={handleDuplicateShift}
                  pendingShiftIds={pendingShiftIds}
                />
              ) : scheduleViewType === 'functions' ? (
                <DayFunctionsTimeline
                  date={selectedDate}
                  shifts={filteredShifts}
                  functions={filteredFunctions}
                  onEditShift={handleEditShift}
                  onAddShift={(data) => {
                    const payload = data ? { ...data } : {}
                    if (!payload.date) {
                      payload.date = format(selectedDate, 'yyyy-MM-dd')
                    }
                    openShiftModal('day', payload)
                  }}
                  canEditShifts={canEditShifts}
                  onMoveShift={handleMoveShift}
                  onDuplicateShift={handleDuplicateShift}
                  pendingShiftIds={pendingShiftIds}
                />
              ) : (
                <DayView
                  selectedDate={selectedDate}
                  shifts={filteredShifts}
                  employees={filteredEmployees}
                  onEditShift={handleEditShift}
                  onAddShift={(formData) => {
                    const defaultDate = format(selectedDate, 'yyyy-MM-dd')
                    let payload = formData ? { ...formData } : { date: defaultDate }

                    if (!payload.date) {
                      payload.date = defaultDate
                    }

                    const enrichedPayload = attachSelectedEmployee(payload)
                    openShiftModal('day', enrichedPayload)
                  }}
                  canCreateShifts={canCreateShifts}
                  canEditShifts={canEditShifts}
                />
              )
            )}
          </>
        )}
      </main>

        <ShiftFormModal
          isOpen={showShiftModal}
          onClose={() => setShowShiftModal(false)}
          initialData={shiftInitialData}
          employees={employees}
          employeeGroups={employeeGroups}
          onSubmit={handleShiftFormSubmit}
          onDelete={handleShiftDelete}
          viewType={modalViewType}
          loading={loading}
          canEditShifts={canEditShifts}
          canDeleteShifts={canDeleteShifts}
        />

        <CreateTemplateModal
          isOpen={showCreateTemplateModal}
          onClose={() => setShowCreateTemplateModal(false)}
        />

        <SelectTemplateModal
          isOpen={showSelectTemplateModal}
          onClose={() => setShowSelectTemplateModal(false)}
          mode={selectTemplateMode}
          onApply={(templateId) => {
            // TODO: Implement apply template logic
            console.log('Apply template:', templateId)
          }}
        />

        <ApplyTemplateModal
          isOpen={showApplyTemplateModal}
          onClose={() => setShowApplyTemplateModal(false)}
          currentWeekStart={startOfWeek(currentDate, { weekStartsOn: 0 })}
          onApply={async (data) => {
            try {
              // Format date as YYYY-MM-DD to avoid timezone issues
              // Using local date components ensures the user's selected date is preserved
              const year = data.applyToDate.getFullYear()
              const month = String(data.applyToDate.getMonth() + 1).padStart(2, '0')
              const day = String(data.applyToDate.getDate()).padStart(2, '0')
              const applyToDateStr = `${year}-${month}-${day}`
              
              const response = await fetch(`/api/schedule-templates/${data.templateId}/apply`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  applyToDate: applyToDateStr,
                  existingShiftsOption: data.existingShiftsOption
                })
              })

              if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || 'Failed to apply template')
              }

              const result = await response.json()
              
              Swal.fire({
                icon: 'success',
                title: 'Template Applied',
                text: result.message || `Successfully applied ${result.shiftsCreated} shifts`,
                timer: 2500,
                showConfirmButton: false
              })

              // Refresh shifts after applying
              fetchShifts()
            } catch (error) {
              console.error('Error applying template:', error)
              Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error instanceof Error ? error.message : 'Failed to apply template'
              })
            }
          }}
        />

        <SaveAsTemplateModal
          isOpen={showSaveAsTemplateModal}
          onClose={() => setShowSaveAsTemplateModal(false)}
          shifts={shifts}
          weekStart={startOfWeek(currentDate, { weekStartsOn: 0 })}
          onSave={async (templateName) => {
            const weekStartDate = startOfWeek(currentDate, { weekStartsOn: 0 })
            
            const response = await fetch('/api/schedule-templates/save-from-schedule', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                name: templateName,
                weekStart: weekStartDate.toISOString(),
                shifts: shifts.map(shift => ({
                  id: shift.id,
                  date: typeof shift.date === 'string' ? shift.date : shift.date.toISOString(),
                  startTime: shift.startTime,
                  endTime: shift.endTime,
                  employeeId: shift.employeeId,
                  employeeGroupId: shift.employeeGroupId,
                  functionId: shift.functionId,
                  departmentId: shift.departmentId,
                  note: shift.note,
                  breakPaid: shift.breakPaid
                }))
              })
            })

            if (!response.ok) {
              const errorData = await response.json()
              throw new Error(errorData.error || 'Failed to save template')
            }

            const result = await response.json()
            
            Swal.fire({
              icon: 'success',
              title: t('templates.saved', 'Template Saved'),
              text: t('templates.saved_message', 'Template "{{name}}" saved with {{count}} shifts', { 
                name: templateName, 
                count: result.template.shiftsCount 
              }),
              timer: 2500,
              showConfirmButton: false
            })
          }}
        />

        {/* Create Attendance Modal */}
        <Dialog open={showCreateAttendanceModal} onOpenChange={setShowCreateAttendanceModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{t('create_attendance.title')}</DialogTitle>
              <DialogDescription>{t('create_attendance.description')}</DialogDescription>
            </DialogHeader>
            {attendanceShift && (
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">{t('create_attendance.employee')}:</span>
                    <p className="font-medium">
                      {employees.find(e => e.id === attendanceShift.employeeId)?.firstName}{' '}
                      {employees.find(e => e.id === attendanceShift.employeeId)?.lastName}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500">{t('create_attendance.date')}:</span>
                    <p className="font-medium">
                      {typeof attendanceShift.date === 'string'
                        ? attendanceShift.date.substring(0, 10)
                        : format(attendanceShift.date, 'yyyy-MM-dd')}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{t('create_attendance.punch_in')}</label>
                    <Input
                      type="time"
                      value={attendanceFormData.punchInTime}
                      onChange={(e) => setAttendanceFormData(prev => ({ ...prev, punchInTime: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{t('create_attendance.punch_out')}</label>
                    <Input
                      type="time"
                      value={attendanceFormData.punchOutTime}
                      onChange={(e) => setAttendanceFormData(prev => ({ ...prev, punchOutTime: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateAttendanceModal(false)}>
                {t('create_attendance.cancel')}
              </Button>
              <Button onClick={handleCreateAttendance} disabled={isCreatingAttendance}>
                {isCreatingAttendance ? t('create_attendance.creating') : t('create_attendance.create')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
  )
}