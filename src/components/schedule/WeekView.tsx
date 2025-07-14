import React, { useState, useRef } from 'react'
import { format } from 'date-fns'
import { PlusIcon } from '@heroicons/react/24/outline'
import { useTranslation } from 'react-i18next'
import SpanningShiftCard from './SpanningShiftCard'
import HourColumn from './HourColumn'

interface WeekViewProps {
  weekDates: Date[]
  shifts: Shift[]
  employees: Employee[]
  onEditShift: (shift: Shift) => void
  onAddShift: (formData?: any) => void
}

export default function WeekView({
  weekDates,
  shifts,
  employees,
  onEditShift,
  onAddShift
}: WeekViewProps) {
  const { t } = useTranslation('schedule')
  const [isDragging, setIsDragging] = useState(false)
  const [startX, setStartX] = useState(0)
  const [scrollLeft, setScrollLeft] = useState(0)
  const weekScrollableRef = useRef<HTMLDivElement>(null)

  // Drag to create state
  const [isDraggingToCreate, setIsDraggingToCreate] = useState(false)
  const [dragStartHour, setDragStartHour] = useState<number | null>(null)
  const [dragEndHour, setDragEndHour] = useState<number | null>(null)
  const [dragDate, setDragDate] = useState<Date | null>(null)

  // Horizontal scroll handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    // Don't start dragging if clicking on a shift card
    if ((e.target as HTMLElement).closest('.shift-card')) {
      return;
    }
    
    if (!weekScrollableRef.current) return
    
    setIsDragging(true)
    setStartX(e.pageX - weekScrollableRef.current.offsetLeft)
    setScrollLeft(weekScrollableRef.current.scrollLeft)
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !weekScrollableRef.current) return
    
    e.preventDefault()
    const x = e.pageX - weekScrollableRef.current.offsetLeft
    const walk = (x - startX) * 1.5 // Speed multiplier
    weekScrollableRef.current.scrollLeft = scrollLeft - walk
  }

  // Drag to create handlers
  const handleDragStartToCreate = (hour: number, date: Date) => {
    setDragStartHour(hour)
    setDragEndHour(hour)
    setDragDate(date)
    setIsDraggingToCreate(true)
  }

  const handleDragOverToCreate = (hour: number) => {
    if (isDraggingToCreate) {
      setDragEndHour(hour)
    }
  }

  const handleDragEndToCreate = () => {
    if (dragStartHour !== null && dragEndHour !== null && dragDate !== null) {
      const startHour = Math.min(dragStartHour, dragEndHour)
      const endHour = Math.max(dragStartHour, dragEndHour)

      const formattedDate = format(dragDate, 'yyyy-MM-dd')
      const startTime = `${startHour.toString().padStart(2, '0')}:00`
      const endTime = `${(endHour + 1).toString().padStart(2, '0')}:00` // Add 1 to end hour to make range inclusive

      // Pass the form data directly to the parent component
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

      // Reset drag state
      setDragStartHour(null)
      setDragEndHour(null)
      setDragDate(null)
      setIsDraggingToCreate(false)
    }
  }

  const getDayShiftCount = (date: string) => {
    return shifts.filter(shift => shift.date.substring(0, 10) === date).length
  }

  const groupOverlappingShifts = (shifts: Shift[]) => {
    // Sort shifts by start time to ensure consistent grouping
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
      
      // If not added to any existing group, create a new group
      if (!addedToGroup) {
        groups.push([shift]);
      }
    }
    
    return groups;
  };

  return (
    <div className="overflow-hidden">
      <div 
        ref={weekScrollableRef}
        className="min-w-full cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseUp}
      >
        <div className="min-w-full">
          <div className="grid grid-cols-[200px_repeat(7,1fr)] border-b">
            <HourColumn />
            
            {weekDates.map((date, i) => {
              const formattedDate = format(date, 'yyyy-MM-dd')
              const dayShifts = shifts.filter(shift => shift.date.substring(0, 10) === formattedDate)
              const isToday = new Date().toDateString() === date.toDateString()
              
              // Group overlapping shifts
              const shiftGroups = groupOverlappingShifts(dayShifts);
              
              return (
                <div key={i} className="relative">
                  <div className={`p-3 font-medium text-center border-r h-[72px] ${isToday ? 'bg-blue-50' : ''}`}>
                    <div className={`text-gray-950 font-bold ${isToday ? 'text-blue-700' : ''}`}>
                      {isToday ? <span className="text-blue-700">{t('week_view.today')}</span> : format(date, 'EEE, MMM d')}
                    </div>
                    <div className="text-sm text-gray-900">
                      <PlusIcon className="inline h-4 w-4 mr-1" />
                      {dayShifts.length} {t('week_view.shifts')}
                    </div>
                  </div>
                  
                  <div className="relative">
                    {/* Hour cells for drag to create */}
                    {Array.from({ length: 23 }, (_, hour) => hour + 1).map(hour => (
                      <div
                        key={hour}
                        className="border-b border-r p-3 h-[60px] relative hover:bg-gray-50"
                        onMouseDown={() => handleDragStartToCreate(hour, date)}
                        onMouseOver={() => handleDragOverToCreate(hour)}
                        onMouseUp={() => handleDragEndToCreate()}
                        style={{
                          backgroundColor: 
                            isDraggingToCreate && 
                            dragDate && 
                            format(dragDate, 'yyyy-MM-dd') === formattedDate && 
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
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}