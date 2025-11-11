import React, { useState, useRef } from 'react'
import { format } from 'date-fns'
import { PlusIcon } from '@heroicons/react/24/outline'
import { useTranslation } from 'react-i18next'
import SpanningShiftCard from './SpanningShiftCard'
import HourColumn from './HourColumn'
import { Shift as PrismaShift, Employee } from '@prisma/client'

type Shift = PrismaShift & {
  functionId?: string | null;
};

interface WeekViewProps {
  weekDates: Date[]
  shifts: Shift[]
  employees: Employee[]
  employeeGroups?: any[]
  functions?: any[]
  categories?: any[]
  scheduleViewType?: 'time' | 'employees' | 'groups' | 'functions'
  onEditShift: (shift: Shift) => void
  onAddShift: (formData?: any) => void
}

export default function WeekView({
  weekDates,
  shifts,
  employees,
  employeeGroups = [],
  functions = [],
  categories = [],
  scheduleViewType = 'time',
  onEditShift,
  onAddShift
}: WeekViewProps) {
  const { t, i18n } = useTranslation('schedule')
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
    return shifts.filter(shift => {
      const shiftDate = typeof shift.date === 'string' ? shift.date : format(shift.date, 'yyyy-MM-dd')
      return shiftDate.substring(0, 10) === date
    }).length
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

  // Group shifts based on schedule view type
  const getGroupedData = () => {
    if (scheduleViewType === 'employees') {
      // Group by employee
      const employeeMap = new Map();
      employees.forEach(emp => {
        employeeMap.set(emp.id, {
          id: emp.id,
          name: `${emp.firstName} ${emp.lastName}`,
          shifts: []
        });
      });
      
      shifts.forEach(shift => {
        if (shift.employeeId && employeeMap.has(shift.employeeId)) {
          employeeMap.get(shift.employeeId).shifts.push(shift);
        }
      });
      
      return Array.from(employeeMap.values());
    } else if (scheduleViewType === 'groups') {
      // Group by employee group
      const groupMap = new Map();
      employeeGroups.forEach(group => {
        groupMap.set(group.id, {
          id: group.id,
          name: group.name,
          shifts: []
        });
      });
      
      shifts.forEach(shift => {
        if (shift.employeeGroupId && groupMap.has(shift.employeeGroupId)) {
          groupMap.get(shift.employeeGroupId).shifts.push(shift);
        }
      });
      
      return Array.from(groupMap.values());
    } else if (scheduleViewType === 'functions') {
      // Group by function/position
      const functionMap = new Map();
      functions.forEach(func => {
        functionMap.set(func.id, {
          id: func.id,
          name: func.name,
          shifts: []
        });
      });
      
      shifts.forEach(shift => {
        if (shift.functionId && functionMap.has(shift.functionId)) {
          functionMap.get(shift.functionId).shifts.push(shift);
        }
      });
      
      return Array.from(functionMap.values());
    }
    
    return [];
  };

  return (
    <div className="overflow-hidden">
      <div 
        ref={weekScrollableRef}
        className="overflow-x-auto"
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseUp}
      >
        <div>
          <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b min-w-full">
            <HourColumn />
            
            {weekDates.map((date, i) => {
              const formattedDate = format(date, 'yyyy-MM-dd')
              const dayShifts = shifts.filter(shift => {
                const shiftDate = typeof shift.date === 'string' ? shift.date : format(shift.date, 'yyyy-MM-dd')
                return shiftDate.substring(0, 10) === formattedDate
              })
              const isToday = new Date().toDateString() === date.toDateString()
              
              // Group overlapping shifts
              const shiftGroups = groupOverlappingShifts(dayShifts);
              
              return (
                <div key={i} className="relative">
                  <div className={`p-1 font-medium text-center border-r h-[40px] flex flex-col justify-center ${isToday ? 'bg-blue-50' : ''}`}>
                    <div className={`text-xs text-gray-950 font-bold ${isToday ? 'text-blue-700' : ''}`}>
                      {isToday ? <span className="text-blue-700">{t('week_view.today')}</span> : (
                        <>
                          <span className="hidden md:inline">{format(date, 'EEE, MMM d')}</span>
                          <span className="md:hidden">{format(date, 'EEE d')}</span>
                        </>
                      )}
                    </div>
                    <div className="text-[10px] text-gray-900">
                      <PlusIcon className="inline h-3 w-3 mr-0.5" />
                      <span className="hidden sm:inline">{dayShifts.length} {t('week_view.shifts')}</span>
                      <span className="sm:hidden">{dayShifts.length}</span>
                    </div>
                  </div>
                  
                  <div className="relative">
                    {/* Hour cells for drag to create */}
                    {Array.from({ length: 23 }, (_, hour) => hour + 1).map(hour => (
                      <div
                        key={hour}
                        className="border-b border-r p-1 h-[24px] relative hover:bg-gray-50"
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