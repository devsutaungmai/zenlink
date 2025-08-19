'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
  KeyIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline'

export default function ActivationCodePage() {
  const router = useRouter()
  const [activationCode, setActivationCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [profileData, setProfileData] = useState<any>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!activationCode.trim()) {
      setError('Please enter an activation code')
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
          activationCode: activationCode.trim().toUpperCase()
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Invalid activation code')
      }

      // Store the connected profile information
      localStorage.setItem('punchClockProfile', JSON.stringify(data.profile))
      localStorage.setItem('punchClockBusiness', data.profile.business.name)
      
      setProfileData(data.profile)
      setSuccess(`Successfully connected to "${data.profile.name}" profile!`)
      
      // Redirect after showing success message
      setTimeout(() => {
        router.push('/time-tracking/punch-clock')
      }, 2000)
      
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to connect with activation code')
    } finally {
      setLoading(false)
    }
  }

  const handleGoBack = () => {
    router.back()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Back Button */}
        <div className="mb-4">
          <button
            onClick={handleGoBack}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            Back
          </button>
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-r from-[#31BCFF] to-[#0EA5E9] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <KeyIcon className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-2">
            Punch Clock Connection
          </h1>
          <p className="text-gray-600">
            Enter your activation code to connect to a punch clock profile
          </p>
        </div>

        {/* Connection Form */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 shadow-xl p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Activation Code Input */}
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
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 flex items-start gap-2">
                <ExclamationTriangleIcon className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div className="text-sm">{error}</div>
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl p-3 flex items-start gap-2">
                <CheckCircleIcon className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm font-medium">{success}</div>
                  {profileData && (
                    <div className="text-xs mt-1">
                      Business: {profileData.business.name} • Department: {profileData.department.name}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Connect Button */}
            <button
              type="submit"
              disabled={loading || activationCode.length !== 6}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-white bg-gradient-to-r from-[#31BCFF] to-[#0EA5E9] border border-transparent rounded-xl hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#31BCFF] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Connecting...
                </>
              ) : (
                <>
                  <KeyIcon className="w-4 h-4" />
                  Connect to Punch Clock
                </>
              )}
            </button>
          </form>
        </div>

        {/* Info Section */}
        <div className="mt-8 bg-white/60 backdrop-blur-xl rounded-2xl border border-gray-200/50 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">
            How it Works
          </h3>
          <div className="space-y-3 text-sm text-gray-700">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-medium text-blue-600">
                1
              </div>
              <span>Get an activation code from your manager or administrator</span>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-medium text-blue-600">
                2
              </div>
              <span>Enter the 6-digit code in the field above</span>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-medium text-blue-600">
                3
              </div>
              <span>Connect to your designated punch clock profile</span>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-medium text-blue-600">
                4
              </div>
              <span>Start tracking your work hours immediately</span>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            Each activation code can only be used once and expires after 24 hours
          </p>
        </div>
      </div>
    </div>
  )
}
