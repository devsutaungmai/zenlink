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

  return (
    <Card className="bg-white/95 backdrop-blur border-emerald-200">
      <CardHeader>
        <CardTitle className="text-emerald-700 flex items-center gap-2">
          <Briefcase className="w-6 h-6" />
          {t('open_shifts.title') || 'Open Shifts'}
          {openShifts.length > 0 && (
            <Badge className="bg-emerald-100 text-emerald-800 ml-2">
              {openShifts.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* My Pending Requests */}
          {myShiftRequests.length > 0 && (
            <div className="space-y-2 mb-4">
              <p className="text-xs font-medium text-amber-700 uppercase tracking-wide">
                {t('open_shifts.my_requests') || 'My Pending Requests'}
              </p>
              {myShiftRequests.map((request) => (
                <div
                  key={request.id}
                  className="p-3 bg-amber-50 border border-amber-200 rounded-lg"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-amber-500 rounded-lg flex items-center justify-center text-white">
                        <Clock className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-medium text-amber-800 text-sm">
                          {formatShiftDate(request.shift.date)}
                        </p>
                        <p className="text-xs text-amber-600">
                          {request.shift.startTime?.substring(0, 5)} - {request.shift.endTime?.substring(0, 5) || (t('common.tbd') || 'TBD')}
                          {request.shift.function && ` · ${request.shift.function.name}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-amber-100 text-amber-800 text-xs">
                        {t('open_shifts.pending') || 'Pending'}
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 border-amber-300 text-amber-700 hover:bg-amber-100"
                        onClick={() => handleCancelRequest(request.id)}
                        disabled={cancellingRequestId === request.id}
                      >
                        {cancellingRequestId === request.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <XCircle className="w-3 h-3" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Available Open Shifts */}
          {openShifts.length > 0 && (
            <>
              <p className="text-xs font-medium text-emerald-700 uppercase tracking-wide">
                {t('open_shifts.available') || 'Available Shifts'}
              </p>
              {openShifts.map((shift) => {
                const alreadyRequested = hasMyRequest(shift)
                const myReqId = getMyRequestId(shift)

                return (
                  <div
                    key={shift.id}
                    className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center text-white font-bold text-xs">
                          {new Date(shift.date).toLocaleDateString(i18n.language, { weekday: 'short' }).substring(0, 3).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-emerald-800 text-sm">
                            {formatShiftDate(shift.date)}
                          </p>
                          <p className="text-xs text-emerald-600">
                            {shift.startTime?.substring(0, 5)} - {shift.endTime?.substring(0, 5) || (t('common.tbd') || 'TBD')}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {shift.function && (
                              <span className="text-xs text-emerald-500 flex items-center gap-0.5">
                                <Briefcase className="w-3 h-3" />
                                {shift.function.name}
                              </span>
                            )}
                            {shift.department && (
                              <span className="text-xs text-emerald-500 flex items-center gap-0.5">
                                <Calendar className="w-3 h-3" />
                                {shift.department.name}
                              </span>
                            )}
                            {shift.employeeGroup && (
                              <span className="text-xs text-emerald-500 flex items-center gap-0.5">
                                <Users className="w-3 h-3" />
                                {shift.employeeGroup.name}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div>
                        {alreadyRequested ? (
                          <div className="flex items-center gap-2">
                            <Badge className="bg-amber-100 text-amber-800 text-xs">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              {t('open_shifts.requested') || 'Requested'}
                            </Badge>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 border-red-300 text-red-600 hover:bg-red-50"
                              onClick={() => myReqId && handleCancelRequest(myReqId)}
                              disabled={cancellingRequestId === myReqId}
                            >
                              {cancellingRequestId === myReqId ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <XCircle className="w-3 h-3" />
                              )}
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 px-3"
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
                  </div>
                )
              })}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
