// hooks/useInvoiceSettings.ts
import { useState, useEffect } from 'react'

interface InvoiceSettings {
  showSalesPrice: boolean
  showCostPrice: boolean
  showDiscountPercentage: boolean
  showUnit: boolean
  showProductGroup: boolean
}

export function useProductSettings() {
  const [settings, setSettings] = useState<InvoiceSettings>({
    showSalesPrice: true,
    showCostPrice: true,
    showDiscountPercentage: true,
    showUnit: true,
    showProductGroup: true
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
      
      const res = await fetch('/api/products/settings')
      
      if (!res.ok) {
        throw new Error('Failed to fetch settings')
      }

      const data = await res.json()
      
      setSettings({
        showSalesPrice: data.showSalesPrice,
        showCostPrice: data.showCostPrice,
        showDiscountPercentage: data.showDiscountPercentage,
        showUnit: data.showUnit,
        showProductGroup: data.showProductGroup
      })
    } catch (err) {
      console.error('Error fetching products settings:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch settings')
      // Keep default values on error
    } finally {
      setLoading(false)
    }
  }

  return { settings, loading, error, refetch: fetchSettings }
}