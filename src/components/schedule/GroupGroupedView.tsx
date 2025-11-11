import React from 'react'
import { format } from 'date-fns'
import { Employee } from '@prisma/client'
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
}

export default function GroupGroupedView({
  weekDates,
  shifts,
  employees,
  employeeGroups,
  onEditShift
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
  );
}
