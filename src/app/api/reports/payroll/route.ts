import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/shared/lib/auth'
import { prisma } from '@/shared/lib/prisma'

export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const {
      startDate,
      endDate,
      employeeIds = [],
      departmentIds = [],
      includeApprovedOnly = false,
      includePaidOnly = false
    } = await request.json()

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'Start date and end date are required' },
        { status: 400 }
      )
    }

    let employeeWhere: any = {
      department: {
        businessId: user.businessId
      }
    }

    if (employeeIds.length > 0) {
      employeeWhere.id = { in: employeeIds }
    }

    if (departmentIds.length > 0) {
      employeeWhere.departmentId = { in: departmentIds }
    }

    let payrollEntryWhere: any = {
      payrollPeriod: {
        businessId: user.businessId,
        OR: [
          {
            startDate: { gte: new Date(startDate) },
            startDate: { lte: new Date(endDate) }
          },
          {
            endDate: { gte: new Date(startDate) },
            endDate: { lte: new Date(endDate) }
          },
          {
            startDate: { lte: new Date(startDate) },
            endDate: { gte: new Date(endDate) }
          }
        ]
      }
    }

    if (includeApprovedOnly) {
      payrollEntryWhere.status = { in: ['APPROVED', 'PAID'] }
    } else if (includePaidOnly) {
      payrollEntryWhere.status = 'PAID'
    }

    if (employeeIds.length > 0) {
      payrollEntryWhere.employeeId = { in: employeeIds }
    }

    if (departmentIds.length > 0) {
      const employeesInDepartments = await prisma.employee.findMany({
        where: {
          departmentId: { in: departmentIds },
          department: {
            businessId: user.businessId
          }
        },
        select: { id: true }
      })
      
      const empIds = employeesInDepartments.map(e => e.id)
      payrollEntryWhere.employeeId = { in: empIds }
    }

    const payrollEntries = await prisma.payrollEntry.findMany({
      where: payrollEntryWhere,
      include: {
        employee: {
          include: {
            department: {
              select: {
                id: true,
                name: true
              }
            },
            employeeGroup: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        payrollPeriod: {
          select: {
            id: true,
            name: true,
            startDate: true,
            endDate: true
          }
        }
      },
      orderBy: [
        { employee: { department: { name: 'asc' } } },
        { employee: { lastName: 'asc' } },
        { employee: { firstName: 'asc' } },
        { payrollPeriod: { startDate: 'desc' } }
      ]
    })

    const summary = {
      totalEntries: payrollEntries.length,
      totalEmployees: [...new Set(payrollEntries.map(entry => entry.employeeId))].length,
      totalRegularHours: payrollEntries.reduce((sum, entry) => sum + entry.regularHours, 0),
      totalOvertimeHours: payrollEntries.reduce((sum, entry) => sum + entry.overtimeHours, 0),
      totalGrossPay: payrollEntries.reduce((sum, entry) => sum + entry.grossPay, 0),
      totalDeductions: payrollEntries.reduce((sum, entry) => sum + entry.deductions, 0),
      totalNetPay: payrollEntries.reduce((sum, entry) => sum + entry.netPay, 0),
      totalBonuses: payrollEntries.reduce((sum, entry) => sum + entry.bonuses, 0),
      byStatus: {
        draft: payrollEntries.filter(e => e.status === 'DRAFT').length,
        approved: payrollEntries.filter(e => e.status === 'APPROVED').length,
        paid: payrollEntries.filter(e => e.status === 'PAID').length
      },
      byDepartment: {} as Record<string, {
        name: string
        count: number
        totalHours: number
        totalGrossPay: number
        totalNetPay: number
      }>
    }

    payrollEntries.forEach(entry => {
      const deptId = entry.employee.department.id
      const deptName = entry.employee.department.name
      
      if (!summary.byDepartment[deptId]) {
        summary.byDepartment[deptId] = {
          name: deptName,
          count: 0,
          totalHours: 0,
          totalGrossPay: 0,
          totalNetPay: 0
        }
      }
      
      summary.byDepartment[deptId].count++
      summary.byDepartment[deptId].totalHours += entry.regularHours + entry.overtimeHours
      summary.byDepartment[deptId].totalGrossPay += entry.grossPay
      summary.byDepartment[deptId].totalNetPay += entry.netPay
    })

    return NextResponse.json({
      entries: payrollEntries,
      summary,
      dateRange: { startDate, endDate }
    })

  } catch (error) {
    console.error('Error generating payroll report:', error)
    return NextResponse.json(
      { error: 'Failed to generate payroll report' },
      { status: 500 }
    )
  }
}
