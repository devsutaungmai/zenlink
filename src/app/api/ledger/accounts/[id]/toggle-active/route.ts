import { getCurrentUserOrEmployee } from "@/shared/lib/auth"
import { prisma } from "@/shared/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

// POST /api/ledger/accounts/<id>/toggle-active - Change ledger account active status
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
        const { id, isActive } = formData

        const existingLedgerAccount = await prisma.ledgerAccount.findFirst({
            where: {
                id: id,
            }
        })

        if (!existingLedgerAccount) {
            return NextResponse.json({ error: 'Ledger Account not found' }, { status: 404 })
        }

        const ledgerAccount = await prisma.ledgerAccount.update({
            where: {
                id: id
            },
            data: { isActive: isActive }
        }
        );

        return NextResponse.json(ledgerAccount, { status: 200 })
    } catch (error: any) {
        console.error('Error updating ledger account active:', error)
      
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}