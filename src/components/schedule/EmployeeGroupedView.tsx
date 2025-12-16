import React, { useState } from 'react'
import { format } from 'date-fns'
import { ChevronDownIcon, ChevronRightIcon, PlusIcon } from '@heroicons/react/24/outline'
import { Employee } from '@prisma/client'
import SpanningShiftCard from './SpanningShiftCard'
import { ShiftWithRelations } from '@/types/schedule'
import { useCurrency } from '@/shared/hooks/useCurrency'
import ShiftsModal from './ShiftsModal'

interface EmployeeGroupedViewProps {
  weekDates: Date[]
  shifts: ShiftWithRelations[]
  employees: Employee[]
  expandedGroups: Set<string>
  onToggleGroup: (groupId: string) => void
  onEditShift: (shift: ShiftWithRelations) => void
  onAddShift?: (data?: { date?: string; employeeId?: string }) => void
  isEmployeeUnavailable?: (employeeId: string, date: string) => boolean
  onUnavailableClick?: (employeeId: string, date: string) => void
  canCreateShifts?: boolean
  canEditShifts?: boolean
}

export default function EmployeeGroupedView({
  weekDates,
  shifts,
  employees,
  expandedGroups,
  onToggleGroup,
  onEditShift,
  onAddShift = () => {},
  isEmployeeUnavailable,
  onUnavailableClick,
  canCreateShifts = true,
  canEditShifts = true
}: EmployeeGroupedViewProps) {
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

  const getEmployeeShifts = (employeeId: string, date: Date) => {
    const formattedDate = format(date, 'yyyy-MM-dd');
    return shifts.filter(shift => {
      const shiftDate = typeof shift.date === 'string' ? shift.date : format(shift.date, 'yyyy-MM-dd');
      return shift.employeeId === employeeId && shiftDate.substring(0, 10) === formattedDate;
    });
  };

  const getEmployeeTotalHours = (employeeId: string) => {
    const employeeShifts = shifts.filter(s => s.employeeId === employeeId);
    let totalMinutes = 0;
    
    employeeShifts.forEach(shift => {
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

  const handleShowMoreShifts = (shifts: ShiftWithRelations[], date: Date, employeeName: string) => {
    setModalState({
      isOpen: true,
      shifts,
      date,
      title: `${employeeName} - All Shifts`
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

        {/* Employee Rows */}
        <div className="p-3 space-y-3">
          {employees.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p className="text-sm">No employees found</p>
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
                          {getEmployeeTotalHours(employee.id)} / {currencySymbol}0.00 / {employeeShiftsCount} Shift{employeeShiftsCount !== 1 ? 's' : ''}
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
                      const dayShifts = getEmployeeShifts(employee.id, date)
                      const isToday = new Date().toDateString() === date.toDateString()
                      const unavailable = isEmployeeUnavailable?.(employee.id, formattedDate) ?? false

                      return (
                        <div key={dayIndex} className="px-1">
                          <div className="min-h-[60px]">
                            {dayShifts.length === 0 ? (
                              canCreateShifts ? (
                                <button
                                  onClick={() => {
                                    if (unavailable) {
                                      onUnavailableClick?.(employee.id, formattedDate)
                                      return
                                    }
                                    onAddShift({ 
                                      date: formattedDate,
                                      employeeId: employee.id 
                                    })
                                  }}
                                  className={`w-full h-full min-h-[60px] border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-1 transition-all active:scale-95 ${
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
                                <div className="w-full h-full min-h-[60px] border-2 border-dashed border-gray-200 rounded-xl" />
                              )
                            ) : (
                              <div className="w-full h-full flex flex-col gap-1">
                                {dayShifts.map(shift => (
                                  <button
                                    key={shift.id}
                                    onClick={() => onEditShift(shift)}
                                    className={`w-full rounded-xl text-white font-medium flex flex-col items-center justify-center gap-0.5 py-2 transition-all active:scale-95 cursor-pointer ${
                                      shift.status === 'CANCELLED' ? 'bg-red-500' :
                                      shift.status === 'WORKING' ? 'bg-blue-500' :
                                      'bg-[#31BCFF]'
                                    }`}
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
                                  onClick={() => {
                                    if (unavailable) {
                                      onUnavailableClick?.(employee.id, formattedDate)
                                      return
                                    }
                                    onAddShift({ 
                                      date: formattedDate,
                                      employeeId: employee.id 
                                    })
                                  }}
                                  className="w-full text-xs text-center text-[#31BCFF] font-semibold py-1 px-2 bg-blue-50 hover:bg-blue-100 rounded transition-all active:scale-95 mt-1"
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

        {/* Employee Rows */}
        {employees.map(employee => {
          const employeeShiftsCount = shifts.filter(s => s.employeeId === employee.id).length;
          
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
                  {getEmployeeTotalHours(employee.id)} / {currencySymbol} 0.00 / {employeeShiftsCount} Shift{employeeShiftsCount !== 1 ? 's' : ''}
                </div>
              </div>
              
              {weekDates.map((date, dateIndex) => {
                const formattedDate = format(date, 'yyyy-MM-dd');
                const dayShifts = getEmployeeShifts(employee.id, date);
                const shiftGroups = groupOverlappingShifts(dayShifts);
                const unavailable = isEmployeeUnavailable?.(employee.id, formattedDate) ?? false;
                
                return (
                  <div key={dateIndex} className="border-r p-2 relative min-h-[80px] group">
                    {shiftGroups.length === 0 ? (
                      <button
                        onClick={() => {
                          if (unavailable) {
                            onUnavailableClick?.(employee.id, formattedDate)
                            return
                          }
                          onAddShift({ 
                            date: formattedDate,
                            employeeId: employee.id 
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
                        {dayShifts.slice(0, 2).map((shift, shiftIndex) => (
                          <div
                            key={shift.id}
                            onClick={() => onEditShift(shift)}
                            className="mb-1 cursor-pointer"
                          >
                            <div className="rounded p-2 text-xs border bg-red-100 border-red-300">
                              <div className="font-medium text-gray-900">
                                {shift.function?.name || 'No Function'}
                              </div>
                              <div className="text-gray-700 mt-0.5">
                                {shift.startTime} - {shift.endTime || 'Active'}
                              </div>
                            </div>
                          </div>
                        ))}
                        {dayShifts.length > 2 && (
                          <button
                            onClick={() => handleShowMoreShifts(dayShifts, date, `${employee.firstName} ${employee.lastName}`)}
                            className="text-xs text-gray-500 hover:text-[#31BCFF] font-medium transition-colors mb-1"
                          >
                            +{dayShifts.length - 2} more shifts
                          </button>
                        )}
                        <button
                          onClick={() => {
                            if (unavailable) {
                              onUnavailableClick?.(employee.id, formattedDate)
                              return
                            }
                            onAddShift({ 
                              date: formattedDate,
                              employeeId: employee.id 
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
        canEditShifts={canEditShifts}
      />
    </div>
  );
}
