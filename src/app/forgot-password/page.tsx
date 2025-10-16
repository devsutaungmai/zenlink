'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import Swal from 'sweetalert2'

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<'email' | 'otp' | 'password'>('email')

  // Step 1: Send OTP
  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (response.ok) {
        setStep('otp')
        Swal.fire({
          text: 'Verification code sent! Check your email.',
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 5000,
          timerProgressBar: true,
          icon: 'success',
          customClass: {
            popup: 'swal-toast-wide'
          }
        })
      } else {
        Swal.fire({
          text: data.error || 'Failed to send verification code',
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 4000,
          timerProgressBar: true,
          icon: 'error',
          customClass: {
            popup: 'swal-toast-wide'
          }
        })
      }
    } catch (error) {
      console.error('Error:', error)
      Swal.fire({
        text: 'An error occurred. Please try again.',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 4000,
        timerProgressBar: true,
        icon: 'error',
        customClass: {
          popup: 'swal-toast-wide'
        }
      })
    } finally {
      setLoading(false)
    }
  }

  // Step 2: Verify OTP
  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
      })

      const data = await response.json()

      if (response.ok) {
        setStep('password')
        Swal.fire({
          text: 'Code verified! Now set your new password.',
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 3000,
          timerProgressBar: true,
          icon: 'success',
          customClass: {
            popup: 'swal-toast-wide'
          }
        })
      } else {
        Swal.fire({
          text: data.error || 'Invalid verification code',
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 4000,
          timerProgressBar: true,
          icon: 'error',
          customClass: {
            popup: 'swal-toast-wide'
          }
        })
      }
    } catch (error) {
      console.error('Error:', error)
      Swal.fire({
        text: 'An error occurred. Please try again.',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 4000,
        timerProgressBar: true,
        icon: 'error',
        customClass: {
          popup: 'swal-toast-wide'
        }
      })
    } finally {
      setLoading(false)
    }
  }

  // Step 3: Reset Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()

    if (password !== confirmPassword) {
      Swal.fire({
        text: 'Passwords do not match',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 4000,
        timerProgressBar: true,
        icon: 'error',
        customClass: {
          popup: 'swal-toast-wide'
        }
      })
      return
    }

    if (password.length < 8) {
      Swal.fire({
        text: 'Password must be at least 8 characters long',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 4000,
        timerProgressBar: true,
        icon: 'error',
        customClass: {
          popup: 'swal-toast-wide'
        }
      })
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, token: otp, password }),
      })

      const data = await response.json()

      if (response.ok) {
        Swal.fire({
          text: 'Password reset successfully! Redirecting to login...',
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 3000,
          timerProgressBar: true,
          icon: 'success',
          customClass: {
            popup: 'swal-toast-wide'
          }
        })
        setTimeout(() => router.push('/login'), 3000)
      } else {
        Swal.fire({
          text: data.error || 'Failed to reset password',
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 4000,
          timerProgressBar: true,
          icon: 'error',
          customClass: {
            popup: 'swal-toast-wide'
          }
        })
      }
    } catch (error) {
      console.error('Error:', error)
      Swal.fire({
        text: 'An error occurred. Please try again.',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 4000,
        timerProgressBar: true,
        icon: 'error',
        customClass: {
          popup: 'swal-toast-wide'
        }
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ backgroundColor: '#E5F1FF' }}>
      <div className="w-full max-w-md">
        <div className="bg-white p-8 rounded-xl shadow-md">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold mb-2" style={{ color: '#0369A1' }}>Zenlink</h1>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              {step === 'email' && 'Forgot Password?'}
              {step === 'otp' && 'Enter Verification Code'}
              {step === 'password' && 'Set New Password'}
            </h2>
            <p className="text-sm text-gray-600">
              {step === 'email' && "Enter your email to receive a verification code"}
              {step === 'otp' && `We sent a 6-digit code to ${email}`}
              {step === 'password' && 'Choose a strong password for your account'}
            </p>
          </div>

          {/* Step Progress Indicator */}
          <div className="flex items-center justify-center mb-6">
            <div className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step === 'email' ? 'bg-[#31BCFF] text-white' : 'bg-green-500 text-white'
              }`}>
                {step === 'email' ? '1' : '✓'}
              </div>
              <div className={`w-16 h-1 ${step !== 'email' ? 'bg-green-500' : 'bg-gray-300'}`}></div>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step === 'otp' ? 'bg-[#31BCFF] text-white' : step === 'password' ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'
              }`}>
                {step === 'password' ? '✓' : '2'}
              </div>
              <div className={`w-16 h-1 ${step === 'password' ? 'bg-green-500' : 'bg-gray-300'}`}></div>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step === 'password' ? 'bg-[#31BCFF] text-white' : 'bg-gray-300 text-gray-600'
              }`}>
                3
              </div>
            </div>
          </div>

          {/* Step 1: Email */}
          {step === 'email' && (
            <form onSubmit={handleSendOTP}>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-[#31BCFF] focus:border-[#31BCFF] outline-none text-gray-900"
                  placeholder="you@example.com"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full relative overflow-hidden bg-gradient-to-r from-[#31BCFF]/80 to-[#0EA5E9]/80 backdrop-blur-md border border-white/20 hover:from-[#31BCFF]/90 hover:to-[#0EA5E9]/90 text-white py-3 px-6 rounded-2xl transition-all duration-300 disabled:opacity-50 shadow-lg hover:shadow-xl"
              >
                <span className="relative z-10 font-medium">
                  {loading ? 'Sending...' : 'Send Verification Code'}
                </span>
              </button>
            </form>
          )}

          {/* Step 2: OTP */}
          {step === 'otp' && (
            <form onSubmit={handleVerifyOTP}>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Verification Code
                </label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-[#31BCFF] focus:border-[#31BCFF] outline-none text-gray-900 text-center text-2xl tracking-widest font-mono"
                  placeholder="000000"
                  maxLength={6}
                  required
                />
                <p className="text-xs text-gray-500 mt-1 text-center">
                  Enter the 6-digit code sent to your email
                </p>
              </div>

              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="w-full relative overflow-hidden bg-gradient-to-r from-[#31BCFF]/80 to-[#0EA5E9]/80 backdrop-blur-md border border-white/20 hover:from-[#31BCFF]/90 hover:to-[#0EA5E9]/90 text-white py-3 px-6 rounded-2xl transition-all duration-300 disabled:opacity-50 shadow-lg hover:shadow-xl"
              >
                <span className="relative z-10 font-medium">
                  {loading ? 'Verifying...' : 'Verify Code'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setStep('email')}
                className="w-full mt-3 text-sm text-gray-600 hover:text-gray-800"
              >
                Resend Code
              </button>
            </form>
          )}

          {/* Step 3: New Password */}
          {step === 'password' && (
            <form onSubmit={handleResetPassword}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-[#31BCFF] focus:border-[#31BCFF] outline-none text-gray-900"
                  placeholder="Enter new password"
                  required
                  minLength={8}
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-[#31BCFF] focus:border-[#31BCFF] outline-none text-gray-900"
                  placeholder="Confirm new password"
                  required
                  minLength={8}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full relative overflow-hidden bg-gradient-to-r from-[#31BCFF]/80 to-[#0EA5E9]/80 backdrop-blur-md border border-white/20 hover:from-[#31BCFF]/90 hover:to-[#0EA5E9]/90 text-white py-3 px-6 rounded-2xl transition-all duration-300 disabled:opacity-50 shadow-lg hover:shadow-xl"
              >
                <span className="relative z-10 font-medium">
                  {loading ? 'Resetting...' : 'Reset Password'}
                </span>
              </button>
            </form>
          )}

          <div className="mt-6 text-center">
            <Link 
              href="/login"
              className="inline-flex items-center gap-2 text-sm text-[#31BCFF] hover:underline"
            >
              <ArrowLeftIcon className="h-4 w-4" />
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
