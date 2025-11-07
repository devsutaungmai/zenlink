import { format } from 'date-fns'
import { ArrowLeftIcon, ArrowRightIcon } from '@heroicons/react/24/outline'
import { useTranslation } from 'react-i18next'

interface Employee {
  id: string
  firstName: string
  lastName: string
}

interface ScheduleHeaderProps {
  startDate: Date
  endDate: Date
  viewMode: 'week' | 'day'
  onPreviousWeek: () => void
  onNextWeek: () => void
  onTodayClick: () => void
  onViewModeChange: (mode: 'week' | 'day') => void
  employees: Employee[]
  selectedEmployeeId: string | null
  onEmployeeChange: (employeeId: string | null) => void
}

export default function ScheduleHeader({
  startDate,
  endDate,
  viewMode,
  onPreviousWeek,
  onNextWeek,
  onTodayClick,
  onViewModeChange,
  employees,
  selectedEmployeeId,
  onEmployeeChange
}: ScheduleHeaderProps) {
  const { t } = useTranslation('schedule')
  const safeEmployees = Array.isArray(employees) ? employees : []
  
  return (
    <div className="mb-4 sm:mb-6">
      {/* Top Row: Title and Navigation */}
      <div className="mb-3 flex flex-col space-y-3 sm:space-y-0 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">{t('title')}</h1>
          
          <div className="flex items-center justify-between sm:justify-start space-x-2">
            <button 
              onClick={onPreviousWeek}
              className="p-2 rounded-md hover:bg-gray-200 text-gray-900 flex-shrink-0"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </button>
            
            <div className="px-2 sm:px-3 py-1 border rounded-md text-gray-500 text-xs sm:text-sm md:text-base whitespace-nowrap flex-1 sm:flex-none text-center">
              {format(startDate, 'MMM d')} - {format(endDate, 'MMM d, yyyy')}
            </div>
            
            <button 
              onClick={onNextWeek}
              className="p-2 rounded-md hover:bg-gray-200 text-gray-900 flex-shrink-0"
            >
              <ArrowRightIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
        
        {/* View Mode Toggles - Show on Desktop */}
        <div className="hidden sm:flex space-x-2">
          <button
            onClick={() => onViewModeChange('week')}
            className={`px-3 py-1.5 rounded-md text-sm ${
              viewMode === 'week' 
                ? 'bg-[#31BCFF] text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {t('header.week')}
          </button>
          <button
            onClick={() => onViewModeChange('day')}
            className={`px-3 py-1.5 rounded-md text-sm ${
              viewMode === 'day' 
                ? 'bg-[#31BCFF] text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {t('header.day')}
          </button>
        </div>
      </div>
      
      {/* Bottom Row: Filters and Actions */}
      <div className="flex flex-col gap-3">
        {/* Mobile View Mode Toggle */}
        <div className="flex sm:hidden space-x-2">
          <button
            onClick={() => onViewModeChange('week')}
            className={`flex-1 px-3 py-2 rounded-md text-sm font-medium ${
              viewMode === 'week' 
                ? 'bg-[#31BCFF] text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {t('header.week')}
          </button>
          <button
            onClick={() => onViewModeChange('day')}
            className={`flex-1 px-3 py-2 rounded-md text-sm font-medium ${
              viewMode === 'day' 
                ? 'bg-[#31BCFF] text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {t('header.day')}
          </button>
        </div>

        {/* Employee Filter and Today Button */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          {/* Employee Filter Dropdown */}
          <div className="flex-1 sm:max-w-xs">
            <select
              value={selectedEmployeeId || ""}
              onChange={(e) => onEmployeeChange(e.target.value === "" ? null : e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#31BCFF]"
            >
            <option value="">{t('header.all_employees')}</option>
            {safeEmployees.map(employee => (
              <option key={employee.id} value={employee.id}>
                {employee.firstName} {employee.lastName}
              </option>
            ))}
          </select>
        </div>
        
        {/* Today Button */}
        <button
          onClick={onTodayClick}
          className="w-full sm:w-auto px-4 py-2 text-sm rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 whitespace-nowrap font-medium"
        >
          {t('header.today')}
        </button>
      </div>
    </div>
  </div>
  )
}