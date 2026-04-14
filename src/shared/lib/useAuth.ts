'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'

export function useAuth() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function login(email: string, password: string, _rememberMe: boolean = true) {
    setLoading(true)
    setError(null)
    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        const check = await fetch('/api/auth/login-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        })
        const { status } = await check.json()

        if (status === 'pending_approval') {
          throw new Error('Your account is pending approval by Zenlink.')
        }
        throw new Error('Invalid email or password')
      }

      sessionStorage.setItem('zenlink_session_mode', 'admin')
      router.push('/dashboard')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return { login, error, loading }
}
