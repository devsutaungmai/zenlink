'use client'

import React, { useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { CameraIcon, TrashIcon, UserCircleIcon } from '@heroicons/react/24/outline'
import Image from 'next/image'

interface ProfilePhotoUploadProps {
  currentPhotoUrl?: string | null
  onPhotoChange: (url: string | null) => void
  disabled?: boolean
}

export default function ProfilePhotoUpload({
  currentPhotoUrl,
  onPhotoChange,
  disabled = false,
}: ProfilePhotoUploadProps) {
  const { t } = useTranslation()
  const [photoUrl, setPhotoUrl] = useState<string | null>(currentPhotoUrl || null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      setError(t('employees.form.photo_type_error'))
      return
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setError(t('employees.form.photo_size_error'))
      return
    }

    setError(null)
    setUploading(true)

    try {
      const formData = new FormData()
      formData.append('file', file)
      if (photoUrl) {
        formData.append('oldPhotoUrl', photoUrl)
      }

      const response = await fetch('/api/upload/employee-photo', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || t('employees.form.photo_upload_failed'))
      }

      setPhotoUrl(data.url)
      onPhotoChange(data.url)
    } catch (err) {
      console.error('Upload error:', err)
      setError(err instanceof Error ? err.message : t('employees.form.photo_upload_failed'))
    } finally {
      setUploading(false)
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleRemovePhoto = async () => {
    if (!photoUrl) return

    setUploading(true)
    setError(null)

    try {
      const response = await fetch(`/api/upload/employee-photo?url=${encodeURIComponent(photoUrl)}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || t('employees.form.photo_delete_failed'))
      }

      setPhotoUrl(null)
      onPhotoChange(null)
    } catch (err) {
      console.error('Delete error:', err)
      setError(err instanceof Error ? err.message : t('employees.form.photo_delete_failed'))
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium text-gray-700">
        {t('employees.form.profile_photo')}
      </label>

      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">
        {/* Photo Preview */}
        <div className="flex-shrink-0">
          <div className="relative h-24 w-24 sm:h-32 sm:w-32 rounded-full overflow-hidden bg-gray-100 border-2 border-gray-200">
            {photoUrl ? (
              <Image
                src={photoUrl}
                alt="Profile"
                fill
                className="object-cover"
              />
            ) : (
              <UserCircleIcon className="h-full w-full text-gray-400 p-3 sm:p-4" />
            )}
            {uploading && (
              <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-white"></div>
              </div>
            )}
          </div>
        </div>

        {/* Upload Controls */}
        <div className="flex-1 w-full space-y-3">
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || uploading}
              className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#31BCFF] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CameraIcon className="h-5 w-5 mr-2 flex-shrink-0" />
              {photoUrl ? t('employees.form.change_photo') : t('employees.form.upload_photo')}
            </button>

            {photoUrl && (
              <button
                type="button"
                onClick={handleRemovePhoto}
                disabled={disabled || uploading}
                className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <TrashIcon className="h-5 w-5 mr-2 flex-shrink-0" />
                {t('employees.form.remove_photo')}
              </button>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            onChange={handleFileSelect}
            className="hidden"
            disabled={disabled || uploading}
          />

          <p className="text-xs text-gray-500 text-center sm:text-left">
            {t('employees.form.photo_format_hint')}
          </p>

          {error && (
            <p className="text-sm text-red-600 text-center sm:text-left">{error}</p>
          )}
        </div>
      </div>
    </div>
  )
}
