'use client'

import React from 'react'
import { useTranslation } from 'react-i18next'
import { format } from 'date-fns'
import Swal from 'sweetalert2'
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline'
import { Copy, ArrowRightLeft } from 'lucide-react'
import { useTemplateDragDrop } from '@/shared/hooks/useTemplateDragDrop'

interface TemplateShift {
  id: string
  dayIndex: number
  startTime: string
  endTime: string | null
  employeeId?: string | null
  employeeGroupId?: string | null
  functionId?: string | null
  departmentId?: string | null
  note?: string | null
  breakMinutes?: number
  breakPaid?: boolean
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
  employeeGroups?: Array<{ id: string; name: string }>
  category?: {
    department?: {
      id: string
      name: string
    }
    departments?: Array<{
      departmentId?: string
      department?: {
        id: string
        name: string
      }
    }>
  }
}

interface TemplateGroupGroupedViewProps {
  weekDates: Date[]
  shifts: TemplateShift[]
  employees: Employee[]
  employeeGroups: EmployeeGroup[]
  functions: FunctionItem[]
  onAddShift: (dayIndex: number, formData?: any) => void
  onEditShift: (shift: TemplateShift) => void
  onDeleteShift: (shiftId: string) => void
  onMoveShift: (shiftId: string, target: { dayIndex: number; employeeId?: string | null; employeeGroupId?: string | null; functionId?: string | null }) => Promise<void>
  onDuplicateShift: (shiftId: string, target: { dayIndex: number; employeeId?: string | null; employeeGroupId?: string | null; functionId?: string | null }) => Promise<void>
  pendingShiftIds?: Set<string>
}

