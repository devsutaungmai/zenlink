import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { prisma } from '@/shared/lib/prisma';
import { getCurrentUser } from '@/shared/lib/auth';
import { calculateInvoiceTotals, getBusinessId } from '@/shared/lib/invoiceHelper';
import { launchBrowser } from '@/shared/lib/puppeteer-config';

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

    const { invoiceId } = await req.json();

    if (!invoiceId) {
      return NextResponse.json(
        { error: 'Invoice ID is required' },
        { status: 400 }
      );
    }

    // Fetch invoice with related data
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
    if (!invoice.customer.email) {
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
      const { productId, quantity, pricePerUnit, discountPercentage } = line;

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
        Number(discountPercentage)
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
        vatPercentage: invoice.vatPercentage,
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

    // Generate invoice rows HTML for PDF
    const invoiceRowsHtml = invoiceLinesData.map((line: any) => {
      return `
        <tr>
          <td>${line.productName}</td>
          <td class="text-center">${line.quantity}</td>
          <td class="text-center">Stk</td>
          <td class="text-right">${formatCurrency(line.pricePerUnit)}</td>
          <td class="text-center">${line.discountPercentage || 0} %</td>
          <td class="text-center">${line.vatPercentage} %</td>
          <td class="text-right">${formatCurrency(line.netAmount)}</td>
          <td class="text-right">${formatCurrency(line.totalAmount)}</td>
        </tr>
      `;
    }).join('');

    // Generate PDF HTML content
    const pdfHtmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Faktura ${invoice.invoiceNumber || invoice.id}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: Arial, sans-serif;
            font-size: 10pt;
            color: #000;
            padding: 40px;
            line-height: 1.4;
        }
        
        .invoice-header {
            display: table;
            width: 100%;
            margin-bottom: 30px;
        }
        
        .company-info {
            display: table-cell;
            width: 70%;
            vertical-align: top;
        }
        
        .company-info p {
            margin: 1px 0;
            font-size: 9pt;
        }
        
        .logo-section {
            display: table-cell;
            width: 30%;
            text-align: right;
            vertical-align: top;
        }
        
        .invoice-details {
            display: table;
            width: 100%;
            margin-bottom: 25px;
            border-top: 1px solid #000;
            padding-top: 15px;
        }
        
        .customer-info {
            display: table-cell;
            width: 50%;
            vertical-align: top;
            padding-right: 20px;
        }
        
        .customer-info p {
            margin: 1px 0;
            font-size: 9pt;
        }
        
        .invoice-meta {
            display: table-cell;
            width: 50%;
            vertical-align: top;
        }
        
        .meta-table {
            width: 100%;
        }
        
        .meta-table td {
            padding: 2px 0;
            font-size: 9pt;
        }
        
        .meta-table td:first-child {
            width: 50%;
        }
        
        .meta-table td:last-child {
            text-align: right;
        }
        
        .invoice-number-row {
            padding-top: 8px !important;
            border-top: 1px solid #ccc;
        }
        
        .invoice-table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }
        
        .invoice-table th {
            background-color: #0B78C7;
            padding: 8px 6px;
            text-align: left;
            font-size: 8pt;
            font-weight: bold;
            border-top: 1px solid #000;
            border-bottom: 1px solid #000;
            text-transform: uppercase;
            color: white;
        }
        
        .invoice-table td {
            padding: 8px 6px;
            font-size: 9pt;
            border-bottom: 1px solid #ddd;
        }
        
        .invoice-table tbody tr:last-child td {
            border-bottom: 1px solid #000;
        }
        
        .text-right {
            text-align: right !important;
        }
        
        .text-center {
            text-align: center !important;
        }
        
        .summary-section {
            margin-top: 30px;
            float: right;
            width: 280px;
        }
        
        .summary-table {
            width: 100%;
        }
        
        .summary-table td {
            padding: 6px 0;
            font-size: 10pt;
        }
        
        .summary-table td:last-child {
            text-align: right;
            padding-left: 20px;
        }
        
        .summary-total {
            border-top: 1px solid #000;
            font-weight: bold;
            padding-top: 10px !important;
        }
        
        .clearfix {
            clear: both;
        }
        
        hr {
          border: none;
          border-top: 2px solid #0B78C7;
        }
    </style>
