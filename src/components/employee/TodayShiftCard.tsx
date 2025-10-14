import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar, Users, CheckCircle, Play, Square, AlertTriangle } from "lucide-react"
import { useTranslation } from 'react-i18next'
import { LocationValidationResult } from "@/shared/lib/locationValidation"

interface Shift {
  id: string
  date: string
  startTime: string
  endTime: string | null
  status: 'SCHEDULED' | 'WORKING' | 'COMPLETED' | 'CANCELLED'
  approved: boolean
  employeeGroup?: {
    name: string
  }
}

interface Attendance {
  id: string
  punchInTime: string
  punchOutTime?: string | null
}

interface TodayShiftCardProps {
  todayShift: Shift | null
  currentAttendance: Attendance | null
  clockingIn: boolean
  clockingOut: boolean
  onPunchIn: () => void
  onPunchOut: () => void
  locationValidation: LocationValidationResult | null
  checkingLocation: boolean
  onCheckLocation: () => void
}

export default function TodayShiftCard({
  todayShift,
  currentAttendance,
  clockingIn,
  clockingOut,
  onPunchIn,
  onPunchOut,
  locationValidation,
  checkingLocation,
  onCheckLocation
}: TodayShiftCardProps) {
  const { t } = useTranslation('employee-dashboard')

  const formatShiftDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        month: 'long', 
        day: 'numeric' 
      })
    } catch (error) {
      return dateString
    }
  }

  return (
    <Card className="bg-white/95 backdrop-blur border-sky-200">
      <CardHeader>
        <CardTitle className="text-sky-700 flex items-center gap-2">
          <Calendar className="w-6 h-6" />
          {t('todays_shift.title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {todayShift ? (
          <>
            <div className="text-center p-4 bg-sky-50 rounded-lg">
              <h3 className="font-semibold text-sky-700 mb-2">
                {formatShiftDate(todayShift.date)}
              </h3>
              <div className="text-2xl font-bold text-sky-600 mb-2">
                {todayShift.startTime.substring(0, 5)} - {todayShift.endTime ? todayShift.endTime.substring(0, 5) : 'Active'}
              </div>
              {todayShift.employeeGroup && (
                <div className="flex justify-center gap-4 text-sm text-sky-600">
                  <span className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {todayShift.employeeGroup.name}
                  </span>
                </div>
              )}
              
              <div className="mt-3 flex flex-wrap justify-center gap-2">
                <Badge className={`${
                  todayShift.status === 'WORKING' ? 'bg-green-100 text-green-800' :
                  todayShift.status === 'COMPLETED' ? 'bg-blue-100 text-blue-800' :
                  todayShift.status === 'CANCELLED' ? 'bg-red-100 text-red-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {todayShift.status === 'SCHEDULED' ? t('shift_status.scheduled') :
                   todayShift.status === 'WORKING' ? t('shift_status.working') :
                   todayShift.status === 'COMPLETED' ? t('shift_status.completed') :
                   todayShift.status === 'CANCELLED' ? t('shift_status.cancelled') : todayShift.status}
                </Badge>
                {todayShift.approved && (
                  <Badge className="bg-emerald-100 text-emerald-800">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    {t('shift_status.approved')}
                  </Badge>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium text-sky-700">{t('todays_shift.attendance')}</h4>
              
              {currentAttendance ? (
                <div className="space-y-3">
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <p className="text-green-700 font-medium">{t('todays_shift.currently_punched_in')}</p>
                    <p className="text-green-600 text-sm">
                      {t('time_card.since', { 
                        time: new Date(currentAttendance.punchInTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) 
                      })}
                    </p>
                  </div>
                  
                  <Button
                    onClick={onPunchOut}
                    disabled={clockingOut}
                    className="w-full bg-red-500 hover:bg-red-600 text-white py-3"
                  >
                    <Square className="w-5 h-5 mr-2" />
                    {clockingOut ? t('time_card.punching_out') : t('time_card.punch_out')}
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {todayShift.status === 'COMPLETED' ? (
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <p className="text-blue-700 font-medium">{t('todays_shift.shift_completed')}</p>
                      <p className="text-blue-600 text-sm">
                        {todayShift.startTime.substring(0, 5)} - {todayShift.endTime!.substring(0, 5)}
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <p className="text-gray-700 font-medium">{t('todays_shift.ready_to_start')}</p>
                        <p className="text-gray-600 text-sm">
                          {t('todays_shift.ready_to_start_description')}
                        </p>
                      </div>
                      
                      <Button
                        onClick={onPunchIn}
                        disabled={clockingIn || (locationValidation?.isAllowed === false)}
                        className="w-full bg-green-500 hover:bg-green-600 text-white py-3 disabled:bg-gray-400 disabled:cursor-not-allowed"
                      >
                        <Play className="w-5 h-5 mr-2" />
                        {clockingIn ? t('time_card.punching_in') : t('time_card.punch_in')}
                      </Button>
                      
                      {locationValidation?.isAllowed === false && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
                            <p className="text-sm text-red-700">
                              {locationValidation.message}
                            </p>
                          </div>
                          <Button
                            onClick={onCheckLocation}
                            disabled={checkingLocation}
                            className="w-full text-xs py-1 h-8 bg-red-600 hover:bg-red-700 text-white"
                          >
                            {checkingLocation ? 'Checking...' : 'Retry Location Check'}
                          </Button>
                        </div>
                      )}
                      
                      {checkingLocation && (
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                          <div className="flex items-center gap-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                            <p className="text-sm text-gray-600">
                              Checking location access...
                            </p>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="text-center p-8 bg-gray-50 rounded-lg">
            <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="font-semibold text-gray-700 mb-2">{t('todays_shift.no_shift')}</h3>
            <p className="text-gray-600 text-sm">{t('todays_shift.no_shift_description')}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
