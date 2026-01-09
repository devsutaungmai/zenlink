import { prisma } from '@/shared/lib/prisma'
import { ContractType, LaborLawProfile, LaborLawSettings, EmploymentType, OvertimeExemption, ContractWarningType } from '@prisma/client'

export interface ContractRules {
  name: string
  employmentType: EmploymentType
  defaultFtePercent: number
  agreedWeeklyHours: number | null
  maxPlannedWeeklyHours: number | null
  overtimeAllowed: boolean
  overtimeExemptRoleIds: string[]
  maxWeekendsPerMonth: number | null
  customBreakMinutes: number | null
  warningType: ContractWarningType
  notifyManagerOnDeviation: boolean
  allowSchedulingWithDeviation: boolean
}

export interface ContractDeviation {
  type: 'OVER_AGREED_HOURS' | 'OVER_MAX_PLANNED' | 'WEEKEND_LIMIT' | 'BREAK_POLICY' | 'OVERTIME_NOT_ALLOWED' | 'OVERTIME_EXEMPT'
  message: string
  severity: 'WARNING'
  currentValue: number
  contractLimit: number
  affectedDate?: string
}

export interface ContractValidationResult {
  hasDeviations: boolean
  deviations: ContractDeviation[]
  overtimeEligible: boolean
  overtimeExemptReason: string | null
}

export interface ShiftDataForContract {
  id?: string
  date: string | Date
  startTime: string
  endTime: string
  breakStart?: string | null
  breakEnd?: string | null
  employeeId: string
}

export interface EmployeeContractInfo {
  contractType: ContractType & {
    laborLawProfile: LaborLawProfile & {
      laborLawSettings: LaborLawSettings | null
    }
  }
  ftePercent: number | null
  employeeRoleIds: string[]
}

export class ContractValidator {
  private contractRules: ContractRules
  private employeeFtePercent: number
  private employeeRoleIds: string[]

  constructor(contractType: ContractType, employeeFtePercent?: number | null, employeeRoleIds: string[] = []) {
    this.contractRules = {
      name: contractType.name,
      employmentType: contractType.employmentType,
      defaultFtePercent: contractType.defaultFtePercent,
      agreedWeeklyHours: contractType.agreedWeeklyHours,
      maxPlannedWeeklyHours: contractType.maxPlannedWeeklyHours,
      overtimeAllowed: contractType.overtimeAllowed,
      overtimeExemptRoleIds: contractType.overtimeExemptRoleIds || [],
      maxWeekendsPerMonth: contractType.maxWeekendsPerMonth,
      customBreakMinutes: contractType.customBreakMinutes,
      warningType: contractType.warningType,
      notifyManagerOnDeviation: contractType.notifyManagerOnDeviation,
      allowSchedulingWithDeviation: contractType.allowSchedulingWithDeviation,
    }
    this.employeeFtePercent = employeeFtePercent ?? contractType.defaultFtePercent
    this.employeeRoleIds = employeeRoleIds
  }

  private calculateShiftHours(shift: ShiftDataForContract): number {
    const startTime = this.parseTime(shift.startTime)
    const endTime = this.parseTime(shift.endTime)
    
    let hours = endTime - startTime
    if (hours < 0) {
      hours += 24
    }

    if (shift.breakStart && shift.breakEnd) {
      const breakStart = this.parseTime(shift.breakStart)
      const breakEnd = this.parseTime(shift.breakEnd)
      let breakHours = breakEnd - breakStart
      if (breakHours < 0) {
        breakHours += 24
      }
      hours -= breakHours
    }

    return hours
  }

  private parseTime(timeStr: string): number {
    const [hours, minutes] = timeStr.split(':').map(Number)
    return hours + (minutes / 60)
  }

  private getEffectiveWeeklyHours(): number {
    if (!this.contractRules.agreedWeeklyHours) {
      return 40 * (this.employeeFtePercent / 100)
    }
    return this.contractRules.agreedWeeklyHours * (this.employeeFtePercent / 100)
  }

  private getEffectiveMaxPlannedHours(): number | null {
    if (!this.contractRules.maxPlannedWeeklyHours) {
      return null
    }
    return this.contractRules.maxPlannedWeeklyHours * (this.employeeFtePercent / 100)
  }

  private isWeekend(date: string | Date): boolean {
    const d = new Date(date)
    const day = d.getDay()
    return day === 0 || day === 6
  }

