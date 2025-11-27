import React, { useState } from 'react'
import { format } from 'date-fns'
import { Employee } from '@prisma/client'
import { PlusIcon } from '@heroicons/react/24/outline'
import { ShiftWithRelations } from '@/types/schedule'
import { useCurrency } from '@/shared/hooks/useCurrency'
import ShiftsModal from './ShiftsModal'

interface FunctionItem {
  id: string
  name: string
  color?: string | null
  categoryId?: string | null
  category?: {
    id: string
    name: string
    color?: string | null
    department?: {
      id: string
      name: string
    } | null
    departments?: Array<{
      id: string
      department: {
        id: string
        name: string
      }
    }>
  } | null
}

interface FunctionGroupedViewProps {
  weekDates: Date[]
  shifts: ShiftWithRelations[]
  employees: Employee[]
  functions: FunctionItem[]
  onEditShift: (shift: ShiftWithRelations) => void
  onAddShift?: (data?: { date?: string; functionId?: string; categoryId?: string; departmentId?: string }) => void
  selectedEmployeeId?: string | null
  isEmployeeUnavailable?: (employeeId: string, date: string) => boolean
  onUnavailableClick?: (employeeId: string, date: string) => void
}

export default function FunctionGroupedView({
  weekDates,
  shifts,
  employees,
  functions,
  onEditShift,
  onAddShift = () => {},
  selectedEmployeeId,
  isEmployeeUnavailable,
  onUnavailableClick
}: FunctionGroupedViewProps) {
  const { currencySymbol } = useCurrency()
  const [modalState, setModalState] = useState<{
    isOpen: boolean
    shifts: ShiftWithRelations[]
    date: Date | null
    title: string
  }>({
    isOpen: false,
    shifts: [],
    date: null,
    title: ''
  })
  
  const groupOverlappingShifts = (shifts: ShiftWithRelations[]) => {
    const sortedShifts = [...shifts].sort((a, b) => {
      if (a.startTime < b.startTime) return -1;
      if (a.startTime > b.startTime) return 1;
      const aEndTime = a.endTime || '23:59';
      const bEndTime = b.endTime || '23:59';
      return aEndTime < bEndTime ? -1 : 1;
    });

    const groups: ShiftWithRelations[][] = [];
    
    for (const shift of sortedShifts) {
      let addedToGroup = false;
      
      for (const group of groups) {
        const overlapsWithGroup = group.some(groupShift => {
          const shiftEndTime = shift.endTime || '23:59';
          const groupShiftEndTime = groupShift.endTime || '23:59';
          return (shift.startTime < groupShiftEndTime && shiftEndTime > groupShift.startTime);
        });
        
        if (overlapsWithGroup) {
          group.push(shift);
          addedToGroup = true;
          break;
        }
      }
      
      if (!addedToGroup) {
        groups.push([shift]);
      }
    }
    
    return groups;
  };

  const getFunctionShifts = (functionId: string, date: Date) => {
    const formattedDate = format(date, 'yyyy-MM-dd');
    
    return shifts.filter(shift => {
      const shiftDate = typeof shift.date === 'string' ? shift.date : format(shift.date, 'yyyy-MM-dd');
      return shift.functionId === functionId && shiftDate.substring(0, 10) === formattedDate;
    });
  };

  const getFunctionTotalHours = (functionId: string) => {
    const functionShifts = shifts.filter(s => s.functionId === functionId);
    
    let totalMinutes = 0;
    
    functionShifts.forEach(shift => {
      if (shift.endTime) {
        const [startHour, startMin] = shift.startTime.split(':').map(Number);
        const [endHour, endMin] = shift.endTime.split(':').map(Number);
        const startMinutes = startHour * 60 + startMin;
        let endMinutes = endHour * 60 + endMin;
        
        if (endMinutes < startMinutes) {
          endMinutes += 24 * 60;
        }
        
        totalMinutes += (endMinutes - startMinutes);
      }
    });
    
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}h ${minutes}m`;
  };

  const handleShowMoreShifts = (shifts: ShiftWithRelations[], date: Date, functionName: string) => {
    setModalState({
      isOpen: true,
      shifts,
      date,
      title: `${functionName} - All Shifts`
    })
  }

  const handleCloseModal = () => {
    setModalState({
      isOpen: false,
      shifts: [],
      date: null,
      title: ''
    })
  }

  const dayCount = Math.max(weekDates.length, 1)
  const isTwoWeekView = dayCount > 7
  const baseColumnMinWidth = 220
  const dayColumnMinWidth = 120
  const desktopMinWidth = isTwoWeekView ? `${baseColumnMinWidth + dayCount * dayColumnMinWidth}px` : undefined
  const mobileGridStyle: React.CSSProperties = {
    gridTemplateColumns: `repeat(${dayCount}, minmax(0, 1fr))`,
    minWidth: isTwoWeekView ? `${dayCount * 72}px` : undefined
  }
  const desktopGridStyle: React.CSSProperties = {
    gridTemplateColumns: isTwoWeekView
      ? `minmax(${baseColumnMinWidth}px, 1fr) repeat(${dayCount}, minmax(${dayColumnMinWidth}px, 1fr))`
      : `1fr repeat(${dayCount}, minmax(0, 1fr))`,
    minWidth: desktopMinWidth
  }

  return (
    <div className="overflow-hidden">
      {/* Mobile View - Grid Layout */}
      <div className="md:hidden bg-gray-50">
        {/* Week Days Header - Perfectly aligned with grid */}
        <div className="bg-white sticky top-0 z-10 border-b shadow-sm overflow-x-auto">
          <div className="grid gap-0" style={mobileGridStyle}>
            {weekDates.map((date, i) => {
              const isToday = new Date().toDateString() === date.toDateString()
              return (
                <div key={i} className="text-center py-3 border-r last:border-r-0">
                  <div className={`text-xs font-medium mb-0.5 ${isToday ? 'text-[#31BCFF]' : 'text-gray-500'}`}>
                    {format(date, 'EEE')}
                  </div>
                  <div className={`text-xl font-bold ${isToday ? 'text-[#31BCFF]' : 'text-gray-900'}`}>
                    {format(date, 'd')}
                  </div>
                </div>
              )
            })}
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
              const functionShiftsAll = shifts.filter(s => s.functionId === fn.id)
              const functionShiftsCount = functionShiftsAll.length
              
              return (
                <div key={fn.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                  {/* Function Header */}
                  <div className="flex items-center justify-between px-3 py-2.5 border-b bg-gray-50">
                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                      {fn.color ? (
                        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: fn.color }} />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-[#31BCFF] flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                          {fn.name.substring(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-gray-900 truncate">
                          {fn.name}
                          {fn.category && (
                            <span className="ml-2 text-xs font-normal text-gray-500">• {fn.category.name}</span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500">
                          {getFunctionTotalHours(fn.id)} / {currencySymbol}0.00 / {functionShiftsCount} Shift{functionShiftsCount !== 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>
                    <button className="text-gray-400 hover:text-gray-600 p-1 text-xl leading-none">
                      ×
                    </button>
                  </div>

                  {/* Day Grid - Exactly 7 columns matching header */}
                  <div className="overflow-x-auto">
                    <div className="grid gap-0 p-3" style={mobileGridStyle}>
                    {weekDates.map((date, dayIndex) => {
                      const formattedDate = format(date, 'yyyy-MM-dd')
                      const dayShifts = getFunctionShifts(fn.id, date)
                      const isToday = new Date().toDateString() === date.toDateString()
                      const unavailable = selectedEmployeeId
                        ? isEmployeeUnavailable?.(selectedEmployeeId, formattedDate) ?? false
                        : false

                      return (
                        <div key={dayIndex} className="px-1">
                          <div className="aspect-square">
                            {dayShifts.length === 0 ? (
                              <button
                                onClick={() => {
                                  if (unavailable && selectedEmployeeId) {
                                    onUnavailableClick?.(selectedEmployeeId, formattedDate)
                                    return
                                  }
                                  onAddShift({ 
                                    date: formattedDate,
                                    functionId: fn.id,
                                    categoryId: fn.categoryId || fn.category?.id,
                                    departmentId: fn.category?.department?.id || fn.category?.departments?.[0]?.department?.id
                                  })
                                }}
                                className={`w-full h-full border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-1 transition-all active:scale-95 ${
                                  unavailable
                                    ? 'border-red-300 bg-red-50 text-red-500 cursor-not-allowed'
                                    : isToday 
                                      ? 'border-[#31BCFF] bg-blue-50 hover:bg-blue-100' 
                                      : 'border-gray-300 hover:border-[#31BCFF] hover:bg-blue-50'
                                }`}
                              >
                                <PlusIcon className={`w-6 h-6 ${unavailable ? 'text-red-400' : 'text-[#31BCFF]'}`} />
                                {unavailable && (
                                  <span className="hidden md:inline text-[10px] font-semibold text-red-500">Unavailable</span>
                                )}
                              </button>
                            ) : (
                              <div className="w-full h-full flex flex-col">
                                {dayShifts.slice(0, 1).map(shift => {
                                  const shiftColor = shift.function?.color || (
                                    shift.status === 'CANCELLED' ? '#ef4444' :
                                    shift.status === 'WORKING' ? '#3b82f6' :
                                    '#31BCFF'
                                  )
                                  return (
                                  <button
                                    key={shift.id}
                                    onClick={() => onEditShift(shift)}
                                    className="w-full flex-1 rounded-xl text-white font-medium flex flex-col items-center justify-center gap-0.5 transition-all active:scale-95"
                                    style={{ backgroundColor: shiftColor }}
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
                                {dayShifts.length > 1 && (
                                  <button 
                                    onClick={() => handleShowMoreShifts(dayShifts, date, fn.name)}
                                    className="w-full text-xs text-center text-gray-600 hover:text-[#31BCFF] font-semibold mt-1 py-1 px-2 bg-gray-100 hover:bg-blue-50 rounded transition-all active:scale-95"
                                  >
                                    +{dayShifts.length - 1} more
                                  </button>
                                )}
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
      <div className="min-w-full" style={desktopMinWidth ? { minWidth: desktopMinWidth } : undefined}>
        {/* Header Row */}
        <div
          className="grid border-b bg-gray-50 sticky top-0"
          style={desktopGridStyle}
        >
          <div className="p-3 font-medium text-sm border-r"></div>
          {weekDates.map((date, i) => {
            const isToday = new Date().toDateString() === date.toDateString();
            const dayShifts = shifts.filter(shift => {
              const shiftDate = typeof shift.date === 'string' ? shift.date : format(shift.date, 'yyyy-MM-dd');
              return shiftDate.substring(0, 10) === format(date, 'yyyy-MM-dd');
            });
            
            return (
              <div key={i} className={`p-2 text-center border-r ${isToday ? 'bg-blue-50' : ''}`}>
                <div className={`text-xs font-semibold ${isToday ? 'text-blue-700' : 'text-gray-900'}`}>
                  {isToday ? 'Today' : format(date, 'EEE, MMM d')}
                </div>
                <div className="text-[10px] text-gray-600 mt-0.5">
                  + {dayShifts.length} Shifts
                </div>
              </div>
            );
          })}
        </div>

        {/* Function Rows */}
        {functions.map(fn => {
          const functionShiftsCount = shifts.filter(s => s.functionId === fn.id).length;
          
          return (
            <div
              key={fn.id}
              className="grid border-b hover:bg-gray-50"
              style={desktopGridStyle}
            >
              <div className="p-3 border-r">
                <div className="flex items-center gap-2">
                  {fn.color && (
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: fn.color }} />
                  )}
                  <div className="font-medium text-sm text-gray-900">
                    {fn.name}
                    {fn.category && (
                      <span className="ml-2 text-xs font-normal text-gray-500">• {fn.category.name}</span>
                    )}
                  </div>
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {getFunctionTotalHours(fn.id)} / {currencySymbol} 0.00 / {functionShiftsCount} Shift{functionShiftsCount !== 1 ? 's' : ''}
                </div>
              </div>
              
              {weekDates.map((date, dateIndex) => {
                const dayShifts = getFunctionShifts(fn.id, date);
                const shiftGroups = groupOverlappingShifts(dayShifts);
                const formattedDate = format(date, 'yyyy-MM-dd');
                const unavailable = selectedEmployeeId
                  ? isEmployeeUnavailable?.(selectedEmployeeId, formattedDate) ?? false
                  : false;
                
                return (
                  <div key={dateIndex} className="border-r p-2 relative min-h-[80px] group">
                    {shiftGroups.length === 0 ? (
                      <button
                        onClick={() => {
                          if (unavailable && selectedEmployeeId) {
                            onUnavailableClick?.(selectedEmployeeId, formattedDate)
                            return
                          }
                          onAddShift({ 
                            date: formattedDate,
                            functionId: fn.id,
                            categoryId: fn.categoryId || fn.category?.id,
                            departmentId: fn.category?.department?.id || fn.category?.departments?.[0]?.department?.id
                          })
                        }}
                        className={`w-full h-full min-h-[76px] border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-1 transition-all opacity-0 group-hover:opacity-100 ${
                          unavailable
                            ? 'border-red-300 bg-red-50 text-red-500 cursor-not-allowed'
                            : 'border-gray-300 hover:border-[#31BCFF] hover:bg-blue-50'
                        }`}
                      >
                        <PlusIcon className={`w-5 h-5 ${unavailable ? 'text-red-400' : 'text-[#31BCFF]'}`} />
                        {unavailable && (
                          <span className="hidden md:inline text-[10px] font-semibold text-red-500">Unavailable</span>
                        )}
                      </button>
                    ) : (
                      <>
                        {dayShifts.slice(0, 2).map((shift, shiftIndex) => {
                          const employee = employees.find(emp => emp.id === shift.employeeId);
                          const shiftColor = shift.function?.color || '#31BCFF'
                          
                          return (
                            <div
                              key={shift.id}
                              onClick={() => onEditShift(shift)}
                              className="mb-1 cursor-pointer"
                            >
                              <div className="rounded p-2 text-xs border text-white font-medium" style={{ backgroundColor: shiftColor, borderColor: shiftColor }}>
                                <div className="font-medium">
                                  {employee ? `${employee.firstName} ${employee.lastName}` : 'Unknown'}
                                </div>
                                <div className="mt-0.5 opacity-90">
                                  {shift.startTime} - {shift.endTime || 'Active'}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        {dayShifts.length > 2 && (
                          <button
                            onClick={() => handleShowMoreShifts(dayShifts, date, fn.name)}
                            className="text-xs text-gray-500 hover:text-[#31BCFF] font-medium transition-colors mb-1"
                          >
                            +{dayShifts.length - 2} more shifts
                          </button>
                        )}
                        <button
                          onClick={() => {
                            if (unavailable && selectedEmployeeId) {
                              onUnavailableClick?.(selectedEmployeeId, formattedDate)
                              return
                            }
                            onAddShift({ 
                              date: formattedDate,
                              functionId: fn.id 
                            })
                          }}
                          className={`absolute bottom-1 right-1 w-6 h-6 border bg-white rounded-full flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 shadow-sm ${
                            unavailable
                              ? 'border-red-300 text-red-400 cursor-not-allowed'
                              : 'border-[#31BCFF] hover:bg-[#31BCFF] hover:text-white'
                          }`}
                        >
                          <PlusIcon className="w-3 h-3" />
                        </button>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
      </div>

      {/* Shifts Modal */}
      <ShiftsModal
        isOpen={modalState.isOpen}
        onClose={handleCloseModal}
        shifts={modalState.shifts}
        date={modalState.date || new Date()}
        title={modalState.title}
        employees={employees}
        onEditShift={onEditShift}
      />
    </div>
  );
}
