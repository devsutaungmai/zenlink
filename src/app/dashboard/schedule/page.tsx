'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { format, addDays, addWeeks, subWeeks, startOfWeek, endOfWeek, addMonths, subMonths, startOfMonth, endOfMonth } from 'date-fns'
import { Employee, EmployeeGroup } from '@prisma/client'
import { ClockIcon, UsersIcon, UserGroupIcon, Squares2X2Icon } from '@heroicons/react/24/outline'
import { useTranslation } from 'react-i18next'

import Swal from 'sweetalert2'
import ScheduleHeader from '@/components/schedule/ScheduleHeader'
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
  const [shiftInitialData, setShiftInitialData] = useState<any>(null)
  const [modalViewType, setModalViewType] = useState<'week' | 'day' | 'month'>('week')

  const [currentDate, setCurrentDate] = useState(new Date())
  const [employees, setEmployees] = useState<Employee[]>([])
  const [employeeGroups, setEmployeeGroups] = useState<EmployeeGroup[]>([])
  const [shifts, setShifts] = useState<ShiftWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'week' | 'two-week' | 'day' | 'month'>('week')
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [scheduleViewType, setScheduleViewType] = useState<'time' | 'employees' | 'groups' | 'functions'>('employees')
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())

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
    // Only fetch shifts when date or employee changes
    fetchShifts()
  }, [currentDate, selectedEmployeeId, startDate, endDate])

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
        fetchShiftTypes()
      ])
    }
    fetchStaticData()
  }, [])

  const fetchEmployees = async () => {
    try {
      const res = await fetch('/api/employees', {
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

  const fetchShifts = async () => {
    try {
      setLoading(true)
      const start = format(startDate, 'yyyy-MM-dd')
      const end = format(endDate, 'yyyy-MM-dd')
      
      let url = `/api/shifts?startDate=${start}&endDate=${end}`
      if (selectedEmployeeId) {
        url += `&employeeId=${selectedEmployeeId}`
      }
      
      const res = await fetch(url, {
        headers: { 'Cache-Control': 'max-age=60' }
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
  }

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
    const payload = formData ? { ...formData } : null

    if (payload?.employeeId && payload?.date) {
      if (shouldPreventShiftCreation(payload.employeeId, payload.date)) {
        return
      }
    }

    setModalViewType(view)
    setShiftInitialData(payload ?? null)
    setShowShiftModal(true)
  }, [shouldPreventShiftCreation])

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

    // Labor Law Validation
    if (formData.employeeId && formData.startTime && formData.endTime) {
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

    setLoading(true);
    const successToastKey = formData.id ? 'toasts.shift_updated' : 'toasts.shift_created'
    const failureToastKey = formData.id ? 'toasts.shift_update_failed' : 'toasts.shift_create_failed'
    try {
      const method = formData.id ? 'PUT' : 'POST';
      const url = formData.id 
        ? `/api/shifts/${formData.id}` 
        : '/api/shifts';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        await fetchShifts();
        setShowShiftModal(false);
        
        Swal.fire({
          text: t(successToastKey),
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
    } finally {
      setLoading(false)
    }
  };

  const handleShiftDelete = async (shiftId: string) => {
    if (!shiftId) return

    setLoading(true)
    try {
      const res = await fetch(`/api/shifts/${shiftId}`, {
        method: 'DELETE'
      })

      if (!res.ok) {
        throw new Error(t('toasts.shift_delete_failed'))
      }

      await fetchShifts()
      setShowShiftModal(false)

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
    } finally {
      setLoading(false)
    }
  }

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

  const isWeekBasedView = viewMode === 'week' || viewMode === 'two-week'

  const renderWeekScopedContent = (dates: Date[]) => {
    if (scheduleViewType === 'time') {
      return (
        <WeekView
          weekDates={dates}
          shifts={filteredShifts}
          employees={employees}
          employeeGroups={employeeGroups}
          functions={functions}
          categories={categories}
          scheduleViewType={scheduleViewType}
          onEditShift={handleEditShift}
          isEmployeeUnavailable={isEmployeeUnavailableOnDate}
          onUnavailableClick={notifyEmployeeUnavailable}
          onAddShift={(formData) => {
            const payload = attachSelectedEmployee(formData ?? null)
            openShiftModal('week', payload)
          }}
        />
      )
    }

    if (scheduleViewType === 'employees') {
      return (
        <EmployeeGroupedView
          weekDates={dates}
          shifts={filteredShifts}
          employees={employees}
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
          isEmployeeUnavailable={isEmployeeUnavailableOnDate}
          onUnavailableClick={notifyEmployeeUnavailable}
          onAddShift={(data) => {
            openShiftModal('week', data ?? null)
          }}
        />
      )
    }

    if (scheduleViewType === 'groups') {
      return (
        <GroupGroupedView
          weekDates={dates}
          shifts={filteredShifts}
          employees={employees}
          employeeGroups={employeeGroups}
          onEditShift={handleEditShift}
          selectedEmployeeId={selectedEmployeeId}
          isEmployeeUnavailable={isEmployeeUnavailableOnDate}
          onUnavailableClick={notifyEmployeeUnavailable}
          onAddShift={(data) => {
            const payload = attachSelectedEmployee(data ?? null)
            openShiftModal('week', payload)
          }}
        />
      )
    }

    if (scheduleViewType === 'functions') {
      return (
        <FunctionGroupedView
          weekDates={dates}
          shifts={filteredShifts}
          employees={employees}
          functions={functions}
          onEditShift={handleEditShift}
          selectedEmployeeId={selectedEmployeeId}
          isEmployeeUnavailable={isEmployeeUnavailableOnDate}
          onUnavailableClick={notifyEmployeeUnavailable}
          onAddShift={(data) => {
            const payload = attachSelectedEmployee(data ?? null)
            openShiftModal('week', payload)
          }}
        />
      )
    }

    return (
      <WeekView
        weekDates={dates}
        shifts={filteredShifts}
        employees={employees}
        employeeGroups={employeeGroups}
        functions={functions}
        categories={categories}
        scheduleViewType={scheduleViewType}
        onEditShift={handleEditShift}
        isEmployeeUnavailable={isEmployeeUnavailableOnDate}
        onUnavailableClick={notifyEmployeeUnavailable}
        onAddShift={(formData) => {
          const payload = attachSelectedEmployee(formData ?? null)
          openShiftModal('week', payload)
        }}
      />
    )
  }

  const formatRangeLabel = (dates: Date[]) => {
    if (!dates || dates.length === 0) return ''
    return `${format(dates[0], 'MMM d')} - ${format(dates[dates.length - 1], 'MMM d')}`
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
          employees={employees}
          selectedEmployeeId={selectedEmployeeId}
          onEmployeeChange={handleEmployeeChange}
          departments={departments}
          employeeGroups={employeeGroups}
          shiftTypes={shiftTypes}
          categories={categories}
          functions={functions}
          selectedDepartmentId={selectedDepartmentId}
          selectedCategoryId={selectedCategoryId}
          selectedFunctionId={selectedFunctionId}
          onDepartmentChange={setSelectedDepartmentId}
          onCategoryChange={setSelectedCategoryId}
          onFunctionChange={setSelectedFunctionId}
          filters={filters}
          onFiltersChange={setFilters}
          scheduleViewType={scheduleViewType}
          onScheduleViewTypeChange={setScheduleViewType}
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
                employees={employees}
                onEditShift={handleEditShift}
                isEmployeeUnavailable={isEmployeeUnavailableOnDate}
                onUnavailableClick={notifyEmployeeUnavailable}
                onAddShift={(data) => {
                  const payload = attachSelectedEmployee(data ?? null)
                  openShiftModal('month', payload)
                }}
              />
            ) : (
              scheduleViewType === 'time' ? (
                <DayView
                  selectedDate={selectedDate}
                  shifts={filteredShifts}
                  employees={employees}
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
                />
              ) : scheduleViewType === 'employees' ? (
                <DayEmployeeTimeline
                  date={selectedDate}
                  shifts={filteredShifts}
                  employees={employees}
                  onEditShift={handleEditShift}
                  onAddShift={(data) => {
                    const payload = data ? { ...data } : {}
                    if (!payload.date) {
                      payload.date = format(selectedDate, 'yyyy-MM-dd')
                    }
                    openShiftModal('day', payload)
                  }}
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
                />
              ) : scheduleViewType === 'functions' ? (
                <DayFunctionsTimeline
                  date={selectedDate}
                  shifts={filteredShifts}
                  functions={functions}
                  onEditShift={handleEditShift}
                  onAddShift={(data) => {
                    const payload = data ? { ...data } : {}
                    if (!payload.date) {
                      payload.date = format(selectedDate, 'yyyy-MM-dd')
                    }
                    openShiftModal('day', payload)
                  }}
                />
              ) : (
                <DayView
                  selectedDate={selectedDate}
                  shifts={filteredShifts}
                  employees={employees}
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
        />
      </div>
  )
}