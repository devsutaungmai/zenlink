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
    showProject: boolean
    showInvoicePaymentTerms: boolean
    showContactPerson: boolean
}

export function useCustomerSettings() {
    const [settings, setSettings] = useState<CustomerSettings>({
        showOrganizationNumber: false,
        showAddress: false,
        showPhoneNumber: false,
        showEmail: false,
        showDiscountPercentage: false,
        showDeliveryAddress: false,
        showDepartment: false,
        showProject: false,
        showInvoicePaymentTerms: false,
        showContactPerson: false
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
                showOrganizationNumber: data.showOrganizationNumber ?? false,
                showAddress: data.showAddress ?? false,
                showPhoneNumber: data.showPhoneNumber ?? false,
                showEmail: data.showEmail ?? false,
                showDiscountPercentage: data.showDiscountPercentage ?? false,
                showDeliveryAddress: data.showDeliveryAddress ?? false,
                showDepartment: data.showDepartment ?? false,
                showProject: data.showProject ?? false,
                showInvoicePaymentTerms: data.showInvoicePaymentTerms ?? false,
                showContactPerson: data.showContactPerson ?? false
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