import { prisma } from '@/shared/lib/prisma'
import { Decimal } from '@prisma/client/runtime/library'
import { ContractValidator, getEmployeeContractInfo } from './contractValidation'

interface PayCalculationInput {
  employeeId: string
  payrollPeriodId: string
  totalHours: number
  regularHours: number
  shiftDetails: Array<{
    date: string
    startTime: string
    endTime: string
    hours: number
    breakDuration: number
    breakPaid: boolean
  }>
}

interface PayCalculationResult {
  regularHours: number
  overtimeHours: number
  regularRate: number
  overtimeRate: number
  bonuses: number
  deductions: number
  grossPay: number
  netPay: number
  appliedRules: Array<{
    ruleName: string
    salaryCode: string
    amount: number
    description: string
  }>
  overtimeCalculations: Array<{
    date: string
    regularHours: number
    overtimeHours: number
    overtimeRule: string
  }>
}

export class PayRulesEngine {
  /**
   * Calculate pay for an employee based on pay rules and overtime rules
   */
  async calculatePay(input: PayCalculationInput): Promise<PayCalculationResult> {
    const { employeeId, payrollPeriodId, totalHours, regularHours, shiftDetails } = input

    // Get employee with pay rules
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        employeeGroup: {
          include: {
            employeeGroupPayRules: {
              where: { isDefault: true },
              include: {
                payRule: {
                  include: {
                    salaryCode: true,
                    overtimeRule: true
                  }
                }
              }
            }
          }
        },
        employeePayRules: {
          where: {
            isActive: true,
            OR: [
              { effectiveTo: null },
              { effectiveTo: { gte: new Date() } }
            ]
          },
          include: {
            payRule: {
              include: {
                salaryCode: true,
                overtimeRule: true
              }
            }
          }
        }
      }
    })

    if (!employee) {
      throw new Error('Employee not found')
    }

    // Get payroll period
    const payrollPeriod = await prisma.payrollPeriod.findUnique({
      where: { id: payrollPeriodId }
    })

    if (!payrollPeriod) {
      throw new Error('Payroll period not found')
    }

    // Determine applicable pay rules (employee-specific rules override group rules)
    const applicableRules = this.getApplicablePayRules(employee)

    // Calculate base rates
    const baseRates = this.calculateBaseRates(applicableRules, employee)

    // Check contract rules for overtime eligibility
    const contractInfo = await getEmployeeContractInfo(employeeId)
    let isOvertimeEligible = true
    let overtimeExemptReason: string | null = null

    if (contractInfo) {
      const contractValidator = new ContractValidator(
        contractInfo.contractType,
        contractInfo.ftePercent,
        contractInfo.employeeRoleIds
      )
      isOvertimeEligible = contractValidator.isOvertimeEligible()
      overtimeExemptReason = contractValidator.getOvertimeExemptReason()
    }

    // Calculate overtime based on overtime rules (only if eligible per contract)
    const overtimeCalculation = isOvertimeEligible 
      ? this.calculateOvertime(shiftDetails, applicableRules)
      : this.calculateNoOvertime(shiftDetails)

    // Calculate final pay amounts
    const regularPay = overtimeCalculation.totalRegularHours * baseRates.regularRate
    const overtimePay = overtimeCalculation.totalOvertimeHours * baseRates.overtimeRate

    // Calculate bonuses and deductions (placeholder for now)
    const bonuses = 0
    const deductions = 0

    const grossPay = regularPay + overtimePay + bonuses
    const netPay = grossPay - deductions

    return {
      regularHours: overtimeCalculation.totalRegularHours,
      overtimeHours: overtimeCalculation.totalOvertimeHours,
      regularRate: baseRates.regularRate,
      overtimeRate: baseRates.overtimeRate,
      bonuses,
      deductions,
      grossPay,
      netPay,
      appliedRules: this.buildAppliedRulesSummary(applicableRules, regularPay, overtimePay),
      overtimeCalculations: overtimeCalculation.dailyBreakdown
    }
  }

  /**
   * Get applicable pay rules for an employee (employee-specific rules override group rules)
   */
  private getApplicablePayRules(employee: any) {
    const rules = new Map()

    // First, add group rules as defaults
    if (employee.employeeGroup?.employeeGroupPayRules) {
      for (const groupRule of employee.employeeGroup.employeeGroupPayRules) {
        rules.set(groupRule.payRule.ruleType, {
          source: 'group',
          rule: groupRule.payRule,
          rate: Number(groupRule.baseRate)
        })
      }
    }

    // Then, override with employee-specific rules
    if (employee.employeePayRules) {
      for (const empRule of employee.employeePayRules) {
        rules.set(empRule.payRule.ruleType, {
          source: 'employee',
          rule: empRule.payRule,
          rate: Number(empRule.customRate)
        })
      }
    }

    return Array.from(rules.values())
  }

  /**
   * Calculate base hourly rates
   */
  private calculateBaseRates(applicableRules: any[], employee: any) {
    let regularRate = 0
    let overtimeRate = 0

    // Find regular rate rule
    const regularRule = applicableRules.find(r => r.rule.ruleType === 'REGULAR')
    if (regularRule) {
      regularRate = regularRule.rate
    } else if (employee.salaryRate && employee.salaryRate > 0) {
      regularRate = employee.salaryRate
    } else {
      // Fall back to employee group hourly wage
      regularRate = employee.employeeGroup?.hourlyWage || 0
    }

    // Find overtime rule and calculate overtime rate
    const overtimeRule = applicableRules.find(r => r.rule.ruleType === 'OVERTIME')
    if (overtimeRule?.rule.overtimeRule) {
      const multiplier = Number(overtimeRule.rule.overtimeRule.rateMultiplier)
      overtimeRate = regularRate * multiplier
    } else {
      // Default 1.5x overtime rate
      overtimeRate = regularRate * 1.5
    }

    return { regularRate, overtimeRate }
  }

  /**
   * Calculate overtime hours based on overtime rules
   */
  private calculateOvertime(shiftDetails: any[], applicableRules: any[]) {
    let totalRegularHours = 0
    let totalOvertimeHours = 0
    const dailyBreakdown: Array<{
      date: string
      regularHours: number
      overtimeHours: number
      overtimeRule: string
    }> = []

    // Find overtime rule
    const overtimeRule = applicableRules.find(r => r.rule.ruleType === 'OVERTIME')
    const overtimeConfig = overtimeRule?.rule.overtimeRule

    if (!overtimeConfig) {
      // No overtime rule - all hours are regular
      totalRegularHours = shiftDetails.reduce((sum, shift) => sum + shift.hours, 0)
      return {
        totalRegularHours,
        totalOvertimeHours: 0,
        dailyBreakdown: shiftDetails.map(shift => ({
          date: shift.date,
          regularHours: shift.hours,
          overtimeHours: 0,
          overtimeRule: 'No overtime rule'
        }))
      }
    }

    const triggerHours = Number(overtimeConfig.triggerAfterHours)
    const isDaily = overtimeConfig.isDaily

    if (isDaily) {
      // Daily overtime calculation
      for (const shift of shiftDetails) {
        let regularHours = Math.min(shift.hours, triggerHours)
        let overtimeHours = Math.max(0, shift.hours - triggerHours)

        totalRegularHours += regularHours
        totalOvertimeHours += overtimeHours

        dailyBreakdown.push({
          date: shift.date,
          regularHours,
          overtimeHours,
          overtimeRule: `Daily overtime after ${triggerHours}h`
        })
      }
    } else {
      // Weekly overtime calculation
      const totalHours = shiftDetails.reduce((sum, shift) => sum + shift.hours, 0)
      const weeklyRegularHours = Math.min(totalHours, triggerHours)
      const weeklyOvertimeHours = Math.max(0, totalHours - triggerHours)

      // Distribute overtime proportionally across shifts
      const overtimeRatio = weeklyOvertimeHours / totalHours
      
      for (const shift of shiftDetails) {
        const shiftRegularHours = shift.hours * (1 - overtimeRatio)
        const shiftOvertimeHours = shift.hours * overtimeRatio

        totalRegularHours += shiftRegularHours
        totalOvertimeHours += shiftOvertimeHours

        dailyBreakdown.push({
          date: shift.date,
          regularHours: Math.round(shiftRegularHours * 100) / 100,
          overtimeHours: Math.round(shiftOvertimeHours * 100) / 100,
          overtimeRule: `Weekly overtime after ${triggerHours}h`
        })
      }
    }

    return {
      totalRegularHours: Math.round(totalRegularHours * 100) / 100,
      totalOvertimeHours: Math.round(totalOvertimeHours * 100) / 100,
      dailyBreakdown
    }
  }

  /**
   * Calculate hours when overtime is not eligible (all hours are regular)
   */
  private calculateNoOvertime(shiftDetails: any[]) {
    const totalRegularHours = shiftDetails.reduce((sum, shift) => sum + shift.hours, 0)
    
    return {
      totalRegularHours: Math.round(totalRegularHours * 100) / 100,
      totalOvertimeHours: 0,
      dailyBreakdown: shiftDetails.map(shift => ({
        date: shift.date,
        regularHours: shift.hours,
        overtimeHours: 0,
        overtimeRule: 'Overtime not eligible per contract'
      }))
    }
  }

  /**
   * Build summary of applied rules
   */
  private buildAppliedRulesSummary(applicableRules: any[], regularPay: number, overtimePay: number) {
    const appliedRules = []

    // Regular pay rule
    const regularRule = applicableRules.find(r => r.rule.ruleType === 'REGULAR')
    if (regularRule) {
      appliedRules.push({
        ruleName: regularRule.rule.name,
        salaryCode: regularRule.rule.salaryCode.code,
        amount: regularPay,
        description: `Regular hours at ${regularRule.rule.salaryCode.name}`
      })
    }

    // Overtime pay rule
    const overtimeRule = applicableRules.find(r => r.rule.ruleType === 'OVERTIME')
    if (overtimeRule && overtimePay > 0) {
      appliedRules.push({
        ruleName: overtimeRule.rule.name,
        salaryCode: overtimeRule.rule.salaryCode.code,
        amount: overtimePay,
        description: `Overtime hours at ${overtimeRule.rule.salaryCode.name}`
      })
    }

    return appliedRules
  }

  /**
   * Calculate sick pay based on 3-month average
   */
  async calculateSickPay(employeeId: string, sickDays: number): Promise<number> {
    // Get the most recent sick pay calculation
    const sickPayCalc = await prisma.sickPayCalculation.findFirst({
      where: { employeeId },
      orderBy: { calculationDate: 'desc' }
    })

    if (!sickPayCalc) {
      // No sick pay calculation available - calculate from recent payroll entries
      const threeMonthsAgo = new Date()
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)

      const recentEntries = await prisma.payrollEntry.findMany({
        where: {
          employeeId,
          payrollPeriod: {
            startDate: { gte: threeMonthsAgo }
          }
        },
        include: {
          payrollPeriod: true
        }
      })

      if (recentEntries.length === 0) {
        return 0
      }

      const totalPay = recentEntries.reduce((sum, entry) => sum + entry.grossPay, 0)
      const totalDays = recentEntries.length * 30 // Approximate days per payroll period
      const dailyRate = totalPay / totalDays

      return sickDays * dailyRate
    }

    return sickDays * Number(sickPayCalc.dailyRate)
  }

  /**
   * Update sick pay calculation for an employee
   */
  async updateSickPayCalculation(employeeId: string): Promise<void> {
    const threeMonthsAgo = new Date()
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)

    const recentEntries = await prisma.payrollEntry.findMany({
      where: {
        employeeId,
        payrollPeriod: {
          startDate: { gte: threeMonthsAgo }
        }
      },
      include: {
        payrollPeriod: true
      }
    })

    if (recentEntries.length === 0) {
      return
    }

    const totalPay = recentEntries.reduce((sum, entry) => sum + entry.grossPay, 0)
    const totalHours = recentEntries.reduce((sum, entry) => sum + entry.regularHours + entry.overtimeHours, 0)
    const totalDays = recentEntries.length * 30 // Approximate

    const dailyRate = totalPay / totalDays
    const hourlyRate = totalPay / totalHours

    await prisma.sickPayCalculation.upsert({
      where: {
        employeeId_calculationDate: {
          employeeId,
          calculationDate: new Date()
        }
      },
      update: {
        threeMonthAverage: new Decimal(totalPay / 3),
        basePeriodStart: threeMonthsAgo,
        basePeriodEnd: new Date(),
        totalHours: new Decimal(totalHours),
        totalPay: new Decimal(totalPay),
        dailyRate: new Decimal(dailyRate),
        hourlyRate: new Decimal(hourlyRate)
      },
      create: {
        employeeId,
        calculationDate: new Date(),
        threeMonthAverage: new Decimal(totalPay / 3),
        basePeriodStart: threeMonthsAgo,
        basePeriodEnd: new Date(),
        totalHours: new Decimal(totalHours),
        totalPay: new Decimal(totalPay),
        dailyRate: new Decimal(dailyRate),
        hourlyRate: new Decimal(hourlyRate)
      }
    })
  }
}

export const payRulesEngine = new PayRulesEngine()
