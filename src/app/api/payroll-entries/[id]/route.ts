import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/shared/lib/auth';
import { prisma } from '@/shared/lib/prisma';
import { calculateShiftTypeAdjustment, getBaseHourlyRate } from '@/shared/lib/salary-calculator';

type PayCalculationType = 'BASE' | 'HOURLY_PLUS_FIXED' | 'FIXED_AMOUNT' | 'PERCENTAGE' | 'UNPAID'

function allocateByWeight(total: number, weights: number[]): number[] {
  if (weights.length === 0) return []

  const totalUnits = Math.round(total * 100)
  const safeWeights = weights.map((w) => (Number.isFinite(w) && w > 0 ? w : 0))
  const weightSum = safeWeights.reduce((sum, w) => sum + w, 0)

  if (weightSum <= 0) {
    const evenBase = Math.floor(totalUnits / weights.length)
    let remainder = totalUnits - evenBase * weights.length
    return safeWeights.map(() => {
      const unit = evenBase + (remainder > 0 ? 1 : 0)
      if (remainder > 0) remainder -= 1
      return unit / 100
    })
  }

  const rawShares = safeWeights.map((w) => (totalUnits * w) / weightSum)
  const floorUnits = rawShares.map((value) => Math.floor(value))
  let remainder = totalUnits - floorUnits.reduce((sum, value) => sum + value, 0)

  const indicesByRemainder = rawShares
    .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((a, b) => b.fraction - a.fraction)
    .map((item) => item.index)

  let pointer = 0
  while (remainder > 0 && indicesByRemainder.length > 0) {
    const idx = indicesByRemainder[pointer % indicesByRemainder.length]
    floorUnits[idx] += 1
    remainder -= 1
    pointer += 1
  }

  return floorUnits.map((units) => units / 100)
}

function formatAmount(value: number): string {
  const rounded = Math.round(value * 100) / 100
  if (Number.isInteger(rounded)) {
    return String(rounded)
  }
  return rounded.toFixed(2)
}

