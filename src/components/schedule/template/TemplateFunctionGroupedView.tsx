'use client'

import React from 'react'
import { format } from 'date-fns'
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline'

interface TemplateShift {
  id: string
  dayIndex: number
  startTime: string
  endTime: string | null
  employeeGroupId?: string | null
  functionId?: string | null
  note?: string | null
  breakMinutes?: number
  breakPaid?: boolean
}

interface EmployeeGroup {
  id: string
  name: string
}

interface FunctionItem {
  id: string
  name: string
  color?: string | null
}

interface TemplateFunctionGroupedViewProps {
  weekDates: Date[]
  shifts: TemplateShift[]
  employeeGroups: EmployeeGroup[]
  functions: FunctionItem[]
  onAddShift: (dayIndex: number, formData?: any) => void
  onEditShift: (shift: TemplateShift) => void
  onDeleteShift: (shiftId: string) => void
}

export default function TemplateFunctionGroupedView({
  weekDates,
  shifts,
  employeeGroups,
  functions,
  onAddShift,
  onEditShift,
  onDeleteShift
}: TemplateFunctionGroupedViewProps) {
  
  const getFunctionShifts = (functionId: string, dayIndex: number) => {
    return shifts.filter(shift => shift.functionId === functionId && shift.dayIndex === dayIndex)
  }

  const getFunctionTotalHours = (functionId: string) => {
    const functionShifts = shifts.filter(s => s.functionId === functionId)
    
    let totalMinutes = 0
    
    functionShifts.forEach(shift => {
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

  const getGroupName = (groupId: string | null | undefined) => {
    if (!groupId) return null
    const group = employeeGroups.find(g => g.id === groupId)
    return group?.name
  }

  const dayCount = Math.max(weekDates.length, 1)
  const mobileGridStyle: React.CSSProperties = {
    gridTemplateColumns: `repeat(${dayCount}, minmax(0, 1fr))`
  }
  const desktopGridStyle: React.CSSProperties = {
    gridTemplateColumns: `220px repeat(${dayCount}, minmax(120px, 1fr))`
  }

  return (
    <div className="overflow-hidden bg-white rounded-xl border border-gray-200">
      {/* Mobile View - Grid Layout */}
      <div className="md:hidden bg-gray-50">
        {/* Week Days Header */}
        <div className="bg-white sticky top-0 z-10 border-b shadow-sm overflow-x-auto">
          <div className="grid gap-0" style={mobileGridStyle}>
            {weekDates.map((date, i) => (
              <div key={i} className="text-center py-3 border-r last:border-r-0">
                <div className="text-xs font-medium mb-0.5 text-gray-500">
                  {format(date, 'EEE')}
                </div>
                <div className="text-xl font-bold text-gray-900">
                  {format(date, 'd')}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Function Rows */}
        <div className="p-3 space-y-3">
          {functions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p className="text-sm">No functions found</p>
            </div>
          ) : (
            functions.map((fn) => {
              const functionShiftsCount = shifts.filter(s => s.functionId === fn.id).length
              
              return (
                <div key={fn.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                  {/* Function Header */}
                  <div className="flex items-center justify-between px-3 py-2.5 border-b bg-gray-50">
                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                      {fn.color ? (
                        <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0" style={{ backgroundColor: fn.color }}>
                          {fn.name.substring(0, 2).toUpperCase()}
                        </div>
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-[#31BCFF] flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                          {fn.name.substring(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-gray-900 truncate">
                          {fn.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {getFunctionTotalHours(fn.id)} / {functionShiftsCount} Shift{functionShiftsCount !== 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Day Grid */}
                  <div className="overflow-x-auto">
                    <div className="grid gap-0 p-3" style={mobileGridStyle}>
                      {weekDates.map((date, dayIndex) => {
                        const dayShifts = getFunctionShifts(fn.id, dayIndex)

                        return (
                          <div key={dayIndex} className="px-1">
                            <div className="min-h-[60px]">
                              {dayShifts.length === 0 ? (
                                <button
                                  onClick={() => onAddShift(dayIndex, { functionId: fn.id })}
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
                                      style={{ backgroundColor: fn.color || '#31BCFF' }}
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
                                    onClick={() => onAddShift(dayIndex, { functionId: fn.id })}
                                    className="w-full text-xs text-center text-[#31BCFF] font-semibold py-1 px-2 bg-blue-50 hover:bg-blue-100 rounded transition-all active:scale-95"
                                  >
                                    + Add
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
      <div className="hidden md:block overflow-x-auto">
        <div className="min-w-full">
          {/* Header Row */}
          <div className="grid border-b bg-gray-50 sticky top-0" style={desktopGridStyle}>
            <div className="p-3 font-medium text-sm border-r">Function</div>
            {weekDates.map((date, i) => (
              <div key={i} className="p-2 text-center border-r">
                <div className="text-xs font-semibold text-gray-900">
                  {format(date, 'EEE, MMM d')}
                </div>
              </div>
            ))}
          </div>

          {/* Function Rows */}
          {functions.map(fn => {
            const functionShiftsCount = shifts.filter(s => s.functionId === fn.id).length
            
            return (
              <div key={fn.id} className="grid border-b hover:bg-gray-50" style={desktopGridStyle}>
                <div className="p-3 border-r">
                  <div className="flex items-center gap-2">
                    {fn.color && (
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: fn.color }} />
                    )}
                    <div className="font-medium text-sm text-gray-900">
                      {fn.name}
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {getFunctionTotalHours(fn.id)} / {functionShiftsCount} Shift{functionShiftsCount !== 1 ? 's' : ''}
                  </div>
                </div>
                
                {weekDates.map((date, dateIndex) => {
                  const dayShifts = getFunctionShifts(fn.id, dateIndex)
                  
                  return (
                    <div key={dateIndex} className="border-r p-2 relative min-h-[80px] group">
                      {dayShifts.length === 0 ? (
                        <button
                          onClick={() => onAddShift(dateIndex, { functionId: fn.id })}
                          className="w-full h-full min-h-[76px] border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-1 transition-all opacity-0 group-hover:opacity-100 border-gray-300 hover:border-[#31BCFF] hover:bg-blue-50"
                        >
                          <PlusIcon className="w-5 h-5 text-[#31BCFF]" />
                          <span className="text-xs text-gray-500">Add Shift</span>
                        </button>
                      ) : (
                        <>
                          {dayShifts.map(shift => {
                            const groupName = getGroupName(shift.employeeGroupId)
                            
                            return (
                              <div
                                key={shift.id}
                                className="mb-1 cursor-pointer group/shift relative"
                              >
                                <div 
                                  onClick={() => onEditShift(shift)}
                                  className="rounded p-2 text-xs text-white font-medium"
                                  style={{ backgroundColor: fn.color || '#31BCFF' }}
                                >
                                  <div className="font-medium">
                                    {groupName || 'No Group'}
                                  </div>
                                  <div className="mt-0.5 opacity-90">
                                    {shift.startTime} - {shift.endTime || 'Open'}
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
                            onClick={() => onAddShift(dateIndex, { functionId: fn.id })}
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
      </div>
    </div>
  )
}
