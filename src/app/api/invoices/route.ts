import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/shared/lib/prisma'
import { getCurrentUserOrEmployee, requireAuth } from '@/shared/lib/auth'
import { calculateInvoiceTotals, generateInvoiceNumber, getBusinessId, invoiceToLedgerPosting } from '@/shared/lib/invoiceHelper'

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
          select:{
            id: true,
            name: true
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

    // Validate inputs
    if (!customerId || !invoiceLines.length) {
      return NextResponse.json(
        { error: 'Missing required fields: customerId,orderLine' },
        { status: 400 }
      )
    }
    let invoiceLinesData = [];
    let totalExclVAT = 0

    for (const line of invoiceLines) {

      const {productId,quantity,pricePerUnit,discountPercentage}= line;
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
      // Calculate totals
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

    const invoiceNumber = await generateInvoiceNumber();
    
    console.log('Creating invoice with number:', invoiceNumber);

    
    // Create invoice with nested invoice line
    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber: invoiceNumber,
        customerId,
        businessId,
        contactPersonId,
        projectId,
        departmentId,
        deliveryAddress,

        // Invoice totals
        totalExclVAT: totalExclVAT,
        vatPercentage: 25,
        vatAmount: vatAmount,
        totalInclVAT: totalInclVAT,

        dueDate: paidAt ? new Date(paidAt) : null,
        notes,
        status: status,
        sentAt: sentAt ? new Date(sentAt) : null,
        paidAt: paidAt ? new Date(paidAt) : null,
        dueDay,


        // Create invoice line with product
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

    if(invoice.status === "SENT"){
      await invoiceToLedgerPosting(invoice.id);
    }

    return NextResponse.json(invoice, { status: 201 })
  } catch (error: any) {
    console.error('Error creating invoice:', error)

    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Invoice already exists in this department' }, { status: 409 })
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
