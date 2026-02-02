import { format } from 'date-fns'
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline'
import { useTranslation } from 'react-i18next'
import { formatDate } from '@/shared/lib/dateLocale'

interface TemplateShift {
  id: string
  dayIndex: number
  startTime: string
  endTime: string | null
  employeeGroupId?: string | null
  functionId?: string | null
  note?: string | null
  breakMinutes?: number
  breakPaid?: boolean
}

interface EmployeeGroup {
  id: string
  name: string
}

interface FunctionItem {
  id: string
  name: string
  color?: string | null
}

interface TemplateWeekViewProps {
  weekDates: Date[]
  shifts: TemplateShift[]
  employeeGroups: EmployeeGroup[]
  functions: FunctionItem[]
  onAddShift: (dayIndex: number, formData?: any) => void
  onEditShift: (shift: TemplateShift) => void
  onDeleteShift: (shiftId: string) => void
}

export default function TemplateWeekView({
  weekDates,
  shifts,
  employeeGroups,
  functions,
  onAddShift,
  onEditShift,
  onDeleteShift
}: TemplateWeekViewProps) {
  const { t, i18n } = useTranslation('schedule')

  const getShiftsForDay = (dayIndex: number) => {
    return shifts.filter(s => s.dayIndex === dayIndex).sort((a, b) => 
      a.startTime.localeCompare(b.startTime)
    )
  }

  const getEmployeeGroupName = (groupId: string | null | undefined) => {
    if (!groupId) return null
    const group = employeeGroups.find(g => g.id === groupId)
    return group?.name || null
  }

  const getFunctionName = (functionId: string | null | undefined) => {
    if (!functionId) return null
    const func = functions.find(f => f.id === functionId)
    return func?.name || null
  }

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':')
    return `${hours}:${minutes}`
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <div className="min-w-[800px]">
          <div className="grid grid-cols-7 border-b bg-gray-50">
            {weekDates.map((date, i) => (
              <div key={i} className="p-3 text-center border-r last:border-r-0">
                <div className="text-xs font-medium text-gray-500 uppercase">
                  {format(date, 'EEE')}
                </div>
                <div className="text-sm font-semibold text-gray-900 mt-0.5">
                  {t('templates.day_label', 'Day')} {i + 1}
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 min-h-[400px]">
            {weekDates.map((_, dayIndex) => {
              const dayShifts = getShiftsForDay(dayIndex)
              
              return (
                <div 
                  key={dayIndex} 
                  className="border-r last:border-r-0 p-2 bg-white hover:bg-gray-50/50 transition-colors"
                >
                  <div className="space-y-2">
                    {dayShifts.map((shift) => {
                      const groupName = getEmployeeGroupName(shift.employeeGroupId)
                      const funcName = getFunctionName(shift.functionId)

                      return (
                        <div
                          key={shift.id}
                          onClick={() => onEditShift(shift)}
                          className="group relative bg-blue-50 border border-blue-200 rounded-lg p-2 cursor-pointer hover:bg-blue-100 transition-colors"
                        >
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              onDeleteShift(shift.id)
                            }}
                            className="absolute top-1 right-1 p-1 rounded-full bg-white shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50"
                          >
                            <TrashIcon className="w-3 h-3 text-red-500" />
                          </button>

                          <div className="text-xs font-semibold text-blue-800">
                            {formatTime(shift.startTime)} - {shift.endTime ? formatTime(shift.endTime) : '...'}
                          </div>

                          {groupName && (
                            <div className="text-xs text-blue-600 mt-1 truncate">
                              {groupName}
                            </div>
                          )}

                          {funcName && (
                            <div className="text-xs text-gray-500 mt-0.5 truncate">
                              {funcName}
                            </div>
                          )}

                          {shift.note && (
                            <div className="text-xs text-gray-400 mt-1 truncate italic">
                              {shift.note}
                            </div>
                          )}
                        </div>
                      )
                    })}

                    <button
                      onClick={() => onAddShift(dayIndex)}
                      className="w-full py-2 border-2 border-dashed border-gray-200 rounded-lg text-gray-400 hover:border-[#31BCFF] hover:text-[#31BCFF] transition-colors flex items-center justify-center gap-1"
                    >
                      <PlusIcon className="w-4 h-4" />
                      <span className="text-xs font-medium">{t('templates.add_shift', 'Add Shift')}</span>
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
