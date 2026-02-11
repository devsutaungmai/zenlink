'use client'

import React, { useEffect, useState } from 'react'
import { ChevronLeftIcon, ChevronRightIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { Calendar as CalendarIcon, Check, X, Clock } from 'lucide-react'
import Swal from 'sweetalert2'
import { useUser } from '@/shared/lib/useUser'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'

interface Availability {
  id: string
  date: string
  isAvailable: boolean
  note?: string
}

export default function EmployeeAvailabilityPage() {
  const router = useRouter()
  const { t, i18n } = useTranslation('employee-dashboard')
  const { user, loading: userLoading } = useUser({ preferEmployee: true })
  const [currentDate, setCurrentDate] = useState(new Date())
  const [availabilities, setAvailabilities] = useState<Availability[]>([])
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set())
  const [availabilityLoading, setAvailabilityLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [reason, setReason] = useState('')
  const [viewingNote, setViewingNote] = useState<{ date: string; note: string; isAvailable: boolean } | null>(null)

  const currentMonth = currentDate.getMonth()
  const currentYear = currentDate.getFullYear()

  const fetchAvailabilities = async () => {
    const employeeId = user?.employee?.id || (user?.role === 'EMPLOYEE' ? user.id : null)
    if (!employeeId) return

    try {
      setAvailabilityLoading(true)
      const response = await fetch(
        `/api/availability?employeeId=${employeeId}&month=${currentMonth + 1}&year=${currentYear}`
      )
      
      if (!response.ok) {
        throw new Error('Failed to fetch availabilities')
      }
      
      const data = await response.json()
      setAvailabilities(data)
    } catch (error) {
      console.error('Error fetching availabilities:', error)
      Swal.fire({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        icon: 'error',
        title: t('availability_page.toast_failed_load')
      })
    } finally {
      setAvailabilityLoading(false)
    }
  }

  useEffect(() => {
    if (user?.employee?.id) {
      fetchAvailabilities()
    }
  }, [currentDate, user?.employee?.id])

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    const days = []
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null)
    }
    
    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day))
    }
    
    return days
  }

  const formatDateKey = (date: Date) => {
    return date.toISOString().split('T')[0]
  }

  const getAvailabilityForDate = (date: Date) => {
    const dateKey = formatDateKey(date)
    return availabilities.find(av => av.date.startsWith(dateKey))
  }

  const isDateSelected = (date: Date) => {
    return selectedDates.has(formatDateKey(date))
  }

  const toggleDateSelection = (date: Date) => {
    const dateKey = formatDateKey(date)
    const newSelected = new Set(selectedDates)
    
    if (newSelected.has(dateKey)) {
      newSelected.delete(dateKey)
    } else {
      newSelected.add(dateKey)
    }
    
    setSelectedDates(newSelected)
  }

  const handleSetAvailability = async (isAvailable: boolean) => {
    if (selectedDates.size === 0) {
      Swal.fire({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        icon: 'warning',
        title: t('availability_page.toast_select_date')
      })
      return
    }

    if (!user?.employee?.id) return

    setSubmitting(true)
    try {
      const response = await fetch('/api/availability', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          employeeId: user?.employee?.id || (user?.role === 'EMPLOYEE' ? user.id : null),
          dates: Array.from(selectedDates),
          isAvailable,
          note: reason.trim() || null
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update availability')
      }

      await fetchAvailabilities()
      setSelectedDates(new Set())
      setReason('')

      Swal.fire({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        icon: 'success',
        title: t('availability_page.toast_marked', {
          count: selectedDates.size,
          status: isAvailable ? t('availability_page.available') : t('availability_page.unavailable')
        })
      })
    } catch (error) {
      console.error('Error updating availability:', error)
      Swal.fire({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        icon: 'error',
        title: t('availability_page.toast_failed_update')
      })
    } finally {
      setSubmitting(false)
    }
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev)
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1)
      } else {
        newDate.setMonth(prev.getMonth() + 1)
      }
      return newDate
    })
    setSelectedDates(new Set()) 
  }

  const clearSelection = () => {
    setSelectedDates(new Set())
  }

  const monthLabel = currentDate.toLocaleDateString(i18n.language, { month: 'long', year: 'numeric' })
  const dayNames = Array.from({ length: 7 }).map((_, idx) => {
    const base = new Date(Date.UTC(2021, 7, 1 + idx))
    return base.toLocaleDateString(i18n.language, { weekday: 'short' })
  })

  const days = getDaysInMonth(currentDate)

  // Show loading if user is still loading or if we don't have user data yet
  if (userLoading || !user) {
    return (
      <div className="min-h-screen bg-[#E5F1FF]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">{t('availability_page.loading_user')}</div>
        </div>
      </div>
    )
  }

  if (!user.employee && user.role !== 'EMPLOYEE') {
    return (
      <div className="min-h-screen bg-[#E5F1FF]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-red-600">
            {t('availability_page.employee_only')}
          </div>
        </div>
      </div>
    )
  }

  if (availabilityLoading) {
    return (
      <div className="min-h-screen bg-[#E5F1FF]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">{t('availability_page.loading_calendar')}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#E5F1FF]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="sm:flex sm:items-center sm:justify-between">
          <div className="sm:flex-auto">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => router.back()}
                className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <ChevronLeftIcon className="h-4 w-4" />
                {t('availability_page.back')}
              </button>
              <h1 className="text-2xl font-bold text-gray-900">{t('availability_page.title')}</h1>
            </div>
            <p className="mt-2 text-sm text-gray-700">
              {t('availability_page.description')}
            </p>
          </div>
        </div>

        {/* Calendar */}
        <div className="mt-8 bg-white shadow rounded-lg overflow-hidden">
          {/* Calendar Header */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <button
                onClick={() => navigateMonth('prev')}
                className="p-2 hover:bg-gray-100 rounded-md"
              >
                <ChevronLeftIcon className="h-5 w-5 text-gray-600" />
              </button>
              
              <h2 className="text-lg font-semibold text-gray-900">{monthLabel}</h2>
              
              <button
                onClick={() => navigateMonth('next')}
                className="p-2 hover:bg-gray-100 rounded-md"
              >
                <ChevronRightIcon className="h-5 w-5 text-gray-600" />
              </button>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="p-6">
            {/* Day Headers */}
            <div className="grid grid-cols-7 gap-px bg-gray-200">
              {dayNames.map(day => (
                <div key={day} className="bg-white py-2 text-center text-sm font-semibold text-gray-700">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days */}
            <div className="grid grid-cols-7 gap-2">
              {days.map((date, index) => {
                if (!date) {
                  return <div key={index} className="h-12"></div>
                }

                const availability = getAvailabilityForDate(date)
                const isSelected = isDateSelected(date)
                const isToday = formatDateKey(date) === formatDateKey(new Date())
                const isPast = date < new Date(new Date().setHours(0, 0, 0, 0))

                return (
                  <button
                    key={date.getTime()}
                    onClick={() => !isPast && toggleDateSelection(date)}
                    disabled={isPast}
                    className={`
                      h-12 rounded-md text-sm font-medium transition-colors relative
                      ${isPast
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : isSelected
                        ? 'bg-[#31BCFF] text-white'
                        : availability?.isAvailable === false
                        ? 'bg-red-100 text-red-800 hover:bg-red-200'
                        : availability?.isAvailable === true
                        ? 'bg-green-100 text-green-800 hover:bg-green-200'
                        : 'bg-gray-50 text-gray-900 hover:bg-gray-100'
                      }
                      ${isToday && !isSelected ? 'ring-2 ring-[#31BCFF]' : ''}
                    `}
                  >
                    <span>{date.getDate()}</span>
                    
                    {/* Availability Indicator */}
                    {availability && (
                      <div className="absolute top-1 right-1">
                        {availability.isAvailable ? (
                          <Check className="h-3 w-3 text-green-600" />
                        ) : (
                          <X className="h-3 w-3 text-red-600" />
                        )}
                      </div>
                    )}
                    
                    {/* Note Indicator - Clickable */}
                    {availability?.note && (
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation()
                          setViewingNote({
                            date: formatDateKey(date),
                            note: availability.note!,
                            isAvailable: availability.isAvailable
                          })
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.stopPropagation()
                            setViewingNote({
                              date: formatDateKey(date),
                              note: availability.note!,
                              isAvailable: availability.isAvailable
                            })
                          }
                        }}
                        className="absolute bottom-0.5 left-1/2 transform -translate-x-1/2 hover:scale-125 transition-transform cursor-pointer"
                      >
                        <span className="text-[10px]">📝</span>
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 bg-white shadow rounded-lg p-6">
          <div className="space-y-4">
            {/* Reason Input - shown when dates are selected */}
            {selectedDates.size > 0 && (
              <div className="space-y-2">
                <label htmlFor="reason" className="block text-sm font-medium text-gray-700">
                  {t('availability_page.reason_label')}
                </label>
                <textarea
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={t('availability_page.reason_placeholder')}
                  rows={2}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#31BCFF] focus:border-[#31BCFF] resize-none"
                />
                <p className="text-xs text-gray-500">
                  {t('availability_page.reason_hint')}
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
              <div className="text-sm text-gray-600">
                {selectedDates.size > 0 ? (
                  <span>{t('availability_page.selected_days', { count: selectedDates.size })}</span>
                ) : (
                  <span>{t('availability_page.select_hint')}</span>
                )}
              </div>
              
              <div className="flex gap-3">
                {selectedDates.size > 0 && (
                  <button
                    onClick={clearSelection}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    {t('availability_page.clear_selection')}
                  </button>
                )}
                
                <button
                  onClick={() => handleSetAvailability(false)}
                  disabled={selectedDates.size === 0 || submitting}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <X className="h-4 w-4 mr-2" />
                  {t('availability_page.mark_unavailable')}
                </button>
                
                <button
                  onClick={() => handleSetAvailability(true)}
                  disabled={selectedDates.size === 0 || submitting}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Check className="h-4 w-4 mr-2" />
                  {t('availability_page.mark_available')}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="mt-6 bg-white shadow rounded-lg p-6">
          <h3 className="text-sm font-medium text-gray-900 mb-4">{t('availability_page.legend')}</h3>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-sm">
            <div className="flex items-center">
              <div className="w-4 h-4 bg-green-100 rounded mr-2"></div>
              <span>{t('availability_page.available')}</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-red-100 rounded mr-2"></div>
              <span>{t('availability_page.unavailable')}</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-[#31BCFF] rounded mr-2"></div>
              <span>{t('availability_page.selected')}</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-gray-100 rounded mr-2"></div>
              <span>{t('availability_page.past_date')}</span>
            </div>
            <div className="flex items-center">
              <span className="text-base mr-2">📝</span>
              <span>{t('availability_page.has_note')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Note Viewing Modal */}
      {viewingNote && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 text-xs rounded-full ${
                  viewingNote.isAvailable 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {viewingNote.isAvailable 
                    ? t('availability_page.available') 
                    : t('availability_page.unavailable')
                  }
                </span>
                <span className="text-sm text-gray-500">
                  {new Date(viewingNote.date).toLocaleDateString(i18n.language, {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </span>
              </div>
              <button
                onClick={() => setViewingNote(null)}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <XMarkIcon className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                {t('availability_page.reason_label').replace(' (Optional)', '')}
              </h4>
              <p className="text-gray-900 whitespace-pre-wrap">
                {viewingNote.note}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
