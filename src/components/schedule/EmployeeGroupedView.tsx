import React from 'react'
import { format } from 'date-fns'
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline'
import { Employee } from '@prisma/client'
import SpanningShiftCard from './SpanningShiftCard'
import { ShiftWithRelations } from '@/types/schedule'
import { useCurrency } from '@/shared/hooks/useCurrency'

interface EmployeeGroupedViewProps {
  weekDates: Date[]
  shifts: ShiftWithRelations[]
  employees: Employee[]
  expandedGroups: Set<string>
  onToggleGroup: (groupId: string) => void
  onEditShift: (shift: ShiftWithRelations) => void
}

export default function EmployeeGroupedView({
  weekDates,
  shifts,
  employees,
  expandedGroups,
  onToggleGroup,
  onEditShift
}: EmployeeGroupedViewProps) {
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

  return (
    <div className="overflow-auto">
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
                  <div key={dateIndex} className="border-r p-2 relative min-h-[80px]">
                    {shiftGroups.map((group, groupIndex) => (
                      <React.Fragment key={`group-${groupIndex}`}>
                        {group.map((shift, shiftIndex) => (
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
  );
}