export default function TemplateGroupGroupedView({
  weekDates,
  shifts,
  employees,
  employeeGroups,
  functions,
  onAddShift,
  onEditShift,
  onDeleteShift,
  onMoveShift,
  onDuplicateShift,
  pendingShiftIds = new Set()
}: TemplateGroupGroupedViewProps) {
  const { t } = useTranslation('schedule')

  const functionById = React.useMemo(
    () => new Map(functions.map((fn) => [fn.id, fn])),
    [functions]
  )

  const employeeBelongsToGroup = React.useCallback((employee: Employee, groupId: string): boolean => {
    if (employee.employeeGroups && employee.employeeGroups.length > 0) {
      return employee.employeeGroups.some((eg) => eg.employeeGroupId === groupId)
    }
    return employee.employeeGroupId === groupId
  }, [])

  const getEmployeeDeptIds = React.useCallback((employeeId: string): string[] => {
    const employee = employees.find((emp) => emp.id === employeeId)
    if (!employee) return []

    const departmentIds = new Set<string>()
    if (employee.departments && employee.departments.length > 0) {
      employee.departments.forEach((department) => departmentIds.add(department.departmentId))
    }
    if (employee.departmentId) {
      departmentIds.add(employee.departmentId)
    }

    return Array.from(departmentIds)
  }, [employees])

  const getGroupDeptIds = React.useCallback((groupId: string): string[] => {
    const departmentIds = new Set<string>()
    employees.forEach((employee) => {
      if (!employeeBelongsToGroup(employee, groupId)) return
      if (employee.departments && employee.departments.length > 0) {
        employee.departments.forEach((department) => departmentIds.add(department.departmentId))
      }
      if (employee.departmentId) {
        departmentIds.add(employee.departmentId)
      }
    })
    return Array.from(departmentIds)
  }, [employees, employeeBelongsToGroup])

  const getFunctionDeptIds = React.useCallback((functionId?: string | null): string[] => {
    if (!functionId) return []
    const fn = functionById.get(functionId)
    if (!fn?.category) return []

    const departmentIds = new Set<string>()
    if (fn.category.departments && fn.category.departments.length > 0) {
      fn.category.departments.forEach((categoryDepartment) => {
        if (categoryDepartment.department?.id) {
          departmentIds.add(categoryDepartment.department.id)
        }
        if (categoryDepartment.departmentId) {
          departmentIds.add(categoryDepartment.departmentId)
        }
      })
    }
    if (fn.category.department?.id) {
      departmentIds.add(fn.category.department.id)
    }

    return Array.from(departmentIds)
  }, [functionById])

  const getFunctionLinkedGroupIds = React.useCallback((functionId?: string | null): string[] => {
    if (!functionId) return []
    const fn = functionById.get(functionId)
    if (!fn?.employeeGroups || fn.employeeGroups.length === 0) return []
    return fn.employeeGroups.map((group) => group.id)
  }, [functionById])

  const getShiftDepartmentIds = React.useCallback((shift?: TemplateShift): string[] => {
    if (!shift) return []
    const departmentIds = new Set<string>()

    if (shift.employeeId) {
      getEmployeeDeptIds(shift.employeeId).forEach((departmentId) => departmentIds.add(departmentId))
    }
    if (shift.departmentId) {
      departmentIds.add(shift.departmentId)
    }
    getFunctionDeptIds(shift.functionId).forEach((departmentId) => departmentIds.add(departmentId))

    return Array.from(departmentIds)
  }, [getEmployeeDeptIds, getFunctionDeptIds])

  const isDropDisabled = React.useCallback((
    targetRowId: string,
    _targetDayIndex: number,
    rowType: 'employee' | 'group' | 'function' | 'openEmployee' | 'openGroup' | 'openFunction',
    shift?: TemplateShift
  ) => {
    if (!shift || rowType !== 'group') return false

    const targetDepartmentIds = getGroupDeptIds(targetRowId)
    const sourceDepartmentIds = getShiftDepartmentIds(shift)

    if (
      targetDepartmentIds.length > 0 &&
      sourceDepartmentIds.length > 0 &&
      !targetDepartmentIds.some((departmentId) => sourceDepartmentIds.includes(departmentId))
    ) {
      return true
    }

    const linkedGroupIds = getFunctionLinkedGroupIds(shift.functionId)
    if (linkedGroupIds.length > 0 && !linkedGroupIds.includes(targetRowId)) {
      return true
    }

    return false
  }, [getGroupDeptIds, getShiftDepartmentIds, getFunctionLinkedGroupIds])

  const onDropRejected = React.useCallback((
    targetRowId: string,
    _targetDayIndex: number,
    rowType: 'employee' | 'group' | 'function' | 'openEmployee' | 'openGroup' | 'openFunction',
    shift?: TemplateShift
  ) => {
    if (!shift || rowType !== 'group') return

    const targetDepartmentIds = getGroupDeptIds(targetRowId)
    const sourceDepartmentIds = getShiftDepartmentIds(shift)

    if (
      targetDepartmentIds.length > 0 &&
      sourceDepartmentIds.length > 0 &&
      !targetDepartmentIds.some((departmentId) => sourceDepartmentIds.includes(departmentId))
    ) {
      Swal.fire({
        icon: 'error',
        title: t('drag_drop.cross_dept_title', 'Cannot Move Shift'),
        text: t('drag_drop.cross_dept_message', 'Cannot move shift to a group in a different department.'),
        confirmButtonColor: '#31BCFF'
      })
      return
    }

    const linkedGroupIds = getFunctionLinkedGroupIds(shift.functionId)
    if (linkedGroupIds.length > 0 && !linkedGroupIds.includes(targetRowId)) {
      Swal.fire({
        icon: 'error',
        title: t('drag_drop.group_mismatch_title', 'Cannot Move Shift'),
        text: t('drag_drop.group_mismatch_message', 'Cannot move shift to a group outside the function\'s linked groups.'),
        confirmButtonColor: '#31BCFF'
      })
    }
  }, [getGroupDeptIds, getShiftDepartmentIds, getFunctionLinkedGroupIds, t])

  const {
    dragOverCell,
    copyMode,
    toggleCopyMode,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleDragEnd
  } = useTemplateDragDrop({ onMoveShift, onDuplicateShift, isDropDisabled, onDropRejected })
  
  const getGroupShifts = (groupId: string, dayIndex: number) => {
    return shifts.filter(shift => shift.employeeGroupId === groupId && shift.dayIndex === dayIndex)
  }

  const getGroupTotalHours = (groupId: string) => {
    const groupShifts = shifts.filter(s => s.employeeGroupId === groupId)
    
    let totalMinutes = 0
    
    groupShifts.forEach(shift => {
      if (shift.endTime) {
        const [startHour, startMin] = shift.startTime.split(':').map(Number)
        const [endHour, endMin] = shift.endTime.split(':').map(Number)
        const startMinutes = startHour * 60 + startMin
        let endMinutes = endHour * 60 + endMin
        
        if (endMinutes < startMinutes) {
          endMinutes += 24 * 60
        }
        
        totalMinutes += (endMinutes - startMinutes)
      }
    })
    
    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60
    return `${hours}h ${minutes}m`
  }

  const getFunctionName = (functionId: string | null | undefined) => {
    if (!functionId) return null
    const fn = functions.find(f => f.id === functionId)
    return fn?.name
  }

  const getFunctionColor = (functionId: string | null | undefined) => {
    if (!functionId) return '#31BCFF'
    const fn = functions.find(f => f.id === functionId)
    return fn?.color || '#31BCFF'
  }

  const dayCount = Math.max(weekDates.length, 1)
  const mobileGridStyle: React.CSSProperties = {
    gridTemplateColumns: `repeat(${dayCount}, minmax(0, 1fr))`
  }
  const desktopGridStyle: React.CSSProperties = {
    gridTemplateColumns: `minmax(160px, 200px) repeat(${dayCount}, minmax(0, 1fr))`
  }

  return (
    <div className="overflow-hidden bg-white rounded-xl border border-gray-200">
      {/* Mobile View - Grid Layout */}
      <div className="md:hidden bg-gray-50">
        {/* Week Days Header */}
        <div className="bg-white sticky top-0 z-10 border-b shadow-sm overflow-x-auto">
          <div className="grid gap-0" style={mobileGridStyle}>
            {weekDates.map((date, i) => (
              <div key={i} className="text-center py-2 border-r last:border-r-0">
                <div className="text-[10px] font-medium text-gray-700">
                  {format(date, 'EEE')}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Group Rows */}
        <div className="p-3 space-y-3">
          {employeeGroups.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p className="text-sm">{t('templates.no_groups_found', 'No groups found')}</p>
            </div>
          ) : (
            employeeGroups.map((group) => {
              const groupShiftsCount = shifts.filter(s => s.employeeGroupId === group.id).length
              
              return (
                <div key={group.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                  {/* Group Header */}
                  <div className="flex items-center justify-between px-3 py-2.5 border-b bg-gray-50">
                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-[#31BCFF] flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                        {group.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-gray-900 truncate">
                          {group.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {getGroupTotalHours(group.id)} / {t('templates.shifts_count', { count: groupShiftsCount, defaultValue: groupShiftsCount === 1 ? '1 shift' : `${groupShiftsCount} shifts` })}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Day Grid */}
                  <div className="overflow-x-auto">
                    <div className="grid gap-0 p-3" style={mobileGridStyle}>
                      {weekDates.map((date, dayIndex) => {
                        const dayShifts = getGroupShifts(group.id, dayIndex)

                        return (
                          <div key={dayIndex} className="px-1">
                            <div className="min-h-[60px]">
                              {dayShifts.length === 0 ? (
                                <button
                                  onClick={() => onAddShift(dayIndex, { employeeGroupId: group.id })}
                                  className="w-full h-full min-h-[60px] border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-1 transition-all active:scale-95 border-gray-300 hover:border-[#31BCFF] hover:bg-blue-50"
                                >
                                  <PlusIcon className="w-6 h-6 text-[#31BCFF]" />
                                </button>
                              ) : (
                                <div className="w-full h-full flex flex-col gap-1">
                                  {dayShifts.map(shift => {
                                    const isPending = pendingShiftIds.has(shift.id)

                                    return (
                                      <button
                                        key={shift.id}
                                        onClick={() => !isPending && onEditShift(shift)}
                                        className={`w-full rounded-xl text-white font-medium flex flex-col items-center justify-center gap-0.5 py-2 transition-all active:scale-95 ${isPending ? 'opacity-50 animate-pulse pointer-events-none' : ''}`}
                                        style={{ backgroundColor: getFunctionColor(shift.functionId) }}
                                      >
                                        <span className="text-xs leading-tight">
                                          {shift.startTime.substring(0, 5)}
                                        </span>
                                        {shift.endTime && (
                                          <span className="text-xs leading-tight">
                                            {shift.endTime.substring(0, 5)}
                                          </span>
                                        )}
                                      </button>
                                    )
                                  })}
                                  <button
                                    onClick={() => onAddShift(dayIndex, { employeeGroupId: group.id })}
                                    className="w-full text-xs text-center text-[#31BCFF] font-semibold py-1 px-2 bg-blue-50 hover:bg-blue-100 rounded transition-all active:scale-95"
                                  >
                                    + {t('templates.add', 'Add')}
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Desktop View - Original Grid Layout */}
      <div className="hidden md:block">
        <div>
          {/* Header Row */}
          <div className="grid border-b bg-gray-50 sticky top-0" style={desktopGridStyle}>
            <div className="p-3 font-medium text-sm border-r">{t('templates.group', 'Group')}</div>
            {weekDates.map((date, i) => (
              <div key={i} className="p-2 text-center border-r">
                <div className="text-xs font-semibold text-gray-900">
                  {format(date, 'EEEE')}
                </div>
              </div>
            ))}
          </div>

          {/* Open Shifts Row */}
          {(() => {
            const openShifts = shifts.filter(s => !s.employeeGroupId)
            return (
              <div className="grid border-b bg-emerald-50/50" style={desktopGridStyle}>
                <div className="p-3 border-r">
                  <div className="font-medium text-sm text-emerald-700 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                    {t('week_view.open_shifts', 'Open Shifts')}
                  </div>
                  <div className="text-xs text-emerald-600 mt-0.5">
                    {openShifts.length} {t('week_view.available', 'available')}
                  </div>
                </div>
                {weekDates.map((date, dayIndex) => {
                  const dayOpenShifts = openShifts.filter(s => s.dayIndex === dayIndex)
                  const openCellId = `open-${dayIndex}`
                  const isOpenDropTarget = dragOverCell === openCellId

                  return (
                    <div
                      key={dayIndex}
                      className={`border-r p-2 relative min-h-[80px] group transition-colors ${
                        isOpenDropTarget ? 'bg-emerald-100 ring-2 ring-inset ring-emerald-400' : ''
                      }`}
                      onDragOver={(e) => handleDragOver(e, openCellId, 'open', dayIndex, 'openGroup')}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, 'open', dayIndex, 'openGroup')}
                    >
                      {dayOpenShifts.map(shift => (
                        <div
                          key={shift.id}
                          draggable={!pendingShiftIds.has(shift.id)}
                          onDragStart={(e) => handleDragStart(e, shift, 'open', shift.dayIndex)}
                          onDragEnd={handleDragEnd}
                          onClick={() => !pendingShiftIds.has(shift.id) && onEditShift(shift)}
                          className={`mb-1 cursor-grab active:cursor-grabbing group/shift relative ${pendingShiftIds.has(shift.id) ? 'opacity-50 animate-pulse pointer-events-none' : ''}`}
                        >
                          <div className="rounded p-2 text-xs border-2 border-dashed border-emerald-400 bg-emerald-100">
                            <div className="font-medium text-emerald-800 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              {t('week_view.open', 'Open')}
                            </div>
                            <div className="mt-0.5 text-emerald-700">
                              {getFunctionName(shift.functionId) || t('templates.no_function', 'No Function')}
                            </div>
                            <div className="mt-0.5 text-emerald-600">
                              {shift.startTime} - {shift.endTime || t('templates.open', 'Open')}
                            </div>
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); onDeleteShift(shift.id) }}
                            className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover/shift:opacity-100 transition-opacity shadow-sm"
                          >
                            <TrashIcon className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() => onAddShift(dayIndex)}
                        className="absolute bottom-1 right-1 w-6 h-6 border bg-white rounded-full flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 shadow-sm border-emerald-400 hover:bg-emerald-500 hover:text-white text-emerald-500"
                      >
                        <PlusIcon className="w-3 h-3" />
                      </button>
                    </div>
                  )
                })}
              </div>
            )
          })()}

          {/* Group Rows */}
          {employeeGroups.map(group => {
            const groupShiftsCount = shifts.filter(s => s.employeeGroupId === group.id).length
            
            return (
              <div key={group.id} className="grid border-b hover:bg-gray-50" style={desktopGridStyle}>
                <div className="p-3 border-r">
                  <div className="font-medium text-sm text-gray-900">
                    {group.name}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {getGroupTotalHours(group.id)} / {t('templates.shifts_count', { count: groupShiftsCount, defaultValue: groupShiftsCount === 1 ? '1 shift' : `${groupShiftsCount} shifts` })}
                  </div>
                </div>
                
                {weekDates.map((date, dateIndex) => {
                  const dayShifts = getGroupShifts(group.id, dateIndex)
                  const cellId = `grp-${group.id}-${dateIndex}`
                  const isDropTarget = dragOverCell === cellId
                  
                  return (
                    <div
                      key={dateIndex}
                      className={`border-r p-2 relative min-h-[80px] group transition-colors ${
                        isDropTarget ? 'bg-blue-50 ring-2 ring-inset ring-[#31BCFF]' : ''
                      }`}
                      onDragOver={(e) => handleDragOver(e, cellId, group.id, dateIndex, 'group')}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, group.id, dateIndex, 'group')}
                    >
                      {dayShifts.length === 0 ? (
                        <button
                          onClick={() => onAddShift(dateIndex, { employeeGroupId: group.id })}
                          className={`w-full h-full min-h-[76px] border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-1 transition-all ${
                            isDropTarget ? 'opacity-100 border-[#31BCFF] bg-blue-50' : 'opacity-0 group-hover:opacity-100'
                          } border-gray-300 hover:border-[#31BCFF] hover:bg-blue-50`}
                        >
                          <PlusIcon className="w-5 h-5 text-[#31BCFF]" />
                          <span className="text-xs text-gray-500">{t('templates.add_shift', 'Add Shift')}</span>
                        </button>
                      ) : (
                        <>
                          {dayShifts.map(shift => {
                            const functionName = getFunctionName(shift.functionId)
                            const shiftColor = getFunctionColor(shift.functionId)
                            
                            return (
                              <div
                                key={shift.id}
                                draggable={!pendingShiftIds.has(shift.id)}
                                onDragStart={(e) => handleDragStart(e, shift, group.id, shift.dayIndex)}
                                onDragEnd={handleDragEnd}
                                className={`mb-1 cursor-grab active:cursor-grabbing group/shift relative ${pendingShiftIds.has(shift.id) ? 'opacity-50 animate-pulse pointer-events-none' : ''}`}
                              >
                                <div 
                                  onClick={() => !pendingShiftIds.has(shift.id) && onEditShift(shift)}
                                  className="rounded p-2 text-xs text-white font-medium"
                                  style={{ backgroundColor: shiftColor }}
                                >
                                  <div className="font-medium">
                                    {functionName || t('templates.no_function', 'No Function')}
                                  </div>
                                  <div className="mt-0.5 opacity-90">
                                    {shift.startTime} - {shift.endTime || t('templates.open', 'Open')}
                                  </div>
                                </div>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    onDeleteShift(shift.id)
                                  }}
                                  className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover/shift:opacity-100 transition-opacity shadow-sm"
                                >
                                  <TrashIcon className="w-3 h-3" />
                                </button>
                              </div>
                            )
                          })}
                          <button
                            onClick={() => onAddShift(dateIndex, { employeeGroupId: group.id })}
                            className="absolute bottom-1 right-1 w-6 h-6 border border-[#31BCFF] bg-white rounded-full flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 shadow-sm hover:bg-[#31BCFF] hover:text-white"
                          >
                            <PlusIcon className="w-3 h-3" />
                          </button>
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>

        {/* Move/Copy Toggle */}
        <div className="flex items-center justify-end gap-2 px-4 py-2 border-t bg-gray-50">
          <div className="inline-flex rounded-lg border border-gray-300 bg-white p-0.5">
            <button
              onClick={() => copyMode && toggleCopyMode()}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                !copyMode ? 'bg-[#31BCFF] text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              Move
            </button>
            <button
              onClick={() => !copyMode && toggleCopyMode()}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                copyMode ? 'bg-[#31BCFF] text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Copy className="w-3.5 h-3.5" />
              Copy
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
