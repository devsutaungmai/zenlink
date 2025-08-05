'use client'

import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { User, Lock, Mail, UserCheck } from 'lucide-react'

interface UserProfileFormData {
  firstName: string
  lastName: string
  email: string
  currentPassword?: string
  newPassword?: string
  confirmPassword?: string
}

interface UserProfileFormProps {
  initialData: UserProfileFormData
  onSubmit: (data: UserProfileFormData) => void
  loading: boolean
}

export default function UserProfileForm({
  initialData,
  onSubmit,
  loading
}: UserProfileFormProps) {
  const { t } = useTranslation()
  const [formData, setFormData] = useState<UserProfileFormData>(initialData)
  const [showPasswordSection, setShowPasswordSection] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required'
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required'
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address'
    }

    // Password validation only if changing password
    if (showPasswordSection) {
      if (!formData.currentPassword) {
        newErrors.currentPassword = 'Current password is required'
      }

      if (!formData.newPassword) {
        newErrors.newPassword = 'New password is required'
      } else if (formData.newPassword.length < 6) {
        newErrors.newPassword = 'Password must be at least 6 characters long'
      }

      if (formData.newPassword !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    // Only include password fields if changing password
    const submissionData: UserProfileFormData = {
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email
    }

    if (showPasswordSection && formData.newPassword) {
      submissionData.currentPassword = formData.currentPassword
      submissionData.newPassword = formData.newPassword
    }

    onSubmit(submissionData)
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-[#31BCFF] to-[#0EA5E9] px-6 py-4">
          <h2 className="text-xl font-semibold text-white flex items-center">
            <User className="w-5 h-5 mr-2" />
            Edit Profile
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
                First Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="firstName"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                className={`block w-full px-4 py-3 rounded-xl border-2 bg-white/70 backdrop-blur-sm text-gray-900 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#31BCFF]/50 ${
                  errors.firstName 
                    ? 'border-red-300 focus:border-red-500' 
                    : 'border-gray-200 focus:border-[#31BCFF] hover:border-gray-300'
                }`}
                disabled={loading}
              />
              {errors.firstName && <p className="mt-1 text-sm text-red-600">{errors.firstName}</p>}
            </div>

            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
                Last Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                className={`block w-full px-4 py-3 rounded-xl border-2 bg-white/70 backdrop-blur-sm text-gray-900 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#31BCFF]/50 ${
                  errors.lastName 
                    ? 'border-red-300 focus:border-red-500' 
                    : 'border-gray-200 focus:border-[#31BCFF] hover:border-gray-300'
                }`}
                disabled={loading}
              />
              {errors.lastName && <p className="mt-1 text-sm text-red-600">{errors.lastName}</p>}
            </div>
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              <Mail className="w-4 h-4 inline mr-1" />
              Email Address <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className={`block w-full px-4 py-3 rounded-xl border-2 bg-white/70 backdrop-blur-sm text-gray-900 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#31BCFF]/50 ${
                errors.email 
                  ? 'border-red-300 focus:border-red-500' 
                  : 'border-gray-200 focus:border-[#31BCFF] hover:border-gray-300'
              }`}
              disabled={loading}
            />
            {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
          </div>

          {/* Password Change Section */}
          <div className="border-t border-gray-200 pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <Lock className="w-5 h-5 mr-2" />
                Change Password
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowPasswordSection(!showPasswordSection)
                  if (!showPasswordSection) {
                    // Clear password fields when hiding section
                    setFormData(prev => ({
                      ...prev,
                      currentPassword: '',
                      newPassword: '',
                      confirmPassword: ''
                    }))
                    // Clear password errors
                    setErrors(prev => {
                      const newErrors = { ...prev }
                      delete newErrors.currentPassword
                      delete newErrors.newPassword
                      delete newErrors.confirmPassword
                      return newErrors
                    })
                  }
                }}
                className="text-sm text-[#31BCFF] hover:text-[#0EA5E9] font-medium"
              >
                {showPasswordSection ? 'Cancel Password Change' : 'Change Password'}
              </button>
            </div>

            {showPasswordSection && (
              <div className="space-y-4">
                <div>
                  <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-2">
                    Current Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    id="currentPassword"
                    name="currentPassword"
                    value={formData.currentPassword || ''}
                    onChange={handleChange}
                    className={`block w-full px-4 py-3 rounded-xl border-2 bg-white/70 backdrop-blur-sm text-gray-900 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#31BCFF]/50 ${
                      errors.currentPassword 
                        ? 'border-red-300 focus:border-red-500' 
                        : 'border-gray-200 focus:border-[#31BCFF] hover:border-gray-300'
                    }`}
                    disabled={loading}
                  />
                  {errors.currentPassword && <p className="mt-1 text-sm text-red-600">{errors.currentPassword}</p>}
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-2">
                      New Password <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      id="newPassword"
                      name="newPassword"
                      value={formData.newPassword || ''}
                      onChange={handleChange}
                      className={`block w-full px-4 py-3 rounded-xl border-2 bg-white/70 backdrop-blur-sm text-gray-900 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#31BCFF]/50 ${
                        errors.newPassword 
                          ? 'border-red-300 focus:border-red-500' 
                          : 'border-gray-200 focus:border-[#31BCFF] hover:border-gray-300'
                      }`}
                      disabled={loading}
                    />
                    {errors.newPassword && <p className="mt-1 text-sm text-red-600">{errors.newPassword}</p>}
                  </div>

                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                      Confirm New Password <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      id="confirmPassword"
                      name="confirmPassword"
                      value={formData.confirmPassword || ''}
                      onChange={handleChange}
                      className={`block w-full px-4 py-3 rounded-xl border-2 bg-white/70 backdrop-blur-sm text-gray-900 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#31BCFF]/50 ${
                        errors.confirmPassword 
                          ? 'border-red-300 focus:border-red-500' 
                          : 'border-gray-200 focus:border-[#31BCFF] hover:border-gray-300'
                      }`}
                      disabled={loading}
                    />
                    {errors.confirmPassword && <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <div className="flex justify-end pt-6 border-t border-gray-200">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center px-6 py-3 text-sm font-medium text-white bg-gradient-to-r from-[#31BCFF] to-[#0EA5E9] border border-transparent rounded-xl hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#31BCFF] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {loading ? (
                <>
                  <div className="animate-spin -ml-1 mr-3 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                  Updating...
                </>
              ) : (
                <>
                  <UserCheck className="w-4 h-4 mr-2" />
                  Update Profile
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
