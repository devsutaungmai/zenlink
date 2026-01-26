import { prisma } from '@/shared/lib/prisma'
import { 
  LaborLawValidator, 
  ValidationResult as LaborLawValidationResult,
  LaborLawViolation,
  LaborLawWarning,
  ShiftData,
  LaborLawRules
} from './laborLawValidation'
import {
  ContractValidator,
  ContractValidationResult,
  ContractDeviation,
  ShiftDataForContract,
  getEmployeeContractInfo
} from './contractValidation'

export interface CombinedValidationResult {
  laborLaw: {
    isValid: boolean
    violations: LaborLawViolation[]
    warnings: LaborLawWarning[]
  }
  contract: {
    hasDeviations: boolean
    deviations: ContractDeviation[]
    overtimeEligible: boolean
    overtimeExemptReason: string | null
  } | null
  canSchedule: boolean
  requiresOverride: boolean
  summaryMessage: string | null
}

export interface ShiftValidationInput {
  id?: string
  date: string | Date
  startTime: string
  endTime: string
  breakStart?: string | null
  breakEnd?: string | null
  employeeId: string
}

export async function validateShiftCombined(
  shift: ShiftValidationInput,
  existingShifts: ShiftValidationInput[] = [],
  laborLawRules?: Partial<LaborLawRules>
): Promise<CombinedValidationResult> {
  const shiftData: ShiftData = {
    id: shift.id,
    date: shift.date,
    startTime: shift.startTime,
    endTime: shift.endTime,
    breakStart: shift.breakStart || undefined,
    breakEnd: shift.breakEnd || undefined,
    employeeId: shift.employeeId,
  }

  const existingShiftData: ShiftData[] = existingShifts.map(s => ({
    id: s.id,
    date: s.date,
    startTime: s.startTime,
    endTime: s.endTime,
    breakStart: s.breakStart || undefined,
    breakEnd: s.breakEnd || undefined,
    employeeId: s.employeeId,
  }))

  let laborLawValidator: LaborLawValidator

  const contractInfo = await getEmployeeContractInfo(shift.employeeId)
  
  if (contractInfo?.contractType?.laborLawProfile?.laborLawSettings) {
    const settings = contractInfo.contractType.laborLawProfile.laborLawSettings
    laborLawValidator = new LaborLawValidator(settings.countryCode, {
      maxHoursPerDay: settings.maxHoursPerDay,
      maxHoursPerWeek: settings.maxHoursPerWeek,
      maxOvertimePerDay: settings.maxOvertimePerDay,
      maxOvertimePerWeek: settings.maxOvertimePerWeek,
      maxConsecutiveDays: settings.maxConsecutiveDays,
      minRestHoursBetweenShifts: settings.minRestHoursBetweenShifts,
      longShiftThreshold: settings.longShiftThreshold,
      minBreakForLongShifts: settings.minBreakForLongShifts,
      overtimeThreshold: settings.overtimeThreshold,
      ...laborLawRules,
    })
  } else {
    laborLawValidator = new LaborLawValidator('NO', laborLawRules)
  }

  const laborLawResult = await laborLawValidator.validateShift(shiftData, existingShiftData)

  let contractResult: ContractValidationResult | null = null
  
  if (contractInfo) {
    const contractValidator = new ContractValidator(
      contractInfo.contractType, 
      contractInfo.ftePercent,
      contractInfo.employeeRoleIds
    )
    
    const contractShiftData: ShiftDataForContract = {
      id: shift.id,
      date: shift.date,
      startTime: shift.startTime,
      endTime: shift.endTime,
      breakStart: shift.breakStart,
      breakEnd: shift.breakEnd,
      employeeId: shift.employeeId,
    }

    const existingContractShiftData: ShiftDataForContract[] = existingShifts.map(s => ({
      id: s.id,
      date: s.date,
      startTime: s.startTime,
      endTime: s.endTime,
      breakStart: s.breakStart,
      breakEnd: s.breakEnd,
      employeeId: s.employeeId,
    }))

    contractResult = contractValidator.validateShiftAgainstContract(
      contractShiftData, 
      existingContractShiftData
    )
  }

  const hasLaborLawViolations = laborLawResult.violations.length > 0
  const hasContractDeviations = contractResult?.hasDeviations || false
  
  const allOverridable = laborLawResult.violations.every(v => v.overridable === true)
  const contractAllowsScheduling = contractResult?.deviations 
    ? (contractInfo?.contractType?.allowSchedulingWithDeviation ?? true)
    : true

  const canSchedule = !hasLaborLawViolations || allOverridable
  const requiresOverride = hasLaborLawViolations && allOverridable

  let summaryMessage: string | null = null
  if (hasLaborLawViolations) {
    summaryMessage = `${laborLawResult.violations.length} labor law violation(s)`
    if (hasContractDeviations) {
      summaryMessage += ` and ${contractResult!.deviations.length} contract deviation(s)`
    }
  } else if (hasContractDeviations) {
    summaryMessage = `${contractResult!.deviations.length} contract deviation(s)`
  }

  return {
    laborLaw: {
      isValid: laborLawResult.isValid,
      violations: laborLawResult.violations,
      warnings: laborLawResult.warnings,
    },
    contract: contractResult,
    canSchedule,
    requiresOverride,
    summaryMessage,
  }
}

