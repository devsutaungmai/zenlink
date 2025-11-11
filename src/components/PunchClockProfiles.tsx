'use client'

import React, { useState, useEffect } from 'react'
import { PlusIcon, PencilIcon, TrashIcon, KeyIcon } from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import ProfileFormModal from '@/components/ProfileFormModal'
import { useTranslation } from 'react-i18next'

interface PunchClockProfile {
  id: string
  name: string
  departmentId: string
  departmentName: string
  isActive: boolean
  activationCode?: string
  createdAt: string
}

interface Department {
  id: string
  name: string
}

export default function PunchClockProfiles() {
  const [profiles, setProfiles] = useState<PunchClockProfile[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingProfile, setEditingProfile] = useState<PunchClockProfile | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const { t } = useTranslation('settings')

  // Fetch profiles and departments from API
  useEffect(() => {
    fetchProfiles()
    fetchDepartments()
  }, [])

  const fetchProfiles = async () => {
    try {
      const response = await fetch('/api/punch-clock-profiles')
      if (response.ok) {
        const data = await response.json()
        setProfiles(data)
      } else {
        console.error('Failed to fetch profiles')
      }
    } catch (error) {
      console.error('Error fetching profiles:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchDepartments = async () => {
    try {
      const response = await fetch('/api/departments')
      if (response.ok) {
        const data = await response.json()
        setDepartments(data)
      } else {
        console.error('Failed to fetch departments')
      }
    } catch (error) {
      console.error('Error fetching departments:', error)
    }
  }

  const handleCreateProfile = () => {
    setEditingProfile(null)
    setShowCreateModal(true)
  }

  const handleEditProfile = (profile: PunchClockProfile) => {
    setEditingProfile(profile)
    setShowCreateModal(true)
  }

  const handleSaveProfile = async (profileData: { name: string; departmentId: string; isActive: boolean }) => {
    setSubmitting(true)
    try {
      if (editingProfile) {
        // Update existing profile
        const response = await fetch(`/api/punch-clock-profiles/${editingProfile.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(profileData)
        })

        if (response.ok) {
          const updatedProfile = await response.json()
          setProfiles(profiles.map(p =>
            p.id === editingProfile.id ? updatedProfile : p
          ))
        } else {
          throw new Error('Failed to update profile')
        }
      } else {
        // Create new profile
        const response = await fetch('/api/punch-clock-profiles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(profileData)
        })

        if (response.ok) {
          const newProfile = await response.json()
          // Add department name from departments list
          const department = departments.find(d => d.id === profileData.departmentId)
          if (department) {
            newProfile.departmentName = department.name
          }
          setProfiles([newProfile, ...profiles])
        } else {
          throw new Error('Failed to create profile')
        }
      }
    } catch (error) {
      console.error('Error saving profile:', error)
      throw error // Re-throw so the modal can handle it
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteProfile = async (profileId: string, profileName: string) => {
    const confirmed = window.confirm(`Are you sure you want to delete "${profileName}"? This action cannot be undone.`)

    if (!confirmed) {
      return
    }

    try {
      const response = await fetch(`/api/punch-clock-profiles/${profileId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setProfiles(profiles.filter(p => p.id !== profileId))
      } else {
        console.error('Failed to delete profile')
        alert('Failed to delete profile. Please try again.')
      }
    } catch (error) {
      console.error('Error deleting profile:', error)
      alert('Failed to delete profile. Please try again.')
    }
  }

  const handleToggleActive = async (profileId: string) => {
    const profile = profiles.find(p => p.id === profileId)
    if (!profile) return

    try {
      const response = await fetch(`/api/punch-clock-profiles/${profileId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: profile.name,
          departmentId: profile.departmentId,
          isActive: !profile.isActive
        })
      })

      if (response.ok) {
        setProfiles(profiles.map(p =>
          p.id === profileId ? { ...p, isActive: !p.isActive } : p
        ))
      } else {
        console.error('Failed to toggle profile status')
      }
    } catch (error) {
      console.error('Error toggling profile status:', error)
    }
  }

  const handleGenerateActivationCode = async (profileId: string) => {
    try {
      const response = await fetch(`/api/punch-clock-profiles/${profileId}/generate-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      if (response.ok) {
        const { profile: updatedProfile, activationCode } = await response.json()
        setProfiles(profiles.map(p =>
          p.id === profileId ? { ...p, activationCode } : p
        ))

        // Show the generated code to the user
        alert(`New activation code generated: ${activationCode}\n\nThis code can be used to activate this punch clock profile.`)
      } else {
        console.error('Failed to generate activation code')
        alert('Failed to generate activation code. Please try again.')
      }
    } catch (error) {
      console.error('Error generating activation code:', error)
      alert('Failed to generate activation code. Please try again.')
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{t('punch_clock.profile_setting.title')}</h2>
            <p className="text-sm text-gray-600 mt-1">
              {t('punch_clock.profile_setting.description')}
            </p>
          </div>
          <button
            onClick={handleCreateProfile}
            className="inline-flex items-center px-4 py-2 bg-[#31BCFF] text-white text-sm font-medium rounded-lg hover:bg-[#31BCFF]/90 transition-colors"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            {t('punch_clock.profile_setting.buttons.create_profile')}
          </button>
        </div>
      </div>

      {/* Profile List */}
      <div className="p-6">
        {profiles.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-lg mb-2">{t('punch_clock.profile_setting.no_profiles_title')}</div>
            <p className="text-gray-500 text-sm mb-4">
              {t('punch_clock.profile_setting.no_profiles_description')}
            </p>
            <button
              onClick={handleCreateProfile}
              className="inline-flex items-center px-4 py-2 bg-[#31BCFF] text-white text-sm font-medium rounded-lg hover:bg-[#31BCFF]/90 transition-colors"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              {t('punch_clock.profile_setting.buttons.create_profile')}
            </button>
          </div>
        ) : (
          <div className="overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('punch_clock.profile_setting.table.profile_name')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('punch_clock.profile_setting.table.department')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('punch_clock.profile_setting.table.status')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('punch_clock.profile_setting.table.activation_code')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('punch_clock.profile_setting.table.created')}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('punch_clock.profile_setting.table.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {profiles.map((profile) => (
                  <tr key={profile.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{profile.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{profile.departmentName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge
                        variant={profile.isActive ? "default" : "secondary"}
                        className={`cursor-pointer ${profile.isActive
                            ? 'bg-green-100 text-green-800 hover:bg-green-200'
                            : 'bg-red-100 text-red-800 hover:bg-red-200'
                          }`}
                        onClick={() => handleToggleActive(profile.id)}
                      >
                        {profile.isActive ? t('punch_clock.profile_setting.status.active') : t('punch_clock.profile_setting.status.inactive')}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        {profile.activationCode ? (
                          <div className="flex items-center space-x-2">
                            <code className="px-2 py-1 bg-gray-100 rounded text-sm font-mono">
                              {profile.activationCode}
                            </code>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleGenerateActivationCode(profile.id)}
                              className="text-gray-600 hover:text-[#31BCFF] p-1"
                              title={t('punch_clock.profile_setting.buttons.generate_new_code')}
                            >
                              <KeyIcon className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleGenerateActivationCode(profile.id)}
                            className="text-[#31BCFF] border-[#31BCFF] hover:bg-[#31BCFF] hover:text-white"
                          >
                            <KeyIcon className="h-4 w-4 mr-1" />
                            {t('punch_clock.profile_setting.buttons.generate_code')}

                          </Button>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(profile.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditProfile(profile)}
                          className="text-gray-600 hover:text-[#31BCFF]"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteProfile(profile.id, profile.name)}
                          className="text-gray-600 hover:text-red-600"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      <ProfileFormModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false)
          setEditingProfile(null)
        }}
        onSave={handleSaveProfile}
        profile={editingProfile}
        departments={departments}
        loading={submitting}
      />
    </div>
  )
}
