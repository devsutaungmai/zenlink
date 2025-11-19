import { addDays, format } from 'date-fns'
import { Shift } from '@prisma/client'
import { ShiftWithRelations } from '@/types/schedule'

export interface ShiftSegment {
  segmentId: string
  shift: ShiftWithRelations
  displayStartTime: string
  displayEndTime: string | null
  isContinuation: boolean
}

const toDateString = (dateValue: string | Date) => {
  if (!dateValue) return ''
  if (typeof dateValue === 'string') {
    return dateValue.substring(0, 10)
  }
  return format(dateValue, 'yyyy-MM-dd')
}

const isOvernightShift = (shift: Pick<Shift, 'startTime' | 'endTime'>) => {
  if (!shift.endTime || !shift.startTime) return false
  return shift.endTime <= shift.startTime
}

export const getShiftSegmentsForDate = (
  shifts: ShiftWithRelations[],
  date: Date
): ShiftSegment[] => {
  const dateString = format(date, 'yyyy-MM-dd')
  const previousDateString = format(addDays(date, -1), 'yyyy-MM-dd')

  const segments: ShiftSegment[] = []

  shifts.forEach((shift) => {
    const shiftDateString = toDateString(shift.date as any)
    const spansMidnight = isOvernightShift(shift)

    if (shiftDateString === dateString) {
      segments.push({
        segmentId: `${shift.id}-${dateString}-primary`,
        shift,
        displayStartTime: shift.startTime,
        displayEndTime: spansMidnight ? '24:00' : (shift.endTime ?? '24:00'),
        isContinuation: false,
      })
    }

    if (spansMidnight && shiftDateString === previousDateString) {
      segments.push({
        segmentId: `${shift.id}-${dateString}-continuation`,
        shift,
        displayStartTime: '00:00',
        displayEndTime: shift.endTime ?? '24:00',
        isContinuation: true,
      })
    }
  })

  return segments
}
