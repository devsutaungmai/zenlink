import React from 'react'
import { format } from 'date-fns'
import { Employee } from '@prisma/client'
import { ShiftWithRelations } from '@/types/schedule'
import { useCurrency } from '@/shared/hooks/useCurrency'

interface FunctionItem {
  id: string
  name: string
  categoryId?: string | null
}

interface FunctionGroupedViewProps {
  weekDates: Date[]
  shifts: ShiftWithRelations[]
  employees: Employee[]
  functions: FunctionItem[]
  onEditShift: (shift: ShiftWithRelations) => void
}

export default function FunctionGroupedView({
  weekDates,
  shifts,
  employees,
  functions,
  onEditShift
}: FunctionGroupedViewProps) {
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

        {/* Function Rows */}
        {functions.map(fn => {
          const functionShiftsCount = shifts.filter(s => s.functionId === fn.id).length;
          
          return (
            <div key={fn.id} className="grid grid-cols-[1fr_repeat(7,minmax(140px,1fr))] border-b hover:bg-gray-50">
              <div className="p-3 border-r">
                <div className="font-medium text-sm text-gray-900">
                  {fn.name}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {getFunctionTotalHours(fn.id)} / {currencySymbol} 0.00 / {functionShiftsCount} Shift{functionShiftsCount !== 1 ? 's' : ''}
                </div>
              </div>
              
              {weekDates.map((date, dateIndex) => {
                const dayShifts = getFunctionShifts(fn.id, date);
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
