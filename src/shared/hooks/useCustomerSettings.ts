// hooks/useCustomerSettings.ts
import { useState, useEffect } from 'react'

interface CustomerSettings {
    showOrganizationNumber: boolean
    showAddress: boolean
    showPhoneNumber: boolean
    showEmail: boolean
    showDiscountPercentage: boolean
    showDeliveryAddress: boolean
    showDepartment: boolean
    showInvoicePaymentTerms: boolean
    showContactPerson: boolean
}

export function useCustomerSettings() {
    const [settings, setSettings] = useState<CustomerSettings>({
        showOrganizationNumber: true,
        showAddress: true,
        showPhoneNumber: true,
        showEmail: true,
        showDiscountPercentage: true,
        showDeliveryAddress: true,
        showDepartment: true,
        showInvoicePaymentTerms: true,
        showContactPerson: true
    })
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        fetchSettings()
    }, [])

    const fetchSettings = async () => {
        try {
            setLoading(true)
            setError(null)

            const res = await fetch('/api/customers/settings')

            if (!res.ok) {
                throw new Error('Failed to fetch settings')
            }

            const data = await res.json()

            setSettings({
                showOrganizationNumber: data.showOrganizationNumber ?? true,
                showAddress: data.showAddress ?? true,
                showPhoneNumber: data.showPhoneNumber ?? true,
                showEmail: data.showEmail ?? true,
                showDiscountPercentage: data.showDiscountPercentage ?? true,
                showDeliveryAddress: data.showDeliveryAddress ?? true,
                showDepartment: data.showDepartment ?? true,
                showInvoicePaymentTerms: data.showInvoicePaymentTerms ?? true,
                showContactPerson: data.showContactPerson ?? true
            })
        } catch (err) {
            console.error('Error fetching invoice settings:', err)
            setError(err instanceof Error ? err.message : 'Failed to fetch settings')
            // Keep default values on error
        } finally {
            setLoading(false)
        }
    }

    return { settings, loading, error, refetch: fetchSettings }
}