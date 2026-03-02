import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/shared/lib/prisma'
import { getCurrentUserOrEmployee } from '@/shared/lib/auth'

// GET /api/customers/[id]
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

    let businessId: string
    if (auth.type === 'user') {
      businessId = (auth.data as any).businessId
    } else {
      // For employees, get businessId from their department
      businessId = (auth.data as any).department.businessId
    }

    const customer = await prisma.customer.findFirst({
      where: {
        id: id,
        businessId: businessId
      },
      include: {
        contactPersons: true,
        InvoicePaymentTerms: true,
        projects: {
          where: { active: true },
          select: { id: true, name: true, active: true }
        },
        department: true,
        business: {
          select: {
            name: true
          }
        }

      }
    })

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    return NextResponse.json(customer)
  } catch (error) {
    console.error('Error fetching customer:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/customers/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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

    const body = await request.json()
    const { customerPaymentTerm, customerContacts, projectIds, ...restData } = body

    if (restData.discountPercentage === "" || restData.discountPercentage === null || restData.discountPercentage === undefined) {
      restData.discountPercentage = 0
    } else {
      restData.discountPercentage = Number(restData.discountPercentage)
    }

    // Check if customer exists
    const existingCustomer = await prisma.customer.findFirst({
      where: {
        id: id,
        businessId: businessId
      }
    })

    if (!existingCustomer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    // Handle InvoicePaymentTerms
    let paymentTermsId: string | null = null

    if (customerPaymentTerm) {
      // Check if payment term already exists with these exact settings
      const existingPaymentTerm = await prisma.invoicePaymentTerms.findFirst({
        where: {
          id: existingCustomer.invoicepaymentTermsId || "",
          businessId: businessId,
        }
      })

      if (existingPaymentTerm) {
        // Use existing payment term
        paymentTermsId = existingPaymentTerm.id
        console.log('Using existing payment term:', paymentTermsId)
        await prisma.invoicePaymentTerms.update({
          where: {
            id: paymentTermsId,
            businessId: businessId
          },
          data: {
            invoiceDueDateType: customerPaymentTerm.dueDateType,
            invoiceDueDateValue: customerPaymentTerm.dueDateValue,
            invoiceDueDateUnit: customerPaymentTerm.dueDateUnit,
          }
        })
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

    // Update customer with payment term ID
    const customer = await prisma.customer.update({
      where: { id: id },
      data: {
        ...restData,
        invoicepaymentTermsId: paymentTermsId,
        ...(restData.departmentId && restData.departmentId !== "" ? { departmentId: restData.departmentId } : { departmentId: null }),
        contactPersons: {
          deleteMany: {},
          create: (customerContacts || []).map((contact: any) => ({
            name: contact.name,
            phoneNumber: contact.phoneNumber,
            email: contact.email,
            isPrimary: contact.isPrimary,
          }))
        },
        projects: {
          set: projectIds?.map((id: any) => ({ id })) || []
        },
      }
    })

    return NextResponse.json(customer)

  } catch (error: any) {
    console.error('Error updating customer:', error)

    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Customer number already exists' }, { status: 409 })
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/customers/[id]
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

    const customer = await prisma.customer.findFirst({
      where: {
        id: id,
        businessId: businessId
      }
    })

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    // Delete the customer (cascade will delete functions)
    await prisma.customer.delete({
      where: { id: id }
    })

    return NextResponse.json({ message: 'Customer deleted successfully' })
  } catch (error) {
    console.error('Error deleting customer:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
