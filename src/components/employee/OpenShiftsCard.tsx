"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useTranslation } from 'react-i18next'
import {
  Calendar,
  Clock,
  Users,
  Briefcase,
  Send,
  CheckCircle,
  XCircle,
  Loader2,
} from "lucide-react"

interface OpenShift {
  id: string
  date: string
  startTime: string
  endTime: string | null
  status: string
  function?: {
    id: string
    name: string
    color?: string | null
  } | null
  department?: {
    id: string
    name: string
  } | null
  employeeGroup?: {
    id: string
    name: string
  } | null
  shiftRequests?: Array<{
    id: string
    status: string
  }>
}

interface ShiftRequest {
  id: string
  status: string
  shift: OpenShift
}

interface OpenShiftsCardProps {
  openShifts: OpenShift[]
  myShiftRequests: ShiftRequest[]
  onRefresh: () => void
}

export default function OpenShiftsCard({
  openShifts,
  myShiftRequests,
  onRefresh
}: OpenShiftsCardProps) {
  const { t, i18n } = useTranslation('employee-dashboard')
  const [requestingShiftId, setRequestingShiftId] = useState<string | null>(null)
  const [cancellingRequestId, setCancellingRequestId] = useState<string | null>(null)

  const formatShiftDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      const today = new Date()
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)

      if (date.toDateString() === today.toDateString()) {
        return t('open_shifts.today') || 'Today'
      }
      if (date.toDateString() === tomorrow.toDateString()) {
        return t('open_shifts.tomorrow') || 'Tomorrow'
      }
      return date.toLocaleDateString(i18n.language, {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      })
    } catch {
      return dateString
    }
  }

  const hasMyRequest = (shift: OpenShift) => {
    return shift.shiftRequests && shift.shiftRequests.length > 0 && 
      shift.shiftRequests.some(r => r.status === 'PENDING')
  }

  const getMyRequestId = (shift: OpenShift) => {
    const req = shift.shiftRequests?.find(r => r.status === 'PENDING')
    return req?.id
  }

  const handleRequestShift = async (shiftId: string) => {
    setRequestingShiftId(shiftId)
    try {
      const res = await fetch('/api/shift-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shiftId })
      })

      if (!res.ok) {
        const data = await res.json()
        console.error('Failed to request shift:', data.error)
        return
      }

      onRefresh()
    } catch (error) {
      console.error('Error requesting shift:', error)
    } finally {
      setRequestingShiftId(null)
    }
  }

  const handleCancelRequest = async (requestId: string) => {
    setCancellingRequestId(requestId)
    try {
      const res = await fetch(`/api/shift-requests/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CANCELLED' })
      })

      if (!res.ok) {
        const data = await res.json()
        console.error('Failed to cancel request:', data.error)
        return
      }

      onRefresh()
    } catch (error) {
      console.error('Error cancelling request:', error)
    } finally {
      setCancellingRequestId(null)
    }
  }

  if (openShifts.length === 0 && myShiftRequests.length === 0) {
    return null
  }

  const totalCount = openShifts.length + myShiftRequests.length

  return (
    <Card className="bg-white/95 backdrop-blur border-sky-100 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sky-800 flex items-center gap-2 text-base font-semibold">
            <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
              <Briefcase className="w-4 h-4 text-emerald-600" />
            </div>
            {t('open_shifts.title') || 'Open Shifts'}
          </CardTitle>
          {totalCount > 0 && (
            <span className="text-xs font-semibold bg-emerald-500 text-white rounded-full px-2 py-0.5 min-w-[22px] text-center">
              {totalCount}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-4">
        {/* My Pending Requests */}
        {myShiftRequests.length > 0 && (
          <div>
            <p className="text-[11px] font-semibold text-amber-600 uppercase tracking-widest mb-2">
              {t('open_shifts.my_requests') || 'My Pending Requests'}
            </p>
            <div className="space-y-2">
              {myShiftRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-amber-50 border border-amber-100"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 shrink-0 bg-amber-400 rounded-xl flex items-center justify-center">
                      <Clock className="w-4 h-4 text-white" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">
                        {formatShiftDate(request.shift.date)}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {request.shift.startTime?.substring(0, 5)}–{request.shift.endTime?.substring(0, 5) || 'TBD'}
                        {request.shift.function && (
                          <span className="text-amber-600"> · {request.shift.function.name}</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <span className="text-xs font-medium text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                      {t('open_shifts.pending') || 'Pending'}
                    </span>
                    <button
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-40"
                      onClick={() => handleCancelRequest(request.id)}
                      disabled={cancellingRequestId === request.id}
                      title="Cancel request"
                    >
                      {cancellingRequestId === request.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Available Open Shifts */}
        {openShifts.length > 0 && (
          <div>
            <p className="text-[11px] font-semibold text-emerald-600 uppercase tracking-widest mb-2">
              {t('open_shifts.available') || 'Available Shifts'}
            </p>
            <div className="space-y-2">
              {openShifts.map((shift) => {
                const alreadyRequested = hasMyRequest(shift)
                const myReqId = getMyRequestId(shift)
                const dayLabel = new Date(shift.date)
                  .toLocaleDateString(i18n.language, { weekday: 'short' })
                  .substring(0, 3)
                  .toUpperCase()

                return (
                  <div
                    key={shift.id}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${
                      alreadyRequested
                        ? 'bg-emerald-50 border-emerald-200'
                        : 'bg-gray-50 border-gray-100 hover:bg-emerald-50 hover:border-emerald-200'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 shrink-0 bg-emerald-500 rounded-xl flex flex-col items-center justify-center text-white leading-none">
                        <span className="text-[10px] font-bold">{dayLabel}</span>
                        <span className="text-[11px] font-semibold">
                          {new Date(shift.date).getDate()}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate">
                          {formatShiftDate(shift.date)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {shift.startTime?.substring(0, 5)}–{shift.endTime?.substring(0, 5) || 'TBD'}
                        </p>
                        {(shift.function || shift.department || shift.employeeGroup) && (
                          <div className="flex flex-wrap gap-1 mt-1">
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
                    <div className="shrink-0 ml-2">
                      {alreadyRequested ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-medium text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            {t('open_shifts.requested') || 'Requested'}
                          </span>
                          <button
                            className="w-7 h-7 flex items-center justify-center rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-40"
                            onClick={() => myReqId && handleCancelRequest(myReqId)}
                            disabled={cancellingRequestId === myReqId}
                            title="Cancel request"
                          >
                            {cancellingRequestId === myReqId ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <XCircle className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          className="bg-emerald-500 hover:bg-emerald-600 text-white h-8 px-3 text-xs font-semibold rounded-lg shadow-sm"
                          onClick={() => handleRequestShift(shift.id)}
                          disabled={requestingShiftId === shift.id}
                        >
                          {requestingShiftId === shift.id ? (
                            <Loader2 className="w-3 h-3 animate-spin mr-1" />
                          ) : (
                            <Send className="w-3 h-3 mr-1" />
                          )}
                          {t('open_shifts.request') || 'Request'}
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
