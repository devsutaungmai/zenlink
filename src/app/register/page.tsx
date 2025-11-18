'use client'

import { useState } from 'react'
import Link from 'next/link'
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'
import { useRouter } from 'next/navigation'

type Step = 1 | 2
type BusinessType = 'retail' | 'restaurant' | 'service' | 'manufacturing' | 'other'

interface UserForm {
  email: string
  password: string
  confirmPassword: string
  firstName: string
  lastName: string
}

interface BusinessForm {
  businessName: string
  address: string
  typeOfBusiness: BusinessType
  employeesQty: number
}

export default function RegisterPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>(1)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [stepOneLoading, setStepOneLoading] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string; confirmPassword?: string }>({})

  const [userForm, setUserForm] = useState<UserForm>({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
  })

  const [businessForm, setBusinessForm] = useState<BusinessForm>({
    businessName: '',
    address: '',
    typeOfBusiness: 'retail',
    employeesQty: 1,
  })

  const checkEmailExists = async (email: string) => {
    const encodedEmail = encodeURIComponent(email.trim())
    const res = await fetch(`/api/auth/register?email=${encodedEmail}`)

    if (!res.ok) {
      throw new Error('Failed to verify email')
    }

    const data = await res.json()
    return Boolean(data.exists)
  }

  const getPasswordStrengthError = (password: string) => {
    const strengthRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/

    if (!strengthRegex.test(password)) {
      return 'Password must be at least 8 characters and include uppercase, lowercase, number, and special character.'
    }

    return null
  }

  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setFieldErrors({})

    const passwordError = getPasswordStrengthError(userForm.password)
    if (passwordError) {
      setFieldErrors((prev) => ({ ...prev, password: passwordError }))
      return
    }

    if (userForm.password !== userForm.confirmPassword) {
      setFieldErrors((prev) => ({ ...prev, confirmPassword: 'Passwords do not match' }))
      return
    }

    try {
      setStepOneLoading(true)
      const emailExists = await checkEmailExists(userForm.email)

      if (emailExists) {
        setFieldErrors((prev) => ({ ...prev, email: 'Email already exists' }))
        return
      }

      setStep(2)
    } catch (validationError) {
      console.error(validationError)
      setError('Unable to verify email right now. Please try again in a moment.')
    } finally {
      setStepOneLoading(false)
    }
  }

  const handleBusinessSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user: userForm,
          business: businessForm,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      // Redirect to dashboard on success
      router.push('/dashboard')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ backgroundColor: '#E5F1FF' }}>
      <Link href="/">
        <h1 className="text-3xl font-bold text-[#31BCFF] mb-8">ZenLink</h1>
      </Link>

      <div className="w-full max-w-md">
        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8">
          <div className={`h-1 w-24 rounded ${step >= 1 ? 'bg-[#31BCFF]' : 'bg-gray-200'}`} />
          <div className={`h-8 w-8 rounded-full flex items-center justify-center mx-2 ${
            step >= 1 ? 'bg-[#31BCFF] text-white' : 'bg-gray-200'
          }`}>
            1
          </div>
          <div className={`h-1 w-24 rounded ${step >= 2 ? 'bg-[#31BCFF]' : 'bg-gray-200'}`} />
          <div className={`h-8 w-8 rounded-full flex items-center justify-center mx-2 ${
            step >= 2 ? 'bg-[#31BCFF] text-white' : 'bg-gray-200'
          }`}>
            2
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-md text-sm">
            {error}
          </div>
        )}

        {step === 1 ? (
          <form onSubmit={handleUserSubmit} className="bg-white p-8 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold text-gray-800 mb-6">Create your account</h2>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                <input
                  type="text"
                  value={userForm.firstName}
                  onChange={(e) => {
                    setUserForm({ ...userForm, firstName: e.target.value })
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-[#31BCFF] focus:border-[#31BCFF] outline-none text-gray-700"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                <input
                  type="text"
                  value={userForm.lastName}
                  onChange={(e) => setUserForm({ ...userForm, lastName: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-[#31BCFF] focus:border-[#31BCFF] outline-none text-gray-700"
                  required
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={userForm.email}
                onChange={(e) => {
                  setUserForm({ ...userForm, email: e.target.value })
                  if (fieldErrors.email) {
                    setFieldErrors((prev) => ({ ...prev, email: undefined }))
                  }
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-[#31BCFF] focus:border-[#31BCFF] outline-none text-gray-700"
                required
              />
              {fieldErrors.email && (
                <p className="mt-1 text-sm text-red-600">{fieldErrors.email}</p>
              )}
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={userForm.password}
                  onChange={(e) => {
                    setUserForm({ ...userForm, password: e.target.value })
                    if (fieldErrors.password) {
                      setFieldErrors((prev) => ({ ...prev, password: undefined }))
                    }
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-[#31BCFF] focus:border-[#31BCFF] outline-none text-gray-700"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? (
                    <EyeSlashIcon className="h-5 w-5" />
                  ) : (
                    <EyeIcon className="h-5 w-5" />
                  )}
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Must include uppercase, lowercase, number, and special character.
              </p>
              {fieldErrors.password && (
                <p className="mt-1 text-sm text-red-600">{fieldErrors.password}</p>
              )}
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
              <input
                type="password"
                value={userForm.confirmPassword}
                onChange={(e) => {
                  setUserForm({ ...userForm, confirmPassword: e.target.value })
                  if (fieldErrors.confirmPassword) {
                    setFieldErrors((prev) => ({ ...prev, confirmPassword: undefined }))
                  }
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-[#31BCFF] focus:border-[#31BCFF] outline-none text-gray-700"
                required
              />
              {fieldErrors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600">{fieldErrors.confirmPassword}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={stepOneLoading}
              className="w-full bg-[#31BCFF] hover:bg-[#31BCFF]/90 text-white py-2 px-4 rounded-md transition-colors disabled:opacity-50"
            >
              {stepOneLoading ? 'Validating...' : 'Continue'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleBusinessSubmit} className="bg-white p-8 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold text-gray-800 mb-6">Business Information</h2>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Business Name</label>
              <input
                type="text"
                value={businessForm.businessName}
                onChange={(e) => setBusinessForm({ ...businessForm, businessName: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-[#31BCFF] focus:border-[#31BCFF] outline-none"
                required
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <input
                type="text"
                value={businessForm.address}
                onChange={(e) => setBusinessForm({ ...businessForm, address: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-[#31BCFF] focus:border-[#31BCFF] outline-none"
                required
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Type of Business</label>
              <select
                value={businessForm.typeOfBusiness}
                onChange={(e) => setBusinessForm({ ...businessForm, typeOfBusiness: e.target.value as BusinessType })}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-[#31BCFF] focus:border-[#31BCFF] outline-none"
                required
              >
                <option value="retail">Retail</option>
                <option value="restaurant">Restaurant</option>
                <option value="service">Service</option>
                <option value="manufacturing">Manufacturing</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">Number of Employees</label>
              <input
                type="number"
                min="1"
                value={businessForm.employeesQty}
                onChange={(e) => setBusinessForm({ ...businessForm, employeesQty: parseInt(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-[#31BCFF] focus:border-[#31BCFF] outline-none"
                required
              />
            </div>

            <div className="flex space-x-4">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="w-full border border-[#31BCFF] text-[#31BCFF] hover:bg-[#31BCFF]/10 py-2 px-4 rounded-md transition-colors"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#31BCFF] hover:bg-[#31BCFF]/90 text-white py-2 px-4 rounded-md transition-colors disabled:opacity-50"
              >
                {loading ? 'Creating Account...' : 'Create Account'}
              </button>
            </div>
          </form>
        )}

        <div className="mt-8 text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Link href="/login" className="text-[#31BCFF] hover:underline font-medium">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  )
}