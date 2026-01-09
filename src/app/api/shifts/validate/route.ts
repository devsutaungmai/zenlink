import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/shared/lib/auth'
import { 
  validateShiftCombined, 
  getEmployeeShiftsForValidation,
  formatCombinedValidationSummary 
} from '@/shared/lib/shiftValidation'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      shiftId,
      date,
      startTime,
      endTime,
      breakStart,
      breakEnd,
      employeeId,
    } = body

    if (!date || !startTime || !endTime || !employeeId) {
      return NextResponse.json(
        { error: 'Missing required fields: date, startTime, endTime, employeeId' },
        { status: 400 }
      )
    }

    const shiftDate = new Date(date)
    const weekStart = new Date(shiftDate)
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + (weekStart.getDay() === 0 ? -6 : 1))
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 13)

    const existingShifts = await getEmployeeShiftsForValidation(
      employeeId,
      weekStart,
      weekEnd,
      shiftId
    )

    const validationResult = await validateShiftCombined(
      {
        id: shiftId,
        date,
        startTime,
        endTime,
        breakStart: breakStart || null,
        breakEnd: breakEnd || null,
        employeeId,
      },
      existingShifts
    )

    const formattedWarnings = formatCombinedValidationSummary(validationResult)

    return NextResponse.json({
      ...validationResult,
      formattedWarnings,
    })
  } catch (error) {
    console.error('Error validating shift:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
