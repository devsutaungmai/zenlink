'use client'

import { useState, useEffect } from 'react'

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

interface UseUserOptions {
  preferEmployee?: boolean
}

export function useUser(options: UseUserOptions = {}) {
  const { preferEmployee = false } = options
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const sessionMode = typeof window !== 'undefined'
          ? sessionStorage.getItem('zenlink_session_mode')
          : null
        const useEmployeeSession = preferEmployee || sessionMode === 'employee'
        const url = useEmployeeSession ? '/api/me?preferEmployee=true' : '/api/me'
        const response = await fetch(url)

        if (!response.ok) {
          setUser(null)
          return
        }

        const userData = await response.json()
        setUser(userData)
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'))
      } finally {
        setLoading(false)
      }
    }

    fetchUser()
  }, [preferEmployee])

  return { user, loading, error }
}
