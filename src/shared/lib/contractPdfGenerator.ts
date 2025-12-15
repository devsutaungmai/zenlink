import jsPDF from 'jspdf'
import { downloadBlob } from '@/shared/utils/download'

interface ContractData {
  id: string
  startDate: string
  endDate?: string | null
  signedStatus?: string | null
  signedAt?: string | null
  signatureData?: string | null
  employee: {
    firstName: string
    lastName: string
    email?: string | null
    mobile?: string | null
    address?: string | null
    employeeNo?: string | null
    department?: {
      name: string
    } | null
  }
  employeeGroup: {
    name: string
  }
  contractTemplate: {
    name: string
    body: string
    logoPath?: string | null
    logoPosition?: string | null
  }
  contractPerson: {
    firstName: string
    lastName: string
  }
}

export async function generateContractPdf(contract: ContractData): Promise<Blob> {
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
  const addWrappedText = (text: string, x: number, y: number, maxWidth: number, lineHeight: number = 7): number => {
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

  // Format contract body with variable replacement
  const formatContractBody = (body: string): string => {
    if (!body || !contract.employee) return body

    return body
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
      .replace(/\{\{employee_group\}\}/g, contract.employeeGroup?.name || '')
      .replace(/\{\{department\}\}/g, contract.employee.department?.name || '')
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
      .replace(/\[EMPLOYEE_GROUP\]/g, contract.employeeGroup?.name || '')
      .replace(/\[TODAY\]/g, new Date().toLocaleDateString())
  }

  // Add logo if exists
  if (contract.contractTemplate.logoPath) {
    try {
      const logoImg = new Image()
      logoImg.crossOrigin = 'anonymous'
      
      await new Promise<void>((resolve, reject) => {
        logoImg.onload = () => {
          const logoHeight = 15
          const logoWidth = (logoImg.width / logoImg.height) * logoHeight
          
          let logoX = margin
          if (contract.contractTemplate.logoPosition === 'TOP_CENTER') {
            logoX = (pageWidth - logoWidth) / 2
          } else if (contract.contractTemplate.logoPosition === 'TOP_RIGHT') {
            logoX = pageWidth - margin - logoWidth
          }
          
          pdf.addImage(logoImg, 'PNG', logoX, yPos, logoWidth, logoHeight)
          yPos += logoHeight + 10
          resolve()
        }
        logoImg.onerror = () => {
          // Skip logo if it fails to load
          resolve()
        }
        logoImg.src = contract.contractTemplate.logoPath!
      })
    } catch {
      // Continue without logo
    }
  }

  // Title
  pdf.setFontSize(20)
  pdf.setFont('helvetica', 'bold')
  const titleLines = pdf.splitTextToSize(contract.contractTemplate.name, contentWidth)
  titleLines.forEach((line: string) => {
    const titleWidth = pdf.getTextWidth(line)
    pdf.text(line, (pageWidth - titleWidth) / 2, yPos)
    yPos += 10
  })
  
  // Divider line
  yPos += 5
  pdf.setDrawColor(200, 200, 200)
  pdf.line(margin, yPos, pageWidth - margin, yPos)
  yPos += 15

  // Contract body content
  pdf.setFontSize(11)
  pdf.setFont('helvetica', 'normal')
  
  const formattedBody = formatContractBody(contract.contractTemplate.body)
  // Strip HTML tags and decode entities
  const plainText = formattedBody
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim()

  yPos = addWrappedText(plainText, margin, yPos, contentWidth, 6)
  yPos += 15

  // Contract Details Section
  checkNewPage(60)
  pdf.setFillColor(249, 250, 251)
  pdf.rect(margin, yPos - 5, contentWidth, 55, 'F')
  
  pdf.setFontSize(14)
  pdf.setFont('helvetica', 'bold')
  pdf.text('Contract Information', margin + 5, yPos + 5)
  yPos += 15

  pdf.setFontSize(10)
  const details = [
    { label: 'Employee', value: `${contract.employee.firstName} ${contract.employee.lastName}` },
    { label: 'Employee Group', value: contract.employeeGroup.name },
    { label: 'Start Date', value: new Date(contract.startDate).toLocaleDateString() },
    { label: 'End Date', value: contract.endDate ? new Date(contract.endDate).toLocaleDateString() : 'Indefinite' },
    { label: 'Contract Person', value: `${contract.contractPerson.firstName} ${contract.contractPerson.lastName}` },
    { label: 'Template', value: contract.contractTemplate.name },
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

  // Signature section
  checkNewPage(50)
  
  if (contract.signedStatus && contract.signedStatus !== 'UNSIGNED') {
    // Signed contract info
    pdf.setFillColor(236, 253, 245)
    pdf.rect(margin, yPos, contentWidth, 30, 'F')
    
    pdf.setFontSize(12)
    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(6, 95, 70)
    pdf.text('Contract Signature Status', margin + 5, yPos + 10)
    
    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'normal')
    pdf.setTextColor(4, 120, 87)
    const signedText = `This contract has been signed ${contract.signedStatus === 'SIGNED_PAPER' ? 'on paper' : 'electronically'}${contract.signedAt ? ` on ${new Date(contract.signedAt).toLocaleDateString()}` : ''}.`
    pdf.text(signedText, margin + 5, yPos + 20)
    
    yPos += 40
  } else {
    // Signature lines
    yPos += 20
    const signatureWidth = (contentWidth - 20) / 2
    
    pdf.setDrawColor(0, 0, 0)
    pdf.line(margin, yPos, margin + signatureWidth, yPos)
    pdf.line(margin + signatureWidth + 20, yPos, pageWidth - margin, yPos)
    
    pdf.setFontSize(9)
    pdf.setTextColor(107, 114, 128)
    pdf.text('Employee Signature', margin, yPos + 5)
    pdf.text('Date', margin + signatureWidth + 20, yPos + 5)
    
    yPos += 20
  }

  // Footer
  checkNewPage(15)
  pdf.setFontSize(9)
  pdf.setTextColor(107, 114, 128)
  const footerText = `Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`
  const footerWidth = pdf.getTextWidth(footerText)
  pdf.text(footerText, (pageWidth - footerWidth) / 2, pageHeight - 10)

  return pdf.output('blob')
}

export function downloadContractPdf(blob: Blob, contract: ContractData): void {
  const filename = `${contract.contractTemplate.name}_${contract.employee.firstName}_${contract.employee.lastName}.pdf`
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_')

  downloadBlob(blob, filename)
}
