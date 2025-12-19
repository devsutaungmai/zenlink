// hooks/useInvoiceSettings.ts
import { useState, useEffect } from 'react'

interface InvoiceSettings {
  showContactPerson: boolean
  showDeliveryAddress: boolean
  showPaymentTerms: boolean
  showDepartment: boolean
  showSeller: boolean
  showDiscount: boolean
  showProject: boolean
  showNote:boolean
}

export function useInvoiceSettings() {
  const [settings, setSettings] = useState<InvoiceSettings>({
    showContactPerson: true,
    showDeliveryAddress: true,
    showPaymentTerms: true,
    showDepartment: true,
    showSeller: true,
    showDiscount: true,
    showProject: true,
    showNote: true
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
      
      const res = await fetch('/api/invoices/settings')
      
      if (!res.ok) {
        throw new Error('Failed to fetch settings')
      }

      const data = await res.json()
      
      setSettings({
        showContactPerson: data.showContactPerson,
        showDeliveryAddress: data.showDeliveryAddress,
        showPaymentTerms: data.showPaymentTerms,
        showDepartment: data.showDepartment,
        showSeller: data.showSeller,
        showDiscount: data.showDiscount,
        showProject: data.showProject,
        showNote: data.showNote
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