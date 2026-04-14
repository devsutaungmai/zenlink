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
            email: true,
            deliveryAddress: true,
            discountPercentage: true,
            business: {
              select: {
                id: true,
                name: true
              },
            },
          },
        },

        project: {
          select: {
            id: true,
            name: true
          }
        },
        department: {
          select: {
            id: true,
            name: true
          }
        },
        paymentAllocations: {
          select: {
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
// POST /api/invoices - Create a new invoice
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

    const isDraft = status === 'DRAFT'
    const hasLines = Array.isArray(invoiceLines) && invoiceLines.length > 0

    if (isDraft && !customerId) {
      return NextResponse.json({ message: 'Nothing to save.' }, { status: 200 })
    }

    if (!isDraft) {
      if (!customerId) {
        return NextResponse.json({ error: 'Customer is required!' }, { status: 400 })
      }
      if (!hasLines) {
        return NextResponse.json(
          { error: 'At least one invoice line is required to send an invoice.' },
          { status: 400 }
        )
      }
    }

    const validLines = hasLines
      ? invoiceLines.filter((l: any) => l.productId && l.quantity && l.pricePerUnit)
      : []

    const maxRetries = 3

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // ── Prepare line data BEFORE the transaction ──────────────────────────
        // Fetching products and calculating totals outside the transaction
        // reduces the time spent inside it significantly.
        let invoiceLinesData: any[] = []
        let totalExclVAT = 0

        for (const line of validLines) {
          const { productId, quantity, pricePerUnit, discountPercentage = 0, vatPercentage } = line

          const product = await prisma.product.findFirst({
            where: { id: productId, businessId }
          })
          if (!product) {
            return NextResponse.json({ error: `Product not found: ${productId}` }, { status: 404 })
          }

          const qty = Number(quantity)
          const price = Number(pricePerUnit)
          const discount = Number(discountPercentage) || 0
          const vatPerc = Number(vatPercentage)
          const calculations = calculateInvoiceTotals(qty, price, discount, vatPerc)

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
            productNumber: product.productNumber || '',
          })
        }

        const totalVatAmount = invoiceLinesData.reduce((total, line) => total + line.vatAmount, 0)
        const totalInclVAT = totalExclVAT + totalVatAmount

        const customer = await prisma.customer.findUnique({ where: { id: customerId } })
        if (!customer) {
          return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
        }

        // ── Transaction: ONLY invoice number generation + invoice creation ────
        // Voucher generation is moved OUTSIDE — it doesn't need to be atomic
        // with the invoice, and it was the main cause of timeout.
        const invoice = await prisma.$transaction(async (tx) => {
          const currentYear = new Date().getFullYear()
          let sequenceNumber: number
          let forYear: number
          let forInvoiceNumber: string

          if (status === InvoiceStatus.SENT) {
            const { year, sequence, invoiceNumber } = await generateInvoiceNumber(businessId, tx)
            sequenceNumber = sequence
            forYear = year
            forInvoiceNumber = invoiceNumber
          } else {
            sequenceNumber = -Math.floor(Math.random() * 1000000)
            forYear = currentYear
            forInvoiceNumber = `DRAFT-${currentYear}-${Date.now()}`
          }

          const invoiceData: any = {
            invoiceNumber: forInvoiceNumber,
            year: forYear,
            sequence: sequenceNumber,
            customerId,
            businessId,
            totalExclVAT,
            totalVatAmount,
            totalInclVAT,
            notes,
            status,
            sentAt: new Date(sentAt) ?? new Date(),
            dueDay: dueDay ?? 14,
            invoiceLines: { create: invoiceLinesData },
          }

          if (contactPersonId?.trim()) invoiceData.contactPersonId = contactPersonId
          if (projectId?.trim()) invoiceData.projectId = projectId
          if (departmentId?.trim()) invoiceData.departmentId = departmentId
          if (deliveryAddress?.trim()) invoiceData.deliveryAddress = deliveryAddress

          if (paidAt?.trim()) {
            invoiceData.dueDate = new Date(paidAt)
            invoiceData.paidAt = new Date(paidAt)
          } else {
            const paidDate = new Date(invoiceData.sentAt)
            paidDate.setDate(paidDate.getDate() + Number(invoiceData.dueDay))
            invoiceData.dueDate = paidDate
            invoiceData.paidAt = paidDate
          }

          return await tx.invoice.create({
            data: invoiceData,
            include: {
              customer: true,
              invoiceLines: { include: { product: true } },
            },
          })
        }, {
          timeout: 15000, // raise limit to 15s as a safety net
        })

        // ── Voucher + ledger OUTSIDE the transaction ──────────────────────────
        // These don't need to be atomic with invoice creation.
        // If they fail, the invoice is still valid — just retry voucher assignment.
        if (invoice.status === 'SENT') {
          try {
            const voucher = await generateVoucherNumber(businessId, VoucherType.INVOICE)
            await prisma.invoice.update({
              where: { id: invoice.id },
              data: { voucherId: voucher.id },
            })
          } catch (voucherError) {
            console.error('Voucher generation failed (non-fatal):', voucherError)
            // Invoice is still valid without voucher — log and continue
          }

          try {
            await invoiceToLedgerPosting(invoice.id)
          } catch (ledgerError) {
            console.error('Ledger posting failed (non-fatal):', ledgerError)
          }
        }

        return NextResponse.json(invoice, { status: 201 })

      } catch (error: any) {
        console.error('Error creating invoice:', error)

        if (error.code === 'P2002' && attempt < maxRetries - 1) {
          console.log(`Duplicate invoice number, retrying... (attempt ${attempt + 1})`)
          await new Promise(resolve => setTimeout(resolve, 100))
          continue
        }

        if (error.code === 'P2002') {
          return NextResponse.json(
            { error: 'Unable to generate unique invoice number. Please try again.' },
            { status: 409 }
          )
        }

        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }
  } catch (error: any) {
    console.error('Error in invoice creation:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
