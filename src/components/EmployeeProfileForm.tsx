'use client'

import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { User, Mail, Phone, MapPin, Calendar, UserCheck } from 'lucide-react'
import { DatePicker } from '@/components/ui/date-picker'

interface EmployeeProfileFormData {
  firstName: string
  lastName: string
  email?: string
  mobile?: string
  address?: string
  birthday?: Date
}

interface EmployeeProfileFormProps {
  initialData: EmployeeProfileFormData
  onSubmit: (data: EmployeeProfileFormData) => void
  loading: boolean
}

export default function EmployeeProfileForm({
  initialData,
  onSubmit,
  loading
}: EmployeeProfileFormProps) {
  const { t } = useTranslation()
  const [formData, setFormData] = useState<EmployeeProfileFormData>(initialData)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const handleDateChange = (date: Date | undefined) => {
    setFormData(prev => ({ ...prev, birthday: date }))
    
    if (errors.birthday) {
      setErrors(prev => ({ ...prev, birthday: '' }))
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

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address'
    }

    if (formData.mobile && formData.mobile.length < 8) {
      newErrors.mobile = 'Please enter a valid mobile number'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    onSubmit(formData)
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-[#31BCFF] to-[#0EA5E9] px-6 py-4">
          <h2 className="text-xl font-semibold text-white flex items-center">
            <User className="w-5 h-5 mr-2" />
            Edit Employee Profile
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

          {/* Contact Information */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              <Mail className="w-4 h-4 inline mr-1" />
              Email Address
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email || ''}
              onChange={handleChange}
              className={`block w-full px-4 py-3 rounded-xl border-2 bg-white/70 backdrop-blur-sm text-gray-900 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#31BCFF]/50 ${
                errors.email 
                  ? 'border-red-300 focus:border-red-500' 
                  : 'border-gray-200 focus:border-[#31BCFF] hover:border-gray-300'
              }`}
              disabled={loading}
              placeholder="your.email@company.com"
            />
            {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
          </div>

          <div>
            <label htmlFor="mobile" className="block text-sm font-medium text-gray-700 mb-2">
              <Phone className="w-4 h-4 inline mr-1" />
              Mobile Number
            </label>
            <input
              type="tel"
              id="mobile"
              name="mobile"
              value={formData.mobile || ''}
              onChange={handleChange}
              className={`block w-full px-4 py-3 rounded-xl border-2 bg-white/70 backdrop-blur-sm text-gray-900 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#31BCFF]/50 ${
                errors.mobile 
                  ? 'border-red-300 focus:border-red-500' 
                  : 'border-gray-200 focus:border-[#31BCFF] hover:border-gray-300'
              }`}
              disabled={loading}
              placeholder="+66123456789"
            />
            {errors.mobile && <p className="mt-1 text-sm text-red-600">{errors.mobile}</p>}
            <p className="mt-1 text-xs text-gray-500">Include country code (e.g., +66 for Thailand)</p>
          </div>

          <div>
            <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
              <MapPin className="w-4 h-4 inline mr-1" />
              Address
            </label>
            <textarea
              id="address"
              name="address"
              value={formData.address || ''}
              onChange={handleChange}
              rows={3}
              className={`block w-full px-4 py-3 rounded-xl border-2 bg-white/70 backdrop-blur-sm text-gray-900 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#31BCFF]/50 ${
                errors.address 
                  ? 'border-red-300 focus:border-red-500' 
                  : 'border-gray-200 focus:border-[#31BCFF] hover:border-gray-300'
              }`}
              disabled={loading}
              placeholder="Enter your home address"
            />
            {errors.address && <p className="mt-1 text-sm text-red-600">{errors.address}</p>}
          </div>

          {/* Personal Information */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="w-4 h-4 inline mr-1" />
              Date of Birth
            </label>
            <div className="relative">
              <DatePicker
                date={formData.birthday}
                onDateChange={handleDateChange}
                className={`${
                  errors.birthday 
                    ? 'border-red-300 focus:border-red-500' 
                    : 'border-gray-200 focus:border-[#31BCFF] hover:border-gray-300'
                }`}
                placeholder="Select your date of birth"
                dateFormat="dd/MM/yyyy"
                yearRange={{
                  from: new Date().getFullYear() - 100,
                  to: new Date().getFullYear()
                }}
                disabled={loading}
              />
            </div>
            {errors.birthday && <p className="mt-1 text-sm text-red-600">{errors.birthday}</p>}
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
