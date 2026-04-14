import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/shared/lib/prisma'
import { getCurrentUserOrEmployee } from '@/shared/lib/auth'
import { de, se } from 'date-fns/locale'

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

    const products = await prisma.product.findMany({
      where: {
        businessId: businessId,
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
      orderBy: {
        productName: 'asc'
      }
    })

    return NextResponse.json(products)
  } catch (error) {
    console.error('Error fetching products:', error)
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
    const { productNumber, productName, unitId, productGroupId, sequence, year, defaultProductNumber,...restData } = formData

    console.log('Creating product with data:', JSON.stringify(formData))

    if (!productNumber || !defaultProductNumber) {
      return NextResponse.json({ error: 'ProductNumber and DefaultProductNumber are required' }, { status: 400 })
    }
    if (!productName) {
      return NextResponse.json({ error: 'ProductName is required' }, { status: 400 })
    }
    const refinedUnitId =
      typeof unitId === "string" && unitId.trim() !== "" ? unitId : null;

    const refinedProductGroupId =
      typeof productGroupId === "string" && productGroupId.trim() !== ""
        ? productGroupId
        : null;

    const productData = {
      ...restData,
      productName,
      productNumber: defaultProductNumber,
      businessId,
      year: year || new Date().getFullYear(),
      sequence: sequence || 0,
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
