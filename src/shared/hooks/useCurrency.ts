'use client'

import { useState, useEffect } from 'react'
import { getCurrencySymbol } from '@/shared/lib/currency'

interface Business {
  id: string
  name: string
  currency: string
}

interface UseCurrencyReturn {
  business: Business | null
  currency: string
  currencySymbol: string
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Custom hook to fetch business information and provide currency utilities
 * @returns Business data, currency info, and utility functions
 */
export function useCurrency(): UseCurrencyReturn {
  const [business, setBusiness] = useState<Business | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchBusiness = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const res = await fetch('/api/business')
      if (res.ok) {
        const data = await res.json()
        setBusiness(data)
      } else {
        setError('Failed to fetch business information')
      }
    } catch (error) {
      console.error('Error fetching business:', error)
      setError('Failed to fetch business information')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBusiness()
  }, [])

  const currency = business?.currency || 'USD'
  const currencySymbol = getCurrencySymbol(currency)

  return {
    business,
    currency,
    currencySymbol,
    loading,
    error,
    refetch: fetchBusiness
  }
}
