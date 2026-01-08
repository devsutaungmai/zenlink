import { getCurrentUserOrEmployee } from "@/shared/lib/auth"
import { prisma } from "@/shared/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

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

    const inUse = await prisma.ledgerEntry.findFirst({
        where: {
            businessId,
            OR: [{ debitAccountId: id }, { creditAccountId: id }]
        }, 
        select: { id: true }
    })

    const ledgerAccountInUse = inUse ? true : false

    return NextResponse.json({ inUse: ledgerAccountInUse })
  } catch (error) {
    console.error('Error fetching LedgerAccount:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}