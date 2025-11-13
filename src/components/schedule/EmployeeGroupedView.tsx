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
}

export default function EmployeeGroupedView({
  weekDates,
  shifts,
  employees,
  expandedGroups,
  onToggleGroup,
  onEditShift,
  onAddShift = () => {}
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

  return (
    <div className="overflow-hidden">
      {/* Mobile View - Grid Layout */}
      <div className="md:hidden bg-gray-50">
        {/* Week Days Header - Perfectly aligned with grid */}
        <div className="bg-white sticky top-0 z-10 border-b shadow-sm">
          <div className="grid grid-cols-7 gap-0">
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
                  <div className="grid grid-cols-7 gap-0 p-3">
                    {weekDates.map((date, dayIndex) => {
                      const formattedDate = format(date, 'yyyy-MM-dd')
                      const dayShifts = getEmployeeShifts(employee.id, date)
                      const isToday = new Date().toDateString() === date.toDateString()

                      return (
                        <div key={dayIndex} className="px-1">
                          <div className="aspect-square">
                            {dayShifts.length === 0 ? (
                              <button
                                onClick={() => onAddShift({ 
                                  date: formattedDate,
                                  employeeId: employee.id 
                                })}
                                className={`w-full h-full border-2 border-dashed rounded-xl flex items-center justify-center transition-all active:scale-95 ${
                                  isToday 
                                    ? 'border-[#31BCFF] bg-blue-50 hover:bg-blue-100' 
                                    : 'border-gray-300 hover:border-[#31BCFF] hover:bg-blue-50'
                                }`}
                              >
                                <PlusIcon className="w-6 h-6 text-[#31BCFF]" />
                              </button>
                            ) : (
                              <div className="w-full h-full flex flex-col">
                                {dayShifts.slice(0, 1).map(shift => (
                                  <button
                                    key={shift.id}
                                    onClick={() => onEditShift(shift)}
                                    className={`w-full flex-1 rounded-xl text-white font-medium flex flex-col items-center justify-center gap-0.5 transition-all active:scale-95 ${
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
                                {dayShifts.length > 1 && (
                                  <button 
                                    onClick={() => handleShowMoreShifts(dayShifts, date, `${employee.firstName} ${employee.lastName}`)}
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
              )
            })
          )}
        </div>
      </div>

      {/* Desktop View - Original Grid Layout */}
      <div className="hidden md:block overflow-auto">
      <div className="min-w-full">
        {/* Header Row */}
        <div className="grid grid-cols-[1fr_repeat(7,minmax(140px,1fr))] border-b bg-gray-50 sticky top-0">
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
            <div key={employee.id} className="grid grid-cols-[1fr_repeat(7,minmax(140px,1fr))] border-b hover:bg-gray-50">
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
                
                return (
                  <div key={dateIndex} className="border-r p-2 relative min-h-[80px] group">
                    {shiftGroups.length === 0 ? (
                      <button
                        onClick={() => onAddShift({ 
                          date: formattedDate,
                          employeeId: employee.id 
                        })}
                        className="w-full h-full min-h-[76px] border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center transition-all hover:border-[#31BCFF] hover:bg-blue-50 opacity-0 group-hover:opacity-100"
                      >
                        <PlusIcon className="w-5 h-5 text-[#31BCFF]" />
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
                          onClick={() => onAddShift({ 
                            date: formattedDate,
                            employeeId: employee.id 
                          })}
                          className="absolute bottom-1 right-1 w-6 h-6 border border-[#31BCFF] bg-white rounded-full flex items-center justify-center transition-all hover:bg-[#31BCFF] hover:text-white opacity-0 group-hover:opacity-100 shadow-sm"
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
