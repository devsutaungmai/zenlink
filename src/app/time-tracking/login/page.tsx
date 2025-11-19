'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  BuildingOfficeIcon,
  ClockIcon,
  UserGroupIcon,
  ArrowRightIcon,
  KeyIcon
} from '@heroicons/react/24/outline'

export default function TimeTrackingLoginPage() {
  const router = useRouter()
  const [businessName, setBusinessName] = useState('')
  const [activationCode, setActivationCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [step, setStep] = useState<'business' | 'activation'>('business')
  const [checking, setChecking] = useState(true)
  const [businessData, setBusinessData] = useState<{ id: string; name: string; address?: string | null; type?: string | null } | null>(null)

  useEffect(() => {
    // Check if user already has business and activation data
    const storedBusinessName = localStorage.getItem('timeTrackingBusiness')
    const storedProfile = localStorage.getItem('punchClockProfile')
    const storedBusinessData = localStorage.getItem('timeTrackingBusinessData')
    
    if (storedBusinessName && storedProfile) {
      try {
        const profileData = JSON.parse(storedProfile)
        if (profileData.id && profileData.name) {
          // User is already activated, redirect to dashboard after a brief delay
          setTimeout(() => {
            router.push('/time-tracking')
          }, 1000)
          return
        }
      } catch (error) {
        console.error('Error parsing stored profile data:', error)
        // Clear invalid data
        localStorage.removeItem('punchClockProfile')
      }
    }
    
    // If only business is stored, set it and go to activation step
    if (storedBusinessName && !storedProfile) {
      setBusinessName(storedBusinessName)
      setStep('activation')
    }

    if (storedBusinessData) {
      try {
        const parsedBusiness = JSON.parse(storedBusinessData)
        setBusinessData(parsedBusiness)
      } catch (error) {
        console.error('Error parsing stored business data:', error)
        localStorage.removeItem('timeTrackingBusinessData')
      }
    }
    
    // Small delay to show loading state
    setTimeout(() => {
      setChecking(false)
    }, 500)
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (step === 'business') {
      await handleBusinessValidation()
    } else {
      await handleActivationCode()
    }
  }

  const handleBusinessValidation = async () => {
    if (!businessName.trim()) {
      setError('Please enter a business name')
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch('/api/business/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          businessName: businessName.trim()
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to validate business')
      }

      // Store the validated business information
      localStorage.setItem('timeTrackingBusiness', businessName.trim())
      localStorage.setItem('timeTrackingBusinessData', JSON.stringify(data.business))
      setBusinessData(data.business)
      
      setSuccess(`Business "${data.business.name}" found! Enter activation code...`)
      
      // Move to activation step
      setTimeout(() => {
        setStep('activation')
        setSuccess(null)
      }, 1000)
      
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to access time tracking. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleActivationCode = async () => {
    if (!activationCode.trim()) {
      setError('Please enter an activation code')
      return
    }

    if (!businessData?.id) {
      setError('Please validate your business before entering an activation code')
      setStep('business')
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch('/api/punch-clock-profiles/activate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          activationCode: activationCode.trim().toUpperCase(),
          businessId: businessData.id
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Invalid activation code')
      }

      // Store the connected profile information
      localStorage.setItem('punchClockProfile', JSON.stringify(data.profile))
      localStorage.setItem('punchClockBusiness', data.profile.business.name)
      
      setSuccess(`Successfully connected to "${data.profile.name}" profile!`)
      
      // Redirect to time tracking dashboard
      setTimeout(() => {
        router.push('/time-tracking')
      }, 1500)
      
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to connect with activation code')
    } finally {
      setLoading(false)
    }
  }

  const handleGoBack = () => {
    setStep('business')
    setActivationCode('')
    setError(null)
    setSuccess(null)
    setBusinessData(null)
    localStorage.removeItem('timeTrackingBusiness')
    localStorage.removeItem('timeTrackingBusinessData')
  }

  // Show loading spinner while checking for existing activation data
  if (checking) {
    const storedBusinessName = localStorage.getItem('timeTrackingBusiness')
    const storedProfile = localStorage.getItem('punchClockProfile')
    const hasActivation = storedBusinessName && storedProfile
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-[#31BCFF] to-[#0EA5E9] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <ClockIcon className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Time Tracking Portal
          </h1>
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 shadow-xl p-8">
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#31BCFF]"></div>
              <p className="text-gray-600">
                {hasActivation 
                  ? 'Welcome back! Redirecting to your dashboard...'
                  : 'Checking your activation status...'
                }
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-r from-[#31BCFF] to-[#0EA5E9] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <ClockIcon className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-2">
            Time Tracking Portal
          </h1>
          <p className="text-gray-600">
            Access your business time tracking dashboard
          </p>
        </div>

        {/* Login Form */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 shadow-xl p-8">
          {step === 'activation' && (
            <div className="mb-4">
              <button
                onClick={handleGoBack}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
              >
                ← Back to Business Selection
              </button>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {step === 'business' ? (
              /* Business Name Input */
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Business Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <BuildingOfficeIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="Enter your business name"
                    className="block w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-[#31BCFF]/50 focus:border-[#31BCFF] transition-all duration-200"
                    required
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Enter the exact business name as registered in the system
                </p>
              </div>
            ) : (
              /* Activation Code Input */
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Activation Code
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <KeyIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={activationCode}
                    onChange={(e) => setActivationCode(e.target.value.toUpperCase())}
                    placeholder="Enter 6-digit activation code"
                    maxLength={6}
                    className="block w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-[#31BCFF]/50 focus:border-[#31BCFF] transition-all duration-200 text-center font-mono text-lg tracking-wider"
                    required
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Get this code from your administrator or manager
                </p>
                {businessData?.name && (
                  <p className="mt-1 text-xs text-gray-600">
                    Using activation code for <span className="font-semibold">{businessData.name}</span>
                  </p>
                )}
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3">
                <div className="text-sm">{error}</div>
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl p-3">
                <div className="text-sm">{success}</div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || (step === 'activation' && activationCode.length !== 6)}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-white bg-gradient-to-r from-[#31BCFF] to-[#0EA5E9] border border-transparent rounded-xl hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#31BCFF] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  {step === 'business' ? 'Validating...' : 'Connecting...'}
                </>
              ) : (
                <>
                  {step === 'business' ? (
                    <>
                      Continue to Activation
                      <ArrowRightIcon className="w-4 h-4" />
                    </>
                  ) : (
                    <>
                      <KeyIcon className="w-4 h-4" />
                      Connect to Dashboard
                    </>
                  )}
                </>
              )}
            </button>
          </form>
        </div>

        {/* Features Preview */}
        <div className="mt-8 bg-white/60 backdrop-blur-xl rounded-2xl border border-gray-200/50 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">
            {step === 'business' ? 'Time Tracking Features' : 'How Activation Works'}
          </h3>
          {step === 'business' ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <ClockIcon className="w-4 h-4 text-green-600" />
                </div>
                <span className="text-sm text-gray-700">Real-time shift tracking</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <UserGroupIcon className="w-4 h-4 text-blue-600" />
                </div>
                <span className="text-sm text-gray-700">Employee status monitoring</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                  <BuildingOfficeIcon className="w-4 h-4 text-purple-600" />
                </div>
                <span className="text-sm text-gray-700">Business dashboard overview</span>
              </div>
            </div>
          ) : (
            <div className="space-y-3 text-sm text-gray-700">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-medium text-blue-600">
                  1
                </div>
                <span>Get your 6-digit activation code from your manager</span>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-medium text-blue-600">
                  2
                </div>
                <span>Enter the code to connect to your punch clock profile</span>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-medium text-blue-600">
                  3
                </div>
                <span>Access the time tracking dashboard immediately</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer Note */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            {step === 'business' 
              ? 'You will need an activation code after business validation'
              : 'Each activation code can only be used once and expires after 24 hours'
            }
          </p>
        </div>
      </div>
    </div>
  )
}
