import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/shared/lib/prisma'
import { getCurrentUserOrEmployee } from '@/shared/lib/auth'

// GET /api/products - Get all products for the business
export async function GET(request: NextRequest) {
  try {
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

    const categories = await prisma.product.findMany({
      where: {
        businessId: businessId
      },
      orderBy: {
        productName: 'asc'
      }
    })

    return NextResponse.json(categories)
  } catch (error) {
    console.error('Error fetching categories:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/products - Create a new product
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
    const { productNumber, productName, unitId, productGroupId } = formData

    console.log('Creating product with data:', JSON.stringify(formData))

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
      ...formData,
      businessId,

      unitId: refinedUnitId,
      productGroupId: refinedProductGroupId,
    };


    const product = await prisma.product.create({
      data: productData
    })

    return NextResponse.json(product, { status: 201 })
  } catch (error: any) {
    console.error('Error creating product:', error)

    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Product name already exists' }, { status: 409 })
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
