import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/shared/lib/prisma'
import { getCurrentUserOrEmployee } from '@/shared/lib/auth'

// GET /api/ledger/accounts/[id]
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

    const ledgerAccount = await prisma.ledgerAccount.findFirst({
      where: {
        id: id,
        businessId: businessId
      }
    })

    if (!ledgerAccount) {
      return NextResponse.json({ error: 'LedgerAccount not found' }, { status: 404 })
    }

    return NextResponse.json(ledgerAccount)
  } catch (error) {
    console.error('Error fetching LedgerAccount:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/ledger/accounts/[id]
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

    const existingLedgerAccount = await prisma.ledgerAccount.findFirst({
      where: {
        id: id,
        businessId: businessId
      }
    })

    if (!existingLedgerAccount) {
      return NextResponse.json({ error: 'LedgerAccount not found' }, { status: 404 })
    }
    const { accountNumber, name, type } = body

    if (!accountNumber || !name || !type) {
      return NextResponse.json({ error: 'AccountNumber and Name and Type are required' }, { status: 400 })
    }


    const ledgerAccount = await prisma.ledgerAccount.update({
      where: { id: id },
      data: body
    })

    return NextResponse.json(ledgerAccount)
  } catch (error: any) {
    console.error('Error updating ledgerAccount:', error)

    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'LedgerAccount name already exists in this department' }, { status: 409 })
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
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

    const ledgerAccount = await prisma.ledgerAccount.findFirst({
      where: {
        id: id,
        businessId: businessId
      }
    })

    if (!ledgerAccount) {
      return NextResponse.json({ error: 'LedgerAccount not found' }, { status: 404 })
    }

    await prisma.ledgerAccount.delete({
      where: { id: id }
    })

    return NextResponse.json({ message: 'LedgerAccount deleted successfully' })
  } catch (error) {
    console.error('Error deleting ledgerAccount:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
