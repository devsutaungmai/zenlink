import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/app/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import puppeteer from 'puppeteer'

export async function GET(request: NextRequest) {
  try {
    // Check if user is admin
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

    // Create a simple HTML table for PDF generation
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

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Attendance Report</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            margin: 0;
            padding: 20px;
            color: #333;
          }
          .header { 
            text-align: center; 
            margin-bottom: 30px; 
            border-bottom: 2px solid #e5e7eb;
            padding-bottom: 20px;
          }
          .header h1 {
            color: #1f2937;
            font-size: 28px;
            margin: 0;
          }
          .date-range { 
            text-align: center; 
            margin-bottom: 30px; 
            color: #6b7280;
            font-size: 16px;
            background: #f9fafb;
            padding: 10px;
            border-radius: 8px;
          }
          table { 
            width: 100%; 
            border-collapse: collapse; 
            margin-bottom: 20px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          }
          th, td { 
            border: 1px solid #e5e7eb; 
            padding: 12px 8px; 
            text-align: left; 
            vertical-align: top;
          }
          th { 
            background-color: #f3f4f6; 
            font-weight: bold; 
            color: #374151;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          td {
            font-size: 13px;
          }
          .text-center { text-align: center; }
          .status-working { 
            color: #059669; 
            font-weight: 600;
          }
          .status-completed { 
            color: #2563eb; 
            font-weight: 600;
          }
          .employee-info {
            font-weight: 600;
          }
          .employee-no {
            color: #6b7280;
            font-size: 11px;
            font-weight: normal;
          }
          .dept-group {
            color: #6b7280;
            font-size: 11px;
          }
          .time-main {
            font-weight: 600;
          }
          .time-date {
            color: #6b7280;
            font-size: 11px;
          }
          .duration {
            font-weight: 600;
            color: #374151;
          }
          .footer {
            margin-top: 40px; 
            text-align: center; 
            color: #6b7280; 
            font-size: 12px;
            border-top: 1px solid #e5e7eb;
            padding-top: 20px;
          }
          .summary {
            background: #f9fafb;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 30px;
          }
          .summary-title {
            font-size: 16px;
            font-weight: bold;
            color: #374151;
            margin-bottom: 10px;
          }
          .summary-stats {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 20px;
          }
          .stat-item {
            text-align: center;
          }
          .stat-number {
            font-size: 24px;
            font-weight: bold;
            color: #1f2937;
          }
          .stat-label {
            font-size: 12px;
            color: #6b7280;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Attendance Report</h1>
        </div>
        <div class="date-range">
          ${startDate && endDate ? `Report Period: ${formatDate(startDate)} - ${formatDate(endDate)}` : 'All Records'}
        </div>
        
        <div class="summary">
          <div class="summary-title">Summary</div>
          <div class="summary-stats">
            <div class="stat-item">
              <div class="stat-number">${attendances.length}</div>
              <div class="stat-label">Total Records</div>
            </div>
            <div class="stat-item">
              <div class="stat-number">${attendances.filter(r => !r.punchOutTime).length}</div>
              <div class="stat-label">Currently Working</div>
            </div>
            <div class="stat-item">
              <div class="stat-number">${attendances.filter(r => r.punchOutTime).length}</div>
              <div class="stat-label">Completed</div>
            </div>
          </div>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>Employee</th>
              <th>Department</th>
              <th>Punch In</th>
              <th>Punch Out</th>
              <th>Duration</th>
              <th>Status</th>
              <th>Shift Info</th>
            </tr>
          </thead>
          <tbody>
            ${attendances.map(record => `
              <tr>
                <td>
                  <div class="employee-info">${record.employee.firstName} ${record.employee.lastName}</div>
                  <div class="employee-no">#${record.employee.employeeNo}</div>
                </td>
                <td>
                  <div>${record.employee.department.name}</div>
                  ${record.employee.employeeGroup ? `<div class="dept-group">${record.employee.employeeGroup.name}</div>` : ''}
                </td>
                <td>
                  <div class="time-main">${formatTime(record.punchInTime)}</div>
                  <div class="time-date">${formatDate(record.punchInTime)}</div>
                </td>
                <td>${record.punchOutTime ? `
                  <div class="time-main">${formatTime(record.punchOutTime)}</div>
                  <div class="time-date">${formatDate(record.punchOutTime)}</div>
                ` : '<span class="status-working">Still working</span>'}</td>
                <td><div class="duration">${calculateWorkDuration(record.punchInTime, record.punchOutTime)}</div></td>
                <td><span class="${record.punchOutTime ? 'status-completed' : 'status-working'}">${record.punchOutTime ? 'Completed' : 'Working'}</span></td>
                <td>${record.shift ? `${record.shift.startTime} - ${record.shift.endTime || 'Active'}` : 'No shift'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div class="footer">
          Generated on ${new Date().toLocaleString()}
        </div>
      </body>
      </html>
    `

    // Launch Puppeteer and generate PDF
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    })
    
    try {
      const page = await browser.newPage()
      await page.setContent(htmlContent, { waitUntil: 'networkidle0' })
      
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20mm',
          right: '15mm',
          bottom: '20mm',
          left: '15mm'
        }
      })

      await browser.close()

      // Create filename
      const dateRange = startDate && endDate ? `${startDate}_to_${endDate}` : 'all_records'
      const filename = `attendance_report_${dateRange}.pdf`

      // Return PDF as response
      return new NextResponse(pdfBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Content-Length': pdfBuffer.length.toString(),
        },
      })

    } catch (error) {
      await browser.close()
      throw error
    }

  } catch (error) {
    console.error('Error generating PDF:', error)
    return NextResponse.json({ 
      error: 'Failed to generate PDF report' 
    }, { status: 500 })
  }
}
