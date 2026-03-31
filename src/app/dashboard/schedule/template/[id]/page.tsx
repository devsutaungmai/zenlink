'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { format, addDays, startOfWeek } from 'date-fns'
import Swal from 'sweetalert2'
import { 
  ArrowLeftIcon, 
  PencilIcon, 
  TrashIcon,
  UsersIcon,
  UserGroupIcon,
  Squares2X2Icon
} from '@heroicons/react/24/outline'
import TemplateEmployeeGroupedView from '@/components/schedule/template/TemplateEmployeeGroupedView'
import TemplateGroupGroupedView from '@/components/schedule/template/TemplateGroupGroupedView'
import TemplateFunctionGroupedView from '@/components/schedule/template/TemplateFunctionGroupedView'
import TemplateDayEmployeeView from '@/components/schedule/template/TemplateDayEmployeeView'
import TemplateDayGroupView from '@/components/schedule/template/TemplateDayGroupView'
import TemplateDayFunctionView from '@/components/schedule/template/TemplateDayFunctionView'
import TemplateShiftModal from '@/components/schedule/template/TemplateShiftModal'

interface TemplateShift {
  id: string
  dayIndex: number
  startTime: string
  endTime: string | null
  employeeId?: string | null
  employeeGroupId?: string | null
  shiftTypeId?: string | null
  functionId?: string | null
  departmentId?: string | null
  categoryId?: string | null
  wage?: number | null
  wageType?: 'HOURLY' | 'PER_SHIFT'
  note?: string | null
  breakStart?: string | null
  breakEnd?: string | null
  breakMinutes?: number
  breakPaid?: boolean
}

interface ScheduleTemplate {
  id: string
  name: string
  length: 'week' | 'day'
  businessId: string
  shifts: TemplateShift[]
  createdAt: string
  updatedAt: string
}

interface Employee {
  id: string
  firstName: string
  lastName: string
  employeeNo?: string | null
  salaryRate?: number | null
  employeeGroupId?: string | null
  departmentId?: string | null
  departments?: Array<{
    departmentId: string
    isPrimary: boolean
    department: {
      id: string
      name: string
    }
  }>
  employeeGroups?: Array<{
    employeeGroupId: string
    isPrimary: boolean
    employeeGroup: {
      id: string
      name: string
    }
  }>
}

interface EmployeeGroup {
  id: string
  name: string
  hourlyWage?: number | null
  wagePerShift?: number | null
  defaultWageType?: 'HOURLY' | 'PER_SHIFT' | null
}

interface FunctionItem {
  id: string
  name: string
  color?: string | null
  categoryId: string
  employeeGroups?: Array<{ id: string; name: string }>
}

interface Department {
  id: string
  name: string
}

interface Category {
  id: string
  name: string
  departmentId?: string | null
  departments?: Array<{
    departmentId?: string
    department?: {
      id: string
      name: string
    }
  }>
}

type ViewType = 'employees' | 'groups' | 'functions'

const VIEW_TABS = [
  { value: 'employees' as ViewType, labelKey: 'view_tabs.employees.label', icon: UsersIcon },
  { value: 'groups' as ViewType, labelKey: 'view_tabs.groups.label', icon: UserGroupIcon },
  { value: 'functions' as ViewType, labelKey: 'view_tabs.functions.label', icon: Squares2X2Icon }
]

