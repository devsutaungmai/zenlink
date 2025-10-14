import React from 'react'
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

export const defaultEmployeeTabs: Tab[] = [
  {
    id: 'details',
    name: 'Details',
    icon: UserIcon,
  },
  {
    id: 'shifts',
    name: 'Shifts',
    icon: ClockIcon,
  },
  {
    id: 'payslips',
    name: 'Payslips',
    icon: DocumentTextIcon,
  },
  {
    id: 'sickleave',
    name: 'Sick Leave',
    icon: HeartIcon,
  }
]

export const contractTab: Tab = {
  id: 'contracts',
  name: 'Contracts',
  icon: DocumentDuplicateIcon,
}

export function EmployeeFormTabs({ 
  activeTab, 
  onTabChange, 
  tabs 
}: EmployeeFormTabsProps) {
  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 shadow-lg">
      <div className="border-b border-gray-200/50">
        <nav className="flex space-x-8 px-6" aria-label="Tabs">
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
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors duration-200`}
              >
                <Icon className="w-5 h-5" />
                {tab.name}
              </button>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
