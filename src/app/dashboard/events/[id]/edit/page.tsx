'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { ChevronLeftIcon } from '@heroicons/react/24/outline'
import EventForm, { EventFormData } from '@/components/EventForm'
import { usePermissions } from '@/shared/lib/usePermissions'
import { PERMISSIONS } from '@/shared/lib/permissions'
import Swal from 'sweetalert2'

interface EventData extends EventFormData {
  id: string
}

export default function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { t } = useTranslation()
  const eventId = React.use(params).id
  const router = useRouter()
  const { hasPermission, loading: permissionsLoading } = usePermissions()
  const [event, setEvent] = useState<EventData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canEditEvents = hasPermission(PERMISSIONS.EVENTS_EDIT)

  useEffect(() => {
    if (!permissionsLoading && !canEditEvents) {
      router.push('/dashboard/events')
    }
  }, [permissionsLoading, canEditEvents, router])

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const res = await fetch(`/api/events/${eventId}`)
        if (!res.ok) throw new Error('Failed to fetch event')
        const data = await res.json()
        
        const mapped: EventData = {
          id: data.id,
          title: data.title,
          description: data.description || '',
          eventDate: data.eventDate ? data.eventDate.split('T')[0] : '',
          startTime: data.startTime,
          endTime: data.endTime || '',
          location: data.location || '',
          type: data.type,
          status: data.status,
          allDepartments: data.allDepartments,
          departmentIds: data.departments?.map((d: any) => d.id) || [],
        }
        setEvent(mapped)
      } catch (error) {
        setError(error instanceof Error ? error.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchEvent()
  }, [eventId])

  const handleSubmit = async (formData: EventFormData) => {
    setSaving(true)
    setError(null)

    try {
      const res = await fetch(`/api/events/${eventId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to update event')
      }

      Swal.fire({
        icon: 'success',
        title: t('events.update_success.title'),
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

  if (permissionsLoading || !canEditEvents) {
    return null
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="p-4 text-gray-500">{t('common.loading')}...</div>
      </div>
    )
  }

  if (error && !event) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-md">
          {error}
          <button
            onClick={() => router.push('/dashboard/events')}
            className="mt-2 px-4 py-2 text-sm font-medium text-white bg-[#31BCFF] rounded-md hover:bg-[#31BCFF]/90"
          >
            {t('events.back_to_events')}
          </button>
        </div>
      </div>
    )
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
              {event ? event.title : t('events.edit_title')}
            </h1>
            <p className="mt-2 text-gray-600">{t('events.edit_description')}</p>
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
          {event ? (
            <EventForm initialData={event} onSubmit={handleSubmit} loading={saving} />
          ) : (
            <div className="p-4 text-gray-500 text-center">
              {t('events.not_found')}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
