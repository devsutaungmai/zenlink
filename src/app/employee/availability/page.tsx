'use client'

import React, { useEffect, useState } from 'react'
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'
import { Calendar as CalendarIcon, Check, X, Clock } from 'lucide-react'
import Swal from 'sweetalert2'
import { useUser } from '@/shared/lib/useUser'

interface Availability {
  id: string
  date: string
  isAvailable: boolean
  note?: string
}

export default function EmployeeAvailabilityPage() {
  const { user, loading: userLoading } = useUser()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [availabilities, setAvailabilities] = useState<Availability[]>([])
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set())
  const [availabilityLoading, setAvailabilityLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const currentMonth = currentDate.getMonth()
  const currentYear = currentDate.getFullYear()

  const fetchAvailabilities = async () => {
    if (!user?.employee?.id) return

    try {
      setAvailabilityLoading(true)
      const response = await fetch(
        `/api/availability?employeeId=${user.employee.id}&month=${currentMonth + 1}&year=${currentYear}`
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
        title: 'Failed to load availability data'
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
        title: 'Please select at least one date'
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
          employeeId: user.employee.id,
          dates: Array.from(selectedDates),
          isAvailable
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update availability')
      }

      await fetchAvailabilities()
      setSelectedDates(new Set())

      Swal.fire({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        icon: 'success',
        title: `Marked ${selectedDates.size} day(s) as ${isAvailable ? 'available' : 'unavailable'}`
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
        title: 'Failed to update availability'
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

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  const days = getDaysInMonth(currentDate)

  // Show loading if user is still loading or if we don't have user data yet
  if (userLoading || !user) {
    return (
      <div className="min-h-screen bg-[#E5F1FF]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">Loading user data...</div>
        </div>
      </div>
    )
  }

  // Show error if user doesn't have employee data
  if (!user.employee) {
    return (
      <div className="min-h-screen bg-[#E5F1FF]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-red-600">
            This page is only accessible to employees. Please log in with your employee PIN.
          </div>
        </div>
      </div>
    )
  }

  // Show loading for availability data
  if (availabilityLoading) {
    return (
      <div className="min-h-screen bg-[#E5F1FF]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">Loading availability calendar...</div>
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
            <h1 className="text-2xl font-bold text-gray-900">My Availability</h1>
            <p className="mt-2 text-sm text-gray-700">
              Set your availability for each day. Click on multiple days and use the buttons below to mark them as available or unavailable.
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
              
              <h2 className="text-lg font-semibold text-gray-900">
                {monthNames[currentMonth]} {currentYear}
              </h2>
              
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
            <div className="grid grid-cols-7 gap-2 mb-4">
              {dayNames.map(day => (
                <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
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
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 bg-white shadow rounded-lg p-6">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="text-sm text-gray-600">
              {selectedDates.size > 0 ? (
                <span>{selectedDates.size} day(s) selected</span>
              ) : (
                <span>Click on dates to select them</span>
              )}
            </div>
            
            <div className="flex gap-3">
              {selectedDates.size > 0 && (
                <button
                  onClick={clearSelection}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Clear Selection
                </button>
              )}
              
              <button
                onClick={() => handleSetAvailability(false)}
                disabled={selectedDates.size === 0 || submitting}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <X className="h-4 w-4 mr-2" />
                Mark Unavailable
              </button>
              
              <button
                onClick={() => handleSetAvailability(true)}
                disabled={selectedDates.size === 0 || submitting}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Check className="h-4 w-4 mr-2" />
                Mark Available
              </button>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="mt-6 bg-white shadow rounded-lg p-6">
          <h3 className="text-sm font-medium text-gray-900 mb-4">Legend</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div className="flex items-center">
              <div className="w-4 h-4 bg-green-100 rounded mr-2"></div>
              <span>Available</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-red-100 rounded mr-2"></div>
              <span>Unavailable</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-[#31BCFF] rounded mr-2"></div>
              <span>Selected</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-gray-100 rounded mr-2"></div>
              <span>Past Date</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
