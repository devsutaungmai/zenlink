'use client'

import { useEffect, useState } from 'react'
import { ClockIcon, CalendarIcon, ChartBarIcon, CheckCircleIcon } from '@heroicons/react/24/outline'
import { useUser } from '@/shared/lib/useUser'
import { useTranslation } from 'react-i18next'

interface AttendanceEntry {
  id: string
  punchInTime: string
  punchOutTime: string | null
  approved: boolean
  durationMinutes: number | null
  durationFormatted: string | null
  shift: {
    id: string
    date: string
    startTime: string
    endTime: string | null
    approved: boolean
    status: string
  } | null
}

interface ShiftDetail {
  id: string
  date: string
  startTime: string
  endTime: string | null
  approved: boolean
  status: string
  durationMinutes: number
  durationFormatted: string | null
}

interface HoursData {
  dateRange: {
    startDate: string
    endDate: string
  }
  totalHours: {
    hours: number
    minutes: number
    total: number
    formatted: string
  }
  approvedShiftHours: {
    hours: number
    minutes: number
    total: number
    formatted: string
  }
  shifts: {
    approved: number
    scheduled: number
    completed: number
    active: number
  }
  attendanceRecords: number
  summary: {
    workingSessions: number
    completedSessions: number
    activeSessions: number
  }
  attendanceEntries: AttendanceEntry[]
  shiftDetails: ShiftDetail[]
}

const ATTENDANCE_PAGE_SIZE = 5

const formatDateLabel = (value: string) =>
  new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })

const formatFullDate = (value: string) =>
  new Date(value).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })

const formatClockTime = (value: string) =>
  new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

const getStatusClasses = (status: string, approved?: boolean) => {
  if (status === 'CANCELLED') return 'text-red-700 bg-red-50'
  if (status === 'WORKING' || !approved) return 'text-amber-700 bg-amber-50'
  if (status === 'COMPLETED' || approved) return 'text-emerald-700 bg-emerald-50'
  return 'text-gray-700 bg-gray-100'
}

const formatRangeDisplay = (start: string, end: string) => {
  if (start === end) return formatFullDate(start)
  return `${formatFullDate(start)} - ${formatFullDate(end)}`
}

