import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/shared/lib/prisma'
import { getCurrentUserOrEmployee } from '@/shared/lib/auth'

// GET /api/products/[id]
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

    const product = await prisma.product.findFirst({
      where: {
        id: id,
        businessId: businessId
      },
       include: {
        unit:{
          select: {
            id: true,
            name: true,
            symbol: true
          }
        },
        ledgerAccount: {
          select: {
            id: true,
            name: true,
            accountNumber: true,
            businessId: true,
            vatCode: { select: { code: true, rate: true } },
            businessVatCodes: {
              where: { businessId },
              include: { vatCode: { select: { name: true, rate: true } } }
            }
          }
        }
      },
    })

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    return NextResponse.json(product)
  } catch (error) {
    console.error('Error fetching product:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/products/[id]
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

    const existingProduct = await prisma.product.findFirst({
      where: {
        id: id,
        businessId: businessId
      }
    })

    if (!existingProduct) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }
    const { productNumber, productName, unitId, productGroupId } = body

    if (!productNumber || !productName) {
      return NextResponse.json({ error: 'ProductName and ProductNumber are required' }, { status: 400 })
    }

    const refinedUnitId =
      typeof unitId === "string" && unitId.trim() !== "" ? unitId : null;

    const refinedProductGroupId =
      typeof productGroupId === "string" && productGroupId.trim() !== ""
        ? productGroupId
        : null;

    const productData = {
      ...body,
      businessId,

      unitId: refinedUnitId,
      productGroupId: refinedProductGroupId,
    };


    const product = await prisma.product.update({
      where: { id: id },
      data: productData
    })

    return NextResponse.json(product)
  } catch (error: any) {
    console.error('Error updating product:', error)

    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Product name already exists in this department' }, { status: 409 })
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

    const product = await prisma.product.findFirst({
      where: {
        id: id,
        businessId: businessId
      }
    })

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    // Delete the product (cascade will delete functions)
    await prisma.product.delete({
      where: { id: id }
    })

    return NextResponse.json({ message: 'Product deleted successfully' })
  } catch (error: any) {
    console.error('Error deleting product:', error)
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
