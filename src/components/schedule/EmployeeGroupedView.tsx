import React, { useState, useRef, useEffect } from 'react'
import { format } from 'date-fns'
import { useTranslation } from 'react-i18next'
import { formatDate } from '@/shared/lib/dateLocale'
import { ChevronDownIcon, ChevronRightIcon, PlusIcon } from '@heroicons/react/24/outline'
import { Clock, Pencil, Copy, CopyPlus, GripVertical, ArrowRightLeft } from 'lucide-react'
import { Employee } from '@prisma/client'
import SpanningShiftCard from './SpanningShiftCard'
import { ShiftWithRelations } from '@/types/schedule'
import { useCurrency } from '@/shared/hooks/useCurrency'
import ShiftsModal from './ShiftsModal'
import { useShiftDragDrop } from '@/shared/hooks/useShiftDragDrop'

interface EmployeeGroupedViewProps {
  weekDates: Date[]
  shifts: ShiftWithRelations[]
  employees: Employee[]
  expandedGroups: Set<string>
  onToggleGroup: (groupId: string) => void
  onEditShift: (shift: ShiftWithRelations) => void
  onAddShift?: (data?: { date?: string; employeeId?: string }) => void
  onCreateAttendance?: (shift: ShiftWithRelations) => void
  isEmployeeUnavailable?: (employeeId: string, date: string) => boolean
  onUnavailableClick?: (employeeId: string, date: string) => void
  canCreateShifts?: boolean
  canEditShifts?: boolean
  canCreateAttendance?: boolean
  onMoveShift?: (shiftId: string, target: any) => Promise<void>
  onDuplicateShift?: (shiftId: string, targets: any[]) => Promise<void>
}