export default function EmployeeHoursPage() {
  const { user, loading: userLoading } = useUser()
  const { t } = useTranslation('employee-hours')
  const [hoursData, setHoursData] = useState<HoursData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [activeQuickRange, setActiveQuickRange] = useState<'today' | 'week' | 'month' | 'custom'>('today')
  const [attendancePage, setAttendancePage] = useState(1)

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0]
    setStartDate(today)
    setEndDate(today)
    setActiveQuickRange('today')
  }, [])

  useEffect(() => {
    if (startDate && endDate) {
      fetchHoursData()
    }
  }, [startDate, endDate])

  useEffect(() => {
    setAttendancePage(1)
  }, [startDate, endDate])

  useEffect(() => {
    if (!hoursData) return
    const totalPages = Math.max(1, Math.ceil(hoursData.attendanceEntries.length / ATTENDANCE_PAGE_SIZE))
    if (attendancePage > totalPages) {
      setAttendancePage(totalPages)
    }
  }, [attendancePage, hoursData])

  const fetchHoursData = async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      if (startDate) params.append('startDate', startDate)
      if (endDate) params.append('endDate', endDate)

      const response = await fetch(`/api/employee/hours?${params.toString()}`)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || t('error.title'))
      }

      const data = await response.json()
      setHoursData(data)
    } catch (err) {
      console.error('Error fetching hours data:', err)
      setError(err instanceof Error ? err.message : t('error.title'))
    } finally {
      setLoading(false)
    }
  }

  const setDateRange = (range: 'today' | 'week' | 'month') => {
    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]

    switch (range) {
      case 'today':
        setStartDate(todayStr)
        setEndDate(todayStr)
        break
      case 'week': {
        const weekStart = new Date(today)
        weekStart.setDate(today.getDate() - today.getDay())
        const weekEnd = new Date(weekStart)
        weekEnd.setDate(weekStart.getDate() + 6)
        setStartDate(weekStart.toISOString().split('T')[0])
        setEndDate(weekEnd.toISOString().split('T')[0])
        break
      }
      case 'month': {
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
        const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0)
        setStartDate(monthStart.toISOString().split('T')[0])
        setEndDate(monthEnd.toISOString().split('T')[0])
        break
      }
    }

    setActiveQuickRange(range)
  }

  const highlightCards = hoursData
    ? [
        {
          title: t('cards.hoursWorked.title'),
          value: hoursData.totalHours.formatted,
          meta: t('cards.hoursWorked.meta', { count: hoursData.summary.completedSessions }),
          icon: ClockIcon,
          accent: 'bg-blue-50 text-blue-600'
        },
        {
          title: t('cards.approvedHours.title'),
          value: hoursData.approvedShiftHours.formatted,
          meta: t('cards.approvedHours.meta', { count: hoursData.shifts.approved }),
          icon: CheckCircleIcon,
          accent: 'bg-emerald-50 text-emerald-600'
        },
        {
          title: t('cards.scheduledShifts.title'),
          value: `${hoursData.shifts.scheduled}`,
          meta: t('cards.scheduledShifts.meta', { count: hoursData.shifts.active }),
          icon: CalendarIcon,
          accent: 'bg-indigo-50 text-indigo-600'
        },
        {
          title: t('cards.workingSessions.title'),
          value: `${hoursData.summary.workingSessions}`,
          meta: t('cards.workingSessions.meta', { count: hoursData.attendanceRecords }),
          icon: ChartBarIcon,
          accent: 'bg-purple-50 text-purple-600'
        }
      ]
    : []

  if (userLoading) {
    return (
      <div className="px-4 py-6 sm:px-6 lg:px-8">
        <div className="space-y-6 animate-pulse">
          <div className="h-7 w-32 rounded bg-gray-200" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, index) => (
              <div key={index} className="h-24 rounded-2xl bg-gray-200" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (user?.role !== 'EMPLOYEE') {
    return (
      <div className="px-4 py-6 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-gray-900">{t('accessDenied.title')}</h1>
          <p className="mt-2 text-gray-600">{t('accessDenied.description')}</p>
        </div>
      </div>
    )
  }

  const rangeLabel = hoursData
    ? formatRangeDisplay(hoursData.dateRange.startDate, hoursData.dateRange.endDate)
    : null

  const quickRanges: Array<{ label: string; value: 'today' | 'week' | 'month' }> = [
    { label: t('quickRanges.today'), value: 'today' },
    { label: t('quickRanges.week'), value: 'week' },
    { label: t('quickRanges.month'), value: 'month' }
  ]

  const attendancePagination = hoursData
    ? (() => {
        const total = hoursData.attendanceEntries.length
        const pageCount = Math.max(1, Math.ceil(total / ATTENDANCE_PAGE_SIZE))
        const currentPage = Math.min(attendancePage, pageCount)
        const startIndex = (currentPage - 1) * ATTENDANCE_PAGE_SIZE
        const endIndex = Math.min(startIndex + ATTENDANCE_PAGE_SIZE, total)
        const items = hoursData.attendanceEntries.slice(startIndex, endIndex)

        return { total, pageCount, currentPage, startIndex, endIndex, items }
      })()
    : null

  const getShiftStatusLabel = (status: string) =>
    t(`shiftTimeline.status.${status}`, { defaultValue: status })

  return (
    <div className="space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">{t('pageLabel')}</p>
        <h1 className="text-2xl font-semibold text-gray-900">{t('heading')}</h1>
        <p className="text-sm text-gray-500">{t('subheading')}</p>
        {rangeLabel && <p className="text-sm text-gray-400">{t('rangeLabel', { range: rangeLabel })}</p>}
      </header>

      <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap gap-2">
          {quickRanges.map(({ label, value }) => {
            const isActive = activeQuickRange === value
            return (
              <button
                key={value}
                onClick={() => setDateRange(value)}
                aria-pressed={isActive}
                className={`flex-1 min-w-[105px] rounded-full border px-3 py-2 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500 sm:flex-none ${
                  isActive ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-700'
                }`}
              >
                {label}
              </button>
            )
          })}
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="flex flex-col text-sm font-medium text-gray-700">
            {t('form.startDate')}
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setActiveQuickRange('custom')
                setStartDate(e.target.value)
              }}
              className="mt-1 rounded-xl border border-gray-200 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
          </label>
          <label className="flex flex-col text-sm font-medium text-gray-700">
            {t('form.endDate')}
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setActiveQuickRange('custom')
                setEndDate(e.target.value)
              }}
              className="mt-1 rounded-xl border border-gray-200 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
          </label>
        </div>
      </section>

      {loading && (
        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-center text-sm text-blue-700">
          {t('loading')}
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <p className="font-semibold">{t('error.title')}</p>
          <p>{error}</p>
        </div>
      )}

      {hoursData && !loading && (
        <div className="space-y-6">
          <section>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {highlightCards.map(card => (
                <div key={card.title} className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${card.accent}`}>
                    <card.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-500">{card.title}</p>
                    <p className="text-xl font-semibold text-gray-900">{card.value}</p>
                    <p className="text-xs text-gray-500">{card.meta}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-6">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{t('summary.title')}</h3>
                {rangeLabel && <p className="text-sm text-gray-500">{rangeLabel}</p>}
              </div>
              <p className="text-sm text-gray-500">
                {t('summary.statsLine', { approved: hoursData.shifts.approved, scheduled: hoursData.shifts.scheduled })}
              </p>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div className="rounded-2xl border border-blue-50 bg-blue-50/60 p-4">
                <p className="text-sm font-semibold text-blue-900">{t('summary.hours.title')}</p>
                <dl className="mt-3 space-y-2 text-sm text-blue-900">
                  <div className="flex items-center justify-between">
                    <dt>{t('summary.hours.total')}</dt>
                    <dd className="font-semibold">{hoursData.totalHours.formatted}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt>{t('summary.hours.approved')}</dt>
                    <dd className="font-semibold">{hoursData.approvedShiftHours.formatted}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt>{t('summary.hours.activeSessions')}</dt>
                    <dd className="font-semibold">{hoursData.summary.activeSessions}</dd>
                  </div>
                </dl>
              </div>
              <div className="rounded-2xl border border-gray-100 p-4">
                <p className="text-sm font-semibold text-gray-900">{t('summary.shifts.title')}</p>
                <dl className="mt-3 space-y-2 text-sm text-gray-700">
                  <div className="flex items-center justify-between">
                    <dt>{t('summary.shifts.completed')}</dt>
                    <dd className="font-semibold text-emerald-600">{hoursData.summary.completedSessions}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt>{t('summary.shifts.scheduled')}</dt>
                    <dd className="font-semibold">{hoursData.shifts.scheduled}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt>{t('summary.shifts.attendance')}</dt>
                    <dd className="font-semibold">{hoursData.attendanceRecords}</dd>
                  </div>
                </dl>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{t('shiftTimeline.title')}</h3>
                <p className="text-sm text-gray-500">{t('shiftTimeline.subtitle')}</p>
              </div>
              <span className="text-xs font-medium text-gray-500">
                {t('shiftTimeline.count', { count: hoursData.shiftDetails.length })}
              </span>
            </div>
            <div className="mt-4 space-y-3">
              {hoursData.shiftDetails.length ? (
                hoursData.shiftDetails.map(shift => (
                  <div key={shift.id} className="rounded-2xl border border-gray-100 p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{formatDateLabel(shift.date)}</p>
                        <p className="text-base font-semibold text-gray-900">
                          {shift.endTime ? `${shift.startTime} - ${shift.endTime}` : shift.startTime}
                        </p>
                        <p className="text-sm text-gray-500">{getShiftStatusLabel(shift.status)}</p>
                      </div>
                      <div className="text-right">
                        {shift.durationFormatted && (
                          <p className="text-sm font-semibold text-gray-900">{shift.durationFormatted}</p>
                        )}
                        <span className={`mt-2 inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${getStatusClasses(shift.status, shift.approved)}`}>
                          {shift.approved ? t('shiftTimeline.badge.approved') : t('shiftTimeline.badge.pending')}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="py-6 text-center text-sm text-gray-500">{t('shiftTimeline.empty')}</p>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{t('attendance.title')}</h3>
                <p className="text-sm text-gray-500">{t('attendance.subtitle')}</p>
              </div>
              <span className="text-xs font-medium text-gray-500">
                {t('attendance.count', { count: hoursData.attendanceEntries.length })}
              </span>
            </div>
            <div className="mt-4 space-y-3">
              {attendancePagination && attendancePagination.items.length ? (
                attendancePagination.items.map(entry => {
                  const attendanceStatus = entry.punchOutTime
                    ? entry.approved
                      ? 'COMPLETED'
                      : 'WORKING'
                    : 'WORKING'

                  const attendanceLabel = entry.punchOutTime
                    ? entry.approved
                      ? t('attendance.badge.approved')
                      : t('attendance.badge.pending')
                    : t('attendance.badge.active')

                  return (
                    <div key={entry.id} className="rounded-2xl border border-gray-100 p-4 shadow-sm">
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                            {entry.shift ? formatDateLabel(entry.shift.date) : formatDateLabel(entry.punchInTime)}
                          </p>
                          <p className="text-base font-semibold text-gray-900">
                            {formatClockTime(entry.punchInTime)} - {entry.punchOutTime ? formatClockTime(entry.punchOutTime) : t('attendance.inProgress')}
                          </p>
                          {entry.shift && (
                            <p className="text-sm text-gray-500">
                              {t('attendance.shiftLabel')}: {entry.shift.startTime}
                              {entry.shift.endTime ? ` - ${entry.shift.endTime}` : ''}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-gray-900">
                            {entry.durationFormatted ?? t('attendance.tracking')}
                          </p>
                          <span className={`mt-2 inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${getStatusClasses(attendanceStatus, entry.approved)}`}>
                            {attendanceLabel}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })
              ) : (
                <p className="py-6 text-center text-sm text-gray-500">{t('attendance.empty')}</p>
              )}
            </div>
            {attendancePagination && attendancePagination.total > 0 && (
              <div className="mt-4 flex flex-col gap-3 border-t border-gray-100 pt-4 text-sm text-gray-600 sm:flex-row sm:items-center sm:justify-between">
                <p>
                  {t('attendance.pagination.summary', {
                    start: attendancePagination.startIndex + 1,
                    end: attendancePagination.endIndex,
                    total: attendancePagination.total
                  })}
                </p>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setAttendancePage(prev => Math.max(1, prev - 1))}
                    disabled={attendancePagination.currentPage === 1}
                    className={`rounded-full border px-3 py-1 text-sm font-medium transition-colors ${
                      attendancePagination.currentPage === 1
                        ? 'cursor-not-allowed border-gray-200 text-gray-400'
                        : 'border-gray-300 text-gray-700 hover:border-gray-400'
                    }`}
                  >
                    {t('attendance.pagination.previous')}
                  </button>
                  <span className="text-xs font-medium text-gray-500">
                    {t('attendance.pagination.page', {
                      current: attendancePagination.currentPage,
                      total: attendancePagination.pageCount
                    })}
                  </span>
                  <button
                    type="button"
                    onClick={() => setAttendancePage(prev => Math.min(attendancePagination.pageCount, prev + 1))}
                    disabled={attendancePagination.currentPage === attendancePagination.pageCount}
                    className={`rounded-full border px-3 py-1 text-sm font-medium transition-colors ${
                      attendancePagination.currentPage === attendancePagination.pageCount
                        ? 'cursor-not-allowed border-gray-200 text-gray-400'
                        : 'border-gray-300 text-gray-700 hover:border-gray-400'
                    }`}
                  >
                    {t('attendance.pagination.next')}
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  )
}