export async function getEmployeeShiftsForValidation(
  employeeId: string,
  startDate: Date,
  endDate: Date,
  excludeShiftId?: string
): Promise<ShiftValidationInput[]> {
  const shifts = await prisma.shift.findMany({
    where: {
      employeeId,
      date: {
        gte: startDate,
        lte: endDate,
      },
      ...(excludeShiftId ? { NOT: { id: excludeShiftId } } : {}),
    },
    select: {
      id: true,
      date: true,
      startTime: true,
      endTime: true,
      breakStart: true,
      breakEnd: true,
      employeeId: true,
    },
  })

  return shifts.map(s => ({
    id: s.id,
    date: s.date,
    startTime: s.startTime,
    endTime: s.endTime || '',
    breakStart: s.breakStart?.toISOString().split('T')[1]?.substring(0, 5) || null,
    breakEnd: s.breakEnd?.toISOString().split('T')[1]?.substring(0, 5) || null,
    employeeId: s.employeeId || '',
  }))
}

export function formatCombinedValidationSummary(result: CombinedValidationResult): {
  redWarnings: string[]
  yellowWarnings: string[]
} {
  const redWarnings: string[] = []
  const yellowWarnings: string[] = []

  result.laborLaw.violations.forEach(v => {
    redWarnings.push(v.message)
  })

  result.laborLaw.warnings.forEach(w => {
    yellowWarnings.push(w.message)
  })

  if (result.contract) {
    result.contract.deviations.forEach(d => {
      yellowWarnings.push(d.message)
    })
  }

  return { redWarnings, yellowWarnings }
}

export function isOvertimeEligibleForEmployee(contractResult: ContractValidationResult | null): {
  eligible: boolean
  reason: string | null
} {
  if (!contractResult) {
    return { eligible: true, reason: null }
  }

  return {
    eligible: contractResult.overtimeEligible,
    reason: contractResult.overtimeExemptReason,
  }
}

export async function getBatchEmployeeShiftsForValidation(
  employeeIds: string[],
  startDate: Date,
  endDate: Date
): Promise<Map<string, ShiftValidationInput[]>> {
  if (employeeIds.length === 0) {
    return new Map()
  }

  const shifts = await prisma.shift.findMany({
    where: {
      employeeId: {
        in: employeeIds
      },
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      id: true,
      date: true,
      startTime: true,
      endTime: true,
      breakStart: true,
      breakEnd: true,
      employeeId: true,
    },
  })

  const shiftsByEmployee = new Map<string, ShiftValidationInput[]>()

  shifts.forEach(s => {
    const employeeId = s.employeeId || ''
    if (!shiftsByEmployee.has(employeeId)) {
      shiftsByEmployee.set(employeeId, [])
    }

    shiftsByEmployee.get(employeeId)!.push({
      id: s.id,
      date: s.date,
      startTime: s.startTime,
      endTime: s.endTime || '',
      breakStart: s.breakStart?.toISOString().split('T')[1]?.substring(0, 5) || null,
      breakEnd: s.breakEnd?.toISOString().split('T')[1]?.substring(0, 5) || null,
      employeeId: employeeId,
    })
  })

  return shiftsByEmployee
}
