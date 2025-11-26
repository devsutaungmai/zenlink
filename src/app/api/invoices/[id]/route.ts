import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/shared/lib/prisma'
import { getCurrentUserOrEmployee } from '@/shared/lib/auth'
import { calculateInvoiceTotals, getBusinessId, invoiceToLedgerPosting } from '@/shared/lib/invoiceHelper'

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
            productId: true,
            quantity: true,
            pricePerUnit: true,
            discountPercentage: true,
            product: {
              select: {
                id: true,
                productName: true
              }
            }
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
    if (!customerId || !invoiceLines.length) {
      return NextResponse.json(
        { error: 'Missing required fields: customerId and at least one product' },
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
      const { productId, quantity, pricePerUnit, discountPercentage = 0 } = line

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

      // Calculate line totals using helper function
      const calculations = calculateInvoiceTotals(
        quantity,
        pricePerUnit,
        discountPercentage
      )

      totalExclVAT += calculations.totalExclVAT

      invoiceLinesData.push({
        productId,
        quantity,
        pricePerUnit,
        discountPercentage,
        subtotal: calculations.subtotal,
        discountAmount: calculations.discountAmount,
        lineTotal: calculations.totalExclVAT,
        productName: product.productName,
        productNumber: product.productNumber || ''
      })
    }

    // Calculate invoice-level VAT (after summing all lines)
    const vatPercentage = 25
    const vatAmount = Math.round(totalExclVAT * (vatPercentage / 100) * 100) / 100
    const totalInclVAT = Math.round((totalExclVAT + vatAmount) * 100) / 100

    // Update invoice with transaction (delete old lines, create new ones)
    const invoice = await prisma.$transaction(async (tx) => {
      // Delete all existing invoice lines
      await tx.invoiceLine.deleteMany({
        where: { invoiceId: invoiceId }
      })

      // Update invoice with new data and create new lines
      return await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          customerId,
          contactPersonId,
          projectId,
          departmentId,
          deliveryAddress,
          totalExclVAT,
          vatPercentage,
          vatAmount,
          totalInclVAT,
          dueDate: paidAt ? new Date(paidAt) : null,
          notes,
          status: status,
          sentAt: sentAt ? new Date(sentAt) : null,
          paidAt: paidAt ? new Date(paidAt) : null,
          dueDay,

          // Create new invoice lines
          invoiceLines: {
            create: invoiceLinesData
          }
        },
        include: {
          customer: true,
          invoiceLines: {
            include: {
              product: true
            }
          }
        }
      })
    })

    if(invoice.status === "SENT"){
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
      }
    })

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    // Delete the invoice (cascade will delete functions)
    await prisma.invoice.delete({
      where: { id: id }
    })

    return NextResponse.json({ message: 'Invoice deleted successfully' })
  } catch (error) {
    console.error('Error deleting invoice:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
