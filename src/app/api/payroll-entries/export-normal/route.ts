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
        employee: true,
        payrollPeriod: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('Payroll Entries')

    worksheet.columns = [
      { header: 'Employee Name', key: 'employeeName', width: 25 },
      { header: 'Employee No', key: 'employeeNo', width: 15 },
      { header: 'Payroll Period', key: 'period', width: 20 },
      { header: 'Period Start Date', key: 'startDate', width: 15 },
      { header: 'Period End Date', key: 'endDate', width: 15 },
      { header: 'Regular Hours', key: 'regularHours', width: 12 },
      { header: 'Overtime Hours', key: 'overtimeHours', width: 14 },
      { header: 'Gross Pay', key: 'grossPay', width: 12 },
      { header: 'Deductions', key: 'deductions', width: 12 },
      { header: 'Net Pay', key: 'netPay', width: 12 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Created Date', key: 'createdAt', width: 15 },
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
      worksheet.addRow({
        employeeName: `${entry.employee.firstName} ${entry.employee.lastName}`,
        employeeNo: entry.employee.employeeNo || '',
        period: entry.payrollPeriod.name,
        startDate: new Date(entry.payrollPeriod.startDate).toLocaleDateString(),
        endDate: new Date(entry.payrollPeriod.endDate).toLocaleDateString(),
        regularHours: entry.regularHours,
        overtimeHours: entry.overtimeHours,
        grossPay: entry.grossPay,
        deductions: entry.deductions,
        netPay: entry.netPay,
        status: entry.status,
        createdAt: new Date(entry.createdAt).toLocaleDateString(),
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
