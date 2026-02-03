'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { 
  ArrowLeftIcon,
  LockClosedIcon, 
  UserIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'

interface Employee {
  id: string
  firstName: string
  lastName: string
  employeeNo: string
  department: {
    name: string
  }
  employeeGroup?: {
    name: string
  }
  email: string
  mobile: string
  isTeamLeader: boolean
}

function EmployeePinLoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const employeeId = searchParams.get('employeeId')
  
  const [employee, setEmployee] = useState<Employee | null>(null)
  const [pin, setPin] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [attempts, setAttempts] = useState(0)
  const [currentTime, setCurrentTime] = useState(new Date())
  const maxAttempts = 3

  useEffect(() => {
    if (!employeeId) {
      router.push('/time-tracking')
      return
    }
    
    fetchEmployeeData()
    
    // Update current time every second
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(timeInterval)
  }, [employeeId, router])

  const fetchEmployeeData = async () => {
    if (!employeeId) return

    try {
      const response = await fetch(`/api/employees/${employeeId}`)
      if (response.ok) {
        const employeeData = await response.json()
        setEmployee(employeeData)
      } else {
        setError('Employee not found')
      }
    } catch (error) {
      console.error('Error fetching employee:', error)
      setError('Failed to load employee data')
    }
  }

  const handlePinChange = (value: string) => {
    // Only allow numbers and limit to 6 digits
    const numericValue = value.replace(/\D/g, '').slice(0, 6)
    setPin(numericValue)
    setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!employee || !pin) return
    
    if (pin.length < 4) {
      setError('PIN must be at least 4 digits')
      return
    }

    if (attempts >= maxAttempts) {
      setError('Too many failed attempts. Please contact your manager.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/employees/verify-pin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          employeeId: employee.id,
          pin: pin
        })
      })

      const data = await response.json()

      if (response.ok && data.success) {
        // Set session mode in sessionStorage (tab-specific) so this tab uses employee session
        sessionStorage.setItem('zenlink_session_mode', 'employee')
        // Redirect to employee dashboard page with employee ID
        router.push(`/employee/dashboard?employeeId=${employee.id}`)
      } else {
        setAttempts(prev => prev + 1)
        setError(data.error || 'Invalid PIN. Please try again.')
        setPin('')
      }
    } catch (error) {
      console.error('Error verifying PIN:', error)
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleNumberClick = (number: string) => {
    if (pin.length < 6) {
      handlePinChange(pin + number)
    }
  }

  const handleBackspace = () => {
    setPin(prev => prev.slice(0, -1))
  }

  const handleClear = () => {
    setPin('')
    setError('')
  }

  const handleBackToPortal = () => {
    router.push('/time-tracking')
  }

  if (!employee) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-gray-600 mb-4">
            {error || 'Loading...'}
          </div>
          <button 
            onClick={handleBackToPortal}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Back to Time Tracking
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={handleBackToPortal}
            className="flex items-center gap-2 px-4 py-2 bg-white/70 hover:bg-white rounded-lg transition-colors shadow-sm"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            Back to Portal
          </button>
          
          <div className="text-center">
            <div className="text-lg font-bold text-blue-600">
              {currentTime.toLocaleTimeString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit',
                hour12: true
              })}
            </div>
            <div className="text-xs text-gray-500">
              {currentTime.toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric'
              })}
            </div>
          </div>
        </div>
        
        {/* Main Login Card */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <LockClosedIcon className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900">Employee Login</h3>
                <p className="text-sm text-gray-600">Enter your PIN to access dashboard</p>
              </div>
            </div>
          </div>

          {/* Employee Info */}
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                <UserIcon className="w-8 h-8 text-gray-600" />
              </div>
              <div>
                <h4 className="text-lg font-medium text-gray-900">
                  {employee.firstName} {employee.lastName}
                </h4>
                <p className="text-sm text-gray-600">
                  {employee.employeeNo} • {employee.department.name}
                </p>
                {employee.employeeGroup && (
                  <p className="text-xs text-blue-600 mt-1">
                    {employee.employeeGroup.name}
                  </p>
                )}
                {employee.isTeamLeader && (
                  <span className="inline-block mt-2 px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full font-medium">
                    Team Leader
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* PIN Input */}
          <div className="p-6">
            <form onSubmit={handleSubmit}>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-4">
                  Enter PIN
                </label>
                <div className="flex justify-center mb-6">
                  <div className="flex gap-2">
                    {[...Array(6)].map((_, index) => (
                      <div
                        key={index}
                        className={`w-12 h-12 border-2 rounded-lg flex items-center justify-center text-xl font-bold transition-all ${
                          pin.length > index
                            ? 'border-blue-500 bg-blue-50 text-blue-600 scale-105'
                            : 'border-gray-300 bg-gray-50 text-gray-400'
                        }`}
                      >
                        {pin.length > index ? '•' : ''}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Number Pad */}
              <div className="grid grid-cols-3 gap-3 mb-6">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((number) => (
                  <button
                    key={number}
                    type="button"
                    onClick={() => handleNumberClick(number.toString())}
                    className="h-14 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 active:scale-95 rounded-xl text-xl font-semibold text-gray-700 transition-all touch-manipulation shadow-sm hover:shadow-md"
                    disabled={loading}
                  >
                    {number}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={handleClear}
                  className="h-14 bg-red-100 hover:bg-red-200 active:bg-red-300 active:scale-95 rounded-xl text-sm font-medium text-red-600 transition-all touch-manipulation shadow-sm hover:shadow-md"
                  disabled={loading}
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={() => handleNumberClick('0')}
                  className="h-14 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 active:scale-95 rounded-xl text-xl font-semibold text-gray-700 transition-all touch-manipulation shadow-sm hover:shadow-md"
                  disabled={loading}
                >
                  0
                </button>
                <button
                  type="button"
                  onClick={handleBackspace}
                  className="h-14 bg-yellow-100 hover:bg-yellow-200 active:bg-yellow-300 active:scale-95 rounded-xl text-lg font-medium text-yellow-600 transition-all touch-manipulation shadow-sm hover:shadow-md"
                  disabled={loading}
                >
                  ⌫
                </button>
              </div>

              {/* Error Message */}
              {error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
                  <ExclamationTriangleIcon className="w-5 h-5 text-red-500 flex-shrink-0" />
                  <span className="text-sm text-red-700">{error}</span>
                </div>
              )}

              {/* Attempts Warning */}
              {attempts > 0 && attempts < maxAttempts && (
                <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                  <p className="text-sm text-yellow-700">
                    {maxAttempts - attempts} attempt{maxAttempts - attempts !== 1 ? 's' : ''} remaining
                  </p>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || pin.length < 4 || attempts >= maxAttempts}
                className="w-full py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-all flex items-center justify-center gap-3 shadow-lg hover:shadow-xl active:scale-98"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Verifying PIN...
                  </>
                ) : (
                  <>
                    <CheckCircleIcon className="w-5 h-5" />
                    Access Dashboard
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4">
            <p className="text-xs text-gray-500 text-center">
              🔒 Secure PIN authentication • Contact your manager if you need help
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// Loading component for Suspense fallback
function LoadingEmployeePinLogin() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ backgroundColor: '#E5F1FF' }}>
      <div className="w-full max-w-md">
        <div className="bg-white rounded-xl shadow-md">
          <div className="p-6 text-center">
            <h1 className="text-2xl font-bold mb-2" style={{ color: '#0369A1' }}>Loading...</h1>
          </div>
          <div className="p-6 animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-12 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function EmployeePinLoginPage() {
  return (
    <Suspense fallback={<LoadingEmployeePinLogin />}>
      <EmployeePinLoginContent />
    </Suspense>
  )
}
