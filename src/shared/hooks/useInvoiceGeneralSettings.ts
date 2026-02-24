// hooks/useInvoiceSettings.ts
import { useState, useEffect } from 'react'

export interface GeneralSetting {
  firstInvoiceNumber: number
  firstCreditNoteNumber: number
  customerNumberSeriesStart: number | null
  customerNumberSeriesEnd: number | null
  defaultBankAccount: string
  defaultPaymentTermsDays: number
  defaultDueDays: number
}

export function useInvoiceGeneralSettings() {
  const [generalSettings, setGeneralSettings] = useState<GeneralSetting>({
    firstInvoiceNumber: 1,
    firstCreditNoteNumber: 1,
    customerNumberSeriesStart: 10000,
    customerNumberSeriesEnd: 19999,
    defaultBankAccount: '',
    defaultPaymentTermsDays: 30,
    defaultDueDays: 30
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
      
    const response = await fetch('/api/invoice-general-settings')

      if (!response.ok) {
        throw new Error('Failed to fetch settings')
      }

      const data = await response.json()
      
      setGeneralSettings({
        firstInvoiceNumber: data.firstInvoiceNumber || 1,
        firstCreditNoteNumber: data.firstCreditNoteNumber || 1,
        customerNumberSeriesStart: data.customerNumberSeriesStart || 10000,
        customerNumberSeriesEnd: data.customerNumberSeriesEnd || 19999,
        defaultBankAccount: data.defaultBankAccount || '',
        defaultPaymentTermsDays: data.defaultPaymentTermsDays || 30,
        defaultDueDays: data.defaultDueDays || 30
      })
    } catch (err) {
      console.error('Error fetching invoice settings:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch settings')
      // Keep default values on error
    } finally {
      setLoading(false)
    }
  }

  return { generalSettings, loading, error, refetch: fetchSettings }
}