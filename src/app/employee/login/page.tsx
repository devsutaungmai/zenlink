'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { User, Delete } from 'lucide-react'
import { APP_NAME } from '@/app/constants'

function EmployeeLoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [employeeId, setEmployeeId] = useState('')
  const [pin, setPin] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPreFilled, setIsPreFilled] = useState(false)

  // Check for pre-filled employee ID from URL params
  useEffect(() => {
    const preFilledEmployeeId = searchParams.get('employeeId')
    if (preFilledEmployeeId) {
      setEmployeeId(preFilledEmployeeId)
      setIsPreFilled(true)
    }
  }, [searchParams])

  const handleNumberPress = (number: string) => {
    if (pin.length < 6) {
      setPin(prev => prev + number)
    }
  }

  const handleClear = () => {
    setPin('')
  }

  const handleBackspace = () => {
    setPin(prev => prev.slice(0, -1))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!employeeId || !pin) {
      setError('Please enter both Employee ID and PIN')
      return
    }

    if (pin.length !== 6) {
      setError('PIN must be 6 digits')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/auth/employee-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId, pin }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Login failed')
      }
      
      console.log('Employee login successful, redirecting to dashboard')
      router.push('/employee/dashboard')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ backgroundColor: '#E5F1FF' }}>
      {/* Back Button for Time Tracking Portal */}
      {isPreFilled && (
        <div className="w-full max-w-md mb-4">
          <button
            onClick={() => router.push('/time-tracking')}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
          >
            ← Back to Time Tracking Portal
          </button>
        </div>
      )}

      {/* Main Container */}
      <div className="w-full max-w-md">
        {/* Login Form */}
        <form onSubmit={handleSubmit} className="bg-white p-8 rounded-xl shadow-md">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold mb-2" style={{ color: '#0369A1' }}>Zenlink</h1>
            <h2 className="text-xl font-semibold text-gray-800">Employee Sign in</h2>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-md text-sm">
              {error}
            </div>
          )}

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Employee ID
            </label>
            <input
              type="text"
              value={employeeId}
              onChange={(e) => !isPreFilled && setEmployeeId(e.target.value.toUpperCase())}
              className={`w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-[#31BCFF] focus:border-[#31BCFF] outline-none text-gray-900 ${
                isPreFilled ? 'bg-gray-50 cursor-not-allowed' : ''
              }`}
              placeholder="EMP001"
              disabled={isPreFilled}
              required
            />
            {isPreFilled && (
              <p className="text-xs text-gray-500 mt-1">
                Employee ID pre-filled from time tracking portal
              </p>
            )}
          </div>

          {/* PIN Display */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3 text-center">
              Enter PIN (6 digits)
            </label>
            <div className="flex justify-center mb-6">
              <div className="flex gap-2">
                {[...Array(6)].map((_, index) => (
                  <div
                    key={index}
                    className="w-12 h-12 border-2 border-gray-300 rounded-lg flex items-center justify-center bg-gray-50"
                  >
                    <span className="text-2xl font-mono text-gray-800">
                      {pin[index] ? '•' : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Number Pad */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((number) => (
                <button
                  key={number}
                  type="button"
                  onClick={() => handleNumberPress(number.toString())}
                  className="w-full h-12 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 border border-gray-300 rounded-lg font-semibold text-lg text-gray-800 transition-colors"
                  disabled={loading || pin.length >= 6}
                >
                  {number}
                </button>
              ))}
              
              {/* Clear Button */}
              <button
                type="button"
                onClick={handleClear}
                className="w-full h-12 bg-red-100 hover:bg-red-200 active:bg-red-300 border border-red-300 rounded-lg font-semibold text-sm text-red-700 transition-colors"
                disabled={loading}
              >
                Clear
              </button>
              
              {/* Zero */}
              <button
                type="button"
                onClick={() => handleNumberPress('0')}
                className="w-full h-12 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 border border-gray-300 rounded-lg font-semibold text-lg text-gray-800 transition-colors"
                disabled={loading || pin.length >= 6}
              >
                0
              </button>
              
              {/* Backspace Button */}
              <button
                type="button"
                onClick={handleBackspace}
                className="w-full h-12 bg-orange-100 hover:bg-orange-200 active:bg-orange-300 border border-orange-300 rounded-lg font-semibold text-orange-700 transition-colors flex items-center justify-center"
                disabled={loading || pin.length === 0}
              >
                <Delete className="w-5 h-5" />
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !employeeId || pin.length !== 6}
            className="w-full relative overflow-hidden bg-gradient-to-r from-[#31BCFF]/80 to-[#0EA5E9]/80 backdrop-blur-md border border-white/20 hover:from-[#31BCFF]/90 hover:to-[#0EA5E9]/90 text-white py-3 px-6 rounded-2xl transition-all duration-300 disabled:opacity-50 shadow-lg hover:shadow-xl before:absolute before:inset-0 before:bg-gradient-to-r before:from-white/10 before:to-transparent before:opacity-0 hover:before:opacity-100 before:transition-opacity flex items-center justify-center gap-2"
          >
            <User className="w-4 h-4 relative z-10" />
            <span className="relative z-10 font-medium">
              {loading ? 'Signing in...' : 'Sign in'}
            </span>
          </button>
        </form>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-600">
          <p>Need admin access?</p>
          <Link 
            href="/login" 
            className="text-[#31BCFF] hover:underline font-medium"
          >
            Admin Login
          </Link>
        </div>
      </div>
    </div>
  )
}

// Loading component for Suspense fallback
function LoadingEmployeeLogin() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ backgroundColor: '#E5F1FF' }}>
      <div className="w-full max-w-md">
        <div className="bg-white p-8 rounded-xl shadow-md">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold mb-2" style={{ color: '#0369A1' }}>Zenlink</h1>
            <h2 className="text-xl font-semibold text-gray-800">Loading...</h2>
          </div>
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded mb-4"></div>
            <div className="h-10 bg-gray-200 rounded mb-4"></div>
            <div className="h-4 bg-gray-200 rounded mb-4"></div>
            <div className="flex justify-center gap-2 mb-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="w-12 h-12 bg-gray-200 rounded"></div>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-3 mb-4">
              {[...Array(12)].map((_, i) => (
                <div key={i} className="h-12 bg-gray-200 rounded"></div>
              ))}
            </div>
            <div className="h-12 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function EmployeeLoginPage() {
  return (
    <Suspense fallback={<LoadingEmployeeLogin />}>
      <EmployeeLoginContent />
    </Suspense>
  )
}
