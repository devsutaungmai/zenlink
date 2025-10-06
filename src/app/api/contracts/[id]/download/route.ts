import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/shared/lib/auth'
import { prisma } from '@/shared/lib/prisma'
import { launchBrowser } from '@/shared/lib/puppeteer-config'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const contractId = params.id

    // Fetch contract with all necessary relations
    const contract = await prisma.contract.findUnique({
      where: { id: contractId },
      include: {
        employee: {
          include: {
            department: true
          }
        },
        employeeGroup: true,
        contractTemplate: true,
        contractPerson: true,
      },
    })

    if (!contract) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 })
    }

    // Format contract body with variable replacement
    const formatContractBody = (body: string) => {
      if (!body || !contract.employee) return body
      
      return body
        // Support both formats: {{variable}} and [VARIABLE]
        .replace(/\{\{employee_name\}\}/g, `${contract.employee.firstName} ${contract.employee.lastName}`)
        .replace(/\{\{employee_first_name\}\}/g, contract.employee.firstName || '')
        .replace(/\{\{employee_last_name\}\}/g, contract.employee.lastName || '')
        .replace(/\{\{employee_email\}\}/g, contract.employee.email || '')
        .replace(/\{\{employee_mobile\}\}/g, contract.employee.mobile || '')
        .replace(/\{\{employee_address\}\}/g, contract.employee.address || '')
        .replace(/\{\{employee_number\}\}/g, contract.employee.employeeNo || '')
        .replace(/\{\{start_date\}\}/g, new Date(contract.startDate).toLocaleDateString())
        .replace(/\{\{end_date\}\}/g, contract.endDate ? new Date(contract.endDate).toLocaleDateString() : 'Indefinite')
        .replace(/\{\{contract_person\}\}/g, `${contract.contractPerson.firstName} ${contract.contractPerson.lastName}`)
        .replace(/\{\{employee_group\}\}/g, contract.employeeGroup?.name || '{{employee_group}}')
        .replace(/\{\{department\}\}/g, contract.employee.department?.name || '{{department}}')
        .replace(/\{\{today\}\}/g, new Date().toLocaleDateString())
        // Legacy format support
        .replace(/\[EMPLOYEE_NAME\]/g, `${contract.employee.firstName} ${contract.employee.lastName}`)
        .replace(/\[EMPLOYEE_FIRST_NAME\]/g, contract.employee.firstName || '')
        .replace(/\[EMPLOYEE_LAST_NAME\]/g, contract.employee.lastName || '')
        .replace(/\[EMPLOYEE_EMAIL\]/g, contract.employee.email || '')
        .replace(/\[EMPLOYEE_MOBILE\]/g, contract.employee.mobile || '')
        .replace(/\[EMPLOYEE_ADDRESS\]/g, contract.employee.address || '')
        .replace(/\[EMPLOYEE_NUMBER\]/g, contract.employee.employeeNo || '')
        .replace(/\[START_DATE\]/g, new Date(contract.startDate).toLocaleDateString())
        .replace(/\[END_DATE\]/g, contract.endDate ? new Date(contract.endDate).toLocaleDateString() : 'Indefinite')
        .replace(/\[CONTRACT_PERSON\]/g, `${contract.contractPerson.firstName} ${contract.contractPerson.lastName}`)
        .replace(/\[EMPLOYEE_GROUP\]/g, contract.employeeGroup?.name || '[EMPLOYEE_GROUP]')
        .replace(/\[TODAY\]/g, new Date().toLocaleDateString())
    }

    const formattedBody = formatContractBody(contract.contractTemplate.body)

    const logoHtml = contract.contractTemplate.logoPath ? 
      `<img src="${contract.contractTemplate.logoPath}" alt="Company Logo" style="height: 64px; width: auto; margin-bottom: 16px;" />` : ''
    
    const logoPositionStyle = 
      contract.contractTemplate.logoPosition === 'TOP_LEFT' ? 'text-align: left;' :
      contract.contractTemplate.logoPosition === 'TOP_CENTER' ? 'text-align: center;' : 'text-align: right;'

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${contract.contractTemplate.name}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 800px;
              margin: 0 auto;
              padding: 40px;
            }
            .logo-container {
              ${logoPositionStyle}
              margin-bottom: 32px;
            }
            .header {
              text-align: center;
              margin-bottom: 40px;
              border-bottom: 2px solid #e5e7eb;
              padding-bottom: 20px;
            }
            .title {
              font-size: 24px;
              font-weight: bold;
              color: #1f2937;
              margin: 0;
            }
            .content {
              white-space: pre-wrap;
              line-height: 1.8;
              margin-bottom: 40px;
            }
            .contract-details {
              background-color: #f9fafb;
              padding: 20px;
              border-radius: 8px;
              margin-top: 40px;
            }
            .details-title {
              font-size: 18px;
              font-weight: bold;
              margin-bottom: 16px;
              color: #1f2937;
            }
            .details-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 16px;
            }
            .detail-item {
              margin-bottom: 8px;
            }
            .detail-label {
              font-weight: 600;
              color: #6b7280;
              font-size: 14px;
            }
            .detail-value {
              color: #1f2937;
              margin-top: 2px;
            }
            .signature-section {
              margin-top: 60px;
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 40px;
            }
            .signature-box {
              border-top: 1px solid #000;
              padding-top: 8px;
              text-align: center;
            }
            .signature-label {
              font-size: 12px;
              color: #6b7280;
            }
            ${contract.signedStatus && contract.signedStatus !== 'UNSIGNED' ? `
            .signed-info {
              background-color: #ecfdf5;
              border: 1px solid #10b981;
              padding: 16px;
              border-radius: 8px;
              margin-top: 20px;
            }
            .signed-signature {
              font-family: 'Brush Script MT', cursive;
              font-style: italic;
              font-size: 20px;
              margin: 8px 0;
            }
            ` : ''}
          </style>
        </head>
        <body>
          <div class="logo-container">
            ${logoHtml}
          </div>
          
          <div class="header">
            <h1 class="title">${contract.contractTemplate.name}</h1>
          </div>
          
          <div class="content">${formattedBody}</div>
          
          <div class="contract-details">
            <h3 class="details-title">Contract Information</h3>
            <div class="details-grid">
              <div class="detail-item">
                <div class="detail-label">Employee</div>
                <div class="detail-value">${contract.employee.firstName} ${contract.employee.lastName}</div>
                ${contract.employee.email ? `<div class="detail-value" style="font-size: 12px; color: #6b7280;">${contract.employee.email}</div>` : ''}
              </div>
              <div class="detail-item">
                <div class="detail-label">Employee Group</div>
                <div class="detail-value">${contract.employeeGroup.name}</div>
              </div>
              <div class="detail-item">
                <div class="detail-label">Start Date</div>
                <div class="detail-value">${new Date(contract.startDate).toLocaleDateString()}</div>
              </div>
              <div class="detail-item">
                <div class="detail-label">End Date</div>
                <div class="detail-value">${contract.endDate ? new Date(contract.endDate).toLocaleDateString() : 'Indefinite'}</div>
              </div>
              <div class="detail-item">
                <div class="detail-label">Contract Person</div>
                <div class="detail-value">${contract.contractPerson.firstName} ${contract.contractPerson.lastName}</div>
              </div>
              <div class="detail-item">
                <div class="detail-label">Template</div>
                <div class="detail-value">${contract.contractTemplate.name}</div>
              </div>
            </div>
          </div>
          
          ${contract.signedStatus && contract.signedStatus !== 'UNSIGNED' ? `
            <div class="signed-info">
              <h4 style="margin: 0 0 8px 0; color: #065f46;">Contract Signature Status</h4>
              <p style="margin: 0; color: #047857;">
                This contract has been signed ${contract.signedStatus === 'SIGNED_PAPER' ? 'on paper' : 'electronically'}
                ${contract.signedAt ? ` on ${new Date(contract.signedAt).toLocaleDateString()}` : ''}.
              </p>
              ${contract.signedStatus === 'SIGNED_ELECTRONIC' && contract.signatureData ? `
                <div style="margin-top: 16px;">
                  <div class="detail-label">Electronic Signature:</div>
                  <div class="signed-signature">${JSON.parse(contract.signatureData).signature}</div>
                  <div style="font-size: 12px; color: #047857;">
                    Signed by: ${JSON.parse(contract.signatureData).signedBy}
                  </div>
                </div>
              ` : ''}
            </div>
          ` : `
            <div class="signature-section">
              <div class="signature-box">
                <div class="signature-label">Employee Signature</div>
              </div>
              <div class="signature-box">
                <div class="signature-label">Date</div>
              </div>
            </div>
          `}
          
          <div style="margin-top: 40px; text-align: center; font-size: 12px; color: #6b7280;">
            Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}
          </div>
        </body>
      </html>
    `

    // Launch Puppeteer and generate PDF
    const browser = await launchBrowser()
    
    try {
      const page = await browser.newPage()
      await page.setContent(html, { waitUntil: 'networkidle0' })
      
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20mm',
          right: '20mm',
          bottom: '20mm',
          left: '20mm'
        }
      })

      await browser.close()

      // Create filename
      const filename = `${contract.contractTemplate.name}_${contract.employee.firstName}_${contract.employee.lastName}.pdf`
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .replace(/_+/g, '_')

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
    return NextResponse.json(
      { error: 'Failed to generate PDF' }, 
      { status: 500 }
    )
  }
}