import React, { useMemo, useState } from 'react'
import { format, addDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isSameMonth, isSameDay } from 'date-fns'
import { Employee, EmployeeGroup } from '@prisma/client'
import { ShiftWithRelations } from '@/types/schedule'
import { PlusIcon } from '@heroicons/react/24/outline'
import { AlertTriangle, AlertCircle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface MonthViewProps {
  currentDate: Date
  shifts: ShiftWithRelations[]
  employees: Employee[]
  onEditShift: (shift: ShiftWithRelations) => void
  onAddShift?: (data?: { date?: string }) => void
  isEmployeeUnavailable?: (employeeId: string, date: string) => boolean
  onUnavailableClick?: (employeeId: string, date: string) => void
}

export default function MonthView({
  currentDate,
  shifts,
  employees,
  onEditShift,
  onAddShift = () => {},
  isEmployeeUnavailable,
  onUnavailableClick
}: MonthViewProps) {
  
  const [selectedDayShifts, setSelectedDayShifts] = useState<{ date: Date; shifts: ShiftWithRelations[] } | null>(null)
  
  // Generate calendar days for the month view
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(currentDate)
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 })
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })
    
    const days = []
    let day = calendarStart
    
    while (day <= calendarEnd) {
      days.push(day)
      day = addDays(day, 1)
    }
    
    return days
  }, [currentDate])

  // Group shifts by date
  const shiftsByDate = useMemo(() => {
    const grouped = new Map<string, ShiftWithRelations[]>()
    
    shifts.forEach(shift => {
      const dateKey = format(new Date(shift.date), 'yyyy-MM-dd')
      if (!grouped.has(dateKey)) {
        grouped.set(dateKey, [])
      }
      grouped.get(dateKey)!.push(shift)
    })
    
    return grouped
  }, [shifts])

  const getShiftsForDay = (date: Date) => {
    const dateKey = format(date, 'yyyy-MM-dd')
    return shiftsByDate.get(dateKey) || []
  }

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const weekDaysMobile = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Mobile View */}
      <div className="md:hidden">
        {/* Calendar Header - Mobile */}
        <div className="grid grid-cols-7 gap-0 border-b bg-gray-50 sticky top-0 z-10">
          {weekDaysMobile.map((day, idx) => (
            <div 
              key={idx}
              className="py-2 text-center text-xs font-semibold text-gray-600 border-r last:border-r-0"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid - Mobile */}
        <div className="grid grid-cols-7 gap-0">
          {calendarDays.map((day, index) => {
            const dayShifts = getShiftsForDay(day)
            const isCurrentMonth = isSameMonth(day, currentDate)
            const isToday = isSameDay(day, new Date())
            const dateKey = format(day, 'yyyy-MM-dd')
            
            return (
              <button
                key={index}
                onClick={() => {
                  if (dayShifts.length > 0) {
                    setSelectedDayShifts({ date: day, shifts: dayShifts })
                  } else if (isCurrentMonth) {
                    onAddShift({ date: dateKey })
                  }
                }}
                className={`min-h-[70px] sm:min-h-[80px] border-r border-b last:border-r-0 p-1.5 sm:p-2 flex flex-col items-center justify-start active:bg-gray-100 transition-colors ${
                  !isCurrentMonth ? 'bg-gray-50' : 'bg-white'
                } ${isToday ? 'bg-blue-50 ring-2 ring-inset ring-blue-400' : ''}`}
              >
                {/* Day Number */}
                <span className={`text-xs sm:text-sm font-medium mb-1 ${
                  !isCurrentMonth 
                    ? 'text-gray-400' 
                    : isToday 
                      ? 'text-blue-600 font-bold' 
                      : 'text-gray-900'
                }`}>
                  {format(day, 'd')}
                </span>

                {/* Shift indicators */}
                {dayShifts.length > 0 && (
                  <div className="flex flex-col gap-0.5 w-full items-center">
                    {dayShifts.slice(0, 2).map((shift) => {
                      const functionColor = shift.function?.color
                      const shiftStatus = shift.status || 'SCHEDULED'
                      
                      return (
                        <div
                          key={shift.id}
                          className="w-full h-1 sm:h-1.5 rounded-full"
                          style={{
                            backgroundColor: functionColor || (
                              shiftStatus === 'CANCELLED' ? '#ef4444' :
                              shiftStatus === 'WORKING' ? '#3b82f6' :
                              '#31BCFF'
                            )
                          }}
                        />
                      )
                    })}
                    {dayShifts.length > 2 && (
                      <span className="text-[9px] sm:text-[10px] text-gray-500 font-medium mt-0.5">
                        +{dayShifts.length - 2}
                      </span>
                    )}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Desktop View */}
      <div className="hidden md:block">
        {/* Calendar Header - Desktop */}
        <div className="grid grid-cols-7 gap-0 border-b">
          {weekDays.map(day => (
            <div 
              key={day}
              className="py-3 text-center text-sm font-semibold text-gray-700 border-r last:border-r-0"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid - Desktop */}
        <div className="grid grid-cols-7 gap-0">
          {calendarDays.map((day, index) => {
            const dayShifts = getShiftsForDay(day)
            const isCurrentMonth = isSameMonth(day, currentDate)
            const isToday = isSameDay(day, new Date())
            const dateKey = format(day, 'yyyy-MM-dd')
            
            return (
              <div
                key={index}
                className={`min-h-[120px] border-r border-b last:border-r-0 p-2 ${
                  !isCurrentMonth ? 'bg-gray-50' : 'bg-white'
                } ${isToday ? 'bg-blue-50' : ''}`}
              >
                {/* Day Number */}
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-sm font-medium ${
                    !isCurrentMonth 
                      ? 'text-gray-400' 
                      : isToday 
                        ? 'text-blue-600 font-bold' 
                        : 'text-gray-900'
                  }`}>
                    {format(day, 'd')}
                  </span>
                  
                  {isCurrentMonth && (
                    <button
                      onClick={() => onAddShift({ date: dateKey })}
                      className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-[#31BCFF] transition-colors"
                    >
                      <PlusIcon className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Shifts */}
                <div className="space-y-1">
                  {dayShifts.slice(0, 3).map((shift) => {
                    const employee = employees.find(e => e.id === shift.employeeId)
                    const shiftStatus = shift.status || 'SCHEDULED'
                    const functionColor = shift.function?.color
                    
                    return (
                      <button
                        key={shift.id}
                        onClick={() => onEditShift(shift)}
                        className="w-full text-left px-2 py-1 rounded text-xs truncate transition-all hover:shadow-sm text-white font-medium"
                        style={{
                          backgroundColor: functionColor || (
                            shiftStatus === 'CANCELLED' ? '#ef4444' :
                            shiftStatus === 'WORKING' ? '#3b82f6' :
                            '#31BCFF'
                          )
                        }}
                      >
                        <div className="font-medium truncate">
                          {shift.startTime} {employee ? `${employee.firstName}` : 'Unknown'}
                        </div>
                      </button>
                    )
                  })}
                  
                  {dayShifts.length > 3 && (
                    <button
                      onClick={() => setSelectedDayShifts({ date: day, shifts: dayShifts })}
                      className="w-full text-xs text-[#31BCFF] hover:text-blue-700 text-center py-1 hover:bg-blue-50 rounded transition-colors"
                    >
                      +{dayShifts.length - 3} more
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* All Shifts Modal */}
      <Dialog open={!!selectedDayShifts} onOpenChange={(open) => !open && setSelectedDayShifts(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] sm:max-h-[80vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 border-b">
            <DialogTitle className="text-base sm:text-lg">
              {selectedDayShifts && format(selectedDayShifts.date, 'EEEE, MMMM d, yyyy')}
            </DialogTitle>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              {selectedDayShifts?.shifts.length} shift{selectedDayShifts?.shifts.length !== 1 ? 's' : ''}
            </p>
          </DialogHeader>

          {/* Modal Content */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
            <div className="space-y-2 sm:space-y-3">
              {selectedDayShifts?.shifts.map((shift) => {
                const employee = employees.find(e => e.id === shift.employeeId)
                const shiftStatus = shift.status || 'SCHEDULED'
                const functionColor = shift.function?.color
                
                return (
                  <button
                    key={shift.id}
                    className={`w-full text-left p-3 sm:p-4 rounded-lg transition-colors ${
                      shift.validation?.hasLaborLawViolations
                        ? 'border-2 border-red-500 bg-red-50 hover:bg-red-100'
                        : shift.validation?.hasContractDeviations
                          ? 'border-2 border-yellow-500 bg-yellow-50 hover:bg-yellow-100'
                          : shift.approved 
                            ? 'border border-green-200 bg-green-50 hover:bg-green-100' 
                            : 'border border-blue-200 bg-blue-50 hover:bg-blue-100'
                    }`}
                    onClick={() => {
                      setSelectedDayShifts(null)
                      onEditShift(shift)
                    }}
                    onTouchEnd={(e) => {
                      e.preventDefault()
                      setSelectedDayShifts(null)
                      onEditShift(shift)
                    }}
                  >
                    <div className="flex items-start sm:items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {shift.validation?.hasLaborLawViolations && (
                            <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0" />
                          )}
                          {shift.validation?.hasContractDeviations && (
                            <AlertCircle className="h-4 w-4 text-yellow-600 flex-shrink-0" />
                          )}
                          <div className="font-medium text-sm sm:text-base text-gray-900 truncate">
                            {employee ? `${employee.firstName} ${employee.lastName}` : 'Unknown Employee'}
                          </div>
                        </div>
                        <div className="text-xs sm:text-sm text-gray-600 mt-1">
                          {shift.startTime} - {shift.endTime || 'Active'}
                          {shift.function && (
                            <span className="ml-2">• {shift.function.name}</span>
                          )}
                        </div>
                        {shift.note && (
                          <div className="text-xs text-gray-500 mt-1 line-clamp-2">
                            Note: {shift.note}
                          </div>
                        )}
                      </div>
                      <div className={`px-2 py-1 rounded text-[10px] sm:text-xs font-medium whitespace-nowrap flex-shrink-0 ${
                        shiftStatus === 'CANCELLED' 
                          ? 'bg-red-200 text-red-800' 
                          : shiftStatus === 'WORKING'
                            ? 'bg-blue-200 text-blue-800'
                            : 'bg-green-200 text-green-800'
                      }`}>
                        {shiftStatus}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Modal Footer */}
          <div className="px-4 sm:px-6 py-3 sm:py-4 border-t bg-gray-50">
            <button
              onClick={() => {
                if (selectedDayShifts) {
                  onAddShift({ date: format(selectedDayShifts.date, 'yyyy-MM-dd') })
                  setSelectedDayShifts(null)
                }
              }}
              className="w-full px-4 py-2.5 sm:py-3 bg-[#31BCFF] text-white rounded-lg hover:bg-blue-600 active:bg-blue-700 transition-colors flex items-center justify-center gap-2 font-medium text-sm sm:text-base"
            >
              <PlusIcon className="w-4 h-4 sm:w-5 sm:h-5" />
              Add New Shift
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
