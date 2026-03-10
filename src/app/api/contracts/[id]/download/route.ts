import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/shared/lib/auth'
import { prisma } from '@/shared/lib/prisma'
import jsPDF from 'jspdf'

export const maxDuration = 30

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const contractId = id

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
        adminSignedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          }
        },
      },
    })

    if (!contract) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 })
    }

    // Format contract body with variable replacement
    const formatContractBody = (body: string) => {
      if (!body || !contract.employee) return body
      
      const employeeFullName = contract.employee.firstName + ' ' + contract.employee.lastName
      const contractPersonFullName = contract.contractPerson.firstName + ' ' + contract.contractPerson.lastName
      
      return body
        .replace(/\{\{employee_name\}\}/g, employeeFullName)
        .replace(/\{\{employee_first_name\}\}/g, contract.employee.firstName || '')
        .replace(/\{\{employee_last_name\}\}/g, contract.employee.lastName || '')
        .replace(/\{\{employee_email\}\}/g, contract.employee.email || '')
        .replace(/\{\{employee_mobile\}\}/g, contract.employee.mobile || '')
        .replace(/\{\{employee_address\}\}/g, contract.employee.address || '')
        .replace(/\{\{employee_number\}\}/g, contract.employee.employeeNo || '')
        .replace(/\{\{start_date\}\}/g, new Date(contract.startDate).toLocaleDateString())
        .replace(/\{\{end_date\}\}/g, contract.endDate ? new Date(contract.endDate).toLocaleDateString() : 'Indefinite')
        .replace(/\{\{contract_person\}\}/g, contractPersonFullName)
        .replace(/\{\{employee_group\}\}/g, contract.employeeGroup?.name || '')
        .replace(/\{\{department\}\}/g, contract.employee.department?.name || '')
        .replace(/\{\{today\}\}/g, new Date().toLocaleDateString())
        // Legacy format support
        .replace(/\[EMPLOYEE_NAME\]/g, employeeFullName)
        .replace(/\[EMPLOYEE_FIRST_NAME\]/g, contract.employee.firstName || '')
        .replace(/\[EMPLOYEE_LAST_NAME\]/g, contract.employee.lastName || '')
        .replace(/\[EMPLOYEE_EMAIL\]/g, contract.employee.email || '')
        .replace(/\[EMPLOYEE_MOBILE\]/g, contract.employee.mobile || '')
        .replace(/\[EMPLOYEE_ADDRESS\]/g, contract.employee.address || '')
        .replace(/\[EMPLOYEE_NUMBER\]/g, contract.employee.employeeNo || '')
        .replace(/\[START_DATE\]/g, new Date(contract.startDate).toLocaleDateString())
        .replace(/\[END_DATE\]/g, contract.endDate ? new Date(contract.endDate).toLocaleDateString() : 'Indefinite')
        .replace(/\[CONTRACT_PERSON\]/g, contractPersonFullName)
        .replace(/\[EMPLOYEE_GROUP\]/g, contract.employeeGroup?.name || '')
        .replace(/\[TODAY\]/g, new Date().toLocaleDateString())
    }

    // Generate PDF using jsPDF
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    })

    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    const margin = 20
    const contentWidth = pageWidth - margin * 2
    let yPos = margin

    // Helper to add text with word wrap
    const addWrappedText = (text: string, x: number, y: number, maxWidth: number, lineHeight: number = 6): number => {
      const lines = pdf.splitTextToSize(text, maxWidth)
      lines.forEach((line: string) => {
        if (y > pageHeight - margin) {
          pdf.addPage()
          y = margin
        }
        pdf.text(line, x, y)
        y += lineHeight
      })
      return y
    }

    // Helper to check and add new page if needed
    const checkNewPage = (requiredSpace: number): void => {
      if (yPos + requiredSpace > pageHeight - margin) {
        pdf.addPage()
        yPos = margin
      }
    }

    // Add logo if exists
    if (contract.contractTemplate.logoPath) {
      try {
        const response = await fetch(contract.contractTemplate.logoPath)
        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer()
          const base64 = Buffer.from(arrayBuffer).toString('base64')
          const mimeType = response.headers.get('content-type') || 'image/png'
          const logoDataUrl = 'data:' + mimeType + ';base64,' + base64
          
          const logoWidth = 40
          const logoHeight = 15
          let logoX = margin
          
          if (contract.contractTemplate.logoPosition === 'TOP_CENTER') {
            logoX = (pageWidth - logoWidth) / 2
          } else if (contract.contractTemplate.logoPosition === 'TOP_RIGHT') {
            logoX = pageWidth - margin - logoWidth
          }
          
          pdf.addImage(logoDataUrl, 'PNG', logoX, yPos, logoWidth, logoHeight)
          yPos += logoHeight + 10
        }
      } catch (logoError) {
        console.warn('Failed to load logo:', logoError)
      }
    }

    // Title
    pdf.setFontSize(18)
    pdf.setFont('helvetica', 'bold')
    const titleLines = pdf.splitTextToSize(contract.contractTemplate.name, contentWidth)
    titleLines.forEach((line: string) => {
      const titleWidth = pdf.getTextWidth(line)
      pdf.text(line, (pageWidth - titleWidth) / 2, yPos)
      yPos += 8
    })
    yPos += 5

    // Divider line
    pdf.setDrawColor(200, 200, 200)
    pdf.line(margin, yPos, pageWidth - margin, yPos)
    yPos += 10

    // Contract body - parse HTML and convert to text
    const formattedBody = formatContractBody(contract.contractTemplate.body)
    
    // Strip HTML tags and convert to plain text
    const plainText = formattedBody
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<\/div>/gi, '\n')
      .replace(/<\/h[1-6]>/gi, '\n\n')
      .replace(/<\/li>/gi, '\n')
      .replace(/<li>/gi, '• ')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\n{3,}/g, '\n\n')
      .trim()

    pdf.setFontSize(11)
    pdf.setFont('helvetica', 'normal')
    yPos = addWrappedText(plainText, margin, yPos, contentWidth, 6)
    yPos += 15

    // Contract Information Box
    checkNewPage(60)
    pdf.setFillColor(249, 250, 251)
    pdf.rect(margin, yPos - 5, contentWidth, 55, 'F')
    
    pdf.setFontSize(14)
    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(0, 0, 0)
    pdf.text('Contract Information', margin + 5, yPos + 5)
    yPos += 15

    pdf.setFontSize(10)
    const employeeFullName = contract.employee.firstName + ' ' + contract.employee.lastName
    const contractPersonFullName = contract.contractPerson.firstName + ' ' + contract.contractPerson.lastName
    
    const details = [
      { label: 'Employee', value: employeeFullName },
      { label: 'Department', value: contract.employee.department?.name || 'N/A' },
      { label: 'Employee Group', value: contract.employeeGroup?.name || 'N/A' },
      { label: 'Start Date', value: new Date(contract.startDate).toLocaleDateString() },
      { label: 'End Date', value: contract.endDate ? new Date(contract.endDate).toLocaleDateString() : 'Indefinite' },
      { label: 'Contract Person', value: contractPersonFullName },
    ]

    const colWidth = contentWidth / 2
    details.forEach((detail, index) => {
      const col = index % 2
      const row = Math.floor(index / 2)
      const x = margin + 5 + col * colWidth
      const y = yPos + row * 12

      pdf.setFont('helvetica', 'bold')
      pdf.setTextColor(107, 114, 128)
      pdf.text(detail.label, x, y)

      pdf.setFont('helvetica', 'normal')
      pdf.setTextColor(31, 41, 55)
      pdf.text(detail.value, x, y + 5)
    })
    yPos += 45

    // Signature Section
    checkNewPage(40)

    // Dual signature section
    const signatureWidth = (contentWidth - 20) / 2
    
    // Admin Signature Section
    pdf.setFontSize(11)
    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(0, 0, 0)
    pdf.text('Employer Signature', margin, yPos)
    yPos += 8
    
    if ((contract as any).adminSignedAt) {
      pdf.setFillColor(236, 253, 245)
      pdf.rect(margin, yPos, signatureWidth, 35, 'F')
      
      // Parse and display signature typography
      let adminSignatureText = ''
      try {
        const sigData = JSON.parse((contract as any).adminSignatureData || '{}')
        adminSignatureText = sigData.signature || ''
      } catch (e) {}
      
      if (adminSignatureText) {
        pdf.setFontSize(16)
        pdf.setFont('times', 'italic')
        pdf.setTextColor(0, 0, 0)
        pdf.text(adminSignatureText, margin + 5, yPos + 12)
      }
      
      pdf.setFontSize(9)
      pdf.setFont('helvetica', 'normal')
      pdf.setTextColor(4, 120, 87)
      const adminName = (contract as any).adminSignedBy 
        ? `${(contract as any).adminSignedBy.firstName} ${(contract as any).adminSignedBy.lastName}`
        : 'Admin'
      pdf.text(`Signed by: ${adminName}`, margin + 5, yPos + 22)
      pdf.text(`Date: ${new Date((contract as any).adminSignedAt).toLocaleDateString()}`, margin + 5, yPos + 30)
    } else {
      pdf.setDrawColor(0, 0, 0)
      pdf.line(margin, yPos + 20, margin + signatureWidth, yPos + 20)
      pdf.setFontSize(9)
      pdf.setTextColor(107, 114, 128)
      pdf.text('Signature', margin, yPos + 25)
      pdf.text('Date', margin + signatureWidth - 30, yPos + 25)
    }
    
    // Employee Signature Section
    pdf.setFontSize(11)
    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(0, 0, 0)
    pdf.text('Employee Signature', margin + signatureWidth + 20, yPos - 8)
    
    if ((contract as any).employeeSignedAt) {
      pdf.setFillColor(236, 253, 245)
      pdf.rect(margin + signatureWidth + 20, yPos, signatureWidth, 35, 'F')
      
      // Parse and display signature typography
      let employeeSignatureText = ''
      try {
        const sigData = JSON.parse((contract as any).employeeSignatureData || '{}')
        employeeSignatureText = sigData.signature || ''
      } catch (e) {}
      
      if (employeeSignatureText) {
        pdf.setFontSize(16)
        pdf.setFont('times', 'italic')
        pdf.setTextColor(0, 0, 0)
        pdf.text(employeeSignatureText, margin + signatureWidth + 25, yPos + 12)
      }
      
      pdf.setFontSize(9)
      pdf.setFont('helvetica', 'normal')
      pdf.setTextColor(4, 120, 87)
      const employeeName = `${contract.employee.firstName} ${contract.employee.lastName}`
      pdf.text(`Signed by: ${employeeName}`, margin + signatureWidth + 25, yPos + 22)
      pdf.text(`Date: ${new Date((contract as any).employeeSignedAt).toLocaleDateString()}`, margin + signatureWidth + 25, yPos + 30)
    } else {
      pdf.setDrawColor(0, 0, 0)
      pdf.line(margin + signatureWidth + 20, yPos + 20, pageWidth - margin, yPos + 20)
      pdf.setFontSize(9)
      pdf.setTextColor(107, 114, 128)
      pdf.text('Signature', margin + signatureWidth + 20, yPos + 25)
      pdf.text('Date', pageWidth - margin - 30, yPos + 25)
    }
    
    yPos += 45
    
    // Status indicator
    if (contract.signedStatus === 'SIGNED_PAPER' || contract.signedStatus === 'SIGNED_ELECTRONIC') {
      pdf.setFillColor(220, 252, 231)
      pdf.rect(margin, yPos, contentWidth, 15, 'F')
      pdf.setFontSize(10)
      pdf.setFont('helvetica', 'bold')
      pdf.setTextColor(22, 101, 52)
      const method = contract.signedStatus === 'SIGNED_PAPER' ? 'on paper' : 'electronically'
      pdf.text(`Contract fully signed ${method}`, margin + 5, yPos + 10)
      yPos += 20
    } else if (contract.signedStatus === 'PENDING_EMPLOYEE_SIGNATURE') {
      pdf.setFillColor(254, 249, 195)
      pdf.rect(margin, yPos, contentWidth, 15, 'F')
      pdf.setFontSize(10)
      pdf.setFont('helvetica', 'bold')
      pdf.setTextColor(133, 77, 14)
      pdf.text('Awaiting employee signature', margin + 5, yPos + 10)
      yPos += 20
    }

    // Footer
    checkNewPage(15)
    pdf.setFontSize(9)
    pdf.setTextColor(107, 114, 128)
    pdf.setFont('helvetica', 'normal')
    const footerText = 'Generated on ' + new Date().toLocaleDateString() + ' at ' + new Date().toLocaleTimeString()
    const footerWidth = pdf.getTextWidth(footerText)
    pdf.text(footerText, (pageWidth - footerWidth) / 2, pageHeight - 10)

    // Create filename
    const filename = (contract.contractTemplate.name + '_' + contract.employee.firstName + '_' + contract.employee.lastName + '.pdf')
      .replace(/[^a-zA-Z0-9_.-]/g, '_')
      .replace(/_+/g, '_')

    // Output PDF buffer
    const pdfBuffer = Buffer.from(pdf.output('arraybuffer'))

    // Return PDF as response
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="' + filename + '"',
        'Content-Length': pdfBuffer.length.toString(),
      },
    })

  } catch (error) {
    console.error('Error generating PDF:', error)
    return NextResponse.json(
      { error: 'Failed to generate PDF' }, 
      { status: 500 }
    )
  }
}