function buildPayCalculationLabel(
  payCalculationType: PayCalculationType,
  payCalculationValue: number
): string {
  if (payCalculationType === 'BASE') {
    return 'Pay Calculation: Hourly Wage'
  }

  const safeValue = Number.isFinite(payCalculationValue) ? payCalculationValue : 0

  switch (payCalculationType) {
    case 'HOURLY_PLUS_FIXED':
      return `Pay Calculation: Hourly Wage + $${formatAmount(safeValue)}/hr`
    case 'FIXED_AMOUNT':
      return `Pay Calculation: Fixed Hourly Rate ($${formatAmount(safeValue)}/hr)`
    case 'PERCENTAGE':
      return `Pay Calculation: Hourly Wage x ${formatAmount(safeValue)}%`
    case 'UNPAID':
      return 'Pay Calculation: Unpaid'
    default:
      return 'Pay Calculation: Hourly Wage'
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const payrollEntry = await prisma.payrollEntry.findFirst({
      where: {
        id: id,
        payrollPeriod: {
          businessId: user.businessId,
        },
      },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeNo: true,
            email: true,
            salaryRate: true,
            employeeGroup: {
              select: {
                hourlyWage: true,
              },
            },
          },
        },
        payrollPeriod: {
          select: {
            id: true,
            name: true,
            startDate: true,
            endDate: true,
            status: true,
          },
        },
      },
    });

    if (!payrollEntry) {
      return NextResponse.json(
        { error: 'Payroll entry not found' },
        { status: 404 }
      );
    }

    const periodStart = new Date(payrollEntry.payrollPeriod.startDate)
    const periodEnd = new Date(payrollEntry.payrollPeriod.endDate)
    periodEnd.setHours(23, 59, 59, 999)

    const attendances = await prisma.attendance.findMany({
      where: {
        employeeId: payrollEntry.employeeId,
        approved: true,
        punchInTime: {
          gte: periodStart,
          lte: periodEnd,
        },
        punchOutTime: {
          not: null,
        },
      },
      include: {
        shift: {
          select: {
            breakStart: true,
            breakEnd: true,
            breakPaid: true,
            wage: true,
            shiftTypeConfig: {
              select: {
                id: true,
                name: true,
                payCalculationType: true,
                payCalculationValue: true,
              },
            },
          },
        },
      },
      orderBy: {
        punchInTime: 'asc',
      },
    })

    const inferredBaseRate = getBaseHourlyRate({
      salaryRate: payrollEntry.employee.salaryRate,
      employeeGroup: payrollEntry.employee.employeeGroup ? { hourlyWage: payrollEntry.employee.employeeGroup.hourlyWage } : null,
    })
    const baseSalaryRate = payrollEntry.regularRate > 0 ? payrollEntry.regularRate : inferredBaseRate

    const attendanceRows: Array<{
      date: string
      scheduledHours: number
      payableHours: number
      breakHours: number
      shiftType: string
      payCalculationType: PayCalculationType
      payCalculationValue: number
      payCalculationLabel: string
      baseRate: number
      effectiveRate: number
      rawEarned: number
    }> = []

    for (const attendance of attendances) {
      if (!attendance.punchOutTime) continue

      let workedHours = (new Date(attendance.punchOutTime).getTime() - new Date(attendance.punchInTime).getTime()) / (1000 * 60 * 60)
      let breakHours = 0

      const breakStart = attendance.shift?.breakStart
      const breakEnd = attendance.shift?.breakEnd
      const breakPaid = attendance.shift?.breakPaid ?? false
      if (breakStart && breakEnd && !breakPaid) {
        breakHours = (new Date(breakEnd).getTime() - new Date(breakStart).getTime()) / (1000 * 60 * 60)
      }

      const safeWorkedHours = Number.isFinite(workedHours) && workedHours > 0 ? workedHours : 0
      const payableHours = Math.max(0, safeWorkedHours - breakHours)
      const date = new Date(attendance.punchInTime).toISOString().split('T')[0]
      const shiftTypeName = attendance.shift?.shiftTypeConfig?.name || 'Normal Shift'
      const payCalculationType = (attendance.shift?.shiftTypeConfig?.payCalculationType ?? 'BASE') as PayCalculationType
      const payCalculationValueRaw = Number(attendance.shift?.shiftTypeConfig?.payCalculationValue ?? 0)
      const payCalculationValue = Number.isFinite(payCalculationValueRaw) ? payCalculationValueRaw : 0
      const payCalculationLabel = buildPayCalculationLabel(payCalculationType, payCalculationValue)
      const attendanceBaseRate = attendance.shift?.wage && attendance.shift.wage > 0
        ? attendance.shift.wage
        : baseSalaryRate
      const effectiveRate = calculateShiftTypeAdjustment(attendanceBaseRate, attendance.shift?.shiftTypeConfig || null)

      attendanceRows.push({
        date,
        scheduledHours: safeWorkedHours,
        payableHours,
        breakHours: Number.isFinite(breakHours) && breakHours > 0 ? breakHours : 0,
        shiftType: shiftTypeName,
        payCalculationType,
        payCalculationValue,
        payCalculationLabel,
        baseRate: attendanceBaseRate,
        effectiveRate,
        rawEarned: payableHours * effectiveRate,
      })
    }

    const dayMap = new Map<string, {
      date: string
      scheduledHours: number
      payableHours: number
      breakHours: number
      shiftCount: number
      rawEarned: number
      rawBaseEarned: number
      shiftTypes: Set<string>
      payCalculationRules: Set<string>
      payCalculationLabels: Set<string>
    }>()

    for (const row of attendanceRows) {
      const existing = dayMap.get(row.date)
      if (existing) {
        existing.scheduledHours += row.scheduledHours
        existing.payableHours += row.payableHours
        existing.breakHours += row.breakHours
        existing.shiftCount += 1
        existing.rawEarned += row.rawEarned
        existing.rawBaseEarned += row.payableHours * row.baseRate
        existing.shiftTypes.add(row.shiftType)
        existing.payCalculationRules.add(`${row.payCalculationType}:${row.payCalculationValue}`)
        existing.payCalculationLabels.add(row.payCalculationLabel)
      } else {
        dayMap.set(row.date, {
          date: row.date,
          scheduledHours: row.scheduledHours,
          payableHours: row.payableHours,
          breakHours: row.breakHours,
          shiftCount: 1,
          rawEarned: row.rawEarned,
          rawBaseEarned: row.payableHours * row.baseRate,
          shiftTypes: new Set([row.shiftType]),
          payCalculationRules: new Set([`${row.payCalculationType}:${row.payCalculationValue}`]),
          payCalculationLabels: new Set([row.payCalculationLabel]),
        })
      }
    }

    const dayRows = Array.from(dayMap.values()).sort((a, b) => a.date.localeCompare(b.date))

    if (dayRows.length === 0) {
      const fallbackDate = new Date(payrollEntry.payrollPeriod.endDate).toISOString().split('T')[0]
      dayRows.push({
        date: fallbackDate,
        scheduledHours: (payrollEntry.regularHours ?? 0) + (payrollEntry.overtimeHours ?? 0),
        payableHours: (payrollEntry.regularHours ?? 0) + (payrollEntry.overtimeHours ?? 0),
        breakHours: 0,
        shiftCount: 0,
        rawEarned: (payrollEntry.regularHours ?? 0) * baseSalaryRate,
        rawBaseEarned: (payrollEntry.regularHours ?? 0) * baseSalaryRate,
        shiftTypes: new Set(['No Shift Data']),
        payCalculationRules: new Set(['BASE:0']),
        payCalculationLabels: new Set(['Pay Calculation: Hourly Wage']),
      })
    }

    const rawRegularHours = dayRows.map((row) => Math.min(row.payableHours, 8))
    const rawOvertimeHours = dayRows.map((row) => Math.max(row.payableHours - 8, 0))
    const workedHourWeights = dayRows.map((row) => row.payableHours)

    const regularHoursByDay = allocateByWeight(payrollEntry.regularHours ?? 0, rawRegularHours.some((h) => h > 0) ? rawRegularHours : workedHourWeights)
    const overtimeHoursByDay = allocateByWeight(payrollEntry.overtimeHours ?? 0, rawOvertimeHours.some((h) => h > 0) ? rawOvertimeHours : workedHourWeights)

    const grossWeights = dayRows.map((_, index) => {
      const regularPay = regularHoursByDay[index] * (payrollEntry.regularRate ?? 0)
      const overtimePay = overtimeHoursByDay[index] * (payrollEntry.overtimeRate ?? 0)
      return regularPay + overtimePay
    })

    const attendanceEarnedWeights = dayRows.map((row) => row.rawEarned)
    const grossByDay = allocateByWeight(
      payrollEntry.grossPay ?? 0,
      attendanceEarnedWeights.some((w) => w > 0) ? attendanceEarnedWeights : (grossWeights.some((w) => w > 0) ? grossWeights : workedHourWeights)
    )
    const bonusByDay = allocateByWeight(payrollEntry.bonuses ?? 0, grossByDay.some((w) => w > 0) ? grossByDay : workedHourWeights)
    const deductionByDay = allocateByWeight(payrollEntry.deductions ?? 0, grossByDay.some((w) => w > 0) ? grossByDay : workedHourWeights)
    const netByDay = grossByDay.map((gross, index) => gross + bonusByDay[index] - deductionByDay[index])

    const netTotal = netByDay.reduce((sum, value) => sum + value, 0)
    const netDelta = Math.round(((payrollEntry.netPay ?? 0) - netTotal) * 100) / 100
    if (Math.abs(netDelta) > 0 && netByDay.length > 0) {
      netByDay[netByDay.length - 1] = Math.round((netByDay[netByDay.length - 1] + netDelta) * 100) / 100
    }

    const dailyBreakdown = dayRows.map((row, index) => {
      const payCalculationRules = Array.from(row.payCalculationRules).map((rule) => {
        const [rawType, rawValue] = rule.split(':')
        const value = Number(rawValue)
        return {
          type: (rawType || 'BASE') as PayCalculationType,
          value: Number.isFinite(value) ? value : 0,
        }
      })

      return {
        date: row.date,
        scheduledHours: row.scheduledHours,
        payableHours: row.payableHours,
        totalBreakHours: row.breakHours,
        totalShifts: row.shiftCount,
        regularHours: regularHoursByDay[index],
        overtimeHours: overtimeHoursByDay[index],
        shiftTypes: Array.from(row.shiftTypes),
        shiftTypeLabel: Array.from(row.shiftTypes).join(', '),
        payCalculationRules,
        payCalculationLabel: Array.from(row.payCalculationLabels).join(' | '),
        baseRate: row.payableHours > 0 ? row.rawBaseEarned / row.payableHours : baseSalaryRate,
        effectiveRate: row.payableHours > 0 ? row.rawEarned / row.payableHours : baseSalaryRate,
        effectiveRateLabel: (row.payableHours > 0 ? row.rawEarned / row.payableHours : baseSalaryRate).toFixed(2),
        shiftPremiumRate: row.payableHours > 0 ? (row.rawEarned - row.rawBaseEarned) / row.payableHours : 0,
        earned: grossByDay[index],
        bonus: bonusByDay[index],
        deduction: deductionByDay[index],
        net: netByDay[index],
      }
    })

    const breakdownTotals = {
      scheduledHours: dailyBreakdown.reduce((sum, row) => sum + row.scheduledHours, 0),
      workedHours: dailyBreakdown.reduce((sum, row) => sum + row.payableHours, 0),
      breakHours: dailyBreakdown.reduce((sum, row) => sum + row.totalBreakHours, 0),
      totalShifts: dailyBreakdown.reduce((sum, row) => sum + row.totalShifts, 0),
      basicSalaryRate: baseSalaryRate,
      averageEffectiveRate:
        dailyBreakdown.reduce((sum, row) => sum + row.payableHours, 0) > 0
          ? dailyBreakdown.reduce((sum, row) => sum + row.earned, 0) /
            dailyBreakdown.reduce((sum, row) => sum + row.payableHours, 0)
          : baseSalaryRate,
      regularHours: dailyBreakdown.reduce((sum, row) => sum + row.regularHours, 0),
      overtimeHours: dailyBreakdown.reduce((sum, row) => sum + row.overtimeHours, 0),
      earned: dailyBreakdown.reduce((sum, row) => sum + row.earned, 0),
      bonus: dailyBreakdown.reduce((sum, row) => sum + row.bonus, 0),
      deduction: dailyBreakdown.reduce((sum, row) => sum + row.deduction, 0),
      net: dailyBreakdown.reduce((sum, row) => sum + row.net, 0),
    }

    return NextResponse.json({
      ...payrollEntry,
      dailyBreakdown,
      breakdownTotals,
    });
  } catch (error) {
    console.error('Error fetching payroll entry:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const body = await request.json();
    const {
      regularHours,
      overtimeHours,
      regularRate,
      overtimeRate,
      deductions,
      bonuses,
      status,
      notes
    } = body;

    const existingEntry = await prisma.payrollEntry.findFirst({
      where: {
        id: id,
        payrollPeriod: {
          businessId: user.businessId,
        },
      },
    });

    if (!existingEntry) {
      return NextResponse.json(
        { error: 'Payroll entry not found' },
        { status: 404 }
      );
    }

    const updateData: any = {};
    
    if (regularHours !== undefined) updateData.regularHours = regularHours;
    if (overtimeHours !== undefined) updateData.overtimeHours = overtimeHours;
    if (regularRate !== undefined) updateData.regularRate = regularRate;
    if (overtimeRate !== undefined) updateData.overtimeRate = overtimeRate;
    if (deductions !== undefined) updateData.deductions = deductions;
    if (bonuses !== undefined) updateData.bonuses = bonuses;
    if (status !== undefined) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;

    // Recalculate gross pay and net pay if any amounts changed
    if (regularHours !== undefined || overtimeHours !== undefined || 
        regularRate !== undefined || overtimeRate !== undefined || 
        bonuses !== undefined || deductions !== undefined) {
      
      const finalRegularHours = regularHours ?? existingEntry.regularHours;
      const finalOvertimeHours = overtimeHours ?? existingEntry.overtimeHours;
      const finalRegularRate = regularRate ?? existingEntry.regularRate;
      const finalOvertimeRate = overtimeRate ?? existingEntry.overtimeRate;
      const finalBonuses = bonuses ?? existingEntry.bonuses;
      const finalDeductions = deductions ?? existingEntry.deductions;

      const grossPay = (finalRegularHours * finalRegularRate) + 
                      (finalOvertimeHours * finalOvertimeRate) + 
                      finalBonuses;
      const netPay = grossPay - finalDeductions;

      updateData.grossPay = grossPay;
      updateData.netPay = netPay;
    }

    const payrollEntry = await prisma.payrollEntry.update({
      where: { id: id },
      data: updateData,
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeNo: true,
            email: true,
          },
        },
        payrollPeriod: {
          select: {
            id: true,
            name: true,
            startDate: true,
            endDate: true,
            status: true,
          },
        },
      },
    });

    return NextResponse.json(payrollEntry);
  } catch (error) {
    console.error('Error updating payroll entry:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payrollEntry = await prisma.payrollEntry.findFirst({
      where: {
        id: id,
        payrollPeriod: {
          businessId: user.businessId,
        },
      },
    });

    if (!payrollEntry) {
      return NextResponse.json(
        { error: 'Payroll entry not found' },
        { status: 404 }
      );
    }

    if (payrollEntry.status !== 'DRAFT') {
      return NextResponse.json(
        { error: 'Cannot delete approved or paid payroll entries' },
        { status: 400 }
      );
    }

    await prisma.payrollEntry.delete({
      where: { id: id },
    });

    return NextResponse.json({ message: 'Payroll entry deleted successfully' });
  } catch (error) {
    console.error('Error deleting payroll entry:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
