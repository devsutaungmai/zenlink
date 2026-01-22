import { getCurrentUserOrEmployee } from "@/shared/lib/auth"
import { prisma } from "@/shared/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

// POST /api/products/<id>/toggle-active - Change product active status
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

        console.log('Creating product with data:', JSON.stringify(formData))


        const existingProduct = await prisma.product.findFirst({
            where: {
                id: id,
                businessId: businessId
            }
        })

        if (!existingProduct) {
            return NextResponse.json({ error: 'Product not found' }, { status: 404 })
        }

        const product = await prisma.product.update({
            where: {
                id: id
            },
            data: { active: active }
        }
        );

        return NextResponse.json(product, { status: 201 })
    } catch (error: any) {
        console.error('Error creating product:', error)
        if (error.code === 'P2002') {
            const target = error.meta?.target
            const targets = Array.isArray(target) ? target.map(String).join(',').toLowerCase() : String(target || '').toLowerCase()

            if (targets.includes('productnumber') || targets.includes('product_number')) {
                return NextResponse.json({ error: 'Product number already exists!' }, { status: 409 })
            }
            if (targets.includes('productname') || targets.includes('product_name')) {
                return NextResponse.json({ error: 'Product name already exists!' }, { status: 409 })
            }

            return NextResponse.json({ error: 'Unique constraint failed' }, { status: 409 })
        }

        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}