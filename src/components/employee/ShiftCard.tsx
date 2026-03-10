"use client"

import { useTranslation } from 'react-i18next'

export interface ShiftCardShift {
  id: string
  date: string
  startTime: string
  endTime: string | null
  shiftType?: string
  status?: string
  note?: string | null
  approved?: boolean
  employeeGroup?: { name: string } | null
  department?: { name: string } | null
  function?: { name: string; color?: string | null } | null
  shiftExchanges?: Array<{ status?: string; approved?: boolean }>
}

interface ShiftCardProps {
  shift: ShiftCardShift
  variant?: 'today' | 'upcoming'
  onClick?: () => void
  className?: string
}

export default function ShiftCard({ shift, variant = 'upcoming', onClick, className = '' }: ShiftCardProps) {
  const { t, i18n } = useTranslation('employee-dashboard')

  const shiftDate = new Date(shift.date)
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)

  const isToday = shiftDate.toDateString() === today.toDateString()
  const isTomorrow = shiftDate.toDateString() === tomorrow.toDateString()

  const dayAbbr = shiftDate
    .toLocaleDateString(i18n.language, { weekday: 'short' })
    .substring(0, 3)
    .toUpperCase()
  const dayNum = shiftDate.getDate()

  const formattedDate = isToday
    ? t('events.today', 'Today')
    : isTomorrow
    ? t('upcoming_shifts.tomorrow', 'Tomorrow')
    : shiftDate.toLocaleDateString(i18n.language, { month: 'short', day: 'numeric' })

  const timeRange = `${shift.startTime?.substring(0, 5)} – ${
    shift.endTime ? shift.endTime.substring(0, 5) : t('common.tbd', 'TBD')
  }`

  const hasPendingExchange = shift.shiftExchanges?.some((e) =>
    !!e.status && ['EMPLOYEE_PENDING', 'ADMIN_PENDING'].includes(e.status)
  )
  const isForSale = shift.note?.includes('[FOR SALE]')

  let badgeBg = 'bg-sky-500'
  let cardBg = 'bg-sky-50'
  let cardBorder = 'border-sky-100'
  let textColor = 'text-sky-700'
  let subColor = 'text-sky-600'

  if (isForSale) {
    badgeBg = 'bg-orange-500'
    cardBg = 'bg-orange-50'
    cardBorder = 'border-orange-200'
    textColor = 'text-orange-700'
    subColor = 'text-orange-600'
  } else if (hasPendingExchange) {
    badgeBg = 'bg-yellow-500'
    cardBg = 'bg-yellow-50'
    cardBorder = 'border-yellow-200'
    textColor = 'text-yellow-700'
    subColor = 'text-yellow-600'
  }

  const statusColorMap: Record<string, string> = {
    SCHEDULED: 'bg-yellow-100 text-yellow-800',
    WORKING: 'bg-green-100 text-green-800',
    COMPLETED: 'bg-blue-100 text-blue-800',
    CANCELLED: 'bg-red-100 text-red-800',
  }

  const statusLabelMap: Record<string, string> = {
    SCHEDULED: t('shift_status.scheduled', 'Scheduled'),
    WORKING: t('shift_status.working', 'Working'),
    COMPLETED: t('shift_status.completed', 'Completed'),
    CANCELLED: t('shift_status.cancelled', 'Cancelled'),
  }

  const hasAnyTag = shift.function || shift.department || shift.employeeGroup

  return (
    <div
      className={`flex items-start gap-3 p-3 ${cardBg} border ${cardBorder} rounded-xl transition-all ${
        onClick ? 'cursor-pointer hover:brightness-95' : ''
      } ${className}`}
      onClick={onClick}
    >
      {/* Day badge */}
      <div
        className={`w-10 h-10 ${badgeBg} rounded-xl flex flex-col items-center justify-center text-white leading-none shrink-0`}
      >
        <span className="text-[10px] font-bold">{dayAbbr}</span>
        <span className="text-[11px] font-semibold">{dayNum}</span>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className={`text-sm font-semibold ${textColor}`}>{formattedDate}</p>
            <p className={`text-xs ${subColor}`}>{timeRange}</p>
          </div>

          <div className="flex flex-col items-end gap-1 shrink-0">
            {variant === 'today' && shift.status && (
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  statusColorMap[shift.status] || 'bg-gray-100 text-gray-700'
                }`}
              >
                {statusLabelMap[shift.status] || shift.status}
              </span>
            )}
            {variant === 'today' && shift.approved && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                {t('shift_status.approved', 'Approved')}
              </span>
            )}
            {variant === 'upcoming' && (isForSale || hasPendingExchange) && (
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  isForSale ? 'bg-orange-100 text-orange-700' : 'bg-yellow-100 text-yellow-700'
                }`}
              >
                {isForSale
                  ? t('upcoming_shifts.for_sale', 'For Sale')
                  : t('upcoming_shifts.pending_exchange', 'Pending Exchange')}
              </span>
            )}
            {variant === 'upcoming' && onClick && !isForSale && !hasPendingExchange && (
              <span className="text-[10px] text-slate-400">
                {t('upcoming_shifts.click_for_options', 'Click for options')}
              </span>
            )}
          </div>
        </div>

        {/* Tags: function (emerald), department (sky), employeeGroup (purple) */}
        {hasAnyTag && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {shift.function && (
              <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-md font-medium">
                {shift.function.name}
              </span>
            )}
            {shift.department && (
              <span className="text-[10px] bg-sky-100 text-sky-700 px-1.5 py-0.5 rounded-md font-medium">
                {shift.department.name}
              </span>
            )}
            {shift.employeeGroup && (
              <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-md font-medium">
                {shift.employeeGroup.name}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
