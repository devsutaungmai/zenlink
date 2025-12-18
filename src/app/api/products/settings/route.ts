// app/api/invoices/settings/route.ts
import { getCurrentUserOrEmployee } from '@/shared/lib/auth'
import { getBusinessId } from '@/shared/lib/invoiceHelper'
import { prisma } from '@/shared/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'


export async function GET(req: NextRequest) {
    try {
        const auth = await getCurrentUserOrEmployee()

        if (!auth) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
        const businessId = await getBusinessId()
        if (!businessId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Optional: Get deviceId from query params or headers
        const searchParams = req.nextUrl.searchParams
        const deviceId = searchParams.get('deviceId') || null

        // Find existing settings
        let settings = await prisma.productFormSettings.findUnique({
            where: {
                businessId: businessId
            }
        })

        // If no settings exist, create default settings
        if (!settings) {
            settings = await prisma.productFormSettings.create({
                data: {
                    businessId,
                    deviceId: deviceId || null,
                    showSalesPrice: true,
                    showCostPrice: true,
                    showDiscountPercentage: true,
                    showUnit: true,
                    showProductGroup: true
                }
            })
        }

        return NextResponse.json(settings, { status: 200 })
    } catch (error) {
        console.error('Error fetching product settings:', error)
        return NextResponse.json(
            { error: 'Failed to fetch settings' },
            { status: 500 }
        )
    }
}

export async function POST(req: NextRequest) {
    try {
        const auth = await getCurrentUserOrEmployee()

        if (!auth) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
        const businessId = await getBusinessId()
        if (!businessId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await req.json()

        const {
            showSalesPrice,
            showCostPrice,
            showDiscountPercentage,
            showUnit,
            showProductGroup
        } = body

        // Validate boolean fields
        const booleanFields = {
            showSalesPrice,
            showCostPrice,
            showDiscountPercentage,
            showUnit,
            showProductGroup
        }

        for (const [key, value] of Object.entries(booleanFields)) {
            if (typeof value !== 'boolean') {
                return NextResponse.json(
                    { error: `${key} must be a boolean` },
                    { status: 400 }
                )
            }
        }

        // Upsert settings (update if exists, create if not)
        const settings = await prisma.productFormSettings.upsert({
            where: {
                businessId
            },
            update: {
                showSalesPrice,
                showCostPrice,
                showDiscountPercentage,
                showUnit,
                showProductGroup
            },
            create: {
                businessId,
                showSalesPrice,
                showCostPrice,
                showDiscountPercentage,
                showUnit,
                showProductGroup
            }
        })

        return NextResponse.json(settings, { status: 200 })
    } catch (error) {
        console.error('Error saving invoice settings:', error)
        return NextResponse.json(
            { error: 'Failed to save settings' },
            { status: 500 }
        )
    }
}