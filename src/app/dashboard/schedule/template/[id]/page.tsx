'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { format, addDays, startOfWeek } from 'date-fns'
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
import TemplateDayView from '@/components/schedule/template/TemplateDayView'
import TemplateShiftModal from '@/components/schedule/template/TemplateShiftModal'

interface TemplateShift {
  id: string
  dayIndex: number
  startTime: string
  endTime: string | null
  employeeId?: string | null
  employeeGroupId?: string | null
  functionId?: string | null
  departmentId?: string | null
  categoryId?: string | null
  note?: string | null
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
}

interface FunctionItem {
  id: string
  name: string
  color?: string | null
  categoryId: string
  employeeGroups?: Array<{ id: string; name: string }>
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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [employeeGroups, setEmployeeGroups] = useState<EmployeeGroup[]>([])
  const [functions, setFunctions] = useState<FunctionItem[]>([])
  const [isEditingName, setIsEditingName] = useState(false)
  const [editedName, setEditedName] = useState('')
  const [showShiftModal, setShowShiftModal] = useState(false)
  const [shiftInitialData, setShiftInitialData] = useState<any>(null)
  const [editingShift, setEditingShift] = useState<TemplateShift | null>(null)
  const [selectedDayIndex, setSelectedDayIndex] = useState(0)
  const [viewType, setViewType] = useState<ViewType>('groups')
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())

  const baseDate = startOfWeek(new Date(), { weekStartsOn: 1 })
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

  useEffect(() => {
    fetchTemplate()
    fetchEmployees()
    fetchEmployeeGroups()
    fetchFunctions()
  }, [fetchTemplate, fetchEmployees, fetchEmployeeGroups, fetchFunctions])

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
    setSelectedDayIndex(dayIndex)
    setEditingShift(null)
    setShiftInitialData({
      date: format(addDays(baseDate, dayIndex), 'yyyy-MM-dd'),
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
      functionId: shift.functionId,
      departmentId: shift.departmentId,
      categoryId: shift.categoryId,
      note: shift.note,
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

    try {
      const response = await fetch(`/api/schedule-templates/${templateId}/shifts/${shiftId}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Failed to delete shift')

      await fetchTemplate()
    } catch (err) {
      console.error('Failed to delete shift:', err)
    }
  }

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
            shifts={template.shifts}
            employees={employees}
            functions={functions}
            onAddShift={handleAddShift}
            onEditShift={handleEditShift}
            onDeleteShift={handleDeleteShift}
          />
        )
      case 'groups':
        return (
          <TemplateGroupGroupedView
            weekDates={weekDates}
            shifts={template.shifts}
            employeeGroups={employeeGroups}
            functions={functions}
            onAddShift={handleAddShift}
            onEditShift={handleEditShift}
            onDeleteShift={handleDeleteShift}
          />
        )
      case 'functions':
        return (
          <TemplateFunctionGroupedView
            weekDates={weekDates}
            shifts={template.shifts}
            employeeGroups={employeeGroups}
            functions={functions}
            onAddShift={handleAddShift}
            onEditShift={handleEditShift}
            onDeleteShift={handleDeleteShift}
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
                {t('common.done', 'Done')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* View Type Tabs - Only show for week templates */}
      {template.length === 'week' && (
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
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
        {template.length === 'week' ? (
          renderWeekView()
        ) : (
          <TemplateDayView
            date={baseDate}
            shifts={template.shifts.filter(s => s.dayIndex === 0)}
            employeeGroups={employeeGroups}
            functions={functions}
            onAddShift={(formData?: any) => handleAddShift(0, formData)}
            onEditShift={handleEditShift}
            onDeleteShift={handleDeleteShift}
          />
        )}
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
