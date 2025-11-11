'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import UserProfileForm from '@/components/UserProfileForm'
import { useUser } from '@/shared/lib/useUser'
import Swal from 'sweetalert2'
import { useTranslation } from 'react-i18next'

interface UserProfile {
  id: string
  email: string
  firstName: string
  lastName: string
  role: string
  createdAt: string
  business: {
    id: string
    name: string
    address: string
    type: string
  }
}

export default function ProfileEditPage() {
  const router = useRouter()
  const { user } = useUser()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const {t} = useTranslation('settings');
  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      const response = await fetch('/api/profile')
      const data = await response.json()

      if (response.ok) {
        setProfile(data)
      } else {
        Swal.fire({
          text: data.error || 'Failed to load profile',
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 4000,
          timerProgressBar: true,
          customClass: {
            popup: 'swal-toast-wide'
          }
        })
        router.push('/dashboard')
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
      Swal.fire({
        text: 'Failed to load profile',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 4000,
        timerProgressBar: true,
        customClass: {
          popup: 'swal-toast-wide'
        }
      })
      router.push('/dashboard')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (formData: any) => {
    setSaving(true)

    try {
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (response.ok) {
        setProfile(data.user)
        
        Swal.fire({
          text: 'Profile updated successfully',
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 3000,
          timerProgressBar: true,
          customClass: {
            popup: 'swal-toast-wide'
          }
        })

        // Redirect back to profile page after successful update
        setTimeout(() => {
          router.push('/dashboard/profile')
        }, 1500)
      } else {
        Swal.fire({
          text: data.error || 'Failed to update profile',
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 4000,
          timerProgressBar: true,
          customClass: {
            popup: 'swal-toast-wide'
          }
        })
      }
    } catch (error) {
      console.error('Error updating profile:', error)
      Swal.fire({
        text: 'Failed to update profile',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 4000,
        timerProgressBar: true,
        customClass: {
          popup: 'swal-toast-wide'
        }
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
            <h1 className="text-2xl font-bold text-gray-900">{t('profile.not_found')}</h1>
            <p className="mt-2 text-gray-600">{t('profile.unabled_load')}</p>
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
                  onClick={() => router.push('/dashboard')}
                  className="text-gray-400 hover:text-gray-500"
                >
                  {t('profile.page.dashboard')}
                </button>
              </li>
              <li>
                <div className="flex items-center">
                  <svg className="flex-shrink-0 h-5 w-5 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                  <button
                    onClick={() => router.push('/dashboard/profile')}
                    className="ml-4 text-gray-400 hover:text-gray-500"
                  >
                    {t('profile.page.breadcrumb')}
                  </button>
                </div>
              </li>
              <li>
                <div className="flex items-center">
                  <svg className="flex-shrink-0 h-5 w-5 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                   <span className="ml-4 text-sm font-medium text-gray-500">{t('profile.edit_profile_page.breadcrumb')}</span>
                </div>
              </li>
            </ol>
          </nav>
          
          <div className="mt-4">
          <h1 className="text-3xl font-bold text-gray-900">{t('profile.edit_profile_page.title')}</h1>
          <p className="mt-2 text-gray-600">
            {t('profile.edit_profile_page.description')}
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
              <p className="text-gray-600">{profile.email}</p>
              <div className="flex items-center mt-1">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {profile.role}
                </span>
                <span className="ml-2 text-sm text-gray-500">
                  {profile.business.name}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Edit Form */}
        <UserProfileForm
          initialData={{
            firstName: profile.firstName,
            lastName: profile.lastName,
            email: profile.email
          }}
          onSubmit={handleSubmit}
          loading={saving}
        />
      </div>
    </div>
  )
}
