'use client'

import { useState } from 'react'
import Link from 'next/link'
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'
import { CheckCircleIcon } from '@heroicons/react/24/solid'
import { useRouter } from 'next/navigation'

type Step = 1 | 2
type BusinessType = string

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
    typeOfBusiness: '',
    employeesQty: 1,
  })

  // Industry groups and options (for Type of Business)
  const industryGroups: Array<{ group: string; options: string[] }> = [
    { group: 'Hospitality', options: ['Hotels', 'Café & Restaurant', 'Bar, Pub & Nightclub', 'Catering & Canteen'] },
    { group: 'Retail', options: ['Retail Store', 'Bakery', 'Commerce', 'Barber Shops & Beauty Salons'] },
    { group: 'Professional Services', options: ['Real Estate', 'Cleaning Services', 'Security', 'Staffing and Recruiting', 'Call Center & Telemarketing', 'Facilities Management & Commercial Cleaning'] },
    { group: 'Entertainment & Leisure', options: ['Entertainment, Cinemas & Fun Parks', 'Events & Event Management', 'Museums and Institutions', 'Performing Arts'] },
    { group: 'Healthcare & Medical', options: ['Elderly Care Services', 'Dental Offices', 'Hospital and Healthcare', 'Drug Stores & Pharmacies'] },
    { group: 'Education', options: ['Colleges & Universities', 'Primary or Secondary Education', 'Childcare'] },
    { group: 'Finance', options: ['Accounting', 'Insurance', 'Banking'] },
    { group: 'Media & Communications', options: ['Advertising and marketing'] },
    { group: 'Transportation', options: ['Logistics & Supply Chain', 'Warehousing', 'Transportation'] },
    { group: 'Other', options: ['Manufacturing', 'Construction', 'Municipality', 'Non-profit', 'Non-Profit & Charitable Organisations'] },
  ]

  // Employee count ranges: 1-9, 10-19, ..., 240-249, 250+
  const employeeRangeOptions: string[] = (() => {
    const arr: string[] = ['1-9']
    for (let start = 10; start <= 240; start += 10) {
      arr.push(`${start}-${start + 9}`)
    }
    arr.push('250+')
    return arr
  })()

  const toEmployeesQty = (range: string): number => {
    if (range === '250+') return 250
    const [min] = range.split('-')
    const n = parseInt(min, 10)
    return Number.isFinite(n) ? n : 1
  }

  const rangeFromQty = (qty: number): string => {
    if (qty >= 250) return '250+'
    if (qty <= 9) return '1-9'
    const start = Math.max(10, Math.min(240, Math.floor(qty / 10) * 10))
    return `${start}-${start + 9}`
  }

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
    <div className="min-h-screen grid md:grid-cols-2 bg-gradient-to-br from-[#EAF6FF] to-[#F7FBFF]">
      {/* Left: Form */}
      <div className="flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-lg">
          <Link href="/" className="inline-block mb-6">
            <h1 className="text-3xl font-bold text-[#31BCFF]">ZenLink</h1>
          </Link>

          {/* Progress Steps */}
          <div className="flex items-center gap-3 mb-8">
            <div className={`h-9 w-9 rounded-full flex items-center justify-center text-sm font-semibold ${step >= 1 ? 'bg-[#31BCFF] text-white' : 'bg-gray-200 text-gray-600'}`}>1</div> 
            <span className="text-sm font-medium text-gray-700">Your account</span>
            <div className={`h-1 flex-1 rounded ${step >= 2 ? 'bg-[#31BCFF]' : 'bg-gray-200'}`}></div>
            <div className={`h-9 w-9 rounded-full flex items-center justify-center text-sm font-semibold ${step >= 2 ? 'bg-[#31BCFF] text-white' : 'bg-gray-200 text-gray-600'}`}>2</div>
            <span className="text-sm font-medium text-gray-700">Business details</span>
          </div>

          <div className="bg-white/90 backdrop-blur-sm shadow-lg rounded-2xl p-8">
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-md text-sm">
                {error}
              </div>
            )}

            {step === 1 ? (
              <form onSubmit={handleUserSubmit}>
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">Create your account</h2>
                <p className="text-sm text-gray-600 mb-6">Use your work email. You can update details later.</p>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                    <input
                      type="text"
                      value={userForm.firstName}
                      onChange={(e) => {
                        setUserForm({ ...userForm, firstName: e.target.value })
                      }}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#31BCFF]/30 focus:border-[#31BCFF] outline-none text-gray-700"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                    <input
                      type="text"
                      value={userForm.lastName}
                      onChange={(e) => setUserForm({ ...userForm, lastName: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#31BCFF]/30 focus:border-[#31BCFF] outline-none text-gray-700"
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
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#31BCFF]/30 focus:border-[#31BCFF] outline-none text-gray-700"
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
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#31BCFF]/30 focus:border-[#31BCFF] outline-none text-gray-700"
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
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#31BCFF]/30 focus:border-[#31BCFF] outline-none text-gray-700"
                    required
                  />
                  {fieldErrors.confirmPassword && (
                    <p className="mt-1 text-sm text-red-600">{fieldErrors.confirmPassword}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={stepOneLoading}
                  className="w-full bg-[#31BCFF] hover:bg-[#31BCFF]/90 text-white py-3 px-4 rounded-xl transition-colors disabled:opacity-50"
                >
                  {stepOneLoading ? 'Validating...' : 'Continue'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleBusinessSubmit}>
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">Your business</h2>
                <p className="text-sm text-gray-600 mb-6">Tell us about your company so we can tailor your workspace.</p>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Business Name</label>
                  <input
                    type="text"
                    value={businessForm.businessName}
                    onChange={(e) => setBusinessForm({ ...businessForm, businessName: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#31BCFF]/30 focus:border-[#31BCFF] outline-none"
                    required
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                  <input
                    type="text"
                    value={businessForm.address}
                    onChange={(e) => setBusinessForm({ ...businessForm, address: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#31BCFF]/30 focus:border-[#31BCFF] outline-none"
                    required
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type of Business</label>
                  <select
                    value={businessForm.typeOfBusiness}
                    onChange={(e) => setBusinessForm({ ...businessForm, typeOfBusiness: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#31BCFF]/30 focus:border-[#31BCFF] outline-none"
                    required
                  >
                    <option value="" disabled>Select industry</option>
                    {industryGroups.map(group => (
                      <optgroup key={group.group} label={group.group}>
                        {group.options.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Number of Employees</label>
                  <select
                    value={rangeFromQty(businessForm.employeesQty)}
                    onChange={(e) => setBusinessForm({ ...businessForm, employeesQty: toEmployeesQty(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#31BCFF]/30 focus:border-[#31BCFF] outline-none"
                    required
                  >
                    {employeeRangeOptions.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="w-full border border-[#31BCFF] text-[#31BCFF] hover:bg-[#31BCFF]/10 py-3 px-4 rounded-xl transition-colors"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-[#31BCFF] hover:bg-[#31BCFF]/90 text-white py-3 px-4 rounded-xl transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Creating Account...' : 'Create Account'}
                  </button>
                </div>
              </form>
            )}
          </div>

          <div className="mt-6 text-center text-sm text-gray-600">
            Already have an account?{' '}
            <Link href="/login" className="text-[#31BCFF] hover:underline font-medium">
              Sign in
            </Link>
          </div>
        </div>
      </div>

      {/* Right: Hero */}
      <div className="hidden md:flex relative items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-[#31BCFF]" />
        <div className="absolute -right-16 -top-20 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -right-10 bottom-0 h-96 w-96 rounded-full bg-white/10 blur-2xl" />
        <div className="relative z-10 max-w-md text-white px-10">
          <h3 className="text-3xl font-semibold mb-4">Get started fast</h3>
          <p className="text-white/90 mb-6">Modern scheduling and payroll tools to help your team move faster.</p>
          <ul className="space-y-3 text-white/95">
            <li className="flex items-start gap-2">
              <CheckCircleIcon className="h-5 w-5" />
              <span>Simple two-step onboarding</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircleIcon className="h-5 w-5" />
              <span>Shifts, attendance and payroll in one place</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircleIcon className="h-5 w-5" />
              <span>Secure by default</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
