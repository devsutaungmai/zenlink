import { format } from 'date-fns'
import { Employee } from '@prisma/client'
import { useCurrency } from '@/shared/hooks/useCurrency'
import { ShiftWithRelations } from '@/types/schedule'
import { AlertTriangle, AlertCircle, Clock, Pencil, Trash2, Send } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'

interface SpanningShiftCardProps {
  shift: ShiftWithRelations
  date: string
  employees: Employee[]
  onEdit: (shift: ShiftWithRelations) => void
  onCreateAttendance?: (shift: ShiftWithRelations) => void
  onDelete?: (shift: ShiftWithRelations) => void
  onPublish?: (shift: ShiftWithRelations) => void
  index?: number  // Position in the overlapping group
  total?: number  // Total shifts in the overlapping group
  displayStartTime?: string
  displayEndTime?: string | null
  isContinuation?: boolean
  canEdit?: boolean
  canCreateAttendance?: boolean
}

export default function SpanningShiftCard({ 
  shift, 
  date, 
  employees = [], // Provide a default empty array 
  onEdit,
  onCreateAttendance,
  onDelete,
  onPublish,
  index = 0, 
  total = 1,
  displayStartTime,
  displayEndTime,
  isContinuation = false,
  canEdit = true,
  canCreateAttendance = false
}: SpanningShiftCardProps) {
  const { currencySymbol } = useCurrency()
  const { t } = useTranslation('schedule')
  const [showContextMenu, setShowContextMenu] = useState(false)
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 })
  const contextMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node)) {
        setShowContextMenu(false)
      }
    }
    if (showContextMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showContextMenu])

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenuPos({ x: e.clientX, y: e.clientY })
    setShowContextMenu(true)
  }
  const effectiveStart = displayStartTime ?? shift.startTime
  const effectiveEnd = displayEndTime ?? shift.endTime
  const { top, height } = getShiftPosition(effectiveStart, effectiveEnd)
  
  // Check if there's an approved exchange to determine the current assigned employee
  const approvedExchange = shift.shiftExchanges?.find(exchange => exchange.status === 'APPROVED')
  
  // If there's an approved exchange, show the toEmployee, otherwise show the original employee
  let currentEmployee = null
  if (approvedExchange) {
    // Find the toEmployee in the employees list
    currentEmployee = employees?.find(e => e.id === approvedExchange.toEmployee.id) || {
      firstName: approvedExchange.toEmployee.firstName,
      lastName: approvedExchange.toEmployee.lastName
    }
  } else {
    // Show the original assigned employee
    currentEmployee = employees?.find(e => e.id === shift.employeeId) || shift.employee
  }
  
  // Format end time for display - show "Active" if null
  const endTimeDisplay = effectiveEnd ? effectiveEnd.substring(0, 5) : 'Active'
  const startTimeDisplay = effectiveStart.substring(0, 5)
  
  // Calculate horizontal position for overlapping shifts
  const cardWidth = total > 1 ? `calc((100% - 16px) / ${total})` : 'calc(100% - 16px)'
  const horizontalOffset = index * (100 / total)
  
  const hasLaborLawViolations = shift.validation?.hasLaborLawViolations || false
  const hasContractDeviations = shift.validation?.hasContractDeviations || false
  
  const isDraft = !(shift as any).isPublished
  let borderColor = shift.approved ? '#84cc16' : isDraft ? '#9ca3af' : '#31BCFF'
  let backgroundColor = shift.approved ? '#d9f99d' : isDraft ? '#f3f4f6' : '#31BCFF'
  let textColor = shift.approved ? '#365314' : isDraft ? '#6b7280' : 'white'

  if (hasLaborLawViolations) {
    borderColor = '#dc2626'
  } else if (hasContractDeviations) {
    borderColor = '#eab308'
  }

  return (
    <>
    <div
      className="absolute shift-card pointer-events-auto z-20 p-1 sm:p-2"
      style={{
        top: `${top}px`,
        height: `${height}px`,
        width: cardWidth,
        left: `calc(8px + ${horizontalOffset}%)`,
        minHeight: '20px',
        backgroundColor: backgroundColor,
        borderColor: borderColor,
        color: textColor,
        borderWidth: hasLaborLawViolations || hasContractDeviations ? '2px' : '1px',
        borderRadius: '0.375rem',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
        cursor: 'pointer',
        overflow: 'hidden',
        zIndex: 20 + index, 
      }}
      onDoubleClick={(e) => {
        e.stopPropagation()
        e.preventDefault()
        onEdit(shift)
      }}
      onContextMenu={handleContextMenu}
      title={`${shift.function?.name || 'No function'} | ${shift.startTime.substring(0, 5)} - ${endTimeDisplay} | ${currentEmployee ? `${currentEmployee.firstName} ${currentEmployee.lastName}` : 'Unassigned'}`}
      draggable={false}
    >
      {/* Draft badge */}
      {isDraft && (
        <div className="absolute top-0.5 right-0.5 text-[9px] font-bold uppercase tracking-wide bg-gray-400 text-white px-1 rounded leading-tight">
          {t('shift_card.draft')}
        </div>
      )}

      {/* Function name - most prominent */}
      {shift.function && (
        <div className="font-bold text-xs truncate mb-0.5">
          {shift.function.name}
        </div>
      )}
      
      {/* Time range */}
      <div className={`${shift.function ? 'font-medium text-[10px]' : 'font-medium text-xs'} truncate`}>
        {startTimeDisplay} - {endTimeDisplay}
      </div>
      
      {/* Employee name */}
      {height > 24 && (
        <div className="text-[10px] mt-0.5 truncate">
          {currentEmployee ? `${currentEmployee.firstName.split(' ')[0]} ${currentEmployee.lastName.charAt(0)}.` : 'Unassigned'}
        </div>
      )}
      
      {height > 36 && shift.employeeGroup && (
        <div className="text-[10px] mt-0.5 opacity-75 truncate">
          {shift.employeeGroup.name}
        </div>
      )}
      
      {/* Show wage information if height allows */}
      {height > 36 && shift.wage && (
        <div className="text-[10px] mt-0.5 font-semibold truncate">
          {currencySymbol}{shift.wage}/{shift.wageType === 'HOURLY' ? 'hr' : 'day'}
        </div>
      )}
    </div>

    {/* Context Menu */}
    {showContextMenu && (
      <div
        ref={contextMenuRef}
        className="fixed bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-[100] min-w-[160px]"
        style={{
          left: contextMenuPos.x,
          top: contextMenuPos.y,
        }}
      >
        {canEdit && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              setShowContextMenu(false)
              onEdit(shift)
            }}
            className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
          >
            <Pencil className="w-4 h-4" />
            {t('context_menu.edit_shift')}
          </button>
        )}
        {canEdit && onPublish && isDraft && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              setShowContextMenu(false)
              onPublish(shift)
            }}
            className="w-full px-3 py-2 text-left text-sm text-blue-600 hover:bg-blue-50 flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            {t('context_menu.publish_shift', 'Publish Shift')}
          </button>
        )}
        {canCreateAttendance && shift.employeeId && shift.approved && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              setShowContextMenu(false)
              onCreateAttendance?.(shift)
            }}
            className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
          >
            <Clock className="w-4 h-4" />
            {t('context_menu.create_attendance')}
          </button>
        )}
        {onDelete && canEdit && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              setShowContextMenu(false)
              onDelete(shift)
            }}
            className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            {t('context_menu.delete_shift')}
          </button>
        )}
      </div>
    )}
    </>
  )
}

