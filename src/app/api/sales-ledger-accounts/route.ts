import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/shared/lib/prisma'
import { getCurrentUserOrEmployee } from '@/shared/lib/auth'
import { AccountType } from '@prisma/client'
import { getBusinessId } from '@/shared/lib/invoiceHelper'

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
      accountNumber: {
        gte: 3000,
        lt: 4000
      },
      OR: [
          { businessId },          // same business
          { businessId: null },    // global/shared account
        ],
      },
      include:{
        vatCode: {
          select: {
            name: true,
            rate: true
          }
        },
        businessVatCodes: {
          where:{businessId},
          include:{vatCode: {select:{name: true,rate: true}}}
        }
      },
      orderBy: { accountNumber: 'asc' }
    })
    return NextResponse.json(ledgerAccounts, { status: 200 })
  } catch (error) {
    console.error('Error fetching categories:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}