</head>
<body>
    <!-- Header -->
    <div class="invoice-header">
        <div class="company-info">
            <p><strong>${invoice.business?.name || '[Firmanavn]'}</strong></p>
            <p>Org.nr.: [Organisasjonsnr]</p>
            <p>Foretaksregisteret</p>
            <p>Telefon: [Telefon]</p>
            <p>Mailadresse: [Mailadresse]</p>
            <p>Web: [Web]</p>
        </div>
         <div class="logo-section">
            <p>[Logo]</p>
        </div>
    </div>

    <!-- Invoice Details -->
    <div class="invoice-details">
        <div class="customer-info">
            <p><strong>${invoice.customer.customerName}</strong></p>
            <p>${invoice.customer.address || '[Firmaadresse]'}</p>
            <p>${invoice.customer.postalCode || '[Firmapostnummer]'} </p>
            <p>Org. nr.: ${invoice.customer.organizationNumber || '[Organisasjonsnr.]'}</p>
            <p style="margin-top: 8px;">Deres ref.: ${invoice.customer.customerNumber || '[Referanse]'}</p>
        </div>
        
        <div class="invoice-meta">
            <table class="meta-table">
                <tr>
                    <td>Fakturadato:</td>
                    <td>${formatDate(invoice.createdAt)}</td>
                </tr>
                <tr>
                    <td>Forfallsdato:</td>
                    <td>${formatDate(new Date(invoice.createdAt.getTime() + 14 * 24 * 60 * 60 * 1000))}</td>
                </tr>
                <tr>
                    <td>Bankkonto:</td>
                    <td>[Bankkontonummer]</td>
                </tr>
                <tr>
                    <td>Kundenummer:</td>
                    <td>${invoice.customer.customerNumber || '[Kundenummer]'}</td>
                </tr>
                <tr>
                    <td>Kid:</td>
                    <td>[Kid]</td>
                </tr>
                <tr>
                    <td>Vår ref.:</td>
                    <td>[Vår referanse]</td>
                </tr>
                <tr class="invoice-number-row">
                    <td><strong>Fakturanummer:</strong></td>
                    <td><strong>${invoice.invoiceNumber || invoice.id}</strong></td>
                </tr>
            </table>
        </div>
    </div>

    <!-- Invoice Table -->
    <table class="invoice-table">
        <thead>
            <tr>
                <th style="width: 35%;">Beskrivelse</th>
                <th class="text-center" style="width: 8%;">Antall</th>
                <th class="text-center" style="width: 8%;">Enhet</th>
                <th class="text-right" style="width: 13%;">Enhetspris</th>
                <th class="text-center" style="width: 8%;">Rabatt</th>
                <th class="text-center" style="width: 8%;">Mva</th>
                <th class="text-center" style="width: 8%;">Nettobeløp</th>
                <th class="text-right" style="width: 15%;">Beløp ink mva</th>
            </tr>
        </thead>
        <tbody>
            ${invoiceRowsHtml}
        </tbody>
    </table>

    <!-- Summary -->
    <div class="summary-section">
        <table class="summary-table">
            <tr>
                <td>SUM</td>
                <td>kr ${formatCurrency(totalExclVAT)}</td>
            </tr>
            <tr>
                <td>MVA (${invoice.vatPercentage}%)</td>
                <td>kr ${formatCurrency(totalVatAmount)}</td>
            </tr>
            <tr class="summary-total">
                <td>Sum å betale</td>
                <td>kr ${formatCurrency(totalIncVAT)}</td>
            </tr>
        </table>
    </div>

    <div class="clearfix"></div>
    <hr/>
</body>
</html>
    `;

    // Generate PDF
    let pdfBuffer: Buffer;
    const browser = await launchBrowser();

    try {
      const page = await browser.newPage();
      await page.setContent(pdfHtmlContent, { waitUntil: 'networkidle0' });

      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20mm',
          right: '15mm',
          bottom: '20mm',
          left: '15mm'
        }
      });

      pdfBuffer = Buffer.from(pdf);
      await browser.close();
    } catch (error) {
      await browser.close();
      throw error;
    }

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

    const filename = `Faktura-${invoice.invoiceNumber || invoice.id}.pdf`;

    // Send email with PDF attachment
    const info = await transporter.sendMail({
      from: `"${invoice.business?.name || 'Zen Link'}" <${process.env.FROM_EMAIL || process.env.GMAIL_USER || 'zenlinkdev@gmail.com'}>`,
      to: invoice.customer.email,
      subject: `Faktura ${invoice.invoiceNumber || invoice.id} fra ${invoice.business?.name || 'Zen Link'}`,
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