const getShiftPosition = (startTime: string, endTime: string | null) => {
  const startParts = startTime.split(':');
  
  // Handle null endTime (active shifts) - assume current time or end of day
  let endHour: number;
  let endMinutes: number;
  
  if (!endTime) {
    // For active shifts, show until current time or end of day
    const now = new Date();
    endHour = now.getHours();
    endMinutes = now.getMinutes();
    
    // If it's past midnight and shift started yesterday, show until end of day
    const startHour = parseInt(startParts[0], 10);
    if (endHour < startHour) {
      endHour = 23;
      endMinutes = 59;
    }
  } else {
    const endParts = endTime.split(':');
    endHour = parseInt(endParts[0], 10);
    endMinutes = parseInt(endParts[1], 10);
  }

  const startHour = parseInt(startParts[0], 10);
  const startMinutes = parseInt(startParts[1], 10);

  // Calculate offsets in minutes since midnight
  const startOffset = startHour * 60 + startMinutes;
  let endOffset = endHour * 60 + endMinutes;
  
  // If end time is earlier than start time, assume it's the next day
  if (endOffset < startOffset) {
    endOffset += 24 * 60; // Add 24 hours
  }

  // Height calculation: 24px per hour for compact view
  const pixelsPerHour = 24;
  const height = ((endOffset - startOffset) / 60) * pixelsPerHour;
  
  // Top position: offset from the top of the schedule grid starting at 00:00
  const top = (startOffset / 60) * pixelsPerHour;
  
  return { top, height };
};