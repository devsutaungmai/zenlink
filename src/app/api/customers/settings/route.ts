// app/api/customers/settings/route.ts
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
        let settings = await prisma.customerFormSettings.findUnique({
            where: {
                businessId: businessId
            }
        })

        // If no settings exist, create default settings
        if (!settings) {
            settings = await prisma.customerFormSettings.create({
                data: {
                    businessId,
                    deviceId: deviceId || null,
                    showOrganizationNumber: true,
                    showAddress: true,
                    showPostalCode: true,
                    showPostalAddress: true,
                    showPhoneNumber: true,
                    showEmail: true,
                    showDiscountPercentage: true,
                    showDeliveryAddress: true,
                    showDeliveryAddressPostalCode: true,
                    showDeliveryAddressPostalAddress: true,
                    showDepartment: true,
                    showProject: true,
                    showInvoicePaymentTerms: true,
                    showContactPerson: true
                }
            })
        }

        return NextResponse.json(settings, { status: 200 })
    } catch (error) {
        console.error('Error fetching customer settings:', error)
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
            showOrganizationNumber,
            showAddress,
            showPostalCode,
            showPostalAddress,
            showPhoneNumber,
            showEmail,
            showDiscountPercentage,
            showDeliveryAddress,
            showDeliveryAddressPostalCode,
            showDeliveryAddressPostalAddress,
            showDepartment,
            showProject,
            showInvoicePaymentTerms,
            showContactPerson
        } = body

        const booleanFields = {
            showOrganizationNumber,
            showAddress,
            showPostalCode,
            showPostalAddress,
            showPhoneNumber,
            showEmail,
            showDiscountPercentage,
            showDeliveryAddress,
            showDeliveryAddressPostalCode,
            showDeliveryAddressPostalAddress,
            showDepartment,
            showProject,
            showInvoicePaymentTerms,
            showContactPerson
        }

        for (const [key, value] of Object.entries(booleanFields)) {
            if (typeof value !== 'boolean') {
                return NextResponse.json(
                    { error: `${key} must be a boolean` },
                    { status: 400 }
                )
            }
        }

        const settings = await prisma.customerFormSettings.upsert({
            where: { businessId },
            update: {
                showOrganizationNumber,
                showAddress,
                showPostalCode,
                showPostalAddress,
                showPhoneNumber,
                showEmail,
                showDiscountPercentage,
                showDeliveryAddress,
                showDeliveryAddressPostalCode,
                showDeliveryAddressPostalAddress,
                showDepartment,
                showProject,
                showInvoicePaymentTerms,
                showContactPerson
            },
            create: {
                businessId,
                showOrganizationNumber,
                showAddress,
                showPostalCode,
                showPostalAddress,
                showPhoneNumber,
                showEmail,
                showDiscountPercentage,
                showDeliveryAddress,
                showDeliveryAddressPostalCode,
                showDeliveryAddressPostalAddress,
                showDepartment,
                showProject,
                showInvoicePaymentTerms,
                showContactPerson
            }
        })

        return NextResponse.json(settings, { status: 200 })
    } catch (error) {
        console.error('Error saving customer settings:', error)
        return NextResponse.json(
            { error: 'Failed to save settings' },
            { status: 500 }
        )
    }
}