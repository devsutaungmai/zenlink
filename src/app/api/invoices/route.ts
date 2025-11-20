import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/shared/lib/prisma'
import { getCurrentUserOrEmployee, requireAuth } from '@/shared/lib/auth'
import { calculateInvoiceTotals, generateInvoiceNumber, getBusinessId } from '@/shared/lib/invoiceHelper'

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
      productId,
      contactPersonId,
      projectId,
      departmentId,
      deliveryAddress,
      quantity,
      pricePerUnit,
      discountPercentage = 0,
      notes,
      sentAt,
      paidAt,
      dueDay,

    } = body

    // Validate inputs
    if (!customerId || !productId || !quantity || !pricePerUnit) {
      return NextResponse.json(
        { error: 'Missing required fields: customerId, productId, quantity, pricePerUnit' },
        { status: 400 }
      )
    }

    // Get product details for snapshot
    const product = await prisma.product.findUnique({
      where: { id: productId }
    })

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
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

    // Calculate totals
    const calculations = calculateInvoiceTotals(
      quantity,
      pricePerUnit,
      discountPercentage
    )
    // Create invoice with nested invoice line
    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber: generateInvoiceNumber(businessId),
        customerId,
        businessId,
        contactPersonId,
        projectId,
        departmentId,
        deliveryAddress,

        // Invoice totals
        totalExclVAT: calculations.totalExclVAT,
        vatPercentage: 25,
        vatAmount: calculations.vatAmount,
        totalInclVAT: calculations.totalInclVAT,

        dueDate: paidAt ? new Date(paidAt) : null,
        notes,
        status: 'DRAFT',
        sentAt: sentAt ? new Date(sentAt) : null,
        paidAt: paidAt ? new Date(paidAt) : null,
        dueDay,


        // Create invoice line with product
        invoiceLines: {
          create: {
            productId,
            quantity,
            pricePerUnit,
            discountPercentage,

            // Calculated fields
            subtotal: calculations.subtotal,
            discountAmount: calculations.discountAmount,
            lineTotal: calculations.totalExclVAT,

            // Product snapshot
            productName: product.productName,
            productNumber: product.productNumber || ''
          }
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

    return NextResponse.json(invoice, { status: 201 })
  } catch (error: any) {
    console.error('Error creating invoice:', error)

    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Invoice already exists in this department' }, { status: 409 })
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