  private getWeekStart(date: Date): Date {
    const d = new Date(date)
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1)
    return new Date(d.setDate(diff))
  }

  private getMonthStart(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), 1)
  }

  validateShiftAgainstContract(
    shift: ShiftDataForContract,
    existingShifts: ShiftDataForContract[] = []
  ): ContractValidationResult {
    const deviations: ContractDeviation[] = []
    const shiftDate = typeof shift.date === 'string' ? shift.date : shift.date.toISOString().split('T')[0]

    const shiftHours = this.calculateShiftHours(shift)
    const weekStart = this.getWeekStart(new Date(shift.date))
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 6)

    const weeklyShifts = existingShifts.filter(s => {
      const sDate = new Date(s.date)
      return sDate >= weekStart && sDate <= weekEnd && s.id !== shift.id
    })

    const currentWeeklyHours = weeklyShifts.reduce((sum, s) => sum + this.calculateShiftHours(s), 0)
    const totalWeeklyHours = currentWeeklyHours + shiftHours

    const agreedHours = this.getEffectiveWeeklyHours()
    if (totalWeeklyHours > agreedHours) {
      deviations.push({
        type: 'OVER_AGREED_HOURS',
        message: `Weekly hours (${totalWeeklyHours.toFixed(1)}h) exceed agreed contract hours (${agreedHours.toFixed(1)}h)`,
        severity: 'WARNING',
        currentValue: totalWeeklyHours,
        contractLimit: agreedHours,
        affectedDate: shiftDate,
      })
    }

    const maxPlannedHours = this.getEffectiveMaxPlannedHours()
    if (maxPlannedHours && totalWeeklyHours > maxPlannedHours) {
      deviations.push({
        type: 'OVER_MAX_PLANNED',
        message: `Weekly hours (${totalWeeklyHours.toFixed(1)}h) exceed maximum planned hours (${maxPlannedHours.toFixed(1)}h)`,
        severity: 'WARNING',
        currentValue: totalWeeklyHours,
        contractLimit: maxPlannedHours,
        affectedDate: shiftDate,
      })
    }

    if (this.contractRules.maxWeekendsPerMonth !== null && this.isWeekend(shift.date)) {
      const monthStart = this.getMonthStart(new Date(shift.date))
      const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0)
      
      const weekendShifts = existingShifts.filter(s => {
        const sDate = new Date(s.date)
        return sDate >= monthStart && sDate <= monthEnd && this.isWeekend(s.date) && s.id !== shift.id
      })

      const uniqueWeekends = new Set<string>()
      weekendShifts.forEach(s => {
        const d = new Date(s.date)
        const weekKey = `${d.getFullYear()}-W${Math.ceil(d.getDate() / 7)}`
        uniqueWeekends.add(weekKey)
      })

      const shiftWeekKey = (() => {
        const d = new Date(shift.date)
        return `${d.getFullYear()}-W${Math.ceil(d.getDate() / 7)}`
      })()
      
      if (!uniqueWeekends.has(shiftWeekKey)) {
        uniqueWeekends.add(shiftWeekKey)
      }

      if (uniqueWeekends.size > this.contractRules.maxWeekendsPerMonth) {
        deviations.push({
          type: 'WEEKEND_LIMIT',
          message: `Weekend work (${uniqueWeekends.size}) exceeds contract limit (${this.contractRules.maxWeekendsPerMonth} per month)`,
          severity: 'WARNING',
          currentValue: uniqueWeekends.size,
          contractLimit: this.contractRules.maxWeekendsPerMonth,
          affectedDate: shiftDate,
        })
      }
    }

    if (this.contractRules.customBreakMinutes !== null) {
      const requiredBreakMinutes = this.contractRules.customBreakMinutes
      
      if (shift.breakStart && shift.breakEnd) {
        const breakStart = this.parseTime(shift.breakStart)
        const breakEnd = this.parseTime(shift.breakEnd)
        const breakMinutes = (breakEnd - breakStart) * 60
        
        if (breakMinutes < requiredBreakMinutes) {
          deviations.push({
            type: 'BREAK_POLICY',
            message: `Break duration (${breakMinutes.toFixed(0)} min) is less than contract policy (${requiredBreakMinutes} min)`,
            severity: 'WARNING',
            currentValue: breakMinutes,
            contractLimit: requiredBreakMinutes,
            affectedDate: shiftDate,
          })
        }
      } else if (shiftHours >= 5) {
        deviations.push({
          type: 'BREAK_POLICY',
          message: `No break scheduled. Contract policy requires ${requiredBreakMinutes} minute break.`,
          severity: 'WARNING',
          currentValue: 0,
          contractLimit: requiredBreakMinutes,
          affectedDate: shiftDate,
        })
      }
    }

    let overtimeEligible = this.contractRules.overtimeAllowed
    let overtimeExemptReason: string | null = null

    if (!this.contractRules.overtimeAllowed) {
      overtimeEligible = false
      overtimeExemptReason = 'Contract type does not allow overtime'
      
      if (totalWeeklyHours > agreedHours) {
        deviations.push({
          type: 'OVERTIME_NOT_ALLOWED',
          message: `Overtime not allowed for this contract type. Hours exceed agreed limit.`,
          severity: 'WARNING',
          currentValue: totalWeeklyHours,
          contractLimit: agreedHours,
          affectedDate: shiftDate,
        })
      }
    }

    const hasExemptRole = this.contractRules.overtimeExemptRoleIds.some(exemptRoleId => 
      this.employeeRoleIds.includes(exemptRoleId)
    )
    
    if (hasExemptRole) {
      overtimeEligible = false
      overtimeExemptReason = 'Employee has an overtime-exempt role'
    }

    return {
      hasDeviations: deviations.length > 0,
      deviations,
      overtimeEligible,
      overtimeExemptReason,
    }
  }

  isOvertimeEligible(): boolean {
    if (!this.contractRules.overtimeAllowed) return false
    
    const hasExemptRole = this.contractRules.overtimeExemptRoleIds.some(exemptRoleId => 
      this.employeeRoleIds.includes(exemptRoleId)
    )
    
    if (hasExemptRole) return false
    return true
  }

  getOvertimeExemptReason(): string | null {
    if (!this.contractRules.overtimeAllowed) {
      return 'Contract type does not allow overtime'
    }
    
    const hasExemptRole = this.contractRules.overtimeExemptRoleIds.some(exemptRoleId => 
      this.employeeRoleIds.includes(exemptRoleId)
    )
    
    if (hasExemptRole) {
      return 'Employee has an overtime-exempt role'
    }
    
    return null
  }

  getWarningType(): ContractWarningType {
    return this.contractRules.warningType
  }

  shouldNotifyManager(): boolean {
    return this.contractRules.notifyManagerOnDeviation
  }

  allowsSchedulingWithDeviation(): boolean {
    return this.contractRules.allowSchedulingWithDeviation
  }

  getContractRules(): ContractRules {
    return { ...this.contractRules }
  }
}