export default function TemplateEditorPage() {
  const params = useParams()
  const router = useRouter()
  const { t } = useTranslation('schedule')
  const templateId = params.id as string

  const [template, setTemplate] = useState<ScheduleTemplate | null>(null)
  const [pendingShiftIds, setPendingShiftIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [employeeGroups, setEmployeeGroups] = useState<EmployeeGroup[]>([])
  const [functions, setFunctions] = useState<FunctionItem[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string | null>(null)
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  const [selectedFunctionId, setSelectedFunctionId] = useState<string | null>(null)
  const [isEditingName, setIsEditingName] = useState(false)
  const [editedName, setEditedName] = useState('')
  const [showShiftModal, setShowShiftModal] = useState(false)
  const [shiftInitialData, setShiftInitialData] = useState<any>(null)
  const [editingShift, setEditingShift] = useState<TemplateShift | null>(null)
  const [selectedDayIndex, setSelectedDayIndex] = useState(0)
  const [viewType, setViewType] = useState<ViewType>('groups')
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())

  const baseDate = startOfWeek(new Date(), { weekStartsOn: 0 })
  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(baseDate, i))

  const viewTabs = useMemo(() => 
    VIEW_TABS.map(tab => ({
      ...tab,
      label: t(tab.labelKey, tab.value.charAt(0).toUpperCase() + tab.value.slice(1))
    })), 
    [t]
  )

  const fetchTemplate = useCallback(async () => {
    try {
      const response = await fetch(`/api/schedule-templates/${templateId}`)
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Template not found')
        }
        throw new Error('Failed to fetch template')
      }
      const data = await response.json()
      setTemplate(data)
      setEditedName(data.name)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load template')
    } finally {
      setLoading(false)
    }
  }, [templateId])

  const fetchEmployees = useCallback(async () => {
    try {
      const response = await fetch('/api/employees')
      if (response.ok) {
        const data = await response.json()
        setEmployees(data)
      }
    } catch (err) {
      console.error('Failed to fetch employees:', err)
    }
  }, [])

  const fetchEmployeeGroups = useCallback(async () => {
    try {
      const response = await fetch('/api/employee-groups')
      if (response.ok) {
        const data = await response.json()
        setEmployeeGroups(data)
        // Expand all groups by default
        setExpandedGroups(new Set(data.map((g: EmployeeGroup) => g.id)))
      }
    } catch (err) {
      console.error('Failed to fetch employee groups:', err)
    }
  }, [])

  const fetchFunctions = useCallback(async () => {
    try {
      const response = await fetch('/api/functions')
      if (response.ok) {
        const data = await response.json()
        setFunctions(data)
      }
    } catch (err) {
      console.error('Failed to fetch functions:', err)
    }
  }, [])

  const fetchDepartments = useCallback(async () => {
    try {
      const response = await fetch('/api/departments')
      if (response.ok) {
        const data = await response.json()
        setDepartments(data)
      }
    } catch (err) {
      console.error('Failed to fetch departments:', err)
    }
  }, [])

  const fetchCategories = useCallback(async () => {
    try {
      const response = await fetch('/api/categories')
      if (response.ok) {
        const data = await response.json()
        setCategories(data)
      }
    } catch (err) {
      console.error('Failed to fetch categories:', err)
    }
  }, [])

  const filteredCategories = useMemo(() => {
    if (!selectedDepartmentId) return categories
    return categories.filter((category) => {
      if (category.departments && category.departments.length > 0) {
        return category.departments.some((cd) => cd.department?.id === selectedDepartmentId || cd.departmentId === selectedDepartmentId)
      }
      if (category.departmentId) {
        return category.departmentId === selectedDepartmentId
      }
      return true
    })
  }, [categories, selectedDepartmentId])

  const filteredFunctions = useMemo(() => {
    let nextFunctions = functions

    if (selectedDepartmentId) {
      const filteredCategoryIds = new Set(filteredCategories.map((category) => category.id))
      nextFunctions = nextFunctions.filter((fn) => filteredCategoryIds.has(fn.categoryId))
    }

    if (selectedCategoryId) {
      nextFunctions = nextFunctions.filter((fn) => fn.categoryId === selectedCategoryId)
    }

    return nextFunctions
  }, [functions, filteredCategories, selectedDepartmentId, selectedCategoryId])

  const filteredEmployees = useMemo(() => {
    if (!selectedDepartmentId) return employees
    return employees.filter((employee) => {
      if (employee.departments && employee.departments.length > 0) {
        return employee.departments.some((ed) => ed.departmentId === selectedDepartmentId || ed.department?.id === selectedDepartmentId)
      }
      return employee.departmentId === selectedDepartmentId
    })
  }, [employees, selectedDepartmentId])

  const filteredEmployeeGroups = useMemo(() => {
    if (!selectedDepartmentId) return employeeGroups
    const groupIds = new Set<string>()
    filteredEmployees.forEach((employee) => {
      if (employee.employeeGroups && employee.employeeGroups.length > 0) {
        employee.employeeGroups.forEach((eg) => groupIds.add(eg.employeeGroupId))
      }
      if (employee.employeeGroupId) {
        groupIds.add(employee.employeeGroupId)
      }
    })
    return employeeGroups.filter((group) => groupIds.has(group.id))
  }, [employeeGroups, filteredEmployees, selectedDepartmentId])

  const categoryById = useMemo(() => {
    return new Map(categories.map((category) => [category.id, category]))
  }, [categories])

  const functionById = useMemo(() => {
    return new Map(functions.map((fn) => [fn.id, fn]))
  }, [functions])

  const filteredTemplateShifts = useMemo(() => {
    if (!template) return []

    return template.shifts.filter((shift) => {
      const shiftFunction = shift.functionId ? functionById.get(shift.functionId) : undefined
      const shiftCategoryId = shift.categoryId || shiftFunction?.categoryId || null

      if (selectedDepartmentId) {
        const departmentIds = new Set<string>()

        if (shift.departmentId) {
          departmentIds.add(shift.departmentId)
        }

        if (shiftCategoryId) {
          const category = categoryById.get(shiftCategoryId)
          if (category?.departments && category.departments.length > 0) {
            category.departments.forEach((cd) => {
              if (cd.department?.id) {
                departmentIds.add(cd.department.id)
              }
              if (cd.departmentId) {
                departmentIds.add(cd.departmentId)
              }
            })
          } else if (category?.departmentId) {
            departmentIds.add(category.departmentId)
          }
        }

        if (!departmentIds.has(selectedDepartmentId)) {
          return false
        }
      }

      if (selectedCategoryId && shiftCategoryId !== selectedCategoryId) {
        return false
      }

      if (selectedFunctionId && shift.functionId !== selectedFunctionId) {
        return false
      }

      return true
    })
  }, [template, categoryById, functionById, selectedDepartmentId, selectedCategoryId, selectedFunctionId])

  useEffect(() => {
    fetchTemplate()
    fetchEmployees()
    fetchEmployeeGroups()
    fetchFunctions()
    fetchDepartments()
    fetchCategories()
  }, [fetchTemplate, fetchEmployees, fetchEmployeeGroups, fetchFunctions, fetchDepartments, fetchCategories])

  const handleUpdateName = async () => {
    if (!template || !editedName.trim()) return

    try {
      const response = await fetch(`/api/schedule-templates/${templateId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editedName.trim() })
      })

      if (!response.ok) throw new Error('Failed to update template name')

      const updatedTemplate = await response.json()
      setTemplate(updatedTemplate)
      setIsEditingName(false)
    } catch (err) {
      console.error('Failed to update template name:', err)
    }
  }

  const handleAddShift = (dayIndex: number, formData?: any) => {
    const filterDefaults = {
      ...(selectedDepartmentId ? { departmentId: selectedDepartmentId } : {}),
      ...(selectedCategoryId ? { categoryId: selectedCategoryId } : {}),
      ...(selectedFunctionId ? { functionId: selectedFunctionId } : {})
    }

    setSelectedDayIndex(dayIndex)
    setEditingShift(null)
    setShiftInitialData({
      date: format(addDays(baseDate, dayIndex), 'yyyy-MM-dd'),
      ...filterDefaults,
      ...formData
    })
    setShowShiftModal(true)
  }

  const handleEditShift = (shift: TemplateShift) => {
    setEditingShift(shift)
    setShiftInitialData({
      id: shift.id,
      date: format(addDays(baseDate, shift.dayIndex), 'yyyy-MM-dd'),
      startTime: shift.startTime,
      endTime: shift.endTime,
      employeeId: shift.employeeId,
      employeeGroupId: shift.employeeGroupId,
      shiftTypeId: shift.shiftTypeId,
      functionId: shift.functionId,
      departmentId: shift.departmentId,
      categoryId: shift.categoryId,
      wage: shift.wage,
      wageType: shift.wageType,
      note: shift.note,
      breakStart: shift.breakStart,
      breakEnd: shift.breakEnd,
      breakMinutes: shift.breakMinutes,
      breakPaid: shift.breakPaid
    })
    setShowShiftModal(true)
  }

  const handleSaveShift = async (shiftData: any) => {
    if (!template) return

    try {
      if (editingShift) {
        const response = await fetch(`/api/schedule-templates/${templateId}/shifts/${editingShift.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...shiftData,
            dayIndex: editingShift.dayIndex
          })
        })

        if (!response.ok) throw new Error('Failed to update shift')
      } else {
        const response = await fetch(`/api/schedule-templates/${templateId}/shifts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...shiftData,
            dayIndex: selectedDayIndex
          })
        })

        if (!response.ok) throw new Error('Failed to create shift')
      }

      await fetchTemplate()
      setShowShiftModal(false)
      setEditingShift(null)
      setShiftInitialData(null)
    } catch (err) {
      console.error('Failed to save shift:', err)
    }
  }

  const handleDeleteShift = async (shiftId: string) => {
    if (!template) return

    const result = await Swal.fire({
      icon: 'warning',
      title: t('templates.confirm_delete_shift_title', 'Delete Shift?'),
      text: t('templates.confirm_delete_shift', 'Are you sure you want to delete this shift?'),
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: t('common.delete', 'Delete'),
      cancelButtonText: t('common.cancel', 'Cancel')
    })

    if (!result.isConfirmed) {
      return
    }

    setPendingShiftIds(prev => new Set(prev).add(shiftId))

    try {
      const response = await fetch(`/api/schedule-templates/${templateId}/shifts/${shiftId}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Failed to delete shift')

      await fetchTemplate()

      Swal.fire({
        text: t('toasts.shift_deleted', 'Shift deleted'),
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 2500,
        timerProgressBar: true,
        customClass: { popup: 'swal-toast-wide' }
      })
    } catch (err) {
      console.error('Failed to delete shift:', err)
      Swal.fire({
        text: t('toasts.shift_delete_failed', 'Failed to delete shift'),
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3500,
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
  }

  const handleMoveTemplateShift = useCallback(async (shiftId: string, target: { dayIndex: number; employeeId?: string | null; employeeGroupId?: string | null; functionId?: string | null }) => {
    setPendingShiftIds(prev => new Set(prev).add(shiftId))
    try {
      const response = await fetch(`/api/schedule-templates/${templateId}/shifts/${shiftId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(target)
      })
      if (!response.ok) throw new Error('Failed to move shift')
      await fetchTemplate()
    } catch (err) {
      console.error('Failed to move template shift:', err)
    } finally {
      setPendingShiftIds(prev => {
        const next = new Set(prev)
        next.delete(shiftId)
        return next
      })
    }
  }, [templateId, fetchTemplate])

  const handleDuplicateTemplateShift = useCallback(async (shiftId: string, target: { dayIndex: number; employeeId?: string | null; employeeGroupId?: string | null; functionId?: string | null }) => {
    if (!template) return
    const sourceShift = template.shifts.find(s => s.id === shiftId)
    if (!sourceShift) return

    setPendingShiftIds(prev => new Set(prev).add(shiftId))
    try {
      const response = await fetch(`/api/schedule-templates/${templateId}/shifts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dayIndex: target.dayIndex,
          startTime: sourceShift.startTime,
          endTime: sourceShift.endTime,
          employeeId: target.employeeId !== undefined ? target.employeeId : sourceShift.employeeId,
          employeeGroupId: target.employeeGroupId !== undefined ? target.employeeGroupId : sourceShift.employeeGroupId,
          functionId: target.functionId !== undefined ? target.functionId : sourceShift.functionId,
          departmentId: sourceShift.departmentId,
          categoryId: sourceShift.categoryId,
          shiftTypeId: sourceShift.shiftTypeId,
          wage: sourceShift.wage,
          wageType: sourceShift.wageType,
          note: sourceShift.note,
          breakStart: sourceShift.breakStart,
          breakEnd: sourceShift.breakEnd,
          breakMinutes: sourceShift.breakMinutes,
          breakPaid: sourceShift.breakPaid,
        })
      })
      if (!response.ok) throw new Error('Failed to duplicate shift')
      await fetchTemplate()
    } catch (err) {
      console.error('Failed to duplicate template shift:', err)
    } finally {
      setPendingShiftIds(prev => {
        const next = new Set(prev)
        next.delete(shiftId)
        return next
      })
    }
  }, [templateId, template, fetchTemplate])

  const handleDeleteTemplate = async () => {
    if (!confirm(t('templates.confirm_delete', 'Are you sure you want to delete this template?'))) {
      return
    }

    try {
      const response = await fetch(`/api/schedule-templates/${templateId}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Failed to delete template')

      router.push('/dashboard/schedule')
    } catch (err) {
      console.error('Failed to delete template:', err)
    }
  }

  const handleToggleGroup = (groupId: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev)
      if (newSet.has(groupId)) {
        newSet.delete(groupId)
      } else {
        newSet.add(groupId)
      }
      return newSet
    })
  }

  const renderWeekView = () => {
    if (!template) return null

    switch (viewType) {
      case 'employees':
        return (
          <TemplateEmployeeGroupedView
            weekDates={weekDates}
            shifts={filteredTemplateShifts}
            employees={filteredEmployees}
            functions={filteredFunctions}
            onAddShift={handleAddShift}
            onEditShift={handleEditShift}
            onDeleteShift={handleDeleteShift}
            onMoveShift={handleMoveTemplateShift}
            onDuplicateShift={handleDuplicateTemplateShift}
            pendingShiftIds={pendingShiftIds}
          />
        )
      case 'groups':
        return (
          <TemplateGroupGroupedView
            weekDates={weekDates}
            shifts={filteredTemplateShifts}
            employees={filteredEmployees}
            employeeGroups={filteredEmployeeGroups}
            functions={filteredFunctions}
            onAddShift={handleAddShift}
            onEditShift={handleEditShift}
            onDeleteShift={handleDeleteShift}
            onMoveShift={handleMoveTemplateShift}
            onDuplicateShift={handleDuplicateTemplateShift}
            pendingShiftIds={pendingShiftIds}
          />
        )
      case 'functions':
        return (
          <TemplateFunctionGroupedView
            weekDates={weekDates}
            shifts={filteredTemplateShifts}
            employees={filteredEmployees}
            employeeGroups={filteredEmployeeGroups}
            functions={filteredFunctions}
            onAddShift={handleAddShift}
            onEditShift={handleEditShift}
            onDeleteShift={handleDeleteShift}
            onMoveShift={handleMoveTemplateShift}
            onDuplicateShift={handleDuplicateTemplateShift}
            pendingShiftIds={pendingShiftIds}
          />
        )
      default:
        return null
    }
  }

  const renderDayView = () => {
    if (!template) return null

    const dayShifts = filteredTemplateShifts.filter(s => s.dayIndex === 0)

    switch (viewType) {
      case 'employees':
        return (
          <TemplateDayEmployeeView
            shifts={dayShifts}
            employees={filteredEmployees}
            functions={filteredFunctions}
            onAddShift={handleAddShift}
            onEditShift={handleEditShift}
            onDeleteShift={handleDeleteShift}
            pendingShiftIds={pendingShiftIds}
          />
        )
      case 'groups':
        return (
          <TemplateDayGroupView
            shifts={dayShifts}
            employeeGroups={filteredEmployeeGroups}
            functions={filteredFunctions}
            onAddShift={handleAddShift}
            onEditShift={handleEditShift}
            onDeleteShift={handleDeleteShift}
            pendingShiftIds={pendingShiftIds}
          />
        )
      case 'functions':
        return (
          <TemplateDayFunctionView
            shifts={dayShifts}
            employeeGroups={filteredEmployeeGroups}
            functions={filteredFunctions}
            onAddShift={handleAddShift}
            onEditShift={handleEditShift}
            onDeleteShift={handleDeleteShift}
            pendingShiftIds={pendingShiftIds}
          />
        )
      default:
        return null
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#31BCFF]"></div>
      </div>
    )
  }

  if (error || !template) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {error || t('templates.not_found', 'Template not found')}
          </h2>
          <button
            onClick={() => router.push('/dashboard/schedule')}
            className="text-[#31BCFF] hover:underline"
          >
            {t('common.go_back', 'Go back to schedule')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/dashboard/schedule')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeftIcon className="w-5 h-5 text-gray-600" />
              </button>

              {isEditingName ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    className="px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#31BCFF] focus:border-[#31BCFF] outline-none"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleUpdateName()
                      if (e.key === 'Escape') {
                        setEditedName(template.name)
                        setIsEditingName(false)
                      }
                    }}
                  />
                  <button
                    onClick={handleUpdateName}
                    className="px-3 py-1.5 bg-[#31BCFF] text-white rounded-lg text-sm font-medium hover:bg-[#28a8e6]"
                  >
                    {t('common.save', 'Save')}
                  </button>
                  <button
                    onClick={() => {
                      setEditedName(template.name)
                      setIsEditingName(false)
                    }}
                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50"
                  >
                    {t('common.cancel', 'Cancel')}
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-semibold text-gray-900">{template.name}</h1>
                  <button
                    onClick={() => setIsEditingName(true)}
                    className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <PencilIcon className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
              )}

              <span className="px-2.5 py-1 bg-gray-100 text-gray-600 text-sm rounded-full">
                {template.length === 'week' 
                  ? t('templates.length_week', 'Week') 
                  : t('templates.length_day', 'Day')}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleDeleteTemplate}
                className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <TrashIcon className="w-4 h-4" />
                <span className="hidden sm:inline">{t('common.delete', 'Delete')}</span>
              </button>
              <button
                onClick={() => router.push('/dashboard/schedule')}
                className="px-4 py-2 bg-[#31BCFF] text-white rounded-lg font-medium hover:bg-[#28a8e6] transition-colors"
              >
                {t('common.go_back', 'Go Back')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* View Type Tabs */}
      <div className="bg-white border-b px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-3 py-3">
          {/* Mobile tabs */}
          <div className="flex md:hidden gap-2" role="tablist">
            {viewTabs.map(tab => {
              const isActive = viewType === tab.value
              return (
                <button
                  key={`mobile-${tab.value}`}
                  onClick={() => setViewType(tab.value)}
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

          {/* Desktop tabs */}
          <div className="hidden md:flex gap-2" role="tablist">
            {viewTabs.map(tab => {
              const Icon = tab.icon
              const isActive = viewType === tab.value
              return (
                <button
                  key={`desktop-${tab.value}`}
                  onClick={() => setViewType(tab.value)}
                  role="tab"
                  aria-selected={isActive}
                  className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#31BCFF] focus-visible:ring-offset-2 ${
                    isActive
                      ? 'border-[#31BCFF] bg-[#31BCFF]/10 text-[#0B5CAB]'
                      : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              )
            })}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <select
              value={selectedDepartmentId || ''}
              onChange={(e) => {
                const value = e.target.value || null
                setSelectedDepartmentId(value)
                setSelectedCategoryId(null)
                setSelectedFunctionId(null)
              }}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#31BCFF]"
            >
              <option value="">{t('shift_form.department', 'Department')}</option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>{department.name}</option>
              ))}
            </select>

            <select
              value={selectedCategoryId || ''}
              onChange={(e) => {
                const value = e.target.value || null
                setSelectedCategoryId(value)
                setSelectedFunctionId(null)
              }}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#31BCFF] disabled:bg-gray-50"
              disabled={filteredCategories.length === 0}
            >
              <option value="">{t('shift_form.category', 'Category')}</option>
              {filteredCategories.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>

            <select
              value={selectedFunctionId || ''}
              onChange={(e) => setSelectedFunctionId(e.target.value || null)}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#31BCFF] disabled:bg-gray-50"
              disabled={filteredFunctions.length === 0}
            >
              <option value="">{t('templates.function', 'Function')}</option>
              {filteredFunctions.map((fn) => (
                <option key={fn.id} value={fn.id}>{fn.name}</option>
              ))}
            </select>

            <button
              onClick={() => {
                setSelectedDepartmentId(null)
                setSelectedCategoryId(null)
                setSelectedFunctionId(null)
              }}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              disabled={!selectedDepartmentId && !selectedCategoryId && !selectedFunctionId}
            >
              {t('common.clear', 'Clear')}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
        {template.length === 'week' ? renderWeekView() : renderDayView()}
      </main>

      <TemplateShiftModal
        isOpen={showShiftModal}
        onClose={() => {
          setShowShiftModal(false)
          setEditingShift(null)
          setShiftInitialData(null)
        }}
        onSave={handleSaveShift}
        initialData={shiftInitialData}
        employees={employees}
        employeeGroups={employeeGroups}
        functions={functions}
      />
    </div>
  )
}
