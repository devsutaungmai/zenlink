import { useState, useEffect } from 'react'
import { format } from 'date-fns'

export default function useFetchShifts(startDate: Date, endDate: Date) {
  const [shifts, setShifts] = useState<Shift[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const controller = new AbortController() // To cancel previous requests
    const fetchShifts = async () => {
      setLoading(true)
      try {
        const start = format(startDate, 'yyyy-MM-dd')
        const end = format(endDate, 'yyyy-MM-dd')
        const res = await fetch(`/api/shifts?startDate=${start}&endDate=${end}`, {
          signal: controller.signal,
        })
        if (!res.ok) throw new Error('Failed to fetch shifts')
        const data = await res.json()
        setShifts(data)
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('Error fetching shifts:', error)
        }
      } finally {
        setLoading(false)
      }
    }

    const debounceTimeout = setTimeout(() => {
      fetchShifts()
    }, 300) // Debounce delay (300ms)

    return () => {
      clearTimeout(debounceTimeout) // Clear debounce timeout
      controller.abort() // Cancel the previous request
    }
  }, [startDate, endDate])

  return { shifts, loading }
}