export async function getEmployeeContractInfo(employeeId: string): Promise<EmployeeContractInfo | null> {
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: {
      ftePercent: true,
      contractTypeId: true,
      contractType: {
        include: {
          laborLawProfile: {
            include: {
              laborLawSettings: true,
            },
          },
        },
      },
      employeeRoles: {
        select: {
          roleId: true,
        },
      },
    },
  })

  if (!employee || !employee.contractType) {
    return null
  }

  return {
    contractType: employee.contractType as EmployeeContractInfo['contractType'],
    ftePercent: employee.ftePercent,
    employeeRoleIds: employee.employeeRoles.map(er => er.roleId),
  }
}

export async function validateShiftWithContractRules(
  shift: ShiftDataForContract,
  existingShifts: ShiftDataForContract[] = []
): Promise<ContractValidationResult | null> {
  const contractInfo = await getEmployeeContractInfo(shift.employeeId)
  
  if (!contractInfo) {
    return null
  }

  const validator = new ContractValidator(
    contractInfo.contractType, 
    contractInfo.ftePercent,
    contractInfo.employeeRoleIds
  )
  return validator.validateShiftAgainstContract(shift, existingShifts)
}

export function formatContractDeviation(deviation: ContractDeviation): string {
  return deviation.message
}

export function separateContractDeviations(deviations: ContractDeviation[]): {
  hourDeviations: ContractDeviation[]
  weekendDeviations: ContractDeviation[]
  breakDeviations: ContractDeviation[]
  overtimeDeviations: ContractDeviation[]
} {
  return {
    hourDeviations: deviations.filter(d => 
      d.type === 'OVER_AGREED_HOURS' || d.type === 'OVER_MAX_PLANNED'
    ),
    weekendDeviations: deviations.filter(d => d.type === 'WEEKEND_LIMIT'),
    breakDeviations: deviations.filter(d => d.type === 'BREAK_POLICY'),
    overtimeDeviations: deviations.filter(d => 
      d.type === 'OVERTIME_NOT_ALLOWED' || d.type === 'OVERTIME_EXEMPT'
    ),
  }
}
