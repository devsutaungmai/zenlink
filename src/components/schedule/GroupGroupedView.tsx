import React from 'react'
import { format } from 'date-fns'
import { Employee } from '@prisma/client'
import { PlusIcon } from '@heroicons/react/24/outline'
import { ShiftWithRelations } from '@/types/schedule'
import { useCurrency } from '@/shared/hooks/useCurrency'

interface EmployeeGroup {
  id: string
  name: string
}

interface GroupGroupedViewProps {
  weekDates: Date[]
  shifts: ShiftWithRelations[]
  employees: Employee[]
  employeeGroups: EmployeeGroup[]
  onEditShift: (shift: ShiftWithRelations) => void
  onAddShift?: (data?: { date?: string; employeeGroupId?: string }) => void
}

export default function GroupGroupedView({
  weekDates,
  shifts,
  employees,
  employeeGroups,
  onEditShift,
  onAddShift = () => {}
}: GroupGroupedViewProps) {
  const { currencySymbol } = useCurrency()
  
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

  const getGroupShifts = (groupId: string, date: Date) => {
    const formattedDate = format(date, 'yyyy-MM-dd');
    
    return shifts.filter(shift => {
      const shiftDate = typeof shift.date === 'string' ? shift.date : format(shift.date, 'yyyy-MM-dd');
      const belongsToGroup = shift.employeeGroupId === groupId || 
                            (shift.employeeId && employees.find(e => e.id === shift.employeeId)?.employeeGroupId === groupId);
      return belongsToGroup && shiftDate.substring(0, 10) === formattedDate;
    });
  };

  const getGroupTotalHours = (groupId: string) => {
    const groupShifts = shifts.filter(s => 
      s.employeeGroupId === groupId || 
      (s.employeeId && employees.find(e => e.id === s.employeeId)?.employeeGroupId === groupId)
    );
    
    let totalMinutes = 0;
    
    groupShifts.forEach(shift => {
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

        {/* Group Rows */}
        <div className="p-3 space-y-3">
          {employeeGroups.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p className="text-sm">No groups found</p>
            </div>
          ) : (
            employeeGroups.map((group) => {
              const groupShiftsAll = shifts.filter(s => 
                s.employeeGroupId === group.id || 
                (s.employeeId && employees.find(e => e.id === s.employeeId)?.employeeGroupId === group.id)
              )
              const groupShiftsCount = groupShiftsAll.length
              
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
                          {getGroupTotalHours(group.id)} / {currencySymbol}0.00 / {groupShiftsCount} Shift{groupShiftsCount !== 1 ? 's' : ''}
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
                      const dayShifts = getGroupShifts(group.id, date)
                      const isToday = new Date().toDateString() === date.toDateString()

                      return (
                        <div key={dayIndex} className="px-1">
                          <div className="aspect-square">
                            {dayShifts.length === 0 ? (
                              <button
                                onClick={() => onAddShift({ 
                                  date: formattedDate,
                                  employeeGroupId: group.id 
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
                              <div className="w-full h-full">
                                {dayShifts.slice(0, 1).map(shift => (
                                  <button
                                    key={shift.id}
                                    onClick={() => onEditShift(shift)}
                                    className={`w-full h-full rounded-xl text-white font-medium flex flex-col items-center justify-center gap-0.5 transition-all active:scale-95 ${
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
                                  <div className="text-[9px] text-center text-gray-500 font-medium mt-0.5">
                                    +{dayShifts.length - 1}
                                  </div>
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

        {/* Group Rows */}
        {employeeGroups.map(group => {
          const groupShiftsCount = shifts.filter(s => 
            s.employeeGroupId === group.id || 
            (s.employeeId && employees.find(e => e.id === s.employeeId)?.employeeGroupId === group.id)
          ).length;
          
          return (
            <div key={group.id} className="grid grid-cols-[1fr_repeat(7,minmax(140px,1fr))] border-b hover:bg-gray-50">
              <div className="p-3 border-r">
                <div className="font-medium text-sm text-gray-900">
                  {group.name}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {getGroupTotalHours(group.id)} / {currencySymbol} 0.00 / {groupShiftsCount} Shift{groupShiftsCount !== 1 ? 's' : ''}
                </div>
              </div>
              
              {weekDates.map((date, dateIndex) => {
                const dayShifts = getGroupShifts(group.id, date);
                const shiftGroups = groupOverlappingShifts(dayShifts);
                
                return (
                  <div key={dateIndex} className="border-r p-2 relative min-h-[80px]">
                    {shiftGroups.map((group, groupIndex) => (
                      <React.Fragment key={`group-${groupIndex}`}>
                        {group.map((shift, shiftIndex) => {
                          const employee = employees.find(emp => emp.id === shift.employeeId);
                          
                          return (
                            <div
                              key={shift.id}
                              onClick={() => onEditShift(shift)}
                              className="mb-1 cursor-pointer"
                            >
                              <div className="rounded p-2 text-xs border bg-red-100 border-red-300">
                                <div className="font-medium text-gray-900">
                                  {employee ? `${employee.firstName} ${employee.lastName}` : 'Unknown'}
                                </div>
                                <div className="text-gray-700 mt-0.5">
                                  {shift.function?.name || 'No Function'}
                                </div>
                                <div className="text-gray-700 mt-0.5">
                                  {shift.startTime} - {shift.endTime || 'Active'}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </React.Fragment>
                    ))}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
      </div>
    </div>
  );
}
