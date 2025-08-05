'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  ChevronRightIcon,
  Cog6ToothIcon,
  ShieldCheckIcon,
  BellIcon,
  UserCircleIcon,
  KeyIcon,
  BuildingOfficeIcon
} from '@heroicons/react/24/outline'
import LaborLawSettings from '@/components/LaborLawSettings'

export default function SettingsPage() {
  const router = useRouter()
  const [activeSection, setActiveSection] = useState<string>('labor-laws')

  const settingSections = [
    {
      id: 'labor-laws',
      name: 'Labor Law Rules',
      description: 'Configure work hour limits and break requirements',
      icon: ShieldCheckIcon,
      component: LaborLawSettings
    },
    {
      id: 'notifications',
      name: 'Notifications',
      description: 'Manage notification preferences',
      icon: BellIcon,
      disabled: true
    },
    {
      id: 'profile',
      name: 'Profile Settings',
      description: 'Update personal information',
      icon: UserCircleIcon,
      href: '/dashboard/profile'
    },
    {
      id: 'security',
      name: 'Security',
      description: 'Password and security settings',
      icon: KeyIcon,
      disabled: true
    },
    {
      id: 'business',
      name: 'Business Settings',
      description: 'Manage business information',
      icon: BuildingOfficeIcon,
      disabled: true
    }
  ]

  const activeSettingSection = settingSections.find(section => section.id === activeSection)
  const ActiveComponent = activeSettingSection?.component

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <nav className="flex" aria-label="Breadcrumb">
            <ol className="flex items-center space-x-4">
              <li>
                <Link
                  href="/dashboard"
                  className="text-gray-400 hover:text-gray-500 transition-colors"
                >
                  Dashboard
                </Link>
              </li>
              <li>
                <div className="flex items-center">
                  <ChevronRightIcon className="flex-shrink-0 h-5 w-5 text-gray-300" />
                  <span className="ml-4 text-sm font-medium text-gray-500">Settings</span>
                </div>
              </li>
            </ol>
          </nav>
          
          <div className="mt-4">
            <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
            <p className="mt-2 text-gray-600">
              Manage your application settings and preferences.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Settings Navigation */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Settings</h2>
              <nav className="space-y-2">
                {settingSections.map((section) => (
                  <div key={section.id}>
                    {section.href ? (
                      <Link
                        href={section.href}
                        className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 hover:text-[#31BCFF] hover:bg-blue-50/50 rounded-lg transition-all group"
                      >
                        <section.icon className="h-5 w-5 mr-3 text-gray-400 group-hover:text-[#31BCFF]" />
                        <div className="flex-1">
                          <p className="font-medium">{section.name}</p>
                          <p className="text-xs text-gray-500">{section.description}</p>
                        </div>
                        <ChevronRightIcon className="h-4 w-4 text-gray-400 group-hover:text-[#31BCFF]" />
                      </Link>
                    ) : (
                      <button
                        onClick={() => !section.disabled && setActiveSection(section.id)}
                        disabled={section.disabled}
                        className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all group ${
                          activeSection === section.id
                            ? 'bg-[#31BCFF] text-white'
                            : section.disabled
                            ? 'text-gray-400 cursor-not-allowed opacity-50'
                            : 'text-gray-700 hover:text-[#31BCFF] hover:bg-blue-50/50'
                        }`}
                      >
                        <section.icon className={`h-5 w-5 mr-3 ${
                          activeSection === section.id
                            ? 'text-white'
                            : section.disabled
                            ? 'text-gray-300'
                            : 'text-gray-400 group-hover:text-[#31BCFF]'
                        }`} />
                        <div className="flex-1 text-left">
                          <p className="font-medium">{section.name}</p>
                          <p className={`text-xs ${
                            activeSection === section.id
                              ? 'text-blue-100'
                              : section.disabled
                              ? 'text-gray-300'
                              : 'text-gray-500'
                          }`}>
                            {section.description}
                          </p>
                        </div>
                        {section.disabled && (
                          <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-full">
                            Soon
                          </span>
                        )}
                      </button>
                    )}
                  </div>
                ))}
              </nav>
            </div>
          </div>

          {/* Settings Content */}
          <div className="lg:col-span-3">
            {ActiveComponent ? (
              <ActiveComponent />
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
                <Cog6ToothIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {activeSettingSection?.name || 'Settings Section'}
                </h3>
                <p className="text-gray-600 mb-4">
                  {activeSettingSection?.description || 'This settings section is coming soon.'}
                </p>
                <p className="text-sm text-gray-500">
                  We're working on bringing you more configuration options.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
