import { format } from 'date-fns'
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline'
import { useTranslation } from 'react-i18next'

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

interface TemplateDayViewProps {
  date: Date
  shifts: TemplateShift[]
  employeeGroups: EmployeeGroup[]
  functions: FunctionItem[]
  onAddShift: (formData?: any) => void
  onEditShift: (shift: TemplateShift) => void
  onDeleteShift: (shiftId: string) => void
}

const HOURS = Array.from({ length: 24 }, (_, i) => i)

export default function TemplateDayView({
  date,
  shifts,
  employeeGroups,
  functions,
  onAddShift,
  onEditShift,
  onDeleteShift
}: TemplateDayViewProps) {
  const { t } = useTranslation('schedule')

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

  const formatHour = (hour: number) => {
    return `${hour.toString().padStart(2, '0')}:00`
  }

  const getShiftPosition = (shift: TemplateShift) => {
    const [startHours, startMinutes] = shift.startTime.split(':').map(Number)
    const startTotalMinutes = startHours * 60 + startMinutes

    let endTotalMinutes = 24 * 60
    if (shift.endTime) {
      const [endHours, endMinutes] = shift.endTime.split(':').map(Number)
      endTotalMinutes = endHours * 60 + endMinutes
      if (endTotalMinutes <= startTotalMinutes) {
        endTotalMinutes = 24 * 60
      }
    }

    const top = (startTotalMinutes / 60) * 60
    const height = Math.max(((endTotalMinutes - startTotalMinutes) / 60) * 60, 30)

    return { top, height }
  }

  const sortedShifts = [...shifts].sort((a, b) => a.startTime.localeCompare(b.startTime))

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="p-4 border-b bg-gray-50">
        <h3 className="text-lg font-semibold text-gray-900">
          {t('templates.day_template', 'Day Template')}
        </h3>
        <p className="text-sm text-gray-500 mt-1">
          {t('templates.day_template_desc', 'Define shifts for a single day that can be applied to any date')}
        </p>
      </div>

      <div className="flex">
        <div className="w-16 flex-shrink-0 border-r bg-gray-50">
          {HOURS.map((hour) => (
            <div key={hour} className="h-[60px] border-b px-2 flex items-start justify-end pt-1">
              <span className="text-xs text-gray-500 font-medium">
                {formatHour(hour)}
              </span>
            </div>
          ))}
        </div>

        <div className="flex-1 relative">
          {HOURS.map((hour) => (
            <div
              key={hour}
              onClick={() => onAddShift({ startTime: formatHour(hour), endTime: formatHour(hour + 1) })}
              className="h-[60px] border-b hover:bg-gray-50 cursor-pointer transition-colors"
            />
          ))}

          {sortedShifts.map((shift) => {
            const { top, height } = getShiftPosition(shift)
            const groupName = getEmployeeGroupName(shift.employeeGroupId)
            const funcName = getFunctionName(shift.functionId)

            return (
              <div
                key={shift.id}
                onClick={() => onEditShift(shift)}
                className="absolute left-2 right-2 bg-blue-100 border-l-4 border-blue-500 rounded-r-lg cursor-pointer hover:bg-blue-200 transition-colors group shadow-sm"
                style={{ top: `${top}px`, height: `${height}px`, minHeight: '30px' }}
              >
                <div className="p-2 h-full overflow-hidden">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onDeleteShift(shift.id)
                    }}
                    className="absolute top-1 right-1 p-1 rounded-full bg-white shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50"
                  >
                    <TrashIcon className="w-3 h-3 text-red-500" />
                  </button>

                  <div className="text-sm font-semibold text-blue-800">
                    {shift.startTime} - {shift.endTime || '...'}
                  </div>

                  {height > 40 && groupName && (
                    <div className="text-xs text-blue-600 mt-1 truncate">
                      {groupName}
                    </div>
                  )}

                  {height > 60 && funcName && (
                    <div className="text-xs text-gray-600 truncate">
                      {funcName}
                    </div>
                  )}

                  {height > 80 && shift.note && (
                    <div className="text-xs text-gray-500 mt-1 truncate italic">
                      {shift.note}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="p-4 border-t bg-gray-50">
        <button
          onClick={() => onAddShift()}
          className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-[#31BCFF] hover:text-[#31BCFF] transition-colors flex items-center justify-center gap-2"
        >
          <PlusIcon className="w-5 h-5" />
          <span className="font-medium">{t('templates.add_shift', 'Add Shift')}</span>
        </button>
      </div>
    </div>
  )
}
