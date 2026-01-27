import React from 'react'
import { useTranslation } from 'react-i18next'
import { 
  UserIcon, 
  ClockIcon, 
  DocumentTextIcon, 
  HeartIcon,
  DocumentDuplicateIcon
} from '@heroicons/react/24/outline'

export type EmployeeTabType = 'details' | 'shifts' | 'payslips' | 'sickleave' | 'contracts'

interface Tab {
  id: EmployeeTabType
  name: string
  icon: React.ComponentType<{ className?: string }>
}

interface EmployeeFormTabsProps {
  activeTab: EmployeeTabType
  onTabChange: (tab: EmployeeTabType) => void
  tabs: Tab[]
}

// Note: Tab names should be translated in the component using these tabs
export const defaultEmployeeTabs: Tab[] = [
  {
    id: 'details',
    name: 'employees.tabs.details',
    icon: UserIcon,
  },
  {
    id: 'shifts',
    name: 'employees.tabs.shifts',
    icon: ClockIcon,
  },
  {
    id: 'payslips',
    name: 'employees.tabs.payslips',
    icon: DocumentTextIcon,
  },
  {
    id: 'sickleave',
    name: 'employees.tabs.sick_leave',
    icon: HeartIcon,
  }
]

export const contractTab: Tab = {
  id: 'contracts',
  name: 'employees.tabs.contracts',
  icon: DocumentDuplicateIcon,
}

export function EmployeeFormTabs({ 
  activeTab, 
  onTabChange, 
  tabs 
}: EmployeeFormTabsProps) {
  const { t } = useTranslation()
  
  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 shadow-lg">
      <div className="border-b border-gray-200/50">
        <nav className="flex overflow-x-auto scrollbar-hide px-4 sm:px-6" aria-label="Tabs">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`${
                  activeTab === tab.id
                    ? 'border-[#31BCFF] text-[#31BCFF]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } flex-shrink-0 whitespace-nowrap py-3 sm:py-4 px-3 sm:px-4 border-b-2 font-medium text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2 transition-colors duration-200`}
              >
                <Icon className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                <span className="hidden xs:inline">{t(tab.name)}</span>
              </button>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
