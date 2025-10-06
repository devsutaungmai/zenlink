import React, { useState, useRef } from 'react'
import { format } from 'date-fns'
import { useTranslation } from 'react-i18next'
import SpanningShiftCard from './SpanningShiftCard'
import HourColumn from './HourColumn'
import { useUser } from '@/shared/lib/useUser'
import { Shift, Employee } from '@prisma/client'
interface DayViewProps {
  selectedDate: Date
  shifts: Shift[]
  onAddShift: (formData?: any) => void
  onEditShift: (shift: Shift) => void
  employees: Employee[]
}

export default function DayView({ 
  selectedDate, 
  shifts, 
  onAddShift, 
  onEditShift, 
  employees = []
}: DayViewProps) {
  const { user } = useUser()
  const { t, i18n } = useTranslation('schedule')
  const isEmployee = user?.role === 'EMPLOYEE'
  
  const [isDraggingToCreate, setIsDraggingToCreate] = useState(false)
  const [dragStartHour, setDragStartHour] = useState<number | null>(null)
  const [dragEndHour, setDragEndHour] = useState<number | null>(null)

  const handleDragStartToCreate = (hour: number) => {
    if (isEmployee) return
    
    setDragStartHour(hour)
    setDragEndHour(hour)
    setIsDraggingToCreate(true)
  }

  const handleDragOverToCreate = (hour: number) => {
    if (isDraggingToCreate) {
      setDragEndHour(hour)
    }
  }

  const handleDragEndToCreate = () => {
    if (isEmployee) return
    
    if (dragStartHour !== null && dragEndHour !== null) {
      const startHour = Math.min(dragStartHour, dragEndHour)
      const endHour = Math.max(dragStartHour, dragEndHour)

      const formattedDate = format(selectedDate, 'yyyy-MM-dd')
      const startTime = `${startHour.toString().padStart(2, '0')}:00`
      const endTime = `${(endHour + 1).toString().padStart(2, '0')}:00` 


      onAddShift({
        date: formattedDate,
        startTime,
        endTime,
        shiftType: 'NORMAL',
        wage: 0,
        wageType: 'HOURLY',
        approved: false,
        employeeId: '',
        employeeGroupId: undefined,
        note: ''
      });

      setDragStartHour(null)
      setDragEndHour(null)
      setIsDraggingToCreate(false)
    }
  }

  const groupOverlappingShifts = (shifts: Shift[]) => {
    const sortedShifts = [...shifts].sort((a, b) => {
      // First by start time
      if (a.startTime < b.startTime) return -1;
      if (a.startTime > b.startTime) return 1;
      
      // Then by end time if start times are equal
      const aEndTime = a.endTime || '23:59'; // Use end of day for active shifts
      const bEndTime = b.endTime || '23:59';
      return aEndTime < bEndTime ? -1 : 1;
    });

    const groups: Shift[][] = [];
    
    for (const shift of sortedShifts) {
      // Find if this shift overlaps with any existing groups
      let addedToGroup = false;
      
      for (const group of groups) {
        const overlapsWithGroup = group.some(groupShift => {
          // Check if shifts overlap - handle null endTime
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

  const formattedDate = format(selectedDate, 'yyyy-MM-dd')
  const isToday = new Date().toDateString() === selectedDate.toDateString()
  const shiftGroups = groupOverlappingShifts(shifts);

  if (!employees) {
    return (
      <div className="mt-4 overflow-hidden">
        <div className="text-center p-4">{t('day_view.loading_employee_data')}</div>
      </div>
    );
  }

  return (
    <div className="mt-4 overflow-hidden">
      <div className="min-w-full">
        <div className="grid grid-cols-[200px_1fr] border-b">
          <HourColumn />
          
          <div className="relative day-column">
            <div className={`p-3 font-medium text-center border-r h-[72px] ${isToday ? 'bg-blue-50' : ''}`}>
              <div className={`text-gray-950 font-bold ${isToday ? 'text-blue-700' : ''}`}>
                {isToday ? <span className="text-blue-700">{t('day_view.today')}</span> : format(selectedDate, 'EEEE, MMMM d, yyyy')}
              </div>
              <div className="text-sm text-gray-900">
                <span className="ml-2">{shifts.length} {t('day_view.shifts')}</span>
              </div>
            </div>
            
            <div className="relative">
              {Array.from({ length: 23 }, (_, hour) => hour + 1).map(hour => (
                <div
                  key={hour}
                  className={`border-b border-r p-3 h-[60px] relative ${!isEmployee ? 'hover:bg-gray-50' : ''}`}
                  onMouseDown={() => handleDragStartToCreate(hour)}
                  onMouseOver={() => handleDragOverToCreate(hour)}
                  onMouseUp={() => handleDragEndToCreate()}
                  style={{
                    backgroundColor: 
                      isDraggingToCreate && 
                      ((hour >= Math.min(dragStartHour || 0, dragEndHour || 0) && 
                        hour <= Math.max(dragStartHour || 0, dragEndHour || 0)))
                        ? 'rgba(49, 188, 255, 0.2)'
                        : undefined
                  }}
                />
              ))}
              
              {/* Render grouped shifts */}
              {shiftGroups.map((group, groupIndex) => (
                <React.Fragment key={`group-${groupIndex}`}>
                  {group.map((shift, shiftIndex) => (
                    <SpanningShiftCard 
                      key={shift.id} 
                      shift={shift} 
                      date={formattedDate}
                      employees={employees}
                      onEdit={onEditShift}
                      index={shiftIndex}
                      total={group.length}
                    />
                  ))}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}