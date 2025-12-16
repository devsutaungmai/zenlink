'use client'

import React from 'react'
import { useTranslation } from 'react-i18next'
import { format } from 'date-fns'
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline'

interface TemplateShift {
  id: string
  dayIndex: number
  startTime: string
  endTime: string | null
  employeeId?: string | null
  employeeGroupId?: string | null
  functionId?: string | null
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

interface FunctionItem {
  id: string
  name: string
  color?: string | null
}

interface TemplateEmployeeGroupedViewProps {
  weekDates: Date[]
  shifts: TemplateShift[]
  employees: Employee[]
  functions: FunctionItem[]
  onAddShift: (dayIndex: number, formData?: any) => void
  onEditShift: (shift: TemplateShift) => void
  onDeleteShift: (shiftId: string) => void
}

export default function TemplateEmployeeGroupedView({
  weekDates,
  shifts,
  employees,
  functions,
  onAddShift,
  onEditShift,
  onDeleteShift
}: TemplateEmployeeGroupedViewProps) {
  const { t } = useTranslation('schedule')
  
  const getEmployeeShifts = (employeeId: string, dayIndex: number) => {
    return shifts.filter(shift => shift.employeeId === employeeId && shift.dayIndex === dayIndex)
  }

  const getEmployeeTotalHours = (employeeId: string) => {
    const employeeShifts = shifts.filter(s => s.employeeId === employeeId)
    let totalMinutes = 0
    
    employeeShifts.forEach(shift => {
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

  // Get unassigned shifts (shifts without an employee)
  const unassignedShifts = shifts.filter(s => !s.employeeId)
  const hasUnassignedShifts = unassignedShifts.length > 0

  return (
    <div className="overflow-hidden bg-white rounded-xl border border-gray-200">
      {/* Mobile View */}
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

        {/* Employee Rows */}
        <div className="p-3 space-y-3">
          {employees.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p className="text-sm">{t('templates.no_employees_found', 'No employees found')}</p>
            </div>
          ) : (
            employees.map((employee) => {
              const employeeShiftsAll = shifts.filter(s => s.employeeId === employee.id)
              const employeeShiftsCount = employeeShiftsAll.length
              
              return (
                <div key={employee.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                  {/* Employee Header */}
                  <div className="flex items-center justify-between px-3 py-2.5 border-b bg-gray-50">
                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-[#31BCFF] flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                        {employee.firstName[0]}{employee.lastName[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-gray-900 truncate">
                          {employee.firstName} {employee.lastName}
                        </div>
                        <div className="text-xs text-gray-500">
                          {getEmployeeTotalHours(employee.id)} / {t('templates.shifts_count', { count: employeeShiftsCount, defaultValue: employeeShiftsCount === 1 ? '1 shift' : `${employeeShiftsCount} shifts` })}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Day Grid */}
                  <div className="overflow-x-auto">
                    <div className="grid gap-0 p-3" style={mobileGridStyle}>
                      {weekDates.map((date, dayIndex) => {
                        const dayShifts = getEmployeeShifts(employee.id, dayIndex)

                        return (
                          <div key={dayIndex} className="px-1">
                            <div className="min-h-[60px]">
                              {dayShifts.length === 0 ? (
                                <button
                                  onClick={() => onAddShift(dayIndex, { employeeId: employee.id })}
                                  className="w-full h-full min-h-[60px] border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-1 transition-all active:scale-95 border-gray-300 hover:border-[#31BCFF] hover:bg-blue-50"
                                >
                                  <PlusIcon className="w-6 h-6 text-[#31BCFF]" />
                                </button>
                              ) : (
                                <div className="w-full h-full flex flex-col gap-1">
                                  {dayShifts.map(shift => (
                                    <button
                                      key={shift.id}
                                      onClick={() => onEditShift(shift)}
                                      className="w-full rounded-xl text-white font-medium flex flex-col items-center justify-center gap-0.5 py-2 transition-all active:scale-95"
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
                                  ))}
                                  <button
                                    onClick={() => onAddShift(dayIndex, { employeeId: employee.id })}
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

      {/* Desktop View */}
      <div className="hidden md:block">
        <div>
          {/* Header Row */}
          <div className="grid border-b bg-gray-50 sticky top-0" style={desktopGridStyle}>
            <div className="p-3 font-medium text-sm border-r">{t('templates.employee', 'Employee')}</div>
            {weekDates.map((date, i) => {
              const dayShifts = shifts.filter(shift => shift.dayIndex === i)
              return (
                <div key={i} className="p-2 text-center border-r">
                  <div className="text-xs font-semibold text-gray-900">
                    {format(date, 'EEEE')}
                  </div>
                  <div className="text-[10px] text-gray-600 mt-0.5">
                    {t('templates.shifts_count', { count: dayShifts.length, defaultValue: dayShifts.length === 1 ? '1 shift' : `${dayShifts.length} shifts` })}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Employee Rows */}
          {employees.map(employee => {
            const employeeShiftsCount = shifts.filter(s => s.employeeId === employee.id).length
            
            return (
              <div
                key={employee.id}
                className="grid border-b hover:bg-gray-50"
                style={desktopGridStyle}
              >
                <div className="p-3 border-r">
                  <div className="font-medium text-sm text-gray-900">
                    {employee.firstName} {employee.lastName}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {getEmployeeTotalHours(employee.id)} / {t('templates.shifts_count', { count: employeeShiftsCount, defaultValue: employeeShiftsCount === 1 ? '1 shift' : `${employeeShiftsCount} shifts` })}
                  </div>
                </div>
                
                {weekDates.map((date, dateIndex) => {
                  const dayShifts = getEmployeeShifts(employee.id, dateIndex)
                  
                  return (
                    <div key={dateIndex} className="border-r p-2 relative min-h-[80px] group">
                      {dayShifts.length === 0 ? (
                        <button
                          onClick={() => onAddShift(dateIndex, { employeeId: employee.id })}
                          className="w-full h-full min-h-[76px] border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-1 transition-all opacity-0 group-hover:opacity-100 border-gray-300 hover:border-[#31BCFF] hover:bg-blue-50"
                        >
                          <PlusIcon className="w-5 h-5 text-[#31BCFF]" />
                          <span className="text-xs text-gray-500">{t('templates.add_shift', 'Add Shift')}</span>
                        </button>
                      ) : (
                        <>
                          {dayShifts.slice(0, 2).map(shift => {
                            const functionName = getFunctionName(shift.functionId)
                            const shiftColor = getFunctionColor(shift.functionId)
                            
                            return (
                              <div
                                key={shift.id}
                                className="mb-1 cursor-pointer group/shift relative"
                              >
                                <div 
                                  onClick={() => onEditShift(shift)}
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
                          {dayShifts.length > 2 && (
                            <span className="text-xs text-gray-500 font-medium">
                              {t('templates.more', '+{{count}} more', { count: dayShifts.length - 2 })}
                            </span>
                          )}
                          <button
                            onClick={() => onAddShift(dateIndex, { employeeId: employee.id })}
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

          {/* Unassigned Shifts Section */}
          {hasUnassignedShifts && (
            <div className="grid border-b bg-yellow-50" style={desktopGridStyle}>
              <div className="p-3 border-r">
                <div className="font-medium text-sm text-yellow-800">
                  {t('templates.unassigned_shifts', 'Unassigned Shifts')}
                </div>
                <div className="text-xs text-yellow-600 mt-0.5">
                  {t('templates.shifts_without_employee', { count: unassignedShifts.length, defaultValue: `${unassignedShifts.length} shift${unassignedShifts.length !== 1 ? 's' : ''} without employee` })}
                </div>
              </div>
              
              {weekDates.map((date, dateIndex) => {
                const dayShifts = unassignedShifts.filter(s => s.dayIndex === dateIndex)
                
                return (
                  <div key={dateIndex} className="border-r p-2 relative min-h-[80px] group">
                    {dayShifts.map(shift => {
                      const functionName = getFunctionName(shift.functionId)
                      const shiftColor = getFunctionColor(shift.functionId)
                      
                      return (
                        <div
                          key={shift.id}
                          className="mb-1 cursor-pointer group/shift relative"
                        >
                          <div 
                            onClick={() => onEditShift(shift)}
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
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
