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
        let settings = await prisma.invoiceFormSettings.findUnique({
            where: {
                businessId:businessId
            }
        })

        // If no settings exist, create default settings
        if (!settings) {
            settings = await prisma.invoiceFormSettings.create({
                data: {
                    businessId,
                    deviceId: deviceId || null,
                    showContactPerson: true,
                    showDeliveryAddress: true,
                    showPaymentTerms: true,
                    showDepartment: true,
                    showSeller: false,
                    showDiscount: true,
                    showProject: true,
                    showNote: true
                }
            })
        }

        return NextResponse.json(settings, { status: 200 })
    } catch (error) {
        console.error('Error fetching invoice settings:', error)
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
            showContactPerson,
            showDeliveryAddress,
            showPaymentTerms,
            showDepartment,
            showDiscount,
            showProject,
            showNote
        } = body

        // Validate boolean fields
        const booleanFields = {
            showContactPerson,
            showDeliveryAddress,
            showPaymentTerms,
            showDepartment,
            showDiscount,
            showProject,
            showNote
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
        const settings = await prisma.invoiceFormSettings.upsert({
            where: {
                businessId
            },
            update: {
                showContactPerson,
                showDeliveryAddress,
                showPaymentTerms,
                showDepartment,
                showDiscount,
                showProject,
                showNote
            },
            create: {
                businessId,
                showContactPerson,
                showDeliveryAddress,
                showPaymentTerms,
                showDepartment,
                showDiscount,
                showProject,
                showNote
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