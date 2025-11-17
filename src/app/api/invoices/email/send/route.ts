import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { prisma } from '@/shared/lib/prisma';
import { getCurrentUser } from '@/shared/lib/auth';
import { calculateInvoiceTotals, getBusinessId } from '@/shared/lib/invoiceHelper';

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
        { error: 'Invoice ID and recipient email are required' },
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

    // Generate invoice rows HTML
    const invoiceRowsHtml = invoiceLinesData.map((line: any) => {
      return `
        <tr>
          <td style="padding: 12px 8px; border-bottom: 1px solid #e9e9e9;">${line.productName}</td>
          <td style="padding: 12px 8px; border-bottom: 1px solid #e9e9e9; text-align: center;">${line.quantity}</td>
          <td style="padding: 12px 8px; border-bottom: 1px solid #e9e9e9; text-align: center;">Stk</td>
          <td style="padding: 12px 8px; border-bottom: 1px solid #e9e9e9; text-align: right;">${formatCurrency(line.pricePerUnit)}</td>
          <td style="padding: 12px 8px; border-bottom: 1px solid #e9e9e9; text-align: center;">${line.discountPercentage || 0}%</td>
          <td style="padding: 12px 8px; border-bottom: 1px solid #e9e9e9; text-align: center;">${line.vatPercentage}%</td>
          <td style="padding: 12px 8px; border-bottom: 1px solid #e9e9e9; text-align: right;">${formatCurrency(line.netAmount)}</td>
          <td style="padding: 12px 8px; border-bottom: 1px solid #e9e9e9; text-align: right;">${formatCurrency(line.totalAmount)}</td>
        </tr>
      `;
    }).join('');

    // Create email HTML
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; color: #333;">
        <!-- Header Section -->
        <div style="background-color: #0B78C7; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">Invoice</h1>
        </div>

        <!-- Content -->
        <div style="padding: 30px; border: 1px solid #e9e9e9; border-top: none;">
          <!-- Invoice Info -->
          <div style="margin-bottom: 30px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="width: 50%; vertical-align: top; padding-right: 20px;">
                  <h3 style="margin: 0 0 10px 0; color: #333;">Kunde:</h3>
                  <p style="margin: 3px 0;"><strong>${invoice.customer.customerName}</strong></p>
                  <p style="margin: 3px 0;">${invoice.customer.address || ''}</p>
                  <p style="margin: 3px 0;">${invoice.customer.postalCode || ''}</p>
                  <p style="margin: 3px 0;">Org.nr.: ${invoice.customer.organizationNumber || ''}</p>
                  <p style="margin: 3px 0;">Kundenummer: ${invoice.customer.customerNumber || ''}</p>
                </td>
                <td style="width: 50%; vertical-align: top;">
                  <h3 style="margin: 0 0 10px 0; color: #333;">Fakturadetaljer:</h3>
                  <table style="width: 100%;">
                    <tr>
                      <td style="padding: 3px 0;"><strong>Fakturanummer:</strong></td>
                      <td style="padding: 3px 0; text-align: right;">${invoice.invoiceNumber || invoice.id}</td>
                    </tr>
                    <tr>
                      <td style="padding: 3px 0;">Fakturadato:</td>
                      <td style="padding: 3px 0; text-align: right;">${formatDate(invoice.createdAt)}</td>
                    </tr>
                    <tr>
                      <td style="padding: 3px 0;">Forfallsdato:</td>
                      <td style="padding: 3px 0; text-align: right;">${formatDate(new Date(invoice.createdAt.getTime() + 14 * 24 * 60 * 60 * 1000))}</td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </div>

          <!-- Invoice Table -->
          <table style="width: 100%; border-collapse: collapse; margin: 30px 0;">
            <thead>
              <tr style="background-color: #0B78C7; color: white;">
                <th style="padding: 12px 8px; text-align: left; font-size: 11px; text-transform: uppercase;">Beskrivelse</th>
                <th style="padding: 12px 8px; text-align: center; font-size: 11px; text-transform: uppercase;">Antall</th>
                <th style="padding: 12px 8px; text-align: center; font-size: 11px; text-transform: uppercase;">Enhet</th>
                <th style="padding: 12px 8px; text-align: right; font-size: 11px; text-transform: uppercase;">Enhetspris</th>
                <th style="padding: 12px 8px; text-align: center; font-size: 11px; text-transform: uppercase;">Rabatt</th>
                <th style="padding: 12px 8px; text-align: center; font-size: 11px; text-transform: uppercase;">Mva</th>
                <th style="padding: 12px 8px; text-align: right; font-size: 11px; text-transform: uppercase;">Nettobeløp</th>
                <th style="padding: 12px 8px; text-align: right; font-size: 11px; text-transform: uppercase;">Beløp ink mva</th>
              </tr>
            </thead>
            <tbody>
              ${invoiceRowsHtml}
            </tbody>
          </table>

          <!-- Summary -->
          <div style="margin-top: 30px; text-align: right;">
            <table style="margin-left: auto; width: 300px; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; border-top: 1px solid #e9e9e9;">SUM</td>
                <td style="padding: 8px 0; text-align: right; border-top: 1px solid #e9e9e9;">kr ${formatCurrency(totalExclVAT)}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0;">MVA (${invoice.vatPercentage}%)</td>
                <td style="padding: 8px 0; text-align: right;">kr ${formatCurrency(totalVatAmount)}</td>
              </tr>
              <tr>
                <td style="padding: 12px 0; border-top: 2px solid #333; font-weight: bold; font-size: 16px;">Sum å betale</td>
                <td style="padding: 12px 0; text-align: right; border-top: 2px solid #333; font-weight: bold; font-size: 16px;">kr ${formatCurrency(totalIncVAT)}</td>
              </tr>
            </table>
          </div>

          <!-- Additional Info -->
          <div style="margin-top: 40px; padding: 20px; background-color: #f9f9f9; border-radius: 4px;">
            <p style="margin: 5px 0; font-size: 14px;">Betalingsinformasjon:</p>
            <p style="margin: 5px 0; font-size: 14px;">Bankkonto: [Bankkontonummer]</p>
            <p style="margin: 5px 0; font-size: 14px;">Ved spørsmål, kontakt oss på: ${invoice.business?.name || '[Firmanavn]'}</p>
          </div>
        </div>

        <!-- Footer -->
        <div style="text-align: center; padding: 20px; color: #666; font-size: 12px;">
          <p>© 2024 ${invoice.business?.name || 'Zen Link'}. All rights reserved.</p>
        </div>
      </div>
    `;

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

    // Send email
    const info = await transporter.sendMail({
      from: `"${invoice.business?.name || 'Zen Link'}" <${process.env.FROM_EMAIL || process.env.GMAIL_USER || 'zenlinkdev@gmail.com'}>`,
      to: invoice.customer.email,
      subject: `Faktura ${invoice.invoiceNumber || invoice.id} fra ${invoice.business?.name || 'Zen Link'}`,
      html: emailHtml,
    });

    console.log('Invoice email sent: %s', info.messageId);

    return NextResponse.json({
      message: 'Invoice email sent successfully',
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