import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/shared/lib/prisma'
import { getCurrentUser } from '@/shared/lib/auth'
import { payRulesEngine } from '@/shared/lib/pay-rules-engine'
import { attendanceCalculator } from '@/shared/lib/attendance-calculator'
import { calculateShiftTypeAdjustment } from '@/shared/lib/salary-calculator'

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser()
    
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { employeeId, payrollPeriodId } = await req.json()

    if (!employeeId || !payrollPeriodId) {
      return NextResponse.json(
        { error: 'Employee ID and Payroll Period ID are required' },
        { status: 400 }
      )
    }

    const payrollPeriod = await prisma.payrollPeriod.findFirst({
      where: {
        id: payrollPeriodId,
        businessId: currentUser.businessId,
      },
    })

    if (!payrollPeriod) {
      return NextResponse.json(
        { error: 'Payroll period not found' },
        { status: 404 }
      )
    }

    const employee = await prisma.employee.findFirst({
      where: {
        id: employeeId,
        user: {
          businessId: currentUser.businessId,
        },
      },
      include: {
        employeeGroup: {
          select: {
            hourlyWage: true,
            wagePerShift: true,
            defaultWageType: true,
          },
        },
      },
    })

    if (!employee) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      )
    }

    try {
      const attendanceCalculation = await attendanceCalculator.calculateAttendanceHours({
        employeeId,
        payrollPeriodId
      })

      if (attendanceCalculation.approvedHours > 0) {
        const shiftDetails = attendanceCalculation.attendanceDetails
          .filter(att => att.isApproved && att.punchOutTime)
          .map(att => ({
            date: att.date,
            startTime: new Date(att.punchInTime).toTimeString().substring(0, 5),
            endTime: att.punchOutTime ? new Date(att.punchOutTime).toTimeString().substring(0, 5) : '',
            hours: att.duration,
            breakDuration: 0,
            breakPaid: false
          }))

        const payCalculation = await payRulesEngine.calculatePay({
          employeeId,
          payrollPeriodId,
          totalHours: attendanceCalculation.approvedHours,
          regularHours: attendanceCalculation.regularHours,
          shiftDetails
        })

        // Per-attendance pay calculation with shift type adjustments
        const approvedDetails = attendanceCalculation.attendanceDetails
          .filter(att => att.isApproved && att.punchOutTime)

        const dateOvertimeMap = new Map<string, { regularHours: number; overtimeHours: number; totalHours: number }>()
        for (const day of payCalculation.overtimeCalculations) {
          const total = day.regularHours + day.overtimeHours
          dateOvertimeMap.set(day.date, {
            regularHours: day.regularHours,
            overtimeHours: day.overtimeHours,
            totalHours: total
          })
        }

        const overtimeMultiplier = payCalculation.regularRate > 0
          ? payCalculation.overtimeRate / payCalculation.regularRate
          : 1.5

        let adjustedGrossPay = 0
        for (const att of approvedDetails) {
          const dayInfo = dateOvertimeMap.get(att.date)
          let attRegularHours = att.duration
          let attOvertimeHours = 0

          if (dayInfo && dayInfo.totalHours > 0) {
            const regularRatio = dayInfo.regularHours / dayInfo.totalHours
            const overtimeRatio = dayInfo.overtimeHours / dayInfo.totalHours
            attRegularHours = att.duration * regularRatio
            attOvertimeHours = att.duration * overtimeRatio
          }

          const shiftTypeConfig = att.shift?.shiftTypeConfig || null
          const effectiveRegularRate = calculateShiftTypeAdjustment(payCalculation.regularRate, shiftTypeConfig as any)
          const effectiveOvertimeRate = effectiveRegularRate * overtimeMultiplier

          adjustedGrossPay += attRegularHours * effectiveRegularRate + attOvertimeHours * effectiveOvertimeRate
        }

        const attendanceSummary = await attendanceCalculator.getAttendanceSummary(
          employeeId,
          payrollPeriodId
        )

        return NextResponse.json({
          totalHours: attendanceCalculation.totalHours,
          totalShifts: attendanceCalculation.totalShifts,
          regularHours: payCalculation.regularHours,
          overtimeHours: payCalculation.overtimeHours,
          regularRate: payCalculation.regularRate,
          overtimeRate: payCalculation.overtimeRate,
          attendanceDetails: attendanceCalculation.attendanceDetails,
          wageCalculationMethod: 'attendance_with_pay_rules',
          approvedHours: attendanceCalculation.approvedHours,
          unapprovedHours: attendanceCalculation.unapprovedHours,
          attendanceSummary,
          appliedRules: payCalculation.appliedRules,
          overtimeCalculations: payCalculation.overtimeCalculations,
          grossPay: adjustedGrossPay,
          netPay: adjustedGrossPay,
          employee: {
            firstName: employee.firstName,
            lastName: employee.lastName,
            employeeNo: employee.employeeNo,
          },
          payrollPeriod: {
            name: payrollPeriod.name,
            startDate: payrollPeriod.startDate,
            endDate: payrollPeriod.endDate,
          },
        })
      } else {
        const attendanceSummary = await attendanceCalculator.getAttendanceSummary(
          employeeId,
          payrollPeriodId
        )

        return NextResponse.json({
          totalHours: attendanceCalculation.totalHours,
          totalShifts: attendanceCalculation.totalShifts,
          regularHours: attendanceCalculation.regularHours,
          overtimeHours: attendanceCalculation.overtimeHours,
          regularRate: attendanceCalculation.regularRate,
          overtimeRate: attendanceCalculation.overtimeRate,
          attendanceDetails: attendanceCalculation.attendanceDetails,
          wageCalculationMethod: 'attendance_only',
          approvedHours: attendanceCalculation.approvedHours,
          unapprovedHours: attendanceCalculation.unapprovedHours,
          attendanceSummary,
          grossPay: 0,
          netPay: 0,
          appliedRules: [],
          overtimeCalculations: [],
          employee: {
            firstName: employee.firstName,
            lastName: employee.lastName,
            employeeNo: employee.employeeNo,
          },
          payrollPeriod: {
            name: payrollPeriod.name,
            startDate: payrollPeriod.startDate,
            endDate: payrollPeriod.endDate,
          },
        })
      }
    } catch (attendanceError) {
      console.warn('Attendance calculation failed, falling back to shift-based calculation:', attendanceError)

      const shiftEndDate = new Date(payrollPeriod.endDate)
      shiftEndDate.setHours(23, 59, 59, 999)

      const shifts = await prisma.shift.findMany({
        where: {
          employeeId: employeeId,
          date: {
            gte: new Date(payrollPeriod.startDate),
            lte: shiftEndDate,
          },
          approved: true,
        },
        orderBy: {
          date: 'asc',
        },
      })

      let totalHours = 0
      let totalShifts = 0
      const shiftDetails: Array<{
        date: string
        startTime: string
        endTime: string | null
        hours: number
        breakStart: string | null
        breakEnd: string | null
        breakPaid: boolean
        breakDuration: number
      }> = []

      for (const shift of shifts) {
        if (shift.endTime) {
          const hours = calculateShiftHours(shift.startTime, shift.endTime, shift.breakStart, shift.breakEnd, shift.breakPaid || false)
          totalHours += hours
          totalShifts += 1
          
          let breakDuration = 0
          if (shift.breakStart && shift.breakEnd) {
            breakDuration = (shift.breakEnd.getTime() - shift.breakStart.getTime()) / (1000 * 60) // Convert to minutes
          }
          
          shiftDetails.push({
            date: shift.date.toISOString().split('T')[0],
            startTime: shift.startTime,
            endTime: shift.endTime,
            hours: hours,
            breakStart: shift.breakStart ? shift.breakStart.toTimeString().substring(0, 5) : null,
            breakEnd: shift.breakEnd ? shift.breakEnd.toTimeString().substring(0, 5) : null,
            breakPaid: shift.breakPaid || false,
            breakDuration: Math.round(breakDuration),
          })
        }
      }

      const regularHoursPerShift = 8
      let regularHours = 0
      let overtimeHours = 0

      for (const detail of shiftDetails) {
        if (detail.hours <= regularHoursPerShift) {
          regularHours += detail.hours
        } else {
          regularHours += regularHoursPerShift
          overtimeHours += (detail.hours - regularHoursPerShift)
        }
      }

      let regularRate = 0
      let overtimeRate = 0

      if (employee.salaryRate && employee.salaryRate > 0) {
        regularRate = employee.salaryRate
        overtimeRate = regularRate * 1.5
      } else if (employee.employeeGroup) {
        if (employee.employeeGroup.defaultWageType === 'HOURLY') {
          regularRate = employee.employeeGroup.hourlyWage
          overtimeRate = employee.employeeGroup.hourlyWage * 1.5
        } else {
          regularRate = employee.employeeGroup.wagePerShift / regularHoursPerShift
          overtimeRate = regularRate * 1.5
        }
      }

      return NextResponse.json({
        totalHours,
        totalShifts,
        regularHours: Math.round(regularHours * 100) / 100,
        overtimeHours: Math.round(overtimeHours * 100) / 100,
        regularRate,
        overtimeRate,
        shiftDetails,
        wageCalculationMethod: 'shifts_fallback',
        shiftsWithWage: 0,
        employee: {
          firstName: employee.firstName,
          lastName: employee.lastName,
          employeeNo: employee.employeeNo,
        },
        payrollPeriod: {
          name: payrollPeriod.name,
          startDate: payrollPeriod.startDate,
          endDate: payrollPeriod.endDate,
        },
      })
    }

  } catch (error) {
    console.error('Error calculating hours:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function calculateShiftHours(
  startTime: string,
  endTime: string,
  breakStart: Date | null,
  breakEnd: Date | null,
  breakPaid: boolean = false
): number {
  const getMinutes = (timeStr: string): number => {
    const [hours, minutes] = timeStr.split(':').map(Number)
    return hours * 60 + minutes
  }

  const startMinutes = getMinutes(startTime)
  let endMinutes = getMinutes(endTime)

  // Handle shifts that cross midnight
  if (endMinutes < startMinutes) {
    endMinutes += 24 * 60 // Add 24 hours
  }

  let totalMinutes = endMinutes - startMinutes

  // Subtract break time only if both breakStart and breakEnd are provided AND it's not a paid break
  if (breakStart && breakEnd && !breakPaid) {
    const breakDuration = breakEnd.getTime() - breakStart.getTime()
    const breakMinutes = breakDuration / (1000 * 60) // Convert to minutes
    totalMinutes -= breakMinutes
  }

  // Convert to hours and round to 2 decimal places
  return Math.round((totalMinutes / 60) * 100) / 100
}
