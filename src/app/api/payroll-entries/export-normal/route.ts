import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/shared/lib/auth'
import { prisma } from '@/shared/lib/prisma'
import ExcelJS from 'exceljs'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const payrollPeriodId = searchParams.get('payrollPeriodId')
    const statusParam = searchParams.get('status')

    if (!payrollPeriodId) {
      return NextResponse.json(
        { error: 'Payroll period ID is required' },
        { status: 400 }
      )
    }

    const payrollPeriod = await prisma.payrollPeriod.findFirst({
      where: {
        id: payrollPeriodId,
        businessId: user.businessId,
      },
    })

    if (!payrollPeriod) {
      return NextResponse.json(
        { error: 'Payroll period not found' },
        { status: 404 }
      )
    }

    const whereClause: any = {
      payrollPeriodId,
    }

    if (statusParam && statusParam !== 'all') {
      const statuses = statusParam.split(',').map((value) => value.trim().toUpperCase()).filter(Boolean)
      if (statuses.length > 0) {
        whereClause.status = statuses.length === 1 ? statuses[0] : { in: statuses }
      }
    }

    const payrollEntries = await prisma.payrollEntry.findMany({
      where: whereClause,
      include: {
        employee: {
          include: {
            employeeGroup: {
              select: {
                id: true,
                name: true,
              },
            },
            employeeGroups: {
              select: {
                employeeGroupId: true,
                isPrimary: true,
                employeeGroup: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
              orderBy: {
                isPrimary: 'desc',
              },
            },
          },
        },
        payrollPeriod: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('Payroll Entries')

    worksheet.columns = [
      { header: 'First name', key: 'firstName', width: 18 },
      { header: 'Last Name', key: 'lastName', width: 18 },
      { header: 'Period Dates', key: 'periodDates', width: 24 },
      { header: 'Tax ID', key: 'taxId', width: 14 },
      { header: 'Employee group name', key: 'employeeGroupName', width: 24 },
      { header: 'Total worked hours (excl. breaks)', key: 'totalWorkedHours', width: 30 },
      { header: 'Avg. hourly wage', key: 'avgHourlyWage', width: 16 },
      { header: 'Salary amount', key: 'salaryAmount', width: 14 },
      { header: 'Status', key: 'status', width: 12 },
    ]

    const headerRow = worksheet.getRow(1)
    headerRow.font = { bold: true }
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF31BCFF' }
    }
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }

    payrollEntries.forEach((entry) => {
      const totalWorkedHours = (entry.regularHours ?? 0) + (entry.overtimeHours ?? 0)
      const salaryAmount = entry.grossPay ?? 0
      const avgHourlyWage = salaryAmount === 0 ? 0 : totalWorkedHours / salaryAmount
      const primaryGroup = entry.employee.employeeGroups?.find(group => group.isPrimary)?.employeeGroup
      const fallbackGroup = entry.employee.employeeGroups?.[0]?.employeeGroup
      const employeeGroupName = primaryGroup?.name || fallbackGroup?.name || entry.employee.employeeGroup?.name || ''

      worksheet.addRow({
        firstName: entry.employee.firstName,
        lastName: entry.employee.lastName,
        periodDates: `${new Date(entry.payrollPeriod.startDate).toLocaleDateString()} - ${new Date(entry.payrollPeriod.endDate).toLocaleDateString()}`,
        taxId: '',
        employeeGroupName,
        totalWorkedHours: Number(totalWorkedHours.toFixed(2)),
        avgHourlyWage: Number(avgHourlyWage.toFixed(2)),
        salaryAmount: Number(salaryAmount.toFixed(2)),
        status: entry.status,
      })
    })

    const buffer = await workbook.xlsx.writeBuffer()

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="payroll-entries-${payrollPeriod.name.replace(/\s+/g, '-')}.xlsx"`,
      },
    })

  } catch (error) {
    console.error('Error generating normal export:', error)
    return NextResponse.json(
      { error: 'Failed to generate export' },
      { status: 500 }
    )
  }
}
