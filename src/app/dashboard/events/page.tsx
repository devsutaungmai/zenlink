'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import {
  PlusIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
  CalendarIcon,
  MapPinIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline'
import Swal from 'sweetalert2'
import { usePermissions } from '@/shared/lib/usePermissions'
import { PERMISSIONS } from '@/shared/lib/permissions'

interface Department {
  id: string
  name: string
}

interface Event {
  id: string
  title: string
  description: string | null
  eventDate: string
  startTime: string
  endTime: string | null
  location: string | null
  type: 'MEETING' | 'TRAINING' | 'EVENT'
  status: 'DRAFT' | 'PUBLISHED'
  allDepartments: boolean
  departments: Department[]
  createdAt: string
  updatedAt: string
}

const ITEMS_PER_PAGE = 10

export default function EventsPage() {
  const { t, i18n } = useTranslation()
  const router = useRouter()
  const { hasPermission, loading: permissionsLoading } = usePermissions()
  
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<string>('')

  const canViewEvents = hasPermission(PERMISSIONS.EVENTS_VIEW)
  const canCreateEvents = hasPermission(PERMISSIONS.EVENTS_CREATE)
  const canEditEvents = hasPermission(PERMISSIONS.EVENTS_EDIT)
  const canDeleteEvents = hasPermission(PERMISSIONS.EVENTS_DELETE)

  useEffect(() => {
    if (!permissionsLoading && canViewEvents) {
      fetchEvents()
    }
  }, [permissionsLoading, canViewEvents])

  const fetchEvents = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/events')
      if (!res.ok) throw new Error('Failed to fetch events')
      const data = await res.json()
      setEvents(data)
    } catch (error) {
      console.error('Error fetching events:', error)
      Swal.fire({
        icon: 'error',
        title: t('events.errors.fetch_failed'),
        text: t('events.errors.fetch_failed_desc'),
      })
    } finally {
      setLoading(false)
    }
  }

  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      const matchesSearch = event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.location?.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesStatus = !statusFilter || event.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [events, searchQuery, statusFilter])

  const paginatedEvents = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return filteredEvents.slice(start, start + ITEMS_PER_PAGE)
  }, [filteredEvents, currentPage])

  const totalPages = Math.ceil(filteredEvents.length / ITEMS_PER_PAGE)

  const handleDelete = async (event: Event) => {
    const result = await Swal.fire({
      title: t('events.delete_confirm.title'),
      text: t('events.delete_confirm.text', { name: event.title }),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#EF4444',
      cancelButtonColor: '#6B7280',
      confirmButtonText: t('events.delete_confirm.confirm'),
      cancelButtonText: t('events.delete_confirm.cancel'),
    })

    if (result.isConfirmed) {
      try {
        const res = await fetch(`/api/events/${event.id}`, { method: 'DELETE' })
        if (!res.ok) throw new Error('Failed to delete event')
        
        Swal.fire({
          icon: 'success',
          title: t('events.delete_success.title'),
          timer: 1500,
          showConfirmButton: false,
        })
        fetchEvents()
      } catch (error) {
        Swal.fire({
          icon: 'error',
          title: t('events.errors.delete_failed'),
        })
      }
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(i18n.language, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const getTypeLabel = (type: string) => {
    return t(`events.types.${type.toLowerCase()}`)
  }

  const getTypeBadgeClass = (type: string) => {
    switch (type) {
      case 'MEETING':
        return 'bg-blue-100 text-blue-800'
      case 'TRAINING':
        return 'bg-purple-100 text-purple-800'
      case 'EVENT':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusBadgeClass = (status: string) => {
    return status === 'PUBLISHED'
      ? 'bg-green-100 text-green-800'
      : 'bg-yellow-100 text-yellow-800'
  }

  if (permissionsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#31BCFF]"></div>
      </div>
    )
  }

  if (!canViewEvents) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900">{t('common.access_denied')}</h2>
          <p className="mt-2 text-gray-600">{t('common.no_permission')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
              {t('events.title')}
            </h1>
            <p className="mt-2 text-gray-600">{t('events.description')}</p>
          </div>
          {canCreateEvents && (
            <button
              onClick={() => router.push('/dashboard/events/create')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#31BCFF] text-white rounded-xl hover:bg-[#31BCFF]/90 transition-colors shadow-lg shadow-[#31BCFF]/25"
            >
              <PlusIcon className="w-5 h-5" />
              {t('events.create_event')}
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 shadow-lg p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder={t('events.search_placeholder')}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setCurrentPage(1)
              }}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#31BCFF]/50 focus:border-[#31BCFF]"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value)
              setCurrentPage(1)
            }}
            className="px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#31BCFF]/50 focus:border-[#31BCFF]"
          >
            <option value="">{t('events.all_statuses')}</option>
            <option value="DRAFT">{t('events.status.draft')}</option>
            <option value="PUBLISHED">{t('events.status.published')}</option>
          </select>
        </div>
      </div>

      {/* Table - Desktop */}
      <div className="hidden md:block bg-white/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 shadow-lg overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#31BCFF]"></div>
          </div>
        ) : paginatedEvents.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            {searchQuery || statusFilter ? t('events.no_results') : t('events.no_events')}
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50/50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  {t('events.table.title')}
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  {t('events.table.date_time')}
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  {t('events.table.location')}
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  {t('events.table.type')}
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  {t('events.table.status')}
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  {t('events.table.departments')}
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  {t('events.table.actions')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedEvents.map((event) => (
                <tr key={event.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{event.title}</div>
                    {event.description && (
                      <div className="text-sm text-gray-500 truncate max-w-xs">{event.description}</div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-gray-600">
                      <CalendarIcon className="w-4 h-4" />
                      <span>{formatDate(event.eventDate)}</span>
                    </div>
                    <div className="text-sm text-gray-500">
                      {event.startTime}{event.endTime && ` - ${event.endTime}`}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {event.location ? (
                      <div className="flex items-center gap-2 text-gray-600">
                        <MapPinIcon className="w-4 h-4" />
                        <span>{event.location}</span>
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getTypeBadgeClass(event.type)}`}>
                      {getTypeLabel(event.type)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusBadgeClass(event.status)}`}>
                      {t(`events.status.${event.status.toLowerCase()}`)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {event.allDepartments ? (
                      <span className="text-sm text-gray-600">{t('events.all_departments')}</span>
                    ) : (
                      <span className="text-sm text-gray-600">
                        {event.departments.length > 0
                          ? event.departments.map(d => d.name).join(', ')
                          : '-'}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {canEditEvents && (
                        <button
                          onClick={() => router.push(`/dashboard/events/${event.id}/edit`)}
                          className="p-2 text-gray-500 hover:text-[#31BCFF] hover:bg-[#31BCFF]/10 rounded-lg transition-colors"
                          title={t('events.edit')}
                        >
                          <PencilIcon className="w-4 h-4" />
                        </button>
                      )}
                      {canDeleteEvents && (
                        <button
                          onClick={() => handleDelete(event)}
                          className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title={t('events.delete')}
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Cards - Mobile */}
      <div className="md:hidden space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#31BCFF]"></div>
          </div>
        ) : paginatedEvents.length === 0 ? (
          <div className="text-center py-12 text-gray-500 bg-white/80 backdrop-blur-xl rounded-2xl border border-gray-200/50">
            {searchQuery || statusFilter ? t('events.no_results') : t('events.no_events')}
          </div>
        ) : (
          paginatedEvents.map((event) => (
            <div
              key={event.id}
              className="bg-white/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 shadow-lg p-4 space-y-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-medium text-gray-900">{event.title}</h3>
                  {event.description && (
                    <p className="text-sm text-gray-500 mt-1">{event.description}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getTypeBadgeClass(event.type)}`}>
                    {getTypeLabel(event.type)}
                  </span>
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusBadgeClass(event.status)}`}>
                    {t(`events.status.${event.status.toLowerCase()}`)}
                  </span>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <CalendarIcon className="w-4 h-4" />
                  <span>{formatDate(event.eventDate)} {event.startTime}</span>
                </div>
                {event.location && (
                  <div className="flex items-center gap-1">
                    <MapPinIcon className="w-4 h-4" />
                    <span>{event.location}</span>
                  </div>
                )}
              </div>

              <div className="text-sm text-gray-500">
                {event.allDepartments
                  ? t('events.all_departments')
                  : event.departments.map(d => d.name).join(', ') || '-'}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                {canEditEvents && (
                  <button
                    onClick={() => router.push(`/dashboard/events/${event.id}/edit`)}
                    className="px-3 py-1.5 text-sm text-[#31BCFF] hover:bg-[#31BCFF]/10 rounded-lg transition-colors"
                  >
                    {t('events.edit')}
                  </button>
                )}
                {canDeleteEvents && (
                  <button
                    onClick={() => handleDelete(event)}
                    className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    {t('events.delete')}
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-white/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 shadow-lg px-4 py-3">
          <div className="text-sm text-gray-600">
            {t('events.pagination.showing', {
              from: (currentPage - 1) * ITEMS_PER_PAGE + 1,
              to: Math.min(currentPage * ITEMS_PER_PAGE, filteredEvents.length),
              total: filteredEvents.length,
            })}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeftIcon className="w-5 h-5" />
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRightIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
