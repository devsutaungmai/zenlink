// hooks/useInvoiceSettings.ts
import { useState, useEffect } from 'react'

interface ProjectSettings {
  showCategory: boolean
  showCustomer: boolean
  showStartDate: boolean
  showEndDate: boolean
}

export function useProjectSettings() {
  const [settings, setSettings] = useState<ProjectSettings>({
    showCategory: true,
    showCustomer: true,
    showStartDate: true,
    showEndDate: true,
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
      
      const res = await fetch('/api/projects/settings')
      
      if (!res.ok) {
        throw new Error('Failed to fetch settings')
      }

      const data = await res.json()
      
      setSettings({
        showCategory: data.showCategory,
        showCustomer: data.showCustomer,
        showStartDate: data.showStartDate,
        showEndDate: data.showEndDate
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