// app/api/ledger/accounts/route.ts
import { getCurrentUserOrEmployee } from '@/shared/lib/auth';
import { generateLedgerReport, getBusinessId } from '@/shared/lib/invoiceHelper';
import { prisma } from '@/shared/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

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
    const ledgerAccounts = await prisma.ledgerAccount.findMany({
      where: {
        OR: [
          { businessId: null },
          { businessId: businessId }
        ]
      },
      orderBy: {
        accountNumber: 'asc',
      },
    })
    console.log(JSON.stringify(ledgerAccounts));
    return NextResponse.json(ledgerAccounts)
  } catch (error) {
    console.error('Error fetching ledgerAccounts:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/ledger/accounts - Create a new ledgerAccount
export async function POST(request: NextRequest) {
  try {
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
    const { accountNumber, name, type } = formData

    console.log('Creating ledgerAccount with data:', JSON.stringify(formData))

    if (!accountNumber || !name || !type ) {
      return NextResponse.json({ error: 'AccountNumber and Name and Type are required' }, { status: 400 })
    }

    const product = await prisma.ledgerAccount.create({
      data: { ...formData, businessId }
    })

    return NextResponse.json(product, { status: 201 })
  } catch (error: any) {
    console.error('Error creating ledgerAccount:', error)

    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'ledgerAccount already exists' }, { status: 409 })
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}