'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useUser } from '@/shared/lib/useUser'
import {
  UserCircleIcon,
  PencilIcon,
  BuildingOfficeIcon,
  CalendarIcon,
  AtSymbolIcon,
  UserIcon,
  KeyIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline'
import Swal from 'sweetalert2'
import { useTranslation } from 'react-i18next'
import { ProfileSkeleton } from '@/components/skeletons/CommonSkeletons'

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

export default function ProfilePage() {
  const router = useRouter()
  const { user } = useUser()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const { t } = useTranslation('settings');

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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'Administrator'
      case 'EMPLOYEE':
        return 'Employee'
      case 'MANAGER':
        return 'Manager'
      default:
        return role
    }
  }

  if (loading) {
    return <ProfileSkeleton />
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 py-4 sm:py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{t('profile.not_found')}</h1>
            <p className="mt-2 text-sm sm:text-base text-gray-600">{t('profile.unabled_load')}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-4 sm:py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <nav className="flex mb-4" aria-label="Breadcrumb">
            <ol className="flex items-center space-x-2 sm:space-x-4">
              <li>
                <Link
                  href="/dashboard"
                  className="text-sm sm:text-base text-gray-400 hover:text-gray-500 transition-colors"
                >
                  {t('profile.page.dashboard')}
                </Link>
              </li>
              <li>
                <div className="flex items-center">
                  <ChevronRightIcon className="flex-shrink-0 h-4 w-4 sm:h-5 sm:w-5 text-gray-300" />
                  <span className="ml-2 sm:ml-4 text-xs sm:text-sm font-medium text-gray-500">{t('profile.page.breadcrumb')}</span>
                </div>
              </li>
            </ol>
          </nav>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{t('profile.page.title')}</h1>
              <p className="mt-1 sm:mt-2 text-sm sm:text-base text-gray-600">
                {t('profile.page.description')}
              </p>
            </div>
            <Link
              href="/dashboard/profile/edit"
              className="inline-flex items-center justify-center px-4 py-2.5 sm:py-2 bg-[#31BCFF] text-white text-sm sm:text-base rounded-lg hover:bg-[#31BCFF]/90 transition-colors font-medium"
            >
              <PencilIcon className="h-4 w-4 mr-2" />
              {t('profile.page.edit_profile_button')}
            </Link>
          </div>
        </div>

        {/* Profile Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Header Section */}
          <div className="bg-gradient-to-r from-[#31BCFF] to-[#0EA5E9] px-4 sm:px-6 py-6 sm:py-8">
            <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-6">
              <div className="h-16 w-16 sm:h-20 sm:w-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border-2 border-white/30 flex-shrink-0">
                <span className="text-xl sm:text-2xl font-bold text-white">
                  {profile.firstName.charAt(0)}{profile.lastName.charAt(0)}
                </span>
              </div>
              <div className="text-white text-center sm:text-left">
                <h2 className="text-xl sm:text-2xl font-bold">
                  {profile.firstName} {profile.lastName}
                </h2>
                <p className="text-blue-100 text-base sm:text-lg mt-1 break-all">{profile.email}</p>
                <div className="flex items-center justify-center sm:justify-start mt-2">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs sm:text-sm font-medium bg-white/20 text-white border border-white/30">
                    {getRoleDisplayName(profile.role)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Content Section */}
          <div className="p-4 sm:p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Personal Information */}
              <div className="space-y-4">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                  {t('profile.personal_information.title')}
                </h3>

                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <UserIcon className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm font-medium text-gray-500">{t('profile.personal_information.full_name')}</p>
                      <p className="text-sm sm:text-base text-gray-900 break-words">{profile.firstName} {profile.lastName}</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <AtSymbolIcon className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm font-medium text-gray-500">{t('profile.personal_information.email_address')}</p>
                      <p className="text-sm sm:text-base text-gray-900 break-all">{profile.email}</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <UserCircleIcon className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm font-medium text-gray-500">{t('profile.personal_information.role')}</p>
                      <p className="text-sm sm:text-base text-gray-900">{getRoleDisplayName(profile.role)}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Business Information */}
              <div className="space-y-4">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                  {t('profile.business_information.title')}
                </h3>

                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <BuildingOfficeIcon className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm font-medium text-gray-500">{t('profile.business_information.business_name')}</p>
                      <p className="text-sm sm:text-base text-gray-900 break-words">{profile.business.name}</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <svg className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm font-medium text-gray-500">{t('profile.business_information.business_address')}</p>
                      <p className="text-sm sm:text-base text-gray-900 break-words">{profile.business.address}</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <svg className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm font-medium text-gray-500">{t('profile.business_information.business_type')}</p>
                      <p className="text-sm sm:text-base text-gray-900 break-words">{profile.business.type}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Account Details */}
            <div className="mt-6 sm:mt-8 pt-6 border-t border-gray-200">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">
                {t('profile.account_details.title')}
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-start space-x-3">
                  <CalendarIcon className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm font-medium text-gray-500">{t('profile.account_details.member_since')}</p>
                    <p className="text-sm sm:text-base text-gray-900">{formatDate(profile.createdAt)}</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <KeyIcon className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm font-medium text-gray-500">{t('profile.account_details.password')}</p>
                    <p className="text-sm sm:text-base text-gray-900">••••••••</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-6 sm:mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <Link
            href="/dashboard/profile/edit"
            className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200 hover:border-[#31BCFF] hover:bg-blue-50/50 transition-all group"
          >
            <div className="flex items-center space-x-3 min-w-0 flex-1">
              <PencilIcon className="h-5 w-5 text-gray-400 group-hover:text-[#31BCFF] flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm sm:text-base font-medium text-gray-900 group-hover:text-[#31BCFF]">{t('profile.actions.edit_profile.title')}</p>
                <p className="text-xs sm:text-sm text-gray-500 truncate">{t('profile.actions.edit_profile.description')}</p>
              </div>
            </div>
            <ChevronRightIcon className="h-5 w-5 text-gray-400 group-hover:text-[#31BCFF] flex-shrink-0 ml-2" />
          </Link>

          <Link
            href="/dashboard/settings"
            className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200 hover:border-[#31BCFF] hover:bg-blue-50/50 transition-all group"
          >
            <div className="flex items-center space-x-3 min-w-0 flex-1">
              <svg className="h-5 w-5 text-gray-400 group-hover:text-[#31BCFF] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <div className="min-w-0 flex-1">
                <p className="text-sm sm:text-base font-medium text-gray-900 group-hover:text-[#31BCFF]">{t('profile.actions.account_settings.title')}</p>
                <p className="text-xs sm:text-sm text-gray-500 truncate">{t('profile.actions.account_settings.description')}</p>
              </div>
            </div>
            <ChevronRightIcon className="h-5 w-5 text-gray-400 group-hover:text-[#31BCFF] flex-shrink-0 ml-2" />
          </Link>
        </div>
      </div>
    </div>
  )
}