export default function EmployeeGroupedView({
  weekDates,
  shifts,
  employees,
  expandedGroups,
  onToggleGroup,
  onEditShift,
  onAddShift = () => {},
  onCreateAttendance,
  isEmployeeUnavailable,
  onUnavailableClick,
  canCreateShifts = true,
  canEditShifts = true,
  canCreateAttendance = false,
  onMoveShift,
  onDuplicateShift
}: EmployeeGroupedViewProps) {
  const { t, i18n } = useTranslation('schedule')
  const { currencySymbol } = useCurrency()

  const noopMove = async () => {}
  const noopDuplicate = async () => {}
  const { dragOverCell, isDragging, copyMode, toggleCopyMode, handleDragStart, handleDragOver, handleDragLeave, handleDrop, handleDragEnd } = useShiftDragDrop({
    onMoveShift: onMoveShift || noopMove,
    onDuplicateShift: onDuplicateShift || noopDuplicate,
    canEditShifts,
    isDropDisabled: (rowId, date) => isEmployeeUnavailable?.(rowId, date) ?? false
  })

  const [duplicateCount, setDuplicateCount] = useState(1)
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false)
  const [duplicateShiftId, setDuplicateShiftId] = useState<string | null>(null)
  const [modalState, setModalState] = useState<{
    isOpen: boolean
    shifts: ShiftWithRelations[]
    date: Date | null
    title: string
  }>({
    isOpen: false,
    shifts: [],
    date: null,
    title: ''
  })
  const [contextMenu, setContextMenu] = useState<{
    show: boolean
    x: number
    y: number
    shift: ShiftWithRelations | null
  }>({ show: false, x: 0, y: 0, shift: null })
  const contextMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node)) {
        setContextMenu(prev => ({ ...prev, show: false }))
      }
    }
    if (contextMenu.show) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [contextMenu.show])

  const handleShiftContextMenu = (e: React.MouseEvent, shift: ShiftWithRelations) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({ show: true, x: e.clientX, y: e.clientY, shift })
  }
  
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

  const handleShowMoreShifts = (shifts: ShiftWithRelations[], date: Date, employeeName: string) => {
    setModalState({
      isOpen: true,
      shifts,
      date,
      title: `${employeeName} - ${t('week_view.shifts')}`
    })
  }

  const handleCloseModal = () => {
    setModalState({
      isOpen: false,
      shifts: [],
      date: null,
      title: ''
    })
  }

  const dayCount = Math.max(weekDates.length, 1)
  const isTwoWeekView = dayCount > 7
  const baseColumnMinWidth = 220
  const dayColumnMinWidth = 120
  const desktopMinWidth = isTwoWeekView ? `${baseColumnMinWidth + dayCount * dayColumnMinWidth}px` : undefined
  const mobileGridStyle: React.CSSProperties = {
    gridTemplateColumns: `repeat(${dayCount}, minmax(0, 1fr))`,
    minWidth: isTwoWeekView ? `${dayCount * 72}px` : undefined
  }
  const desktopGridStyle: React.CSSProperties = {
    gridTemplateColumns: isTwoWeekView
      ? `minmax(${baseColumnMinWidth}px, 1fr) repeat(${dayCount}, minmax(${dayColumnMinWidth}px, 1fr))`
      : `1fr repeat(${dayCount}, minmax(0, 1fr))`,
    minWidth: desktopMinWidth
  }

  return (
    <div className="overflow-hidden">
      {/* Mobile View - Grid Layout */}
      <div className="md:hidden bg-gray-50">
        {/* Week Days Header - Perfectly aligned with grid */}
        <div className="bg-white sticky top-0 z-10 border-b shadow-sm overflow-x-auto">
          <div className="grid gap-0" style={mobileGridStyle}>
            {weekDates.map((date, i) => {
              const isToday = new Date().toDateString() === date.toDateString()
              return (
                <div key={i} className="text-center py-3 border-r last:border-r-0">
                  <div className={`text-xs font-medium mb-0.5 ${isToday ? 'text-[#31BCFF]' : 'text-gray-500'}`}>
                    {formatDate(date, 'EEE', i18n.language)}
                  </div>
                  <div className={`text-xl font-bold ${isToday ? 'text-[#31BCFF]' : 'text-gray-900'}`}>
                    {format(date, 'd')}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Open Shifts Row - Mobile */}
        {(() => {
          const openShifts = shifts.filter(s => s.status === 'OPEN' && !s.employeeId);
          
          return (
            <div className="p-3 pb-0">
              <div className="bg-emerald-50 rounded-xl border border-emerald-200 overflow-hidden shadow-sm">
                <div className="flex items-center justify-between px-3 py-2.5 border-b bg-emerald-100/50">
                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-emerald-500 flex items-center justify-center text-white">
                      <div className="w-3 h-3 rounded-full bg-white animate-pulse"></div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-emerald-800">
                        {t('week_view.open_shifts') || 'Open Shifts'}
                      </div>
                      <div className="text-xs text-emerald-600">
                        {openShifts.length} {t('week_view.available') || 'available'}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <div className="grid gap-0 p-3" style={mobileGridStyle}>
                    {weekDates.map((date, dayIndex) => {
                      const formattedDate = format(date, 'yyyy-MM-dd');
                      const dayOpenShifts = openShifts.filter(shift => {
                        const shiftDate = typeof shift.date === 'string' ? shift.date : format(shift.date, 'yyyy-MM-dd');
                        return shiftDate.substring(0, 10) === formattedDate;
                      });
                      
                      return (
                        <div key={dayIndex} className="px-1">
                          <div className="min-h-[60px] flex flex-col relative">
                            {dayOpenShifts.slice(0, 1).map(shift => (
                              <button
                                key={shift.id}
                                onClick={() => onEditShift(shift)}
                                className="w-full rounded-lg p-2 text-left border-2 border-dashed border-emerald-400 bg-emerald-100"
                              >
                                <div className="text-[11px] font-semibold text-emerald-800 flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                  {t('week_view.open') || 'Open'}
                                </div>
                                <div className="text-[10px] text-emerald-700 mt-0.5">
                                  {shift.startTime} - {shift.endTime || 'Open'}
                                </div>
                              </button>
                            ))}
                            {dayOpenShifts.length > 1 && (
                              <button
                                onClick={() => handleShowMoreShifts(dayOpenShifts, date, t('week_view.open_shifts') || 'Open Shifts')}
                                className="text-[10px] text-emerald-600 font-medium"
                              >
                                +{dayOpenShifts.length - 1} more
                              </button>
                            )}
                            <button
                              onClick={() => onAddShift({ date: formattedDate })}
                              className="absolute bottom-1 right-1 w-6 h-6 border bg-white rounded-full flex items-center justify-center transition-all shadow-sm border-emerald-400 hover:bg-emerald-500 hover:text-white text-emerald-500"
                            >
                              <PlusIcon className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Employee Rows */}
        <div className="p-3 space-y-3">
          {employees.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p className="text-sm">{t('header.no_employees_found')}</p>
            </div>
          ) : (
            employees.map((employee) => {
              const employeeShiftsAll = shifts.filter(s => s.employeeId === employee.id)
              const employeeShiftsCount = employeeShiftsAll.length
              
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
                          {getEmployeeTotalHours(employee.id)} / {currencySymbol}0.00 / {employeeShiftsCount} {t('week_view.shifts')}
                        </div>
                      </div>
                    </div>
                    <button className="text-gray-400 hover:text-gray-600 p-1 text-xl leading-none">
                      ×
                    </button>
                  </div>

                  {/* Day Grid - Exactly 7 columns matching header */}
                  <div className="overflow-x-auto">
                    <div className="grid gap-0 p-3" style={mobileGridStyle}>
                    {weekDates.map((date, dayIndex) => {
                      const formattedDate = format(date, 'yyyy-MM-dd')
                      const dayShifts = getEmployeeShifts(employee.id, date)
                      const isToday = new Date().toDateString() === date.toDateString()
                      const unavailable = isEmployeeUnavailable?.(employee.id, formattedDate) ?? false

                      return (
                        <div key={dayIndex} className="px-1">
                          <div className="min-h-[60px]">
                            {dayShifts.length === 0 ? (
                              canCreateShifts ? (
                                <button
                                  onClick={() => {
                                    if (unavailable) {
                                      onUnavailableClick?.(employee.id, formattedDate)
                                      return
                                    }
                                    onAddShift({ 
                                      date: formattedDate,
                                      employeeId: employee.id 
                                    })
                                  }}
                                  className={`w-full h-full min-h-[60px] border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-1 transition-all active:scale-95 ${
                                    unavailable
                                      ? 'border-red-300 bg-red-50 text-red-500 cursor-not-allowed'
                                      : isToday 
                                        ? 'border-[#31BCFF] bg-blue-50 hover:bg-blue-100' 
                                        : 'border-gray-300 hover:border-[#31BCFF] hover:bg-blue-50'
                                  }`}
                                >
                                  <PlusIcon className={`w-6 h-6 ${unavailable ? 'text-red-400' : 'text-[#31BCFF]'}`} />
                                  {unavailable && (
                                    <span className="hidden md:inline text-[10px] font-semibold text-red-500">Unavailable</span>
                                  )}
                                </button>
                              ) : (
                                <div className="w-full h-full min-h-[60px] border-2 border-dashed border-gray-200 rounded-xl" />
                              )
                            ) : (
                              <div className="w-full h-full flex flex-col gap-1">
                                {dayShifts.map(shift => (
                                  <button
                                    key={shift.id}
                                    onClick={() => onEditShift(shift)}
                                    className={`w-full rounded-xl font-medium flex flex-col items-center justify-center gap-0.5 py-2 transition-all active:scale-95 cursor-pointer ${
                                      shift.status === 'CANCELLED' ? 'bg-red-500 text-white' :
                                      shift.status === 'WORKING' ? 'bg-blue-500 text-white' :
                                      shift.approved ? 'bg-lime-200 text-lime-900 border-2 border-lime-500' :
                                      'bg-[#31BCFF] text-white'
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
                                <button
                                  onClick={() => {
                                    if (unavailable) {
                                      onUnavailableClick?.(employee.id, formattedDate)
                                      return
                                    }
                                    onAddShift({ 
                                      date: formattedDate,
                                      employeeId: employee.id 
                                    })
                                  }}
                                  className="w-full text-xs text-center text-[#31BCFF] font-semibold py-1 px-2 bg-blue-50 hover:bg-blue-100 rounded transition-all active:scale-95 mt-1"
                                >
                                  + Add
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Desktop View - Original Grid Layout */}
      <div className="hidden md:block overflow-x-auto">
      <div className="min-w-full" style={desktopMinWidth ? { minWidth: desktopMinWidth } : undefined}>
        {/* Header Row */}
        <div
          className="grid border-b bg-gray-50 sticky top-0"
          style={desktopGridStyle}
        >
          <div className="p-3 font-medium text-sm border-r flex items-center justify-center">
            {canEditShifts && (
              <div className="inline-flex rounded-md border border-gray-200 bg-white shadow-sm" role="group">
                <button
                  onClick={() => copyMode && toggleCopyMode()}
                  className={`inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded-l-md transition-colors ${
                    !copyMode
                      ? 'bg-blue-400 text-white'
                      : 'bg-white text-gray-500 hover:bg-gray-50'
                  }`}
                  title={t('context_menu.copy_mode_off') || 'Drag to move'}
                >
                  <ArrowRightLeft className="w-3 h-3" />
                  Move
                </button>
                <button
                  onClick={() => !copyMode && toggleCopyMode()}
                  className={`inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded-r-md transition-colors ${
                    copyMode
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-500 hover:bg-gray-50'
                  }`}
                  title={t('context_menu.copy_mode_on') || 'Drag to duplicate'}
                >
                  <Copy className="w-3 h-3" />
                  Copy
                </button>
              </div>
            )}
          </div>
          {weekDates.map((date, i) => {
            const isToday = new Date().toDateString() === date.toDateString();
            const dayShifts = shifts.filter(shift => {
              const shiftDate = typeof shift.date === 'string' ? shift.date : format(shift.date, 'yyyy-MM-dd');
              return shiftDate.substring(0, 10) === format(date, 'yyyy-MM-dd');
            });
            
            return (
              <div key={i} className={`p-2 text-center border-r ${isToday ? 'bg-blue-50' : ''}`}>
                <div className={`text-xs font-semibold ${isToday ? 'text-blue-700' : 'text-gray-900'}`}>
                  {isToday ? t('week_view.today') : formatDate(date, 'EEE, MMM d', i18n.language)}
                </div>
                <div className="text-[10px] text-gray-600 mt-0.5">
                  + {dayShifts.length} {t('week_view.shifts')}
                </div>
              </div>
            );
          })}
        </div>

        {/* Open Shifts Row */}
        {(() => {
          const openShifts = shifts.filter(s => s.status === 'OPEN' && !s.employeeId);
          
          return (
            <div
              className="grid border-b bg-emerald-50/50"
              style={desktopGridStyle}
            >
              <div className="p-3 border-r">
                <div className="font-medium text-sm text-emerald-700 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                  {t('week_view.open_shifts') || 'Open Shifts'}
                </div>
                <div className="text-xs text-emerald-600 mt-0.5">
                  {openShifts.length} {t('week_view.available') || 'available'}
                </div>
              </div>
              
              {weekDates.map((date, dateIndex) => {
                const formattedDate = format(date, 'yyyy-MM-dd');
                const dayOpenShifts = openShifts.filter(shift => {
                  const shiftDate = typeof shift.date === 'string' ? shift.date : format(shift.date, 'yyyy-MM-dd');
                  return shiftDate.substring(0, 10) === formattedDate;
                });
                
                const openCellId = `open-${formattedDate}`
                const isOpenDropTarget = dragOverCell === openCellId

                return (
                  <div
                    key={dateIndex}
                    className={`border-r p-2 relative min-h-[80px] group transition-colors ${
                      isOpenDropTarget ? 'bg-emerald-100 ring-2 ring-inset ring-emerald-400' : ''
                    }`}
                    onDragOver={(e) => handleDragOver(e, openCellId)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, 'open', formattedDate, 'open')}
                  >
                    {dayOpenShifts.slice(0, 2).map((shift) => (
                      <div
                        key={shift.id}
                        draggable={canEditShifts}
                        onDragStart={(e) => handleDragStart(e, shift, 'open', formattedDate)}
                        onDragEnd={handleDragEnd}
                        onClick={() => onEditShift(shift)}
                        className={`mb-1 cursor-pointer ${canEditShifts ? 'cursor-grab active:cursor-grabbing' : ''}`}
                      >
                        <div className="rounded p-2 text-xs border-2 border-dashed border-emerald-400 bg-emerald-100">
                          <div className="font-medium text-emerald-800 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            {t('week_view.open') || 'Open'}
                          </div>
                          <div className="mt-0.5 text-emerald-700">
                            {shift.function?.name || 'No Function'}
                          </div>
                          <div className="mt-0.5 text-emerald-600">
                            {shift.startTime} - {shift.endTime || 'Open'}
                          </div>
                        </div>
                      </div>
                    ))}
                    {dayOpenShifts.length > 2 && (
                      <button
                        onClick={() => handleShowMoreShifts(dayOpenShifts, date, t('week_view.open_shifts') || 'Open Shifts')}
                        className="text-xs text-emerald-600 hover:text-emerald-800 font-medium transition-colors mb-1"
                      >
                        +{dayOpenShifts.length - 2} more
                      </button>
                    )}
                    <button
                      onClick={() => onAddShift({ date: formattedDate })}
                      className="absolute bottom-1 right-1 w-6 h-6 border bg-white rounded-full flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 shadow-sm border-emerald-400 hover:bg-emerald-500 hover:text-white text-emerald-500"
                    >
                      <PlusIcon className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          );
        })()}

        {/* Employee Rows */}
        {employees.map(employee => {
          const employeeShiftsCount = shifts.filter(s => s.employeeId === employee.id).length;
          
          return (
            <div
              key={employee.id}
              className="grid border-b hover:bg-gray-50"
              style={desktopGridStyle}
            >
              <div className="p-3 border-r">
                <div className="font-medium text-sm text-gray-900">
                  {employee.firstName} {employee.lastName}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {getEmployeeTotalHours(employee.id)} / {currencySymbol} 0.00 / {employeeShiftsCount} {t('week_view.shifts')}
                </div>
              </div>
              
              {weekDates.map((date, dateIndex) => {
                const formattedDate = format(date, 'yyyy-MM-dd');
                const dayShifts = getEmployeeShifts(employee.id, date);
                const shiftGroups = groupOverlappingShifts(dayShifts);
                const unavailable = isEmployeeUnavailable?.(employee.id, formattedDate) ?? false;
                
                const cellId = `emp-${employee.id}-${formattedDate}`
                const isDropTarget = dragOverCell === cellId
                
                return (
                  <div
                    key={dateIndex}
                    className={`border-r p-2 relative min-h-[80px] group transition-colors ${
                      isDropTarget ? 'bg-blue-50 ring-2 ring-inset ring-[#31BCFF]' : ''
                    }`}
                    onDragOver={(e) => handleDragOver(e, cellId, employee.id, formattedDate)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, employee.id, formattedDate, 'employee')}
                  >
                    {shiftGroups.length === 0 ? (
                      <button
                        onClick={() => {
                          if (unavailable) {
                            onUnavailableClick?.(employee.id, formattedDate)
                            return
                          }
                          onAddShift({ 
                            date: formattedDate,
                            employeeId: employee.id 
                          })
                        }}
                        className={`w-full h-full min-h-[76px] border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-1 transition-all ${
                          isDropTarget ? 'opacity-100 border-[#31BCFF] bg-blue-50' : 'opacity-0 group-hover:opacity-100'
                        } ${
                          unavailable
                            ? 'border-red-300 bg-red-50 text-red-500 cursor-not-allowed'
                            : 'border-gray-300 hover:border-[#31BCFF] hover:bg-blue-50'
                        }`}
                      >
                        <PlusIcon className={`w-5 h-5 ${unavailable ? 'text-red-400' : 'text-[#31BCFF]'}`} />
                        {unavailable && (
                          <span className="hidden md:inline text-[10px] font-semibold text-red-500">Unavailable</span>
                        )}
                      </button>
                    ) : (
                      <>
                        {dayShifts.slice(0, 2).map((shift, shiftIndex) => {
                          const backgroundColor = shift.approved ? '#d9f99d' : (shift.function?.color || '#dbeafe')
                          const borderColor = shift.approved ? '#84cc16' : (shift.function?.color || '#93c5fd')
                          const textColor = shift.approved ? '#365314' : '#1f2937'
                          
                          return (
                            <div
                              key={shift.id}
                              draggable={canEditShifts}
                              onDragStart={(e) => handleDragStart(e, shift, employee.id, formattedDate)}
                              onDragEnd={handleDragEnd}
                              onClick={() => onEditShift(shift)}
                              onContextMenu={(e) => handleShiftContextMenu(e, shift)}
                              className={`mb-1 cursor-pointer ${canEditShifts ? 'cursor-grab active:cursor-grabbing' : ''}`}
                            >
                              <div 
                                className="rounded p-2 text-xs border"
                                style={{
                                  backgroundColor: backgroundColor,
                                  borderColor: borderColor,
                                  borderWidth: shift.approved ? '2px' : '1px'
                                }}
                              >
                                <div className="font-medium" style={{ color: textColor }}>
                                  {shift.function?.name || 'No Function'}
                                </div>
                                <div className="mt-0.5" style={{ color: textColor, opacity: 0.8 }}>
                                  {shift.startTime} - {shift.endTime || 'Active'}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                        {dayShifts.length > 2 && (
                          <button
                            onClick={() => handleShowMoreShifts(dayShifts, date, `${employee.firstName} ${employee.lastName}`)}
                            className="text-xs text-gray-500 hover:text-[#31BCFF] font-medium transition-colors mb-1"
                          >
                            +{dayShifts.length - 2} more shifts
                          </button>
                        )}
                        <button
                          onClick={() => {
                            if (unavailable) {
                              onUnavailableClick?.(employee.id, formattedDate)
                              return
                            }
                            onAddShift({ 
                              date: formattedDate,
                              employeeId: employee.id 
                            })
                          }}
                          className={`absolute bottom-1 right-1 w-6 h-6 border bg-white rounded-full flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 shadow-sm ${
                            unavailable
                              ? 'border-red-300 text-red-400 cursor-not-allowed'
                              : 'border-[#31BCFF] hover:bg-[#31BCFF] hover:text-white'
                          }`}
                        >
                          <PlusIcon className="w-3 h-3" />
                        </button>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
      </div>

      {/* Shifts Modal */}
      <ShiftsModal
        isOpen={modalState.isOpen}
        onClose={handleCloseModal}
        shifts={modalState.shifts}
        date={modalState.date || new Date()}
        title={modalState.title}
        employees={employees}
        onEditShift={onEditShift}
        canEditShifts={canEditShifts}
      />

      {/* Context Menu */}
      {contextMenu.show && contextMenu.shift && (
        <div
          ref={contextMenuRef}
          className="fixed bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-[100] min-w-[160px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          {canEditShifts && (
            <button
              onClick={() => {
                setContextMenu(prev => ({ ...prev, show: false }))
                onEditShift(contextMenu.shift!)
              }}
              className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
            >
              <Pencil className="w-4 h-4" />
              {t('context_menu.edit_shift')}
            </button>
          )}
          {canEditShifts && onDuplicateShift && (
            <button
              onClick={() => {
                const shift = contextMenu.shift!
                setContextMenu(prev => ({ ...prev, show: false }))
                onDuplicateShift(shift.id, [{}])
              }}
              className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
            >
              <Copy className="w-4 h-4" />
              {t('context_menu.duplicate_shift') || 'Duplicate Shift'}
            </button>
          )}
          {canEditShifts && onDuplicateShift && (
            <button
              onClick={() => {
                const shift = contextMenu.shift!
                setContextMenu(prev => ({ ...prev, show: false }))
                setDuplicateShiftId(shift.id)
                setDuplicateCount(1)
                setShowDuplicateDialog(true)
              }}
              className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
            >
              <CopyPlus className="w-4 h-4" />
              {t('context_menu.duplicate_multiple') || 'Duplicate Multiple...'}
            </button>
          )}
          {canCreateAttendance && contextMenu.shift.employeeId && contextMenu.shift.approved && (
            <button
              onClick={() => {
                setContextMenu(prev => ({ ...prev, show: false }))
                onCreateAttendance?.(contextMenu.shift!)
              }}
              className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
            >
              <Clock className="w-4 h-4" />
              {t('context_menu.create_attendance')}
            </button>
          )}
        </div>
      )}

      {showDuplicateDialog && duplicateShiftId && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-xl shadow-xl p-6 w-80" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">
              {t('context_menu.duplicate_multiple') || 'Duplicate Multiple'}
            </h3>
            <label className="text-xs text-gray-600 block mb-1">
              {t('context_menu.number_of_copies') || 'Number of copies'}
            </label>
            <input
              type="number"
              min={1}
              max={50}
              value={duplicateCount}
              onChange={(e) => setDuplicateCount(Math.min(50, Math.max(1, parseInt(e.target.value) || 1)))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-4 focus:ring-2 focus:ring-[#31BCFF] focus:border-transparent"
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => { setShowDuplicateDialog(false); setDuplicateShiftId(null) }}
                className="px-3 py-1.5 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                {t('context_menu.cancel') || 'Cancel'}
              </button>
              <button
                onClick={async () => {
                  if (onDuplicateShift && duplicateShiftId) {
                    const targets = Array.from({ length: duplicateCount }, () => ({}))
                    await onDuplicateShift(duplicateShiftId, targets)
                  }
                  setShowDuplicateDialog(false)
                  setDuplicateShiftId(null)
                }}
                className="px-3 py-1.5 text-sm text-white bg-[#31BCFF] rounded-lg hover:bg-[#31BCFF]/90"
              >
                {t('context_menu.duplicate') || 'Duplicate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
