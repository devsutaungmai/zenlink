'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import EmployeeProfileForm from '@/components/EmployeeProfileForm'
import { useUser } from '@/shared/lib/useUser'
import Swal from 'sweetalert2'

interface EmployeeProfile {
  id: string
  firstName: string
  lastName: string
  employeeNo: string
  email?: string
  mobile?: string
  address?: string
  birthday?: string
  department: {
    id: string
    name: string
  }
  employeeGroup?: {
    id: string
    name: string
  }
  user: {
    id: string
    email: string
    firstName: string
    lastName: string
    role: string
  }
}

export default function EmployeeProfileEditPage() {
  const router = useRouter()
  const { user } = useUser()
  const [profile, setProfile] = useState<EmployeeProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      const response = await fetch('/api/employee/profile')
      const data = await response.json()

      if (response.ok) {
        setProfile(data)
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: data.error || 'Failed to load profile'
        })
        router.push('/employee/dashboard')
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to load profile'
      })
      router.push('/employee/dashboard')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (formData: any) => {
    setSaving(true)

    try {
      const response = await fetch('/api/employee/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (response.ok) {
        setProfile(data.profile)
        
        Swal.fire({
          icon: 'success',
          title: 'Success!',
          text: 'Profile updated successfully',
          timer: 2000,
          showConfirmButton: false
        })

        // Redirect back to dashboard after successful update
        setTimeout(() => {
          router.push('/employee/dashboard')
        }, 2000)
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: data.error || 'Failed to update profile'
        })
      }
    } catch (error) {
      console.error('Error updating profile:', error)
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to update profile'
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#31BCFF]"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900">Profile not found</h1>
            <p className="mt-2 text-gray-600">Unable to load profile information.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <nav className="flex" aria-label="Breadcrumb">
            <ol className="flex items-center space-x-4">
              <li>
                <button
                  onClick={() => router.push('/employee/dashboard')}
                  className="text-gray-400 hover:text-gray-500"
                >
                  Dashboard
                </button>
              </li>
              <li>
                <div className="flex items-center">
                  <svg className="flex-shrink-0 h-5 w-5 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="ml-4 text-sm font-medium text-gray-500">Edit Profile</span>
                </div>
              </li>
            </ol>
          </nav>
          
          <div className="mt-4">
            <h1 className="text-3xl font-bold text-gray-900">Edit Profile</h1>
            <p className="mt-2 text-gray-600">
              Update your personal information and contact details.
            </p>
          </div>
        </div>

        {/* Profile Info Card */}
        <div className="mb-8 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center space-x-4">
            <div className="h-16 w-16 bg-gradient-to-r from-[#31BCFF] to-[#0EA5E9] rounded-full flex items-center justify-center">
              <span className="text-xl font-semibold text-white">
                {profile.firstName.charAt(0)}{profile.lastName.charAt(0)}
              </span>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {profile.firstName} {profile.lastName}
              </h2>
              <p className="text-gray-600">Employee #{profile.employeeNo}</p>
              <div className="flex items-center mt-1 space-x-4">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {profile.department.name}
                </span>
                {profile.employeeGroup && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    {profile.employeeGroup.name}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Edit Form */}
        <EmployeeProfileForm
          initialData={{
            firstName: profile.firstName,
            lastName: profile.lastName,
            email: profile.email,
            mobile: profile.mobile,
            address: profile.address,
            birthday: profile.birthday ? new Date(profile.birthday) : undefined
          }}
          onSubmit={handleSubmit}
          loading={saving}
        />
      </div>
    </div>
  )
}
