import { format } from 'date-fns'

interface SpanningShiftCardProps {
  shift: Shift
  date: string
  employees: Employee[]
  onEdit: (shift: Shift) => void
  index?: number  // Position in the overlapping group
  total?: number  // Total shifts in the overlapping group
}

export default function SpanningShiftCard({ 
  shift, 
  date, 
  employees = [], // Provide a default empty array 
  onEdit, 
  index = 0, 
  total = 1 
}: SpanningShiftCardProps) {
  const { top, height } = getShiftPosition(shift.startTime, shift.endTime)
  const employee = employees && employees.length > 0 ? employees.find(e => e.id === shift.employeeId) : null
  
  // Format end time for display - show "Active" if null
  const endTimeDisplay = shift.endTime ? shift.endTime.substring(0, 5) : 'Active'
  
  // Calculate horizontal position for overlapping shifts
  const cardWidth = total > 1 ? `calc((100% - 16px) / ${total})` : 'calc(100% - 16px)'
  const horizontalOffset = index * (100 / total)
  
  return (
    <div
      className="absolute shift-card pointer-events-auto z-20"
      style={{
        top: `${top}px`,
        height: `${height}px`,
        width: cardWidth,
        left: `calc(8px + ${horizontalOffset}%)`,
        minHeight: '20px',
        backgroundColor: shift.approved ? undefined : '#31BCFF',
        borderColor: shift.approved ? '#84cc16' : '#31BCFF',
        color: shift.approved ? '#365314' : 'white',
        borderWidth: '1px',
        borderRadius: '0.375rem',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
        padding: '0.5rem',
        cursor: 'pointer',
        overflow: 'hidden',
        // Add a subtle shadow to help distinguish overlapping cards
        zIndex: 20 + index, 
      }}
      onDoubleClick={(e) => {
        e.stopPropagation()
        e.preventDefault()
        onEdit(shift)
      }}
      title={`${shift.startTime.substring(0, 5)} - ${endTimeDisplay} | ${employee ? `${employee.firstName} ${employee.lastName}` : 'Unassigned'}`}
      draggable={false}
    >
      <div className="font-medium text-sm truncate">
        {shift.startTime.substring(0, 5)} - {endTimeDisplay}
      </div>
      {height > 40 && (
        <div className="text-xs mt-1 truncate">
          {employee ? `${employee.firstName} ${employee.lastName}` : 'Unassigned'}
        </div>
      )}
      {height > 60 && shift.employeeGroup && (
        <div className="text-xs mt-1 opacity-75 truncate">
          {shift.employeeGroup.name}
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

  // Height calculation: 1 hour = 60px
  const height = ((endOffset - startOffset) / 60) * 60;
  
  // Top position: offset from the top of the schedule grid
  // Assuming the grid starts at hour 1 (not 0)
  const top = ((startOffset - 60) / 60) * 60; // Subtract 60 minutes to adjust for grid starting at hour 1
  
  return { top, height };
};