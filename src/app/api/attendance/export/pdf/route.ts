import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/shared/lib/prisma'
import { getCurrentUser } from '@/shared/lib/auth'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export const maxDuration = 30

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser || currentUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const employeeId = searchParams.get('employeeId')
    const businessId = searchParams.get('businessId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const whereClause: any = {}

    if (businessId || currentUser.businessId) {
      whereClause.businessId = businessId || currentUser.businessId
    }

    if (employeeId) {
      whereClause.employeeId = employeeId
    }

    if (startDate && endDate) {
      const start = new Date(startDate)
      start.setHours(0, 0, 0, 0)
      const end = new Date(endDate)
      end.setHours(23, 59, 59, 999)

      whereClause.punchInTime = {
        gte: start,
        lte: end
      }
    }

    const attendances = await prisma.attendance.findMany({
      where: whereClause,
      include: {
        employee: {
          select: {
            firstName: true,
            lastName: true,
            employeeNo: true,
            department: {
              select: {
                name: true
              }
            },
            employeeGroup: {
              select: {
                name: true
              }
            }
          }
        },
        shift: {
          select: {
            id: true,
            startTime: true,
            endTime: true,
            shiftType: true,
            status: true
          }
        }
      },
      orderBy: {
        punchInTime: 'desc'
      }
    })

    const formatTime = (dateValue: Date | string) => {
      const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue
      return date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false
      })
    }

    const formatDate = (dateValue: Date | string) => {
      const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
      })
    }

    const calculateWorkDuration = (punchIn: Date | string, punchOut?: Date | string | null) => {
      const startTime = typeof punchIn === 'string' ? new Date(punchIn) : punchIn
      const endTime = punchOut 
        ? (typeof punchOut === 'string' ? new Date(punchOut) : punchOut)
        : new Date()
      
      const diffMs = endTime.getTime() - startTime.getTime()
      const hours = Math.floor(diffMs / (1000 * 60 * 60))
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
      return `${hours}h ${minutes}m`
    }

    // Generate PDF using jsPDF
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    })

    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    const margin = 15
    let yPos = margin

    // Header
    pdf.setFillColor(49, 188, 255)
    pdf.rect(0, 0, pageWidth, 25, 'F')
    
    pdf.setTextColor(255, 255, 255)
    pdf.setFontSize(18)
    pdf.setFont('helvetica', 'bold')
    pdf.text('Attendance Report', pageWidth / 2, 15, { align: 'center' })
    
    yPos = 35

    // Report Info
    pdf.setTextColor(0, 0, 0)
    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'normal')
    
    const dateRangeText = startDate && endDate 
      ? `Period: ${formatDate(startDate)} - ${formatDate(endDate)}`
      : 'Period: All Records'
    pdf.text(dateRangeText, margin, yPos)
    pdf.text(`Total Records: ${attendances.length}`, pageWidth - margin - 50, yPos)
    
    yPos += 10

    // Table
    const tableData = attendances.map(record => [
      `${record.employee.firstName} ${record.employee.lastName}\n#${record.employee.employeeNo || 'N/A'}`,
      `${record.employee.department?.name || 'N/A'}${record.employee.employeeGroup ? '\n' + record.employee.employeeGroup.name : ''}`,
      `${formatTime(record.punchInTime)}\n${formatDate(record.punchInTime)}`,
      record.punchOutTime 
        ? `${formatTime(record.punchOutTime)}\n${formatDate(record.punchOutTime)}`
        : 'Still working',
      calculateWorkDuration(record.punchInTime, record.punchOutTime),
      record.punchOutTime ? 'Completed' : 'Working',
      record.shift 
        ? `${record.shift.startTime} - ${record.shift.endTime || 'Active'}`
        : 'No shift'
    ])

    autoTable(pdf, {
      startY: yPos,
      margin: { left: margin, right: margin },
      head: [['Employee', 'Department', 'Punch In', 'Punch Out', 'Duration', 'Status', 'Shift']],
      body: tableData,
      headStyles: { 
        fillColor: [49, 188, 255], 
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 9
      },
      styles: { 
        fontSize: 8,
        cellPadding: 3,
        overflow: 'linebreak'
      },
      columnStyles: {
        0: { cellWidth: 45 },
        1: { cellWidth: 40 },
        2: { cellWidth: 35 },
        3: { cellWidth: 35 },
        4: { cellWidth: 25 },
        5: { cellWidth: 25 },
        6: { cellWidth: 35 },
      },
      didParseCell: (data) => {
        // Style status column
        if (data.column.index === 5 && data.section === 'body') {
          if (data.cell.raw === 'Working') {
            data.cell.styles.textColor = [34, 197, 94]
            data.cell.styles.fontStyle = 'bold'
          } else if (data.cell.raw === 'Completed') {
            data.cell.styles.textColor = [59, 130, 246]
          }
        }
      },
    })

    // Footer
    const totalPages = pdf.getNumberOfPages()
    for (let i = 1; i <= totalPages; i++) {
      pdf.setPage(i)
      pdf.setFontSize(8)
      pdf.setTextColor(107, 114, 128)
      pdf.text(
        `Generated on ${new Date().toLocaleString()} | Page ${i} of ${totalPages}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      )
    }

    // Output PDF
    const pdfBuffer = Buffer.from(pdf.output('arraybuffer'))
    const dateRange = startDate && endDate ? `${startDate}_to_${endDate}` : 'all_records'
    const filename = `attendance_report_${dateRange}.pdf`

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    })

  } catch (error) {
    console.error('Error generating PDF:', error)
    return NextResponse.json({ 
      error: 'Failed to generate PDF report' 
    }, { status: 500 })
  }
}
