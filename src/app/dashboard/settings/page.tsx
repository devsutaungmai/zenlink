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
  BuildingOfficeIcon,
  ClockIcon
} from '@heroicons/react/24/outline'
import LaborLawSettings from '@/components/LaborLawSettings'
import PunchClockProfiles from '@/components/PunchClockProfiles'
import PunchClockAccessSettings from '@/components/PunchClockAccessSettings'
import BusinessInfoSettings from '@/components/BusinessInfoSettings'

export default function SettingsPage() {
  const router = useRouter()
  const [activeSection, setActiveSection] = useState<string>('labor-laws')
  const [expandedMenus, setExpandedMenus] = useState<Set<string>>(new Set())

  const settingSections = [
    {
      id: 'labor-laws',
      name: 'Labor Law Rules',
      description: 'Configure work hour limits and break requirements',
      icon: ShieldCheckIcon,
      component: LaborLawSettings
    },
    {
      id: 'punch-clock',
      name: 'Punch Clock',
      description: 'Time tracking and clock-in settings',
      icon: ClockIcon,
      hasSubmenus: true,
      submenus: [
        {
          id: 'punch-clock-access',
          name: 'Access',
          description: 'Configure access permissions and restrictions',
          component: PunchClockAccessSettings
        },
        {
          id: 'punch-clock-general',
          name: 'General',
          description: 'General punch clock settings'
        },
        {
          id: 'punch-clock-profiles',
          name: 'Profiles',
          description: 'Manage time tracking profiles',
          component: PunchClockProfiles
        },
        {
          id: 'punch-clock-advance',
          name: 'Advance',
          description: 'Advanced punch clock configurations'
        }
      ]
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
      description: 'Manage business information and currency',
      icon: BuildingOfficeIcon,
      component: BusinessInfoSettings
    }
  ]

  const activeSettingSection = settingSections.find(section => {
    if (section.id === activeSection) {
      return true
    }
    if (section.hasSubmenus && section.submenus) {
      return section.submenus.some(submenu => submenu.id === activeSection)
    }
    return false
  })
  
  // If we're in a submenu, find the submenu details
  const activeSubmenu = activeSettingSection?.hasSubmenus && activeSettingSection.submenus
    ? activeSettingSection.submenus.find(submenu => submenu.id === activeSection)
    : null
    
  const ActiveComponent = activeSettingSection?.component || activeSubmenu?.component

  const toggleMenuExpansion = (menuId: string) => {
    const newExpanded = new Set(expandedMenus)
    if (newExpanded.has(menuId)) {
      newExpanded.delete(menuId)
    } else {
      newExpanded.add(menuId)
    }
    setExpandedMenus(newExpanded)
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="">
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
                    ) : section.hasSubmenus ? (
                      <>
                        <button
                          onClick={() => toggleMenuExpansion(section.id)}
                          className="w-full flex items-center px-3 py-2 text-sm font-medium text-gray-700 hover:text-[#31BCFF] hover:bg-blue-50/50 rounded-lg transition-all group"
                        >
                          <section.icon className="h-5 w-5 mr-3 text-gray-400 group-hover:text-[#31BCFF]" />
                          <div className="flex-1 text-left">
                            <p className="font-medium">{section.name}</p>
                            <p className="text-xs text-gray-500">{section.description}</p>
                          </div>
                          <ChevronRightIcon className={`h-4 w-4 text-gray-400 group-hover:text-[#31BCFF] transition-transform ${
                            expandedMenus.has(section.id) ? 'rotate-90' : ''
                          }`} />
                        </button>
                        {expandedMenus.has(section.id) && section.submenus && (
                          <div className="ml-8 mt-2 space-y-1">
                            {section.submenus.map((submenu) => (
                              <button
                                key={submenu.id}
                                onClick={() => setActiveSection(submenu.id)}
                                className={`w-full flex items-start px-3 py-2 text-sm rounded-lg transition-all ${
                                  activeSection === submenu.id
                                    ? 'bg-[#31BCFF] text-white'
                                    : 'text-gray-600 hover:text-[#31BCFF] hover:bg-blue-50/50'
                                }`}
                              >
                                <div className="flex-1 text-left">
                                  <p className="font-medium">{submenu.name}</p>
                                  <p className={`text-xs ${
                                    activeSection === submenu.id ? 'text-blue-100' : 'text-gray-500'
                                  }`}>
                                    {submenu.description}
                                  </p>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </>
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
                <div className="flex items-center justify-center mb-4">
                  {activeSettingSection?.icon && (
                    <activeSettingSection.icon className="h-12 w-12 text-gray-400 mr-3" />
                  )}
                  {activeSubmenu && (
                    <ClockIcon className="h-6 w-6 text-gray-400" />
                  )}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {activeSubmenu 
                    ? `${activeSettingSection?.name} - ${activeSubmenu.name}`
                    : activeSettingSection?.name || 'Settings Section'
                  }
                </h3>
                <p className="text-gray-600 mb-4">
                  {activeSubmenu 
                    ? activeSubmenu.description 
                    : activeSettingSection?.description || 'This settings section is coming soon.'
                  }
                </p>
                <p className="text-sm text-gray-500">
                  {activeSubmenu 
                    ? 'This punch clock feature is coming soon.'
                    : 'We\'re working on bringing you more configuration options.'
                  }
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
