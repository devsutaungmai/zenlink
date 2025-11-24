import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/shared/lib/prisma'
import { getCurrentUserOrEmployee } from '@/shared/lib/auth'

// GET /api/project/[id]
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

        const customer = await prisma.project.findFirst({
            where: {
                id: id,
                businessId: businessId
            }
        })

        if (!customer) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 })
        }

        return NextResponse.json(customer)
    } catch (error) {
        console.error('Error fetching project:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

// PUT /api/project/[id]
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

        const existingProject = await prisma.project.findFirst({
            where: {
                id: id,
                businessId: businessId
            }
        })

        if (!existingProject) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 })
        }

        const customer = await prisma.customer.findFirst({
            where: {
                id: existingProject.customerId || "",
                businessId: businessId
            }
        })

        if (!customer) {
            return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
        }

        const departmentIdofCustomer = customer.departmentId;


        const project = await prisma.project.update({
            where: { id: id },
            data: {
                ...body, departmentId: departmentIdofCustomer,
                startDate: body.startDate ? new Date(body.startDate) : null,
                endDate: body.endDate ? new Date(body.endDate) : null
            }
        })

        return NextResponse.json(project)
    } catch (error: any) {
        console.error('Error updating project:', error)

        if (error.code === 'P2002') {
            return NextResponse.json({ error: 'Project name already exists in this department' }, { status: 409 })
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

        const project = await prisma.project.findFirst({
            where: {
                id: id,
                businessId: businessId
            }
        })

        if (!project) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 })
        }

        // Delete the customer (cascade will delete functions)
        await prisma.project.delete({
            where: { id: id }
        })

        return NextResponse.json({ message: 'Project deleted successfully' })
    } catch (error) {
        console.error('Error deleting project:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
