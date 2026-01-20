import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/shared/lib/prisma'
import { getCurrentUser } from '@/shared/lib/auth'
import { calculateInvoiceTotals, formatInvoiceNumberForDisplay, getBusinessId } from '@/shared/lib/invoiceHelper'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const businessId = await getBusinessId()
    if (!businessId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const invoiceId = searchParams.get('invoiceId')

    if (!invoiceId) {
      return NextResponse.json({ error: 'Invoice ID is required' }, { status: 400 })
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        customer: true,
        invoiceLines: {
          select: {
            productId: true,
            quantity: true,
            pricePerUnit: true,
            discountPercentage: true,
            product: true,
            vatPercentage: true,
            vatAmount: true
          }
        },
        business: true
      }
    })

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    let totalExclVAT = 0
    let totalVatAmount = 0
    let totalIncVAT = 0
    const invoiceLinesData: any = []

    for (const line of invoice.invoiceLines) {
      const { productId, quantity, pricePerUnit, discountPercentage,vatPercentage } = line

      if (!productId || !quantity || !pricePerUnit) {
        return NextResponse.json(
          { error: 'Each line must have productId, quantity, and pricePerUnit' },
          { status: 400 }
        )
      }

      const product = await prisma.product.findFirst({
        where: { id: productId, businessId }
      })

      if (!product) {
        return NextResponse.json(
          { error: `Product not found: ${productId}` },
          { status: 404 }
        )
      }

      const calculations = calculateInvoiceTotals(
        quantity,
        Number(pricePerUnit),
        Number(discountPercentage),
        Number(vatPercentage)
      )

      totalExclVAT += calculations.totalExclVAT
      totalVatAmount += calculations.vatAmount
      totalIncVAT += calculations.totalInclVAT

      invoiceLinesData.push({
        productId,
        quantity,
        pricePerUnit,
        discountPercentage,
        netAmount: calculations.totalExclVAT,
        totalAmount: calculations.totalInclVAT,
        vatPercentage: Number(vatPercentage),
        totalVatAmount,
        productName: product.productName,
        productNumber: product.productNumber || ''
      })
    }

    const totalAmountAfterDiscount = totalExclVAT;
    const TotalVatAmount = totalVatAmount
    const totalIncVATAmount = totalIncVAT

    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('nb-NO', {
        style: 'decimal',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(amount)
    }

    const formatDate = (date: Date) => {
      return new Date(date).toLocaleDateString('nb-NO', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      })
    }

    //
    // ---------------------------------------------------------
    // PDF REBUILT USING SAME LAYOUT STYLE AS YOUR POST VERSION
    // ---------------------------------------------------------
    //

    const doc = new jsPDF('p', 'mm', 'a4')

    // ===== HEADER: BUSINESS INFO (LEFT) =====
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text(invoice.business?.name || '[Firmanavn]', 14, 15)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text('Org.nr.: [Organisasjonsnr]', 14, 20)
    doc.text('Telefon: [Telefon]', 14, 25)
    doc.text('Mailadresse: [Mailadresse]', 14, 30)
    doc.text('Web: [Web]', 14, 35)

    // Logo Placeholder (same layout)
    doc.text('[Logo]', 180, 15)

    // Divider line
    doc.setLineWidth(0.5)
    doc.line(14, 42, 196, 42)

    // ===== CUSTOMER + INVOICE DETAILS =====
    let yPos = 50

    // Customer block
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.text('Kunde:', 14, yPos)
    doc.setFont('helvetica', 'normal')
    doc.text(invoice.customer.customerName || '', 14, yPos + 5)
    doc.text(invoice.customer.address || '[Firmaadresse]', 14, yPos + 10)
    doc.text(invoice.customer.postalCode || '[Firmapostnummer]', 14, yPos + 15)
    doc.text(`Org. nr.: ${invoice.customer.organizationNumber || '[Organisasjonsnr.]'}`, 14, yPos + 20)
    doc.text(`Kundenummer: ${invoice.customer.customerNumber || '[Kundenummer]'}`, 14, yPos + 25)

    // Invoice details (right)
    const rightX = 120

    doc.setFont('helvetica', 'bold')
    doc.text('Fakturadato:', rightX, yPos)
    doc.setFont('helvetica', 'normal')
    doc.text(formatDate(invoice.sentAt ?? invoice.createdAt), 170, yPos, { align: 'right' })

    doc.setFont('helvetica', 'bold')
    doc.text('Forfallsdato:', rightX, yPos + 5)
    doc.setFont('helvetica', 'normal')
    doc.text(formatDate(invoice.dueDate ?? invoice.createdAt), 170, yPos + 5, { align: 'right' })

    doc.setFont('helvetica', 'bold')
    doc.text('Bankkonto:', rightX, yPos + 10)
    doc.setFont('helvetica', 'normal')
    doc.text('[Bankkontonummer]', 173, yPos + 10, { align: 'right' })

    doc.setFont('helvetica', 'bold')
    doc.text('Kundenummer:', rightX, yPos + 15)
    doc.setFont('helvetica', 'normal')
    doc.text(invoice.customer.customerNumber || '[Kundenummer]', 170, yPos + 15, { align: 'right' })

    doc.setFont('helvetica', 'bold')
    doc.text('Kid:', rightX, yPos + 20)
    doc.setFont('helvetica', 'normal')
    doc.text('[Kid]', 170, yPos + 20, { align: 'right' })

    // Invoice number
    doc.line(rightX, yPos + 23, 196, yPos + 23)
    doc.setFont('helvetica', 'bold')
    doc.text('Fakturanummer: ',rightX, yPos + 28)
    doc.text(formatInvoiceNumberForDisplay(invoice.invoiceNumber) || invoice.id, 173, yPos + 28, { align: 'right' })

    //
    // ===== INVOICE TABLE (same as POST layout) =====
    //
    const tableData = invoiceLinesData.map((line: any) => [
      line.productName,
      line.quantity.toString(),
      'Stk',
      formatCurrency(line.pricePerUnit),
      `${line.discountPercentage || 0}%`,
      `${line.vatPercentage}%`,
      formatCurrency(line.netAmount),
      formatCurrency(line.totalAmount)
    ])

    autoTable(doc, {
      startY: yPos + 35,
      head: [[
        'Beskrivelse',
        'Antall',
        'Enhet',
        'Enhetspris',
        'Rabatt',
        'Mva',
        'Nettobeløp',
        'Beløp ink mva'
      ]],
      body: tableData,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: {
        fillColor: [11,120,199],
        textColor: [255,255,255],
        fontStyle: 'bold',
        fontSize: 8
      },
      columnStyles: {
        0: { cellWidth: 50 },
        1: { halign: 'center', cellWidth: 15 },
        2: { halign: 'center', cellWidth: 15 },
        3: { halign: 'right', cellWidth: 22 },
        4: { halign: 'center', cellWidth: 15 },
        5: { halign: 'center', cellWidth: 15 },
        6: { halign: 'right', cellWidth: 25 },
        7: { halign: 'right', cellWidth: 25 },
      }
    })

    //
    // ===== SUMMARY SECTION (same layout as POST) =====
    //
    const finalY = (doc as any).lastAutoTable.finalY + 10
    const summaryX = 120

    doc.setFontSize(10)
    doc.text('SUM', summaryX, finalY)
    doc.text(`kr ${formatCurrency(totalAmountAfterDiscount)}`, 196, finalY, { align: 'right' })

    doc.text(`TOTAL MVA(%)`, summaryX, finalY + 5)
    doc.text(`kr ${formatCurrency(TotalVatAmount)}`, 196, finalY + 5, { align: 'right' })

    doc.line(summaryX, finalY + 8, 196, finalY + 8)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.text('Sum å betale', summaryX, finalY + 13)
    doc.text(`kr ${formatCurrency(totalIncVATAmount)}`, 196, finalY + 13, { align: 'right' })

    doc.line(14, finalY + 20, 196, finalY + 20)

    //
    // ===== SEND PDF BACK =====
    //
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'))
    const filename = `faktura_${invoice.invoiceNumber || invoice.id}.pdf`

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.length.toString()
      }
    })

  } catch (error) {
    console.error('Error generating invoice PDF:', error)
    return NextResponse.json({ error: 'Failed to generate invoice PDF' }, { status: 500 })
  }
}
