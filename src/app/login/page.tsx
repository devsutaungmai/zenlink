'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/shared/lib/useAuth'
import Link from 'next/link'
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'
import { User } from 'lucide-react'
import { APP_NAME } from '@/app/constants/constants'

export default function LoginPage() {
  const router = useRouter()
  const { login, error, loading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [companyId, setCompanyId] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [checkingAuth, setCheckingAuth] = useState(true)

  // Middleware already redirects authenticated admins away from /login.
  // Only check for a lingering employee session here.
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const empResponse = await fetch('/api/employee/me')
        if (empResponse.ok) {
          router.replace('/employee/dashboard')
          return
        }
      } catch {
        // ignore
      }
      setCheckingAuth(false)
    }
    checkAuth()
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await login(email, password, rememberMe)
  }

  // Show loading while checking auth status
  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#E5F1FF' }}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#31BCFF]"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ backgroundColor: '#E5F1FF' }}>
      {/* Logo */}
      {/* <Link href="/">
        <h1 className="text-3xl font-bold text-[#31BCFF] mb-8">{APP_NAME}</h1>
      </Link> */}

      {/* Main Container */}
      <div className="w-full max-w-md">
        {/* Login Form */}
        <form onSubmit={handleSubmit} className="bg-white p-8 rounded-xl shadow-md">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold mb-2" style={{ color: '#0369A1' }}>Zenlink</h1>
            <h2 className="text-xl font-semibold text-gray-800">Sign in</h2>
          </div>

          {error && (
            <div className={`mb-4 p-3 rounded-md text-sm border ${
              error.includes('pending approval')
                ? 'bg-yellow-50 border-yellow-200 text-yellow-800'
                : 'bg-red-50 border-red-200 text-red-600'
            }`}>
              {error}
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-[#31BCFF] focus:border-[#31BCFF] outline-none text-gray-900"
              required
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-[#31BCFF] focus:border-[#31BCFF] outline-none text-gray-900"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute rounded-xl right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 shadow-md transition-colors duration-200 focus:outline-none"
              >
                {showPassword ? (
                  <EyeSlashIcon className="h-5 w-5" />
                ) : (
                  <EyeIcon className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>

          <div className="mb-6">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded border-gray-300 text-[#31BCFF] shadow-sm focus:border-[#31BCFF] focus:ring focus:ring-[#31BCFF] focus:ring-opacity-50"
              />
              <span className="ml-2 text-sm text-gray-700">
                Keep me signed in
              </span>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full relative overflow-hidden bg-gradient-to-r from-[#31BCFF]/80 to-[#0EA5E9]/80 backdrop-blur-md border border-white/20 hover:from-[#31BCFF]/90 hover:to-[#0EA5E9]/90 text-white py-3 px-6 rounded-2xl transition-all duration-300 disabled:opacity-50 shadow-lg hover:shadow-xl before:absolute before:inset-0 before:bg-gradient-to-r before:from-white/10 before:to-transparent before:opacity-0 hover:before:opacity-100 before:transition-opacity"
          >
            <span className="relative z-10 font-medium">
              {loading ? 'Signing in...' : 'Sign in'}
            </span>
          </button>

          {/* <div className="mt-4">
            <Link 
              href="/employee/login"
              className="w-full relative overflow-hidden bg-white/30 backdrop-blur-md border border-white/40 hover:bg-white/40 text-gray-700 py-3 px-6 rounded-2xl transition-all duration-300 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl before:absolute before:inset-0 before:bg-gradient-to-r before:from-white/20 before:to-transparent before:opacity-0 hover:before:opacity-100 before:transition-opacity"
            >
              <User className="w-4 h-4 relative z-10" />
              <span className="relative z-10 font-medium">Time Tracker Portal</span>
            </Link>
          </div> */}

          <div className="mt-4 text-center">
            <Link 
              href="/forgot-password" 
              className="text-sm text-[#31BCFF] hover:underline"
            >
              Forgot password?
            </Link>
          </div>
        </form>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-600">
          <p>Don't have an account?</p>
          <Link 
            href="/register" 
            className="text-[#31BCFF] hover:underline font-medium"
          >
            Create Account
          </Link>
        </div>
      </div>
    </div>
  )
}
