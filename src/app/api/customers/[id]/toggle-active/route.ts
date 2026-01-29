import { getCurrentUserOrEmployee } from "@/shared/lib/auth"
import { prisma } from "@/shared/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

// POST /api/customer/<id>/toggle-active - Change customer active status
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
        const { id, active } = formData

        const existingCustomer = await prisma.customer.findFirst({
            where: {
                id: id,
                businessId: businessId
            }
        })

        if (!existingCustomer) {
            return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
        }

        const customer = await prisma.customer.update({
            where: {
                id: id
            },
            data: { active: active }
        }
        );

        return NextResponse.json(customer, { status: 200 })
    } catch (error: any) {
        console.error('Error updating customer active:', error)
      
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}