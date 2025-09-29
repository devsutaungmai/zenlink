import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/app/lib/prisma';
import { launchBrowser } from '@/lib/puppeteer-config';

function generatePayslipHTML(payrollEntry: any, business: any) {
  const periodStartDate = new Date(payrollEntry.payrollPeriod.startDate).toLocaleDateString();
  const periodEndDate = new Date(payrollEntry.payrollPeriod.endDate).toLocaleDateString();
  const regularPay = payrollEntry.regularHours * payrollEntry.regularRate;
  const overtimePay = payrollEntry.overtimeHours * payrollEntry.overtimeRate;
  
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Payslip - ${payrollEntry.employee.firstName} ${payrollEntry.employee.lastName}</title>
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            
            body {
                font-family: 'Arial', sans-serif;
                font-size: 14px;
                line-height: 1.6;
                color: #333;
                background-color: #f8f9fa;
            }
            
            .payslip-container {
                max-width: 800px;
                margin: 20px auto;
                background: white;
                border: 1px solid #ddd;
                border-radius: 8px;
                overflow: hidden;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            
            .header {
                background: linear-gradient(135deg, #31BCFF 0%, #0EA5E9 100%);
                color: white;
                padding: 30px;
                text-align: center;
            }
            
            .header h1 {
                font-size: 28px;
                font-weight: bold;
                margin-bottom: 10px;
            }
            
            .header .subtitle {
                font-size: 16px;
                opacity: 0.9;
            }
            
            .company-info {
                background: #f8f9fa;
                padding: 20px 30px;
                border-bottom: 1px solid #e9ecef;
            }
            
            .company-info h2 {
                color: #495057;
                font-size: 18px;
                margin-bottom: 10px;
            }
            
            .info-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 30px;
                padding: 30px;
            }
            
            .info-section h3 {
                color: #495057;
                font-size: 16px;
                margin-bottom: 15px;
                border-bottom: 2px solid #31BCFF;
                padding-bottom: 5px;
            }
            
            .info-row {
                display: flex;
                justify-content: space-between;
                padding: 8px 0;
                border-bottom: 1px solid #f1f3f4;
            }
            
            .info-row:last-child {
                border-bottom: none;
            }
            
            .info-label {
                font-weight: 600;
                color: #6c757d;
            }
            
            .info-value {
                color: #495057;
                font-weight: 500;
            }
            
            .earnings-section {
                background: #f8f9fa;
                padding: 30px;
                margin: 20px 0;
            }
            
            .earnings-title {
                font-size: 20px;
                color: #495057;
                margin-bottom: 20px;
                text-align: center;
                font-weight: bold;
            }
            
            .earnings-table {
                width: 100%;
                border-collapse: collapse;
                background: white;
                border-radius: 8px;
                overflow: hidden;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            }
            
            .earnings-table th {
                background: #495057;
                color: white;
                padding: 12px;
                text-align: left;
                font-weight: 600;
                font-size: 14px;
            }
            
            .earnings-table td {
                padding: 10px 12px;
                border-bottom: 1px solid #e9ecef;
                font-size: 14px;
            }
            
            .earnings-table tr:last-child td {
                border-bottom: none;
            }
            
            .description-col {
                width: 40%;
            }
            
            .hours-col {
                width: 20%;
                text-align: center;
            }
            
            .rate-col {
                width: 20%;
                text-align: center;
            }
            
            .amount-col {
                width: 20%;
                text-align: right;
            }
            
            .earnings-table tbody td.hours-col,
            .earnings-table tbody td.rate-col,
            .earnings-table tbody td.amount-col {
                text-align: right;
            }
            
            .subtotal-row {
                background: #f8f9fa;
            }
            
            .subtotal-row td {
                border-top: 2px solid #dee2e6;
                padding: 12px;
                font-weight: 600;
            }
            
            .total-row {
                background: #e9ecef;
            }
            
            .total-row td {
                border-top: 2px solid #495057;
                padding: 15px 12px;
                font-weight: bold;
                font-size: 16px;
            }
            
            .deduction-amount {
                color: #dc3545;
            }
            
            .net-amount {
                color: #28a745;
                font-size: 18px;
            }
            
            .notes-section {
                margin-top: 20px;
                padding: 15px;
                background: white;
                border-radius: 8px;
                border: 1px solid #e9ecef;
            }
            
            .total-section {
                background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
                color: white;
                padding: 30px;
                text-align: center;
            }
            
            .total-section h3 {
                fontSize: 24px;
                margin-bottom: 10px;
            }
            
            .net-pay {
                font-size: 36px;
                font-weight: bold;
                margin: 10px 0;
            }
            
            .footer {
                background: #f8f9fa;
                padding: 20px 30px;
                text-align: center;
                border-top: 1px solid #e9ecef;
                color: #6c757d;
                font-size: 12px;
            }
            
            .status-badge {
                display: inline-block;
                padding: 4px 12px;
                border-radius: 20px;
                font-size: 12px;
                font-weight: 600;
                text-transform: uppercase;
            }
            
            .status-draft {
                background: #fff3cd;
                color: #856404;
                border: 1px solid #ffeaa7;
            }
            
            .status-approved {
                background: #d1ecf1;
                color: #0c5460;
                border: 1px solid #bee5eb;
            }
            
            .status-paid {
                background: #d4edda;
                color: #155724;
                border: 1px solid #c3e6cb;
            }
        </style>
    </head>
    <body>
        <div class="payslip-container">
            <!-- Header -->
            <div class="header">
                <h1>PAYSLIP</h1>
                <div class="subtitle">${payrollEntry.payrollPeriod.name}</div>
                <div class="subtitle">Pay Period: ${periodStartDate} - ${periodEndDate}</div>
            </div>
            
            <!-- Company Information -->
            <div class="company-info">
                <h2>${business?.name || 'Company Name'}</h2>
                <p>${business?.address || 'Company Address'}</p>
            </div>
            
            <!-- Employee and Period Info -->
            <div class="info-grid">
                <div class="info-section">
                    <h3>Employee Information</h3>
                    <div class="info-row">
                        <span class="info-label">Name:</span>
                        <span class="info-value">${payrollEntry.employee.firstName} ${payrollEntry.employee.lastName}</span>
                    </div>
                    ${payrollEntry.employee.employeeNo ? `
                    <div class="info-row">
                        <span class="info-label">Employee #:</span>
                        <span class="info-value">${payrollEntry.employee.employeeNo}</span>
                    </div>
                    ` : ''}
                    <div class="info-row">
                        <span class="info-label">Email:</span>
                        <span class="info-value">${payrollEntry.employee.email || 'N/A'}</span>
                    </div>
                </div>
                
                <div class="info-section">
                    <h3>Pay Period Details</h3>
                    <div class="info-row">
                        <span class="info-label">Period:</span>
                        <span class="info-value">${payrollEntry.payrollPeriod.name}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Start Date:</span>
                        <span class="info-value">${periodStartDate}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">End Date:</span>
                        <span class="info-value">${periodEndDate}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Status:</span>
                        <span class="info-value">
                            <span class="status-badge status-${payrollEntry.status.toLowerCase()}">
                                ${payrollEntry.status}
                            </span>
                        </span>
                    </div>
                </div>
            </div>
            
            <!-- Earnings & Deductions Table -->
            <div class="earnings-section">
                <div class="earnings-title">Earnings & Deductions</div>
                <table class="earnings-table">
                    <thead>
                        <tr>
                            <th class="description-col">Description</th>
                            <th class="hours-col">Hours</th>
                            <th class="rate-col">Rate</th>
                            <th class="amount-col">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>Regular Hours</td>
                            <td>${payrollEntry.regularHours}h</td>
                            <td>$${payrollEntry.regularRate.toFixed(2)}/hr</td>
                            <td>$${regularPay.toFixed(2)}</td>
                        </tr>
                        ${payrollEntry.overtimeHours > 0 ? `
                        <tr>
                            <td>Overtime Hours</td>
                            <td>${payrollEntry.overtimeHours}h</td>
                            <td>$${payrollEntry.overtimeRate.toFixed(2)}/hr</td>
                            <td>$${overtimePay.toFixed(2)}</td>
                        </tr>
                        ` : ''}
                        ${payrollEntry.bonuses > 0 ? `
                        <tr>
                            <td>Bonuses</td>
                            <td>-</td>
                            <td>-</td>
                            <td>$${payrollEntry.bonuses.toFixed(2)}</td>
                        </tr>
                        ` : ''}
                        <tr class="subtotal-row">
                            <td colspan="3"><strong>Gross Pay</strong></td>
                            <td><strong>$${payrollEntry.grossPay.toFixed(2)}</strong></td>
                        </tr>
                        ${payrollEntry.deductions > 0 ? `
                        <tr>
                            <td>Total Deductions</td>
                            <td>-</td>
                            <td>-</td>
                            <td class="deduction-amount">-$${payrollEntry.deductions.toFixed(2)}</td>
                        </tr>
                        ` : `
                        <tr>
                            <td>Deductions</td>
                            <td>-</td>
                            <td>-</td>
                            <td>$0.00</td>
                        </tr>
                        `}
                        <tr class="total-row">
                            <td colspan="3"><strong>Net Pay</strong></td>
                            <td class="net-amount"><strong>$${payrollEntry.netPay.toFixed(2)}</strong></td>
                        </tr>
                    </tbody>
                </table>
                ${payrollEntry.notes ? `
                <div class="notes-section">
                    <strong>Notes:</strong><br>
                    <span style="font-size: 12px; color: #6c757d;">${payrollEntry.notes}</span>
                </div>
                ` : ''}
            </div>
            
            <!-- Net Pay Section -->
            <div class="total-section">
                <h3>Net Pay</h3>
                <div class="net-pay">$${payrollEntry.netPay.toFixed(2)}</div>
            </div>
            
            <!-- Footer -->
            <div class="footer">
                <p>This payslip was generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
                <p>For questions about this payslip, please contact your HR department.</p>
            </div>
        </div>
    </body>
    </html>
  `;
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

    // Get business information
    const business = await prisma.business.findUnique({
      where: { id: user.businessId },
      select: {
        name: true,
        address: true,
      },
    });

    // Generate HTML content for the payslip
    const htmlContent = generatePayslipHTML(payrollEntry, business);

    // Launch puppeteer and generate PDF
    const browser = await launchBrowser();
    
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20px',
        right: '20px',
        bottom: '20px',
        left: '20px'
      }
    });
    
    await browser.close();

    // Return PDF as response
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="payslip-${payrollEntry.employee.firstName}-${payrollEntry.employee.lastName}-${payrollEntry.payrollPeriod.name.replace(/\s+/g, '-')}.pdf"`,
      },
    });
  } catch (error) {
    console.error('Error generating payslip:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
