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
    <div className="mb-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
      <div className="flex items-center">
        <h1 className="text-2xl font-semibold text-gray-900 mr-4">{t('title')}</h1>
        
        <div className="flex space-x-2">
          <button 
            onClick={onPreviousWeek}
            className="p-2 rounded-md hover:bg-gray-200 text-gray-900"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          
          <div className="px-3 py-1 border rounded-md text-gray-500">
            {format(startDate, 'MMM d')} - {format(endDate, 'MMM d, yyyy')}
          </div>
          
          <button 
            onClick={onNextWeek}
            className="p-2 rounded-md hover:bg-gray-200 text-gray-900"
          >
            <ArrowRightIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
      
      <div className="flex items-center space-x-4">
        {/* Employee Filter Dropdown */}
        <div className="w-64">
          <select
            value={selectedEmployeeId || ""}
            onChange={(e) => onEmployeeChange(e.target.value === "" ? null : e.target.value)}
            className="w-full px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#31BCFF]"
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
          className="px-3 py-1.5 rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200"
        >
          {t('header.today')}
        </button>
        
        {/* View Mode Toggles */}
        <div className="flex space-x-2">
          <button
            onClick={() => onViewModeChange('week')}
            className={`px-3 py-1.5 rounded-md ${
              viewMode === 'week' 
                ? 'bg-[#31BCFF] text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {t('header.week')}
          </button>
          <button
            onClick={() => onViewModeChange('day')}
            className={`px-3 py-1.5 rounded-md ${
              viewMode === 'day' 
                ? 'bg-[#31BCFF] text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {t('header.day')}
          </button>
        </div>
      </div>
    </div>
  )
}