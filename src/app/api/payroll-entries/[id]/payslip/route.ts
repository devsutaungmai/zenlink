import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/shared/lib/auth'
import { prisma } from '@/shared/lib/prisma'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export const maxDuration = 30

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

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
    })

    if (!payrollEntry) {
      return NextResponse.json(
        { error: 'Payroll entry not found' },
        { status: 404 }
      )
    }

    // Get business information
    const business = await prisma.business.findUnique({
      where: { id: user.businessId },
      select: {
        name: true,
        address: true,
      },
    })

    // Generate PDF using jsPDF
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    })

    const pageWidth = pdf.internal.pageSize.getWidth()
    const margin = 20
    let yPos = margin

    // Header
    pdf.setFillColor(49, 188, 255) // #31BCFF
    pdf.rect(0, 0, pageWidth, 40, 'F')
    
    pdf.setTextColor(255, 255, 255)
    pdf.setFontSize(24)
    pdf.setFont('helvetica', 'bold')
    pdf.text('PAYSLIP', pageWidth / 2, 20, { align: 'center' })
    
    pdf.setFontSize(12)
    pdf.setFont('helvetica', 'normal')
    pdf.text(payrollEntry.payrollPeriod.name, pageWidth / 2, 32, { align: 'center' })
    
    yPos = 55

    // Company Info
    pdf.setTextColor(0, 0, 0)
    pdf.setFontSize(14)
    pdf.setFont('helvetica', 'bold')
    pdf.text(business?.name || 'Company', margin, yPos)
    
    if (business?.address) {
      pdf.setFontSize(10)
      pdf.setFont('helvetica', 'normal')
      pdf.text(business.address, margin, yPos + 6)
      yPos += 10
    }
    yPos += 15

    // Employee Info Box
    pdf.setFillColor(248, 249, 250)
    pdf.rect(margin, yPos, pageWidth - margin * 2, 35, 'F')
    
    yPos += 8
    pdf.setFontSize(12)
    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(73, 80, 87)
    pdf.text('Employee Information', margin + 5, yPos)
    
    yPos += 8
    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'normal')
    
    const empName = `${payrollEntry.employee.firstName} ${payrollEntry.employee.lastName}`
    const empNo = `Employee No: ${payrollEntry.employee.employeeNo || 'N/A'}`
    const empEmail = payrollEntry.employee.email || 'N/A'
    const periodStart = new Date(payrollEntry.payrollPeriod.startDate).toLocaleDateString()
    const periodEnd = new Date(payrollEntry.payrollPeriod.endDate).toLocaleDateString()
    
    pdf.text(empName, margin + 5, yPos)
    pdf.text(empNo, pageWidth / 2, yPos)
    yPos += 5
    pdf.text(`Email: ${empEmail}`, margin + 5, yPos)
    pdf.text(`Period: ${periodStart} - ${periodEnd}`, pageWidth / 2, yPos)
    
    yPos += 20

    // Earnings Table
    pdf.setTextColor(0, 0, 0)
    pdf.setFontSize(12)
    pdf.setFont('helvetica', 'bold')
    pdf.text('Earnings', margin, yPos)
    yPos += 5

    // Safely get numeric values with defaults
    const regularHours = payrollEntry.regularHours ?? 0
    const regularRate = payrollEntry.regularRate ?? 0
    const overtimeHours = payrollEntry.overtimeHours ?? 0
    const overtimeRate = payrollEntry.overtimeRate ?? 0
    const deductions = payrollEntry.deductions ?? 0
    const bonuses = payrollEntry.bonuses ?? 0
    const grossPay = payrollEntry.grossPay ?? 0
    const netPay = payrollEntry.netPay ?? 0
    const totalHours = regularHours + overtimeHours

    const regularPay = regularHours * regularRate
    const overtimePay = overtimeHours * overtimeRate

    autoTable(pdf, {
      startY: yPos,
      margin: { left: margin, right: margin },
      head: [['Description', 'Hours', 'Rate', 'Amount']],
      body: [
        ['Regular Hours', regularHours.toFixed(2), `$${regularRate.toFixed(2)}`, `$${regularPay.toFixed(2)}`],
        ['Overtime Hours', overtimeHours.toFixed(2), `$${overtimeRate.toFixed(2)}`, `$${overtimePay.toFixed(2)}`],
      ],
      headStyles: { fillColor: [49, 188, 255], textColor: 255 },
      styles: { fontSize: 10 },
      columnStyles: {
        0: { cellWidth: 60 },
        1: { cellWidth: 30, halign: 'right' },
        2: { cellWidth: 35, halign: 'right' },
        3: { cellWidth: 40, halign: 'right' },
      },
    })

    yPos = (pdf as any).lastAutoTable.finalY + 15

    // Deductions Table
    pdf.setFontSize(12)
    pdf.setFont('helvetica', 'bold')
    pdf.text('Deductions', margin, yPos)
    yPos += 5

    autoTable(pdf, {
      startY: yPos,
      margin: { left: margin, right: margin },
      head: [['Description', 'Amount']],
      body: [
        ['Deductions', `$${deductions.toFixed(2)}`],
      ],
      headStyles: { fillColor: [220, 53, 69], textColor: 255 },
      styles: { fontSize: 10 },
      columnStyles: {
        0: { cellWidth: 100 },
        1: { cellWidth: 65, halign: 'right' },
      },
    })

    yPos = (pdf as any).lastAutoTable.finalY + 15

    // Summary Section
    pdf.setFillColor(236, 253, 245)
    pdf.rect(margin, yPos, pageWidth - margin * 2, 45, 'F')

    yPos += 10
    pdf.setFontSize(11)
    pdf.setFont('helvetica', 'normal')
    
    const colX1 = margin + 5
    const colX2 = pageWidth / 2 + 10
    
    pdf.text(`Gross Pay:`, colX1, yPos)
    pdf.text(`$${grossPay.toFixed(2)}`, colX1 + 70, yPos)
    
    pdf.text(`Total Hours:`, colX2, yPos)
    pdf.text(`${totalHours.toFixed(2)}`, colX2 + 50, yPos)
    
    yPos += 8
    pdf.text(`Bonuses:`, colX1, yPos)
    pdf.text(`$${bonuses.toFixed(2)}`, colX1 + 70, yPos)
    
    pdf.text(`Deductions:`, colX2, yPos)
    pdf.text(`-$${deductions.toFixed(2)}`, colX2 + 50, yPos)

    yPos += 12
    pdf.setFontSize(16)
    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(4, 120, 87)
    pdf.text(`Net Pay: $${netPay.toFixed(2)}`, pageWidth / 2, yPos, { align: 'center' })

    // Footer
    const footerY = pdf.internal.pageSize.getHeight() - 20
    pdf.setFontSize(9)
    pdf.setTextColor(107, 114, 128)
    pdf.setFont('helvetica', 'normal')
    pdf.text(`Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, pageWidth / 2, footerY, { align: 'center' })
    pdf.text('For questions about this payslip, please contact your HR department.', pageWidth / 2, footerY + 5, { align: 'center' })

    // Output PDF
    const pdfBuffer = Buffer.from(pdf.output('arraybuffer'))
    const filename = `payslip-${payrollEntry.employee.firstName}-${payrollEntry.employee.lastName}-${payrollEntry.payrollPeriod.name.replace(/\s+/g, '-')}.pdf`

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    })
  } catch (error) {
    console.error('Error generating payslip:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
