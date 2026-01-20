import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { prisma } from '@/shared/lib/prisma';
import { getCurrentUser } from '@/shared/lib/auth';
import { calculateInvoiceTotals, formatInvoiceNumberForDisplay, getBusinessId } from '@/shared/lib/invoiceHelper';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export async function POST(req: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const businessId = await getBusinessId();
    if (!businessId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {invoiceId} = await req.json();

    if (!invoiceId ) {
      return NextResponse.json(
        { error: 'Invoice ID is required' },
        { status: 400 }
      );
    }

    // Fetch invoice with related data
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        customer: {
          select: {
            email: true,
            contactPersons: { where: { isPrimary: true }, select: { email: true } },
            customerName: true,
            address: true,
            postalCode: true,
            organizationNumber: true,
            customerNumber: true
          }
        },
        invoiceLines: {
          select: {
            productId: true,
            quantity: true,
            pricePerUnit: true,
            discountPercentage: true,
            vatPercentage: true,
            product: true
          }
        },
        business: true
      }
    });

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Check if customer has an email
    const email = invoice.customer.email || invoice.customer.contactPersons?.[0]?.email;
    if (!email) {
      return NextResponse.json(
        { error: 'Customer email not found. Please add an email address to the customer.' },
        { status: 400 }
      );
    }

    // Prepare invoice lines data with calculations
    let totalExclVAT = 0;
    let totalVatAmount = 0;
    let totalIncVAT = 0;
    const invoiceLinesData: any = [];

    for (const line of invoice.invoiceLines) {
      const { productId, quantity, pricePerUnit, discountPercentage,vatPercentage} = line;

      if (!productId || !quantity || !pricePerUnit) {
        return NextResponse.json(
          { error: 'Each line must have productId, quantity, and pricePerUnit' },
          { status: 400 }
        );
      }

      const product = await prisma.product.findFirst({
        where: { id: productId, businessId }
      });

      if (!product) {
        return NextResponse.json(
          { error: `Product not found: ${productId}` },
          { status: 404 }
        );
      }

      const calculations = calculateInvoiceTotals(
        quantity,
        Number(pricePerUnit),
        Number(discountPercentage),
        Number(vatPercentage)
      );
      
      totalExclVAT += calculations.totalExclVAT;
      totalVatAmount += calculations.vatAmount;
      totalIncVAT += calculations.totalInclVAT;

      invoiceLinesData.push({
        productId,
        quantity,
        pricePerUnit,
        discountPercentage,
        netAmount: calculations.totalExclVAT,
        totalAmount: calculations.totalInclVAT,
        vatPercentage: vatPercentage,
        productName: product.productName,
        productNumber: product.productNumber || ''
      });
    }

    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('nb-NO', {
        style: 'decimal',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(amount);
    };

    const formatDate = (date: Date) => {
      return new Date(date).toLocaleDateString('nb-NO', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    };

    // Generate PDF using jsPDF
    const doc = new jsPDF('p', 'mm', 'a4');
    
    // Header - Company Info (Left)
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(invoice.business?.name || '[Firmanavn]', 14, 15);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Org.nr.: [Organisasjonsnr]', 14, 20);
    doc.text('Telefon: [Telefon]', 14, 25);
    doc.text('Mailadresse: [Mailadresse]', 14, 30);
    doc.text('Web: [Web]', 14, 35);

    // Logo placeholder (Right)
    doc.text('[Logo]', 180, 15);

    // Horizontal line
    doc.setLineWidth(0.5);
    doc.line(14, 42, 196, 42);

    // Customer Info (Left) & Invoice Details (Right)
    let yPos = 50;
    
    // Customer section
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Kunde:', 14, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(invoice.customer.customerName, 14, yPos + 5);
    doc.text(invoice.customer.address || '[Firmaadresse]', 14, yPos + 10);
    doc.text(invoice.customer.postalCode || '[Firmapostnummer]', 14, yPos + 15);
    doc.text(`Org. nr.: ${invoice.customer.organizationNumber || '[Organisasjonsnr.]'}`, 14, yPos + 20);
    doc.text(`Kundenummer: ${invoice.customer.customerNumber || '[Referanse]'}`, 14, yPos + 25);

    // Invoice details (Right side)
    const rightX = 120;
    doc.setFont('helvetica', 'bold');
    doc.text('Fakturadato:', rightX, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(formatDate(invoice.createdAt), 170, yPos, { align: 'right' });
    
    doc.setFont('helvetica', 'bold');
    doc.text('Forfallsdato:', rightX, yPos + 5);
    doc.setFont('helvetica', 'normal');
    doc.text(formatDate(new Date(invoice.createdAt.getTime() + 14 * 24 * 60 * 60 * 1000)), 170, yPos + 5, { align: 'right' });
    
    doc.setFont('helvetica', 'bold');
    doc.text('Bankkonto:', rightX, yPos + 10);
    doc.setFont('helvetica', 'normal');
    doc.text('[Bankkontonummer]', 173, yPos + 10, { align: 'right' });
    
    doc.setFont('helvetica', 'bold');
    doc.text('Kundenummer:', rightX, yPos + 15);
    doc.setFont('helvetica', 'normal');
    doc.text(invoice.customer.customerNumber || '[Kundenummer]', 170, yPos + 15, { align: 'right' });
    
    doc.setFont('helvetica', 'bold');
    doc.text('Kid:', rightX, yPos + 20);
    doc.setFont('helvetica', 'normal');
    doc.text('[Kid]', 170, yPos + 20, { align: 'right' });

    // Invoice number (highlighted)
    doc.setLineWidth(0.3);
    doc.line(rightX, yPos + 23, 196, yPos + 23);
    doc.setFont('helvetica', 'bold');
    doc.text('Fakturanummer:', rightX, yPos + 28);
    doc.text(formatInvoiceNumberForDisplay(invoice.invoiceNumber) || invoice.id, 173, yPos + 28, { align: 'right' });

    // Invoice items table
    const tableData = invoiceLinesData.map((line: any) => [
      line.productName,
      line.quantity.toString(),
      'Stk',
      formatCurrency(line.pricePerUnit),
      `${line.discountPercentage || 0}%`,
      `${line.vatPercentage}%`,
      formatCurrency(line.netAmount),
      formatCurrency(line.totalAmount)
    ]);

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
      styles: {
        fontSize: 8,
        cellPadding: 3,
      },
      headStyles: {
        fillColor: [11, 120, 199], // #0B78C7
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8,
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
      },
    });

    // Summary section
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    const summaryX = 120;
    
    doc.setFontSize(10);
    doc.text('SUM', summaryX, finalY);
    doc.text(`kr ${formatCurrency(totalExclVAT)}`, 196, finalY, { align: 'right' });
    
    doc.text(`MVA`, summaryX, finalY + 5);
    doc.text(`kr ${formatCurrency(totalVatAmount)}`, 196, finalY + 5, { align: 'right' });
    
    // Total line
    doc.setLineWidth(0.5);
    doc.line(summaryX, finalY + 8, 196, finalY + 8);
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Sum å betale', summaryX, finalY + 13);
    doc.text(`kr ${formatCurrency(totalIncVAT)}`, 196, finalY + 13, { align: 'right' });

    // Footer line
    doc.setLineWidth(0.5);
    doc.line(14, finalY + 20, 196, finalY + 20);

    // Get PDF as buffer
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

    // Create simple email text body (Norwegian)
    const emailBody = `
Du har mottatt en faktura fra ${invoice.business?.name || 'Zen Link'}. Se vedlegg.

Spørsmål vedrørende fakturaen rettes til ${invoice.business?.name || 'Zen Link'}. Hvis du ønsker en skriftlig faktura til regnskap e.l., så kan du ta en utskrift av fakturaen fra nettleseren.

Hvis du har spørsmål, så kan du svare på denne e-posten eller sende en e-post til ${process.env.FROM_EMAIL || process.env.GMAIL_USER || 'zenlinkdev@gmail.com'}.

Denne e-posten er sendt fra økonomisystemet Zenlink (www.zenlink.no).
    `.trim();

    // Setup nodemailer transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.GMAIL_USER || 'zenlinkdev@gmail.com',
        pass: process.env.GMAIL_APP_PASSWORD,
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    // Verify SMTP connection
    try {
      await transporter.verify();
      console.log('SMTP connection verified successfully');
    } catch (verifyError) {
      console.error('SMTP verification failed:', verifyError);
      throw new Error(`Email service unavailable: ${verifyError instanceof Error ? verifyError.message : 'Unknown error'}`);
    }

    const filename = `Faktura-${formatInvoiceNumberForDisplay(invoice.invoiceNumber) || invoice.id}.pdf`;

    // Send email with PDF attachment
    const info = await transporter.sendMail({
      from: `"${invoice.business?.name || 'Zen Link'}" <${process.env.FROM_EMAIL || process.env.GMAIL_USER || 'zenlinkdev@gmail.com'}>`,
      to: email,
      subject: `Faktura ${formatInvoiceNumberForDisplay(invoice.invoiceNumber) || invoice.id} fra ${invoice.business?.name || 'Zen Link'}`,
      text: emailBody,
      attachments: [
        {
          filename: filename,
          content: pdfBuffer,
          contentType: 'application/pdf'
        }
      ]
    });

    console.log('Invoice email sent with PDF attachment: %s', info.messageId);

    return NextResponse.json({
      message: 'Invoice email sent successfully with PDF attachment',
      messageId: info.messageId
    });

  } catch (error: any) {
    console.error('Error sending invoice email:', error);
    return NextResponse.json(
      { error: 'Failed to send invoice email', details: error.message },
      { status: 500 }
    );
  }
}