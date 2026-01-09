import { format } from 'date-fns'
import { Employee } from '@prisma/client'
import { useCurrency } from '@/shared/hooks/useCurrency'
import { ShiftWithRelations } from '@/types/schedule'
import { AlertTriangle, AlertCircle } from 'lucide-react'

interface SpanningShiftCardProps {
  shift: ShiftWithRelations
  date: string
  employees: Employee[]
  onEdit: (shift: ShiftWithRelations) => void
  index?: number  // Position in the overlapping group
  total?: number  // Total shifts in the overlapping group
  displayStartTime?: string
  displayEndTime?: string | null
  isContinuation?: boolean
  canEdit?: boolean
}

export default function SpanningShiftCard({ 
  shift, 
  date, 
  employees = [], // Provide a default empty array 
  onEdit, 
  index = 0, 
  total = 1,
  displayStartTime,
  displayEndTime,
  isContinuation = false,
  canEdit = true
}: SpanningShiftCardProps) {
  const { currencySymbol } = useCurrency()
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
  
  let borderColor = shift.approved ? '#84cc16' : '#31BCFF'
  if (hasLaborLawViolations) {
    borderColor = '#dc2626' // red-600
  } else if (hasContractDeviations) {
    borderColor = '#eab308' // yellow-500
  }

  return (
    <div
      className="absolute shift-card pointer-events-auto z-20 p-1 sm:p-2"
      style={{
        top: `${top}px`,
        height: `${height}px`,
        width: cardWidth,
        left: `calc(8px + ${horizontalOffset}%)`,
        minHeight: '20px',
        backgroundColor: shift.approved ? undefined : '#31BCFF',
        borderColor: borderColor,
        color: shift.approved ? '#365314' : 'white',
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
      title={`${shift.function?.name || 'No function'} | ${shift.startTime.substring(0, 5)} - ${endTimeDisplay} | ${currentEmployee ? `${currentEmployee.firstName} ${currentEmployee.lastName}` : 'Unassigned'}`}
      draggable={false}
    >
      {/* Validation warnings indicator */}
      {(hasLaborLawViolations || hasContractDeviations) && height > 24 && (
        <div className="flex items-center gap-1 mb-0.5">
          {hasLaborLawViolations && (
            <AlertTriangle className="h-3 w-3 text-red-600" />
          )}
          {hasContractDeviations && (
            <AlertCircle className="h-3 w-3 text-yellow-600" />
          )}
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