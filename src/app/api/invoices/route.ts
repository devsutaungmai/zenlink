import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/shared/lib/prisma'
import { getCurrentUserOrEmployee, requireAuth } from '@/shared/lib/auth'
import { calculateInvoiceTotals, generateInvoiceNumber, generateVoucherNumber, getBusinessId, invoiceToLedgerPosting } from '@/shared/lib/invoiceHelper'
import { InvoiceStatus, VoucherType } from '@prisma/client'

// GET /api/invoices
export async function GET(request: NextRequest) {
  try {
    const auth = await getCurrentUserOrEmployee()

    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const businessId = await getBusinessId()
    if (!businessId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const invoices = await prisma.invoice.findMany({
      where: {
        businessId: businessId
      },
      include: {
        customer: {
          select: {
            id: true,
            customerName: true,
            email: true
          }
        },
        project: {
          select: {
            id: true,
            name: true
          }
        },
        paymentAllocations:{
          select:{
            amountAllocated: true
          }
        }
      },
      orderBy: {
        invoiceNumber: 'asc',
      }
    })
    console.log(JSON.stringify(invoices));
    return NextResponse.json(invoices)
  } catch (error) {
    console.error('Error fetching invoices:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/invoices - Create a new invocies
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const auth = await getCurrentUserOrEmployee()

    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const businessId = await getBusinessId()
    if (!businessId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const body = await request.json()
    const {
      customerId,
      contactPersonId,
      projectId,
      departmentId,
      deliveryAddress,
      notes,
      sentAt,
      paidAt,
      dueDay,
      invoiceLines,
      status
    } = body

    // Validate inputs - only check for required fields
    if (!customerId) {
      return NextResponse.json(
        { error: 'Customer is required!' },
        { status: 400 }
      )
    }
    if (!invoiceLines || invoiceLines.length === 0) {
      return NextResponse.json(
        { error: 'InvoiceLine is required!' },
        { status: 400 }
      )
    }
    const maxRetries = 3

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        let invoiceLinesData = [];
        let totalExclVAT = 0

        for (const line of invoiceLines) {

          const { productId, quantity, pricePerUnit, discountPercentage = 0, vatPercentage } = line;
          // Validate line data
          if (!productId || !quantity || !pricePerUnit) {
            return NextResponse.json(
              { error: 'Each line must have productId, quantity, and pricePerUnit' },
              { status: 400 }
            )
          }

          // Get product details for snapshot
          const product = await prisma.product.findFirst({
            where: { id: productId, businessId }
          })

          if (!product) {
            return NextResponse.json(
              { error: `Product not found: ${productId}` },
              { status: 404 }
            )
          }

          // Convert string values to numbers
          const qty = Number(quantity)
          const price = Number(pricePerUnit)
          const discount = Number(discountPercentage) || 0
          const vatPerc = Number(vatPercentage)

          // Calculate totals
          const calculations = calculateInvoiceTotals(
            qty,
            price,
            discount,
            vatPerc
          )

          totalExclVAT += calculations.totalExclVAT

          invoiceLinesData.push({
            productId,
            quantity: qty,
            pricePerUnit: price,
            discountPercentage: discount,
            subtotal: calculations.subtotal,
            discountAmount: calculations.discountAmount,
            lineTotal: calculations.totalExclVAT,
            vatAmount: calculations.vatAmount,
            vatPercentage: vatPerc,
            productName: product.productName,
            productNumber: product.productNumber || ''
          })
        }

        // Calculate invoice-level VAT (after summing all lines)
        // const vatPercentage = 25
        const totalVatAmount = invoiceLinesData.reduce((total, line) => total + line.vatAmount, 0)
        const totalInclVAT = totalExclVAT + totalVatAmount  // Correct calculation
        // Verify customer exists
        const customer = await prisma.customer.findUnique({
          where: { id: customerId }
        })

        if (!customer) {
          return NextResponse.json(
            { error: 'Customer not found' },
            { status: 404 }
          )
        }

        const invoice = await prisma.$transaction(async (tx) => {
          const currentYear = new Date().getFullYear()
          let sequenceNumber;
          let forYear;
          let forInvoiceNumber;
          if (status === InvoiceStatus.SENT) {
            const { year, sequence, invoiceNumber } = await generateInvoiceNumber(businessId, tx);
            sequenceNumber = sequence;
            forYear = year;
            forInvoiceNumber = invoiceNumber;
          } else if (status === InvoiceStatus.DRAFT) {
            sequenceNumber = -Math.floor(Math.random() * 1000000); // Use negative timestamp as sequence for uniqueness
            forYear = currentYear;
            forInvoiceNumber = `DRAFT-${currentYear}-${Date.now()}`;
          }

          const invoiceData: any = {
            invoiceNumber: forInvoiceNumber,
            year: forYear,
            sequence: sequenceNumber,
            customerId,
            businessId,

            // Invoice totals
            totalExclVAT: totalExclVAT,
            totalVatAmount: totalVatAmount,
            totalInclVAT: totalInclVAT,
            notes,
            status: status,
            sentAt: new Date(sentAt) ?? new Date(),
            dueDay: dueDay ?? 14,


            // Create invoice line with product
            invoiceLines: {
              create: invoiceLinesData
            }
          }

          if (contactPersonId && contactPersonId.trim() !== '') {
            invoiceData.contactPersonId = contactPersonId
          }

          if (projectId && projectId.trim() !== '') {
            invoiceData.projectId = projectId
          }

          if (departmentId && departmentId.trim() !== '') {
            invoiceData.departmentId = departmentId
          }

          if (deliveryAddress && deliveryAddress.trim() !== '') {
            invoiceData.deliveryAddress = deliveryAddress
          }

          if (paidAt && paidAt.trim() !== "") {
            invoiceData.dueDate = new Date(paidAt)
            invoiceData.paidAt = new Date(paidAt)
          } else {
            const sentDate = invoiceData.sentAt;
            const paidDate = new Date(sentDate);
            paidDate.setDate(paidDate.getDate() + Number(invoiceData.dueDay))
            invoiceData.dueDate = paidDate;
            invoiceData.paidAt = paidDate;

          }

          // Create invoice with nested invoice line
          const invoice = await tx.invoice.create({
            data: invoiceData,
            include: {
              customer: true,
              invoiceLines: {
                include: {
                  product: true
                }
              }
            }
          })

          if (invoice.status === "SENT") {
            // Generate voucher and update invoice in a transaction
            const voucher = await generateVoucherNumber(businessId, VoucherType.INVOICE, tx);

            const updated = await tx.invoice.update({
              where: { id: invoice.id },
              data: { voucherId: voucher.id }
            });

            return updated;
          }

          return invoice;

        });

        if (invoice.status === "SENT") {
          await invoiceToLedgerPosting(invoice.id);
        }

        return NextResponse.json(invoice, { status: 201 })
      } catch (error: any) {
        console.error('Error creating invoice:', error)

        // If it's a duplicate invoice number, retry
        if (error.code === 'P2002' && attempt < maxRetries - 1) {
          console.log(`Duplicate invoice number, retrying... (attempt ${attempt + 1})`)
          await new Promise(resolve => setTimeout(resolve, 100))
          continue
        }

        // Other errors or max retries reached
        if (error.code === 'P2002') {
          return NextResponse.json({
            error: 'Unable to generate unique invoice number. Please try again.'
          }, { status: 409 })
        }

        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }
  } catch (error: any) {
    console.error('Error in invoice creation:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
