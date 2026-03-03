'use client'

import { useTranslation } from 'react-i18next'
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

interface TemplateDayEmployeeViewProps {
  shifts: TemplateShift[]
  employees: Employee[]
  functions: FunctionItem[]
  onAddShift: (dayIndex: number, formData?: any) => void
  onEditShift: (shift: TemplateShift) => void
  onDeleteShift: (shiftId: string) => void
  pendingShiftIds?: Set<string>
}

export default function TemplateDayEmployeeView({
  shifts,
  employees,
  functions,
  onAddShift,
  onEditShift,
  onDeleteShift,
  pendingShiftIds = new Set()
}: TemplateDayEmployeeViewProps) {
  const { t } = useTranslation('schedule')
  
  const getEmployeeShifts = (employeeId: string) => {
    return shifts.filter(shift => shift.employeeId === employeeId)
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

  const openShifts = shifts.filter(s => !s.employeeId)

  return (
    <div className="overflow-hidden bg-white rounded-xl border border-gray-200">
      {/* Mobile View */}
      <div className="md:hidden bg-gray-50">
        <div className="p-3 space-y-3">
          {employees.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p className="text-sm">{t('templates.no_employees_found', 'No employees found')}</p>
            </div>
          ) : (
            employees.map((employee) => {
              const employeeShifts = getEmployeeShifts(employee.id)
              const employeeShiftsCount = employeeShifts.length
              
              return (
                <div key={employee.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
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

                  <div className="p-3">
                    {employeeShifts.length === 0 ? (
                      <button
                        onClick={() => onAddShift(0, { employeeId: employee.id })}
                        className="w-full py-4 border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-1 transition-all active:scale-95 border-gray-300 hover:border-[#31BCFF] hover:bg-blue-50"
                      >
                        <PlusIcon className="w-6 h-6 text-[#31BCFF]" />
                        <span className="text-xs text-gray-500">{t('templates.add_shift', 'Add Shift')}</span>
                      </button>
                    ) : (
                      <div className="space-y-2">
                        {employeeShifts.map(shift => {
                          const functionName = getFunctionName(shift.functionId)
                          const shiftColor = getFunctionColor(shift.functionId)
                          const isPending = pendingShiftIds.has(shift.id)
                          
                          return (
                            <div
                              key={shift.id}
                              onClick={() => !isPending && onEditShift(shift)}
                              className={`rounded-lg p-3 text-white cursor-pointer relative group ${isPending ? 'opacity-50 animate-pulse pointer-events-none' : ''}`}
                              style={{ backgroundColor: shiftColor }}
                            >
                              <div className="font-medium text-sm">
                                {shift.startTime} - {shift.endTime || t('templates.open', 'Open')}
                              </div>
                              {functionName && (
                                <div className="text-xs opacity-90 mt-0.5">{functionName}</div>
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onDeleteShift(shift.id)
                                }}
                                className="absolute top-1 right-1 w-6 h-6 bg-white/20 hover:bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <TrashIcon className="w-3 h-3 text-white" />
                              </button>
                            </div>
                          )
                        })}
                        <button
                          onClick={() => onAddShift(0, { employeeId: employee.id })}
                          className="w-full text-xs text-center text-[#31BCFF] font-semibold py-2 px-2 bg-blue-50 hover:bg-blue-100 rounded-lg transition-all active:scale-95"
                        >
                          + {t('templates.add', 'Add')}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Desktop View */}
      <div className="hidden md:block">
        <div className="min-w-full">
          <div className="grid grid-cols-[220px_1fr] border-b bg-gray-50 sticky top-0">
            <div className="p-3 font-medium text-sm border-r">{t('templates.employee', 'Employee')}</div>
            <div className="p-3 font-medium text-sm">{t('templates.shifts', 'Shifts')}</div>
          </div>

          {/* Open Shifts Row */}
          {(() => {
            return (
              <div className="grid grid-cols-[220px_1fr] border-b bg-emerald-50/50">
                <div className="p-3 border-r">
                  <div className="font-medium text-sm text-emerald-700 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                    {t('week_view.open_shifts', 'Open Shifts')}
                  </div>
                  <div className="text-xs text-emerald-600 mt-0.5">
                    {openShifts.length} {t('week_view.available', 'available')}
                  </div>
                </div>
                <div className="p-2 relative min-h-[60px] group">
                  {openShifts.length === 0 ? (
                    <button
                      onClick={() => onAddShift(0)}
                      className="w-full h-full min-h-[56px] border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-1 transition-all opacity-0 group-hover:opacity-100 border-emerald-300 hover:border-emerald-500 hover:bg-emerald-50"
                    >
                      <PlusIcon className="w-5 h-5 text-emerald-500" />
                    </button>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {openShifts.map(shift => (
                        <div key={shift.id} className={`cursor-pointer group/shift relative ${pendingShiftIds.has(shift.id) ? 'opacity-50 animate-pulse pointer-events-none' : ''}`}>
                          <div
                            onClick={() => !pendingShiftIds.has(shift.id) && onEditShift(shift)}
                            className="rounded p-2 text-xs border-2 border-dashed border-emerald-400 bg-emerald-100 min-w-[120px]"
                          >
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
                        onClick={() => onAddShift(0)}
                        className="w-8 h-8 border bg-white rounded-full flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 shadow-sm border-emerald-400 hover:bg-emerald-500 hover:text-white text-emerald-500 self-center"
                      >
                        <PlusIcon className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })()}

          {employees.map(employee => {
            const employeeShifts = getEmployeeShifts(employee.id)
            const employeeShiftsCount = employeeShifts.length
            
            return (
              <div
                key={employee.id}
                className="grid grid-cols-[220px_1fr] border-b hover:bg-gray-50"
              >
                <div className="p-3 border-r">
                  <div className="font-medium text-sm text-gray-900">
                    {employee.firstName} {employee.lastName}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {getEmployeeTotalHours(employee.id)} / {t('templates.shifts_count', { count: employeeShiftsCount, defaultValue: employeeShiftsCount === 1 ? '1 shift' : `${employeeShiftsCount} shifts` })}
                  </div>
                </div>
                
                <div className="p-2 relative min-h-[80px] group">
                  {employeeShifts.length === 0 ? (
                    <button
                      onClick={() => onAddShift(0, { employeeId: employee.id })}
                      className="w-full h-full min-h-[76px] border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-1 transition-all opacity-0 group-hover:opacity-100 border-gray-300 hover:border-[#31BCFF] hover:bg-blue-50"
                    >
                      <PlusIcon className="w-5 h-5 text-[#31BCFF]" />
                      <span className="text-xs text-gray-500">{t('templates.add_shift', 'Add Shift')}</span>
                    </button>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {employeeShifts.map(shift => {
                        const functionName = getFunctionName(shift.functionId)
                        const shiftColor = getFunctionColor(shift.functionId)
                        const isPending = pendingShiftIds.has(shift.id)
                        
                        return (
                          <div
                            key={shift.id}
                            className={`cursor-pointer group/shift relative ${isPending ? 'opacity-50 animate-pulse pointer-events-none' : ''}`}
                          >
                            <div 
                              onClick={() => !isPending && onEditShift(shift)}
                              className="rounded p-2 text-xs text-white font-medium min-w-[120px]"
                              style={{ backgroundColor: shiftColor }}
                            >
                              <div className="font-medium">
                                {shift.startTime} - {shift.endTime || t('templates.open', 'Open')}
                              </div>
                              {functionName && (
                                <div className="mt-0.5 opacity-90">{functionName}</div>
                              )}
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
                        onClick={() => onAddShift(0, { employeeId: employee.id })}
                        className="w-8 h-8 border border-[#31BCFF] bg-white rounded-full flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 shadow-sm hover:bg-[#31BCFF] hover:text-white self-center"
                      >
                        <PlusIcon className="w-4 h-4" />
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
}
