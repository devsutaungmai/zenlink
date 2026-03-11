import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/shared/lib/prisma'
import { getCurrentUserOrEmployee } from '@/shared/lib/auth'
import { calculateInvoiceTotals, generateInvoiceNumber, generateVoucherNumber, getBusinessId, invoiceToLedgerPosting } from '@/shared/lib/invoiceHelper'
import { VoucherType } from '@prisma/client'
import { InvoiceStatus } from '@/app/dashboard/invoices/page'

// GET /api/invoices/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const auth = await getCurrentUserOrEmployee()

    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const businessId = await getBusinessId()
    if (!businessId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const invoice = await prisma.invoice.findFirst({
      where: {
        id: id,
        businessId: businessId
      },
      include: {
        customer: {
          select: {
            id: true,
            customerName: true,
            contactPersons: true,
            InvoicePaymentTerms: true,
            projects: true,
            department: true,
            business: {
              select: {
                name: true
              }
            }
          }
        },
        invoiceLines: {
          select: {
            id: true,
            productId: true,
            quantity: true,
            pricePerUnit: true,
            discountPercentage: true,
            vatPercentage: true,
            productName: true,
            productNumber: true,
            isCredited: true
        }
      }
    }
    })

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    return NextResponse.json(invoice)
  } catch (error) {
    console.error('Error fetching invocie:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/invoices/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const businessId = await getBusinessId()
    if (!businessId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { id } = await params
    const invoiceId = id
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

    // Validate inputs
    if (!customerId || !invoiceLines || invoiceLines.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: customerId, invoiceLines' },
        { status: 400 }
      )
    }

    // Check if invoice exists and belongs to the business
    const existingInvoice = await prisma.invoice.findFirst({
      where: {
        id: invoiceId,
        businessId
      }
    })

    if (!existingInvoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      )
    }

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

    // Prepare invoice lines data with calculations
    let totalExclVAT = 0
    const invoiceLinesData: any = []

    for (const line of invoiceLines) {
      const { productId, quantity, pricePerUnit, discountPercentage = 0, vatPercentage } = line

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
      const vatPerc = Number(vatPercentage) || 0

      // Calculate line totals using helper function
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
        vatAmount:calculations.vatAmount,
        vatPercentage: vatPerc,
        productName: product.productName,
        productNumber: product.productNumber || ''
      })
    }

    // Calculate invoice-level VAT (after summing all lines)
    const totalVatAmount = invoiceLinesData.reduce((total: any, line: any)=> total + line.vatAmount,0)
    const totalInclVAT = totalExclVAT + totalVatAmount  // Correct calculation
    const isTransitioningToSent =
      existingInvoice.status === InvoiceStatus.DRAFT &&
      status === InvoiceStatus.SENT

    // Update invoice with transaction (delete old lines, create new ones)
    const invoice = await prisma.$transaction(async (tx) => {
      // Delete all existing invoice lines
      await tx.invoiceLine.deleteMany({
        where: { invoiceId: invoiceId }
      })
      const invoiceData: any = {
        customerId,
        totalExclVAT,
        totalVatAmount: totalVatAmount,
        totalInclVAT,
        notes,
        status: status,
        sentAt: new Date(sentAt) ?? new Date(),
        dueDay: dueDay ?? 14,

        // Create new invoice lines
        invoiceLines: {
          create: invoiceLinesData
        }
      }
      if (isTransitioningToSent) {
        const { year, sequence, invoiceNumber } = await generateInvoiceNumber(businessId, tx)
        invoiceData.invoiceNumber = invoiceNumber
        invoiceData.year = year
        invoiceData.sequence = sequence
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

      // Update invoice with new data and create new lines
      const updatedInvoice = await tx.invoice.update({
        where: { id: invoiceId },
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
      if (isTransitioningToSent) {
        const voucher = await generateVoucherNumber(businessId, VoucherType.INVOICE, tx)
        await tx.invoice.update({
          where: { id: updatedInvoice.id },
          data: { voucherId: voucher.id }
        })
      }
      return updatedInvoice
    })

    if (isTransitioningToSent) {
      await invoiceToLedgerPosting(invoice.id);
    }

    return NextResponse.json(invoice)
  } catch (error) {
    console.error('Error updating invoice:', error)
    return NextResponse.json(
      { error: 'Failed to update invoice', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// DELETE /api/products/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  
  // Check if it's a bulk delete request
  if (id === 'bulk') {
    try {
      const body = await request.json()
      const { ids } = body

      console.log('Received IDs for deletion:', ids)
      
      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return NextResponse.json(
          { error: 'Invoice IDs are required' },
          { status: 400 }
        )
      }

      const auth = await getCurrentUserOrEmployee()
      if (!auth) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      const businessId = await getBusinessId()
      if (!businessId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      // Delete multiple invoices
      for (const invoiceId of ids) {
        const invoice = await prisma.invoice.findFirst({
          where: {
            id: invoiceId,
            businessId: businessId
          }
        })

        if (!invoice) {
          continue // Skip not found
        }

        if (invoice.status !== 'DRAFT') {
          continue // Skip non-draft
        }

        await prisma.invoice.delete({
          where: { id: invoice.id }
        })
      }

      return NextResponse.json({ message: 'Invoices deleted successfully' })
    } catch (error) {
      console.error('Error in bulk delete:', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  }

  // Single delete logic (your existing code)
  try {
    const auth = await getCurrentUserOrEmployee()
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const businessId = await getBusinessId()
    if (!businessId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const invoice = await prisma.invoice.findFirst({
      where: {
        id: id,
        businessId: businessId
      }
    })

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    await prisma.invoice.delete({
      where: { id: id }
    })

    return NextResponse.json({ message: 'Invoice deleted successfully' })
  } catch (error) {
    console.error('Error deleting invoice:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
