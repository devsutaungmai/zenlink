import { useState, useEffect, useCallback } from 'react'

interface User {
  id: string
  firstName: string
  lastName: string
  email: string
  role: string
  employee?: {
    id: string
    employeeNo: string
    department: string
    departmentId: string
    employeeGroup?: string
    employeeGroupId?: string
  }
}

export function useUser() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const refreshSession = useCallback(async () => {
    try {
      await fetch('/api/auth/refresh', { method: 'POST' })
    } catch (err) {
      console.warn('Session refresh failed:', err)
    }
  }, [])

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch('/api/me')
        
        if (!response.ok) {
          if (response.status === 401) {
            setUser(null)
            setLoading(false)
            return
          }
          throw new Error('Failed to fetch user data')
        }
        
        const userData = await response.json()
        setUser(userData)

        refreshSession()
      } catch (err) {
        console.error('Error fetching user:', err)
        setError(err instanceof Error ? err : new Error('Unknown error'))
      } finally {
        setLoading(false)
      }
    }

    fetchUser()
  }, [refreshSession])

  // Set up periodic session refresh in a separate effect
  useEffect(() => {
    if (!user) return

    const sessionRefreshInterval = setInterval(() => {
      refreshSession()
    }, 24 * 60 * 60 * 1000) // 24 hours

    return () => clearInterval(sessionRefreshInterval)
  }, [user, refreshSession])

  return { user, loading, error, refreshSession }
}
