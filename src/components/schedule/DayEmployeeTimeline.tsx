import React, { useMemo, useState, useCallback } from 'react'
import { format } from 'date-fns'
import { Employee } from '@prisma/client'
import { PlusIcon } from '@heroicons/react/24/outline'
import { useCurrency } from '@/shared/hooks/useCurrency'
import { ShiftWithRelations } from '@/types/schedule'
import { getShiftSegmentsForDate, ShiftSegment } from './utils'
import ShiftsModal from './ShiftsModal'

interface DayEmployeeTimelineProps {
  date: Date
  shifts: ShiftWithRelations[]
  employees: Employee[]
  onAddShift: (formData?: any) => void
  onEditShift: (shift: ShiftWithRelations) => void
}

interface EmployeeRowMeta {
  id: string
  displayName: string
  firstName?: string | null
  lastName?: string | null
  code?: string | null
  isOpenShift?: boolean
}

const HOURS = Array.from({ length: 24 }, (_, hour) => hour)
const MINUTES_IN_DAY = 24 * 60

const timeToMinutes = (time: string) => {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

const formatDuration = (minutes: number) => {
  const hrs = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hrs}h ${mins}m`
}

const getInitials = (firstName?: string | null, lastName?: string | null) => {
  const first = firstName?.charAt(0) ?? ''
  const last = lastName?.charAt(0) ?? ''
  return (first + last || 'OS').toUpperCase()
}

const assignLanes = (segments: ShiftSegment[]) => {
  const sorted = [...segments].sort((a, b) => {
    if (a.displayStartTime < b.displayStartTime) return -1
    if (a.displayStartTime > b.displayStartTime) return 1
    const aEnd = a.displayEndTime || '24:00'
    const bEnd = b.displayEndTime || '24:00'
    return aEnd.localeCompare(bEnd)
  })

  const laneEndTimes: number[] = []
  return sorted.map(segment => {
    const start = timeToMinutes(segment.displayStartTime)
    const end = timeToMinutes(segment.displayEndTime || '24:00')
    let laneIndex = laneEndTimes.findIndex(endTime => start >= endTime)
    if (laneIndex === -1) {
      laneIndex = laneEndTimes.length
      laneEndTimes.push(end)
    } else {
      laneEndTimes[laneIndex] = end
    }
    return { segment, laneIndex }
  })
}

const getHorizontalPosition = (start: string, end: string | null) => {
  const startMinutes = timeToMinutes(start)
  let endMinutes = end ? timeToMinutes(end) : startMinutes + 60
  if (endMinutes <= startMinutes) {
    endMinutes = startMinutes + 60
  }
  const left = (startMinutes / MINUTES_IN_DAY) * 100
  const width = ((endMinutes - startMinutes) / MINUTES_IN_DAY) * 100
  return {
    left: Math.min(left, 99.5),
    width: Math.max(width, 1)
  }
}

export default function DayEmployeeTimeline({
  date,
  shifts,
  employees,
  onAddShift,
  onEditShift
}: DayEmployeeTimelineProps) {
  const formattedDate = format(date, 'yyyy-MM-dd')
  const { currencySymbol } = useCurrency()
  const readableDate = format(date, 'EEEE, MMMM d, yyyy')
  const daySegments = useMemo(() => getShiftSegmentsForDate(shifts, date), [shifts, date])
  const [hoveredCell, setHoveredCell] = useState<{ rowId: string; hour: number } | null>(null)
  const hourWidthPercent = 100 / HOURS.length

  const segmentsByEmployee = useMemo(() => {
    const map = new Map<string, ShiftSegment[]>()
    daySegments.forEach(segment => {
      const key = segment.shift.employeeId ?? 'open-shifts'
      if (!map.has(key)) {
        map.set(key, [])
      }
      map.get(key)!.push(segment)
    })
    return map
  }, [daySegments])

  const employeeRows: EmployeeRowMeta[] = useMemo(() => {
    const rows: EmployeeRowMeta[] = employees.map(emp => ({
      id: emp.id,
      displayName: `${emp.firstName} ${emp.lastName}`.trim(),
      firstName: emp.firstName,
      lastName: emp.lastName,
      code: emp.employeeNo
    }))

    rows.sort((a, b) => a.displayName.localeCompare(b.displayName))

    return rows
  }, [employees])

  const getStatsForRow = (segments: ShiftSegment[]) => {
    let totalMinutes = 0
    let totalWage = 0

    segments.forEach(segment => {
      const start = timeToMinutes(segment.displayStartTime)
      const end = timeToMinutes(segment.displayEndTime || '24:00')
      totalMinutes += Math.max(end - start, 0)
      if (segment.shift.wage) {
        totalWage += segment.shift.wage
      }
    })

    return {
      duration: formatDuration(totalMinutes),
      wage: totalWage,
      shifts: segments.length
    }
  }

  const handleTimelineMouseMove = useCallback((
    rowId: string,
    event: React.MouseEvent<HTMLDivElement>
  ) => {
    const bounds = event.currentTarget.getBoundingClientRect()
    if (!bounds.width) return
    const clampedX = Math.min(Math.max(event.clientX - bounds.left, 0), bounds.width - 0.001)
    const hourWidthPx = bounds.width / HOURS.length
    const hourIndex = Math.min(
      HOURS.length - 1,
      Math.max(0, Math.floor(clampedX / hourWidthPx))
    )

    setHoveredCell(prev => {
      if (prev?.rowId === rowId && prev.hour === hourIndex) {
        return prev
      }
      return { rowId, hour: hourIndex }
    })
  }, [])

  const handleTimelineMouseLeave = useCallback((rowId: string) => {
    setHoveredCell(prev => (prev?.rowId === rowId ? null : prev))
  }, [])

  // Modal state for showing all shifts
  const [modalState, setModalState] = useState<{
    isOpen: boolean
    shifts: ShiftWithRelations[]
    title: string
  }>({
    isOpen: false,
    shifts: [],
    title: ''
  })

  const handleShowMoreShifts = (shifts: ShiftWithRelations[], employeeName: string) => {
    setModalState({
      isOpen: true,
      shifts,
      title: `${employeeName} - All Shifts`
    })
  }

  const handleCloseModal = () => {
    setModalState({
      isOpen: false,
      shifts: [],
      title: ''
    })
  }

  // Get shifts for mobile view
  const getEmployeeShiftsForMobile = (employeeId: string) => {
    return shifts.filter(shift => {
      const shiftDate = typeof shift.date === 'string' ? shift.date : format(shift.date, 'yyyy-MM-dd')
      return shift.employeeId === employeeId && shiftDate.substring(0, 10) === formattedDate
    })
  }

  return (
    <>
    {/* Mobile View */}
    <div className="md:hidden mt-4 bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
      <div className="p-3 space-y-3">
        {employeeRows.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p className="text-sm">No employees found</p>
          </div>
        ) : (
          employeeRows.map((row) => {
            const employeeShifts = getEmployeeShiftsForMobile(row.id)
            const stats = getStatsForRow(segmentsByEmployee.get(row.id) ?? [])
            
            return (
              <div key={row.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                {/* Employee Header */}
                <div className="flex items-center justify-between px-3 py-2.5 border-b bg-gray-50">
                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-[#31BCFF] flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                      {getInitials(row.firstName, row.lastName)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-gray-900 truncate">
                        {row.displayName}
                      </div>
                      <div className="text-xs text-gray-500">
                        {stats.duration} / {stats.shifts} Shift{stats.shifts !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Shifts */}
                <div className="p-3">
                  <div className="min-h-[60px]">
                    {employeeShifts.length === 0 ? (
                      <button
                        onClick={() => onAddShift({ 
                          date: formattedDate,
                          employeeId: row.id 
                        })}
                        className="w-full h-full min-h-[60px] border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-1 transition-all active:scale-95 border-gray-300 hover:border-[#31BCFF] hover:bg-blue-50"
                      >
                        <PlusIcon className="w-6 h-6 text-[#31BCFF]" />
                      </button>
                    ) : (
                      <div className="w-full h-full flex flex-col gap-1">
                        {employeeShifts.slice(0, 1).map(shift => (
                          <button
                            key={shift.id}
                            onClick={() => onEditShift(shift)}
                            className={`w-full rounded-xl text-white font-medium flex flex-col items-center justify-center gap-0.5 py-2 transition-all active:scale-95 ${
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
                        {employeeShifts.length > 1 && (
                          <button 
                            onClick={() => handleShowMoreShifts(employeeShifts, row.displayName)}
                            className="w-full text-xs text-center text-gray-600 hover:text-[#31BCFF] font-semibold py-1 px-2 bg-gray-100 hover:bg-blue-50 rounded transition-all active:scale-95"
                          >
                            +{employeeShifts.length - 1} more
                          </button>
                        )}
                        <button
                          onClick={() => onAddShift({ 
                            date: formattedDate,
                            employeeId: row.id 
                          })}
                          className="w-full text-xs text-center text-[#31BCFF] font-semibold py-1 px-2 bg-blue-50 hover:bg-blue-100 rounded transition-all active:scale-95 mt-1"
                        >
                          + Add
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>

    {/* Desktop View */}
    <div className="hidden md:block mt-4 overflow-hidden rounded-xl border border-gray-200 bg-white">
      <div className="overflow-x-auto">
        <div className="min-w-[1100px]">
          {/* Header Row */}
          <div className="grid grid-cols-[260px_1fr] border-b bg-gray-50">
            <div className="px-4 py-3 flex flex-col gap-1 border-r">
              <div className="text-xs text-gray-500">{employeeRows.length - 1} employees • {daySegments.length} shifts</div>
              <div className="flex items-center gap-3 text-xs font-medium pt-1">
                <button className="text-[#31BCFF] hover:text-blue-500">Manage Employees</button>
              </div>
            </div>
            <div className="grid grid-cols-24 text-[11px] font-semibold text-gray-500">
              {HOURS.map(hour => (
                <div key={`hour-header-${hour}`} className="py-3 text-center border-l first:border-l-0">
                  {hour.toString().padStart(2, '0')}
                </div>
              ))}
            </div>
          </div>


          {/* Employee Rows */}
          {employeeRows.map(row => {
            const rowSegments = segmentsByEmployee.get(row.id) ?? []
            const laneData = assignLanes(rowSegments)
            const laneCount = laneData.length ? Math.max(...laneData.map(item => item.laneIndex)) + 1 : 1
            const rowHeight = Math.max(72, laneCount * 32 + 24)
            const stats = getStatsForRow(rowSegments)

            return (
              <div key={row.id} className="grid grid-cols-[260px_1fr] border-b last:border-b-0">
                {/* Employee meta */}
                <div className="px-4 py-4 flex items-center justify-between gap-3 border-r">
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="text-sm font-semibold text-gray-900">{row.displayName}</div>
                      <div className="text-[11px] text-gray-500">{stats.duration} • {currencySymbol}{stats.wage.toFixed(2)} • {stats.shifts} Shift{stats.shifts === 1 ? '' : 's'}</div>
                    </div>
                  </div>
                </div>

                {/* Timeline */}
                <div
                  className="relative group"
                  style={{ minHeight: `${rowHeight}px` }}
                  onMouseMove={(event) => handleTimelineMouseMove(row.id, event)}
                  onMouseLeave={() => handleTimelineMouseLeave(row.id)}
                >
                  {/* Grid background */}
                  <div className="absolute inset-0 grid grid-cols-24 pointer-events-none">
                    {HOURS.map(hour => (
                      <div
                        key={`grid-${row.id}-${hour}`}
                        className={`border-l border-b border-gray-100 transition-colors ${
                          hoveredCell?.rowId === row.id && hoveredCell.hour === hour
                            ? 'bg-blue-50'
                            : ''
                        }`}
                      />
                    ))}
                  </div>

                  {hoveredCell?.rowId === row.id && (
                    <button
                      onClick={(event) => {
                        event.stopPropagation()
                        const hour = hoveredCell.hour
                        const startTime = `${hour.toString().padStart(2, '0')}:00`
                        onAddShift({
                          date: formattedDate,
                          startTime,
                          employeeId: row.isOpenShift ? undefined : row.id
                        })
                      }}
                      className="absolute z-30 w-7 h-7 rounded-full bg-white border border-[#31BCFF] text-[#31BCFF] flex items-center justify-center shadow-sm hover:bg-[#31BCFF] hover:text-white focus-visible:outline-none"
                      style={{
                        top: '8px',
                        left: `calc(${(hoveredCell.hour * hourWidthPercent) + (hourWidthPercent / 2)}% - 14px)`
                      }}
                      title={`Add shift at ${hoveredCell.hour.toString().padStart(2, '0')}:00`}
                    >
                      <PlusIcon className="w-4 h-4" />
                    </button>
                  )}

                  <div className="relative h-full py-3">
                    {laneData.map(({ segment, laneIndex }) => {
                      const { left, width } = getHorizontalPosition(segment.displayStartTime, segment.displayEndTime)
                      const topOffset = laneIndex * 34
                      const employeeName = segment.shift.employee
                        ? `${segment.shift.employee.firstName} ${segment.shift.employee.lastName}`
                        : 'Unassigned'

                      return (
                        <button
                          key={`${segment.segmentId}-${laneIndex}`}
                          onClick={() => onEditShift(segment.shift)}
                          className="absolute rounded-md px-2 py-1 text-xs font-medium text-white shadow-sm bg-[#31BCFF] hover:bg-blue-500 transition-colors truncate"
                          style={{
                            left: `${left}%`,
                            width: `${width}%`,
                            top: `${topOffset}px`,
                            minWidth: '30px',
                            zIndex: 30
                          }}
                          title={`${segment.shift.function?.name || 'No function'} • ${segment.displayStartTime} - ${segment.displayEndTime || 'Active'} • ${employeeName}`}
                        >
                          <div className="truncate">
                            {segment.shift.function?.name || 'Shift'}
                          </div>
                          <div className="text-[10px] opacity-80 truncate">
                            {segment.displayStartTime} - {segment.displayEndTime || 'Active'}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>

    {/* Shifts Modal */}
    <ShiftsModal
      isOpen={modalState.isOpen}
      onClose={handleCloseModal}
      shifts={modalState.shifts}
      date={date}
      title={modalState.title}
      employees={employees}
      onEditShift={onEditShift}
    />
    </>
  )
}
