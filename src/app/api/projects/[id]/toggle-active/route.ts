import { getCurrentUserOrEmployee } from "@/shared/lib/auth"
import { prisma } from "@/shared/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

// POST /api/projects/<id>/toggle-active - Change project active status
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

        const existingProduct = await prisma.project.findFirst({
            where: {
                id: id,
                businessId: businessId
            }
        })

        if (!existingProduct) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 })
        }

        const product = await prisma.project.update({
            where: {
                id: id
            },
            data: { active: active }
        }
        );

        return NextResponse.json(product, { status: 200 })
    } catch (error: any) {
        console.error('Error updating project active:', error)
      
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}