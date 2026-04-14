import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/shared/lib/prisma'
import { getCurrentUser } from '@/shared/lib/auth'
import { calculateInvoiceTotals, formatCustomerNumberForDisplay, formatInvoiceNumberForDisplay, getBusinessId } from '@/shared/lib/invoiceHelper'
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
          include: {

            product: true,

          }
        },
        business: {
          include: { invoiceGeneralSetting: true, users: { where: { id: currentUser.id }, select: { id: true, email: true } } }
        },
      }
    })

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    let totalExclVAT = 0
    let totalVatAmount = 0
    let totalIncVAT = 0
    const invoiceLinesData: any = []
    const vatMap: Map<number, { netAmount: number, vatAmount: number }> = new Map();
    let vatPayableBreakdowns: any = [];

    for (const line of invoice.invoiceLines) {
      const { productId, quantity, pricePerUnit, discountPercentage, vatPercentage, product } = line

      if (!productId || quantity == null || !pricePerUnit || !product) {
        return NextResponse.json(
          { error: `Invalid line: productId=${productId}, quantity=${quantity}` },
          { status: 400 }
        )
      }

      const isCreditNote = !!invoice.creditedInvoiceId || invoice.status === 'CREDIT_NOTE';
      const sign = isCreditNote ? -1 : 1;

      // Then in the loop — no longer derive sign from quantity
      const absQty = Math.abs(Number(quantity));
      const absPrice = Math.abs(Number(pricePerUnit));

      const calculations = calculateInvoiceTotals(absQty, absPrice, Number(discountPercentage), Number(vatPercentage));

      const signedNet = calculations.totalExclVAT * sign;
      const signedVat = calculations.vatAmount * sign;
      const signedTotal = calculations.totalInclVAT * sign;

      const vatKey = Number(vatPercentage);
      const current = vatMap.get(vatKey) || { netAmount: 0, vatAmount: 0 };
      vatMap.set(vatKey, {
        netAmount: current.netAmount + signedNet,
        vatAmount: current.vatAmount + signedVat
      });

      vatPayableBreakdowns = Array.from(vatMap.entries())
        .map(([vp, amounts]) => ({
          vatPercentage: vp,
          netAmount: amounts.netAmount,
          vatAmount: amounts.vatAmount,
        }))
        .sort((a, b) => b.vatPercentage - a.vatPercentage);

      totalExclVAT += signedNet;
      totalVatAmount += signedVat;
      totalIncVAT += signedTotal;

      invoiceLinesData.push({
        productId,
        quantity: absQty * sign,       // keep negative for display
        pricePerUnit: absPrice * sign, // keep negative for display
        discountPercentage,
        netAmount: signedNet,
        totalAmount: signedTotal,
        vatPercentage: Number(vatPercentage),
        vatAmount: signedVat,
        totalVatAmount: signedVat,
        productName: product.productName,  // use included product, not separate fetch
        productNumber: product.productNumber || ''
      })
    }

    const totalAmountAfterDiscount = totalExclVAT;
    const TotalVatAmount = totalVatAmount
    const totalIncVATAmount = totalIncVAT

    const formatCurrency = (amount: number) => {
      const absAmount = Math.abs(amount);
      const formatted = new Intl.NumberFormat('nb-NO', {
        style: 'decimal',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(absAmount);
      return amount < 0 ? `-${formatted}` : formatted;
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
    doc.text(`Org.nr.: ${invoice.business?.organizationNumber || '[Organisasjonsnr]'}`, 14, 20)
    doc.text(`Telefon: ${invoice.business?.phone || '[Telefon]'}`, 14, 25)
    doc.text(`Mailadresse: ${invoice.business?.users?.[0]?.email || '[Mailadresse]'}`, 14, 30)
    doc.text(`Web: ${invoice.business?.website || '[Web]'}`, 14, 35)

    // Logo Placeholder (same layout)
    if (invoice.business?.logoUrl) {
      try {
        const logoRes = await fetch(invoice.business.logoUrl)
        const logoBuffer = await logoRes.arrayBuffer()
        const logoBase64 = Buffer.from(logoBuffer).toString('base64')
        const mimeType = invoice.business.logoUrl.match(/\.png/i) ? 'PNG' : 'JPEG'

        // Contain within 45x25mm box (top-right)
        const maxW = 70, maxH = 28
        const imgProps = doc.getImageProperties(`data:image/${mimeType.toLowerCase()};base64,${logoBase64}`)
        const ratio = Math.min(maxW / imgProps.width, maxH / imgProps.height)
        const imgW = imgProps.width * ratio
        const imgH = imgProps.height * ratio
        const imgX = 196 - imgW  // right-align
        const imgY = 2

        doc.addImage(`data:image/${mimeType.toLowerCase()};base64,${logoBase64}`, mimeType, imgX, imgY, imgW, imgH)
      } catch (e) {
        doc.text('[Logo]', 180, 15)
      }
    }


    // Invoice number or Credit number (same layout as POST)
    doc.setFont('helvetica')

    // Invoice number block (top-right, above divider)

    const label = invoice.invoiceNumber?.startsWith('CN')
      ? 'Kreditnota nummer:'
      : 'Fakturanummer:'

    // number (top)


    // label (below number)
    // Replace the label/number block (around line with doc.text(label...))
    doc.setFont('helvetica')
    doc.setFontSize(10)
    doc.text(label, 120, 35)                          // ← align left like other fields
    doc.setFont('helvetica', 'normal')
    doc.text(
      formatInvoiceNumberForDisplay(invoice.invoiceNumber) || invoice.id,
      180, 35, { align: 'right' }                      // ← align right like other values
    )

    // Divider line
    doc.setLineWidth(0.5)
    doc.line(14, 42, 196, 42)

    // ===== CUSTOMER + INVOICE DETAILS =====
    let yPos = 50

    // Customer block
    // Customer block
    doc.setFont('helvetica')
    doc.setFontSize(10)
    doc.text('Kunde:', 14, yPos)
    doc.setFont('helvetica', 'normal')
    if (invoice.customer.customerName) {
      doc.text(invoice.customer.customerName, 14, yPos + 5)
    }
    if (invoice.customer.address) {
      doc.text(`Adresse: ${invoice.customer.address}`, 14, yPos + 10)
    }
    if (invoice.customer.postalCode) {
      doc.text(`Postnummer: ${invoice.customer.postalCode}`, 14, yPos + 15)
    }
    if (invoice.customer.organizationNumber) {
      doc.text(`Org. nr.: ${invoice.customer.organizationNumber}`, 14, yPos + 20)
    }


    // Invoice details (right)
    const rightX = 120

    doc.setFont('helvetica')
    doc.text('Fakturadato:', rightX, yPos)
    doc.setFont('helvetica', 'normal')
    doc.text(formatDate(invoice.sentAt ?? invoice.createdAt), 170, yPos, { align: 'right' })

    doc.setFont('helvetica')
    doc.text('Forfallsdato:', rightX, yPos + 5)
    doc.setFont('helvetica', 'normal')
    doc.text(formatDate(invoice.dueDate ?? invoice.createdAt), 170, yPos + 5, { align: 'right' })

    if (invoice.business?.invoiceGeneralSetting?.defaultBankAccount) {
      doc.setFont('helvetica')
      doc.text('Bankkonto:', rightX, yPos + 10)
      doc.setFont('helvetica', 'normal')
      doc.text(invoice.business?.invoiceGeneralSetting?.defaultBankAccount || '[Bankkontonummer]', 173, yPos + 10, { align: 'right' })
    }

    doc.setFont('helvetica')
    doc.text('Kundenummer:', rightX, yPos + 15)
    doc.setFont('helvetica', 'normal')
    doc.text(formatCustomerNumberForDisplay(invoice.customer.customerNumber) || '[Kundenummer]', 170, yPos + 15, { align: 'right' })

    // doc.setFont('helvetica', 'bold')
    // doc.text('Kid:', rightX, yPos + 20)
    // doc.setFont('helvetica', 'normal')
    // doc.text('[Kid]', 170, yPos + 20, { align: 'right' })

    //
    // ===== INVOICE TABLE (same as POST layout) =====
    //

    const tableData = invoiceLinesData.map((line: any) => {
      return [
        line.productName,
        String(Number(line.quantity)),         // ← force to plain number first
        'Stk',
        formatCurrency(Number(line.pricePerUnit)),  // ← force Number
        `${line.discountPercentage || 0}%`,
        `${line.vatPercentage}%`,
        formatCurrency(Number(line.netAmount)),     // ← force Number
        formatCurrency(Number(line.totalAmount)),   // ← force Number
      ]
    })

    autoTable(doc, {
      startY: yPos + 25,
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
        fillColor: [11, 120, 199],
        textColor: [255, 255, 255],
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
    // ===== SUMMARY SECTION =====
    const finalY = (doc as any).lastAutoTable.finalY + 10
    const summaryX = 90

    doc.setFontSize(10)
    doc.setFont('helvetica')
    doc.text('Sum', summaryX, finalY)
    doc.setFont('helvetica', 'normal')
    doc.text(`kr ${formatCurrency(totalAmountAfterDiscount)}`, 196, finalY, { align: 'right' })

    doc.line(summaryX, finalY + 1, 196, finalY + 1)

    vatPayableBreakdowns.forEach((line: any, index: number) => {
      const y = finalY + 5 + index * 5
      const netFormatted = formatCurrency(line.netAmount)
      const vatFormatted = formatCurrency(line.vatAmount)
      // Capitalize first letter only
      doc.text(
        `Vat amount(${line.vatPercentage}%) of ${netFormatted} - kr ${vatFormatted}`,
        summaryX, y
      )
    })

    const totalVatY = finalY + 5 + invoiceLinesData.length * 5

    doc.text(`Total vat amount(%)`, summaryX, totalVatY)
    doc.text(`kr ${formatCurrency(TotalVatAmount)}`, 196, totalVatY, { align: 'right' })

    doc.line(summaryX, totalVatY + 3, 196, totalVatY + 3)

    doc.setFont('helvetica')
    doc.setFontSize(10)
    doc.text('Sum å betale', summaryX, totalVatY + 8)
    doc.text(`kr ${formatCurrency(totalIncVATAmount)}`, 196, totalVatY + 8, { align: 'right' })  // ← same Y as label

    doc.line(14, totalVatY + 11, 196, totalVatY + 11)

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
    return NextResponse.json({
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}
