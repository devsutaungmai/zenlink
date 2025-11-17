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
      {/* Mobile View - Grid Layout like image */}
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
              const employeeShifts = shifts.filter(s => s.employeeId === employee.id)
              const totalHours = employeeShifts.reduce((sum, shift) => {
                if (shift.startTime && shift.endTime) {
                  const [startHour, startMin] = shift.startTime.split(':').map(Number)
                  const [endHour, endMin] = shift.endTime.split(':').map(Number)
                  const hours = (endHour + endMin/60) - (startHour + startMin/60)
                  return sum + hours
                }
                return sum
              }, 0)
              
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
                          {totalHours.toFixed(0)}h 00m / $0.00
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
                      const dayShifts = employeeShifts.filter(shift => {
                        const shiftDate = typeof shift.date === 'string' ? shift.date : format(shift.date, 'yyyy-MM-dd')
                        return shiftDate.substring(0, 10) === formattedDate
                      })
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

      {/* Add Employee Button */}
      <div className="md:hidden p-4">
        <button
          onClick={() => onAddShift()}
          className="w-full py-3 bg-[#31BCFF] text-white rounded-lg font-medium hover:bg-[#28a8e6] flex items-center justify-center gap-2"
        >
          <PlusIcon className="w-5 h-5" />
          Add Employee Shift
        </button>
      </div>

      {/* Desktop View - Original Grid Layout */}
      <div 
        ref={weekScrollableRef}
        className="hidden md:block overflow-x-auto"
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