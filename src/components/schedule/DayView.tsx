import React, { useState } from 'react'
import { format } from 'date-fns'
import { useTranslation } from 'react-i18next'
import SpanningShiftCard from './SpanningShiftCard'
import HourColumn from './HourColumn'
import { useUser } from '@/shared/lib/useUser'
import { Employee } from '@prisma/client'
import { getShiftSegmentsForDate, ShiftSegment } from './utils'
import { ShiftWithRelations } from '@/types/schedule'
interface DayViewProps {
  selectedDate: Date
  shifts: ShiftWithRelations[]
  onAddShift: (formData?: any) => void
  onEditShift: (shift: ShiftWithRelations) => void
  employees: Employee[]
  canCreateShifts?: boolean
  canEditShifts?: boolean
}

export default function DayView({ 
  selectedDate, 
  shifts, 
  onAddShift, 
  onEditShift, 
  employees = [],
  canCreateShifts = true,
  canEditShifts = true
}: DayViewProps) {
  const { user } = useUser()
  const { t, i18n } = useTranslation('schedule')
  const isEmployee = user?.role === 'EMPLOYEE'
  
  const [isDraggingToCreate, setIsDraggingToCreate] = useState(false)
  const [dragStartHour, setDragStartHour] = useState<number | null>(null)
  const [dragEndHour, setDragEndHour] = useState<number | null>(null)

  const handleDragStartToCreate = (hour: number) => {
    if (isEmployee || !canCreateShifts) return
    
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
    if (isEmployee || !canCreateShifts) return
    
    if (dragStartHour !== null && dragEndHour !== null) {
      const startHour = Math.min(dragStartHour, dragEndHour)
      const endHourExclusive = Math.max(dragStartHour, dragEndHour) + 1
      const normalizeHour = (hour: number) => ((hour % 24) + 24) % 24

      const formattedDate = format(selectedDate, 'yyyy-MM-dd')
      const startTime = `${normalizeHour(startHour).toString().padStart(2, '0')}:00`
      const endTime = `${normalizeHour(endHourExclusive).toString().padStart(2, '0')}:00`


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

  const getMinutes = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number)
    return hours * 60 + minutes
  }

  const groupOverlappingShifts = (segments: ShiftSegment[]) => {
    const sortedSegments = [...segments].sort((a, b) => {
      if (a.displayStartTime < b.displayStartTime) return -1
      if (a.displayStartTime > b.displayStartTime) return 1

      const aEnd = a.displayEndTime || '24:00'
      const bEnd = b.displayEndTime || '24:00'
      if (aEnd < bEnd) return -1
      if (aEnd > bEnd) return 1
      return 0
    })

    const groups: ShiftSegment[][] = []

    for (const segment of sortedSegments) {
      let addedToGroup = false

      for (const group of groups) {
        const overlapsWithGroup = group.some(groupSegment => {
          const segmentStart = getMinutes(segment.displayStartTime)
          const segmentEnd = getMinutes(segment.displayEndTime || '24:00')
          const groupStart = getMinutes(groupSegment.displayStartTime)
          const groupEnd = getMinutes(groupSegment.displayEndTime || '24:00')

          return segmentStart < groupEnd && segmentEnd > groupStart
        })

        if (overlapsWithGroup) {
          group.push(segment)
          addedToGroup = true
          break
        }
      }

      if (!addedToGroup) {
        groups.push([segment])
      }
    }

    return groups
  }

  const formattedDate = format(selectedDate, 'yyyy-MM-dd')
  const isToday = new Date().toDateString() === selectedDate.toDateString()
  const daySegments = getShiftSegmentsForDate(shifts, selectedDate)
  const shiftGroups = groupOverlappingShifts(daySegments)

  if (!employees) {
    return (
      <div className="mt-4 overflow-hidden">
        <div className="text-center p-4">{t('day_view.loading_employee_data')}</div>
      </div>
    );
  }

  return (
    <div className="mt-4 overflow-hidden -mx-4 sm:mx-0">
      <div className="sm:overflow-x-auto sm:touch-pan-x">
        <div className="sm:min-w-[600px]">
          <div className="grid grid-cols-[60px_1fr] sm:grid-cols-[150px_1fr] md:grid-cols-[200px_1fr] border-b">
            <HourColumn />
            
            <div className="relative day-column">
              <div className={`p-1 font-medium text-center border-r h-[40px] flex flex-col justify-center ${isToday ? 'bg-blue-50' : ''}`}>
                <div className={`text-xs text-gray-950 font-bold ${isToday ? 'text-blue-700' : ''}`}>
                  {isToday ? <span className="text-blue-700">{t('day_view.today')}</span> : (
                    <>
                      <span className="hidden md:inline">{format(selectedDate, 'EEEE, MMMM d, yyyy')}</span>
                      <span className="md:hidden">{format(selectedDate, 'EEE, MMM d, yyyy')}</span>
                    </>
                  )}
                </div>
                <div className="text-[10px] text-gray-900">
                  <span className="ml-1">{daySegments.length} {t('day_view.shifts')}</span>
                </div>
              </div>
              
              <div className="relative">
              {Array.from({ length: 24 }, (_, hour) => hour).map(hour => (
                <div
                  key={hour}
                  className={`border-b border-r p-1 h-[24px] relative ${!isEmployee ? 'hover:bg-gray-50' : ''}`}
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
                  {group.map((segment, shiftIndex) => (
                    <SpanningShiftCard 
                      key={segment.segmentId}
                      shift={segment.shift} 
                      date={formattedDate}
                      employees={employees}
                      onEdit={onEditShift}
                      index={shiftIndex}
                      total={group.length}
                      displayStartTime={segment.displayStartTime}
                      displayEndTime={segment.displayEndTime}
                      isContinuation={segment.isContinuation}
                      canEdit={canEditShifts}
                    />
                  ))}
                </React.Fragment>
              ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}