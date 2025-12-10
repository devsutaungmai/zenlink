import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/shared/lib/prisma'
import { getCurrentUserOrEmployee, requireAuth } from '@/shared/lib/auth'

// GET /api/categories - Get all categories for the business
export async function GET(request: NextRequest) {
  try {
    const auth = await getCurrentUserOrEmployee()

    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    let businessId: string
    if (auth.type === 'user') {
      businessId = (auth.data as any).businessId
    } else {
      // For employees, get businessId from their department
      businessId = (auth.data as any).department.businessId
    }

    const categories = await prisma.customer.findMany({
      where: {
        businessId: businessId
      },
      orderBy: {
        customerName: 'asc',
      }
    })

    return NextResponse.json(categories)
  } catch (error) {
    console.error('Error fetching categories:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/customers - Create a new customer
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const auth = await getCurrentUserOrEmployee()

    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let businessId: string

    if (auth.type === 'user') {
      businessId = (auth.data as any).businessId
    } else {
      const employeeData = auth.data as any
      if (!employeeData.department || !employeeData.department.businessId) {
        return NextResponse.json({ error: 'Employee department not found' }, { status: 404 })
      }
      businessId = employeeData.department.businessId
    }

    if (!businessId) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    const formData = await request.json()
    const { customerName, customerNumber, customerPaymentTerm, customerContacts, ...restData } = formData

    console.log('Creating customer with data:', JSON.stringify(formData))

    if (!customerName || !customerNumber) {
      return NextResponse.json({ error: 'CustomerName and CustomerNumber are required' }, { status: 400 })
    }
    if (restData.discountPercentage === "" || restData.discountPercentage === null || restData.discountPercentage === undefined) {
      restData.discountPercentage = 0
    } else {
      restData.discountPercentage = Number(restData.discountPercentage)
    }

    // Handle InvoicePaymentTerms
    let paymentTermsId: string | null = null

    if (customerPaymentTerm) {
      // Check if payment term already exists with these exact settings
      const existingPaymentTerm = await prisma.invoicePaymentTerms.findFirst({
        where: {
          businessId: businessId,
          invoiceDueDateType: customerPaymentTerm.dueDateType,
          invoiceDueDateValue: customerPaymentTerm.dueDateValue,
          invoiceDueDateUnit: customerPaymentTerm.dueDateUnit,
        }
      })

      if (existingPaymentTerm) {
        // Use existing payment term
        paymentTermsId = existingPaymentTerm.id
        console.log('Using existing payment term:', paymentTermsId)
      } else {
        // Create new payment term
        const newPaymentTerm = await prisma.invoicePaymentTerms.create({
          data: {
            businessId: businessId,
            invoiceDueDateType: customerPaymentTerm.dueDateType,
            invoiceDueDateValue: customerPaymentTerm.dueDateValue,
            invoiceDueDateUnit: customerPaymentTerm.dueDateUnit,
          }
        })
        paymentTermsId = newPaymentTerm.id
        console.log('Created new payment term:', paymentTermsId)
      }
    }

    // Create customer with payment term ID
    const customer = await prisma.customer.create({
      data: {
        ...restData,
        discountPercentage:
          !restData.discountPercentage ? 0 : Number(restData.discountPercentage),
        customerName,
        customerNumber,
        businessId,
        invoicepaymentTermsId: paymentTermsId,
        contactPersons: {
          create: customerContacts || []
        }
      }
    })

    return NextResponse.json(customer, { status: 201 })

  } catch (error: any) {
    console.error('Error creating customer:', error)

    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Customer number already exists' }, { status: 409 })
    }

    return NextResponse.json({
      message: error.message,
      stack: error.stack,
      code: error.code,
      meta: error.meta,
    },
      { status: 500 })
  }
}
