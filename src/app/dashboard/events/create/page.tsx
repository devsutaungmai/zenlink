'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { ChevronLeftIcon } from '@heroicons/react/24/outline'
import EventForm, { EventFormData } from '@/components/EventForm'
import { usePermissions } from '@/shared/lib/usePermissions'
import { PERMISSIONS } from '@/shared/lib/permissions'
import Swal from 'sweetalert2'

export default function CreateEventPage() {
  const { t } = useTranslation()
  const router = useRouter()
  const { hasPermission, loading: permissionsLoading } = usePermissions()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canCreateEvents = hasPermission(PERMISSIONS.EVENTS_CREATE)

  useEffect(() => {
    if (!permissionsLoading && !canCreateEvents) {
      router.push('/dashboard/events')
    }
  }, [permissionsLoading, canCreateEvents, router])

  const handleSubmit = async (formData: EventFormData) => {
    setSaving(true)
    setError(null)

    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to create event')
      }

      Swal.fire({
        icon: 'success',
        title: t('events.create_success.title'),
        timer: 1500,
        showConfirmButton: false,
      })

      router.push('/dashboard/events')
      router.refresh()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setSaving(false)
    }
  }

  if (permissionsLoading || !canCreateEvents) {
    return null
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/dashboard/events')}
            className="p-2 hover:bg-white/50 rounded-xl transition-colors duration-200"
          >
            <ChevronLeftIcon className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
              {t('events.create_title')}
            </h1>
            <p className="mt-2 text-gray-600">{t('events.create_description')}</p>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4">
          {error}
        </div>
      )}

      {/* Form */}
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 shadow-lg">
        <div className="p-6">
          <EventForm onSubmit={handleSubmit} loading={saving} />
        </div>
      </div>
    </div>
  )
}
