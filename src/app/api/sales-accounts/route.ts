import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/shared/lib/prisma'
import { getCurrentUserOrEmployee } from '@/shared/lib/auth'

// GET /api/categories - Get all categories for the business
export async function GET(request: NextRequest) {
  try {
    const auth = await getCurrentUserOrEmployee()

    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const raw = await prisma.salesAccount.findMany({
      include: { ledgerAccount: { select: { accountNumber: true } } },
      orderBy: { accountName: 'asc' }
    })

    const categories = raw.map(sa => {
      const ledgerAccountNumber = sa.ledgerAccount?.accountNumber ?? sa.accountNumber
      const { ledgerAccount, ...rest } = sa
      return { ...rest, accountNumber: ledgerAccountNumber }
    })
    return NextResponse.json(categories)
  } catch (error) {
    console.error('Error fetching categories:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}