'use client'

import { useState, useMemo } from 'react'
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
  ClockIcon,
  UsersIcon,
  RectangleGroupIcon
} from '@heroicons/react/24/outline'
import LaborLawSettings from '@/components/LaborLawSettings'
import PunchClockProfiles from '@/components/PunchClockProfiles'
import PunchClockAccessSettings from '@/components/PunchClockAccessSettings'
import BusinessInfoSettings from '@/components/BusinessInfoSettings'
import ContractTemplateForm from '@/components/ContractTemplateForm'
import ShiftTypeSettings from '@/components/ShiftTypeSettings'
import PeopleGeneralSettings from '@/components/PeopleGeneralSettings'
import ContractRulesSettings from '@/components/ContractRulesSettings'
import LaborLawProfilesSettings from '@/components/LaborLawProfilesSettings'
import { useTranslation } from 'react-i18next'
import { usePermissions } from '@/shared/lib/usePermissions'
import { PERMISSIONS } from '@/shared/lib/permissions'
import GeneralSetting from '@/components/invoice/settings/GeneralSettings'

interface SettingSubmenu {
  id: string
  name: string
  description: string
  component?: React.ComponentType
}

interface SettingSection {
  id: string
  name: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  component?: React.ComponentType
  hasSubmenus?: boolean
  submenus?: SettingSubmenu[]
  disabled?: boolean
  href?: string
}

export default function SettingsPage() {
  const router = useRouter()
  const [activeSection, setActiveSection] = useState<string>('profile')
  const [expandedMenus, setExpandedMenus] = useState<Set<string>>(new Set(['people']))
  const { t } = useTranslation('settings')
  const { hasPermission, loading: permissionsLoading } = usePermissions()
  
  const canManageContractTemplates = hasPermission(PERMISSIONS.CONTRACT_TEMPLATES_MANAGE)
  const canManageLaborLaw = hasPermission(PERMISSIONS.SETTINGS_LABOR_LAW)
  const canManagePunchClock = hasPermission(PERMISSIONS.PUNCH_CLOCK_SETTINGS)
  const canManageBusiness = hasPermission(PERMISSIONS.SETTINGS_BUSINESS)
  const canManageShiftTypes = hasPermission(PERMISSIONS.SETTINGS_SHIFT_TYPES)
  const canManagePeopleGeneral = hasPermission(PERMISSIONS.SETTINGS_PEOPLE_GENERAL)
  
  const settingSections = useMemo((): SettingSection[] => {
    const sections: SettingSection[] = []
    
    if (canManageLaborLaw) {
      sections.push({
        id: 'labor-laws',
        name: t('labor.title'),
        description: t('labor.description'),
        icon: ShieldCheckIcon,
        component: LaborLawSettings
      })
    }
    
    if (canManagePunchClock) {
      sections.push({
        id: 'punch-clock',
        name: t('punch_clock.title'),
        description: t('punch_clock.description'),
        icon: ClockIcon,
        hasSubmenus: true,
        submenus: [
          {
            id: 'punch-clock-access',
            name: t('punch_clock.menu.access.title'),
            description: t('punch_clock.menu.access.description'),
            component: PunchClockAccessSettings
          },
          {
            id: 'punch-clock-general',
            name: t('punch_clock.menu.general.title'),
            description: t('punch_clock.menu.general.description')
          },
          {
            id: 'punch-clock-profiles',
            name: t('punch_clock.menu.profiles.title'),
            description: t('punch_clock.menu.profiles.description'),
            component: PunchClockProfiles
          },
          {
            id: 'punch-clock-advance',
            name: t('punch_clock.menu.advance.title'),
            description: t('punch_clock.menu.advance.description')
          }
        ]
      })
    }
    
    if (canManageContractTemplates) {
      sections.push({
        id: 'people',
        name: t('people.title'),
        description: t('people.description'),
        icon: UsersIcon,
        hasSubmenus: true,
        submenus: [
          {
            id: 'people-general',
            name: t('people.menu.general.title'),
            description: t('people.menu.general.description'),
            component: PeopleGeneralSettings
          },
          {
            id: 'people-labor-law-profiles',
            name: 'Labor Law Profiles',
            description: 'Manage labor law profile presets',
            component: LaborLawProfilesSettings
          },
          {
            id: 'people-contract-rules',
            name: t('people.menu.contract_rules.title') || 'Contract Rules',
            description: t('people.menu.contract_rules.description') || 'Define contract types and employment conditions',
            component: ContractRulesSettings
          },
          {
            id: 'people-contract-setup',
            name: t('people.menu.contract_setup.title'),
            description: t('people.menu.contract_setup.description'),
            component: ContractTemplateForm
          }
        ]
      })
    }
    
    sections.push({
      id: 'profile',
      name: t('profile.menu.title'),
      description: t('profile.menu.description'),
      icon: UserCircleIcon,
      href: '/dashboard/profile'
    })
    
    if (canManageBusiness) {
      sections.push({
        id: 'business',
        name: t('business_setting.menu.title'),
        description: t('business_setting.menu.description'),
        icon: BuildingOfficeIcon,
        component: BusinessInfoSettings
      })
    }
    
    if (canManageShiftTypes) {
      sections.push({
        id: 'shift-types',
        name: t('shift_types.menu.title'),
        description: t('shift_types.menu.description'),
        icon: RectangleGroupIcon,
        component: ShiftTypeSettings
      })
    }

    sections.push({
        id: 'invoice-settings',
        name: 'Invoice Settings',
        description: "Manage your invoice preferences",
        icon: ShieldCheckIcon,
        component: GeneralSetting
      })
    
    return sections
  }, [t, canManageContractTemplates, canManageLaborLaw, canManagePunchClock, canManageBusiness, canManageShiftTypes])

  const activeSettingSection = settingSections.find(section => {
    if (section.id === activeSection) {
      return true
    }
    if (section.hasSubmenus && section.submenus) {
      return section.submenus.some(submenu => submenu.id === activeSection)
    }
    return false
  })

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
    <div className="min-h-screen bg-gray-50 py-4 sm:py-8">
      <div className="px-4 sm:px-0">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <nav className="flex" aria-label="Breadcrumb">
            <ol className="flex items-center space-x-2 sm:space-x-4">
              <li>
                <Link
                  href="/dashboard"
                  className="text-gray-400 hover:text-gray-500 transition-colors text-xs sm:text-sm"
                >
                  Dashboard
                </Link>
              </li>
              <li>
                <div className="flex items-center">
                  <ChevronRightIcon className="flex-shrink-0 h-4 w-4 sm:h-5 sm:w-5 text-gray-300" />
                  <span className="ml-2 sm:ml-4 text-xs sm:text-sm font-medium text-gray-500">Settings</span>
                </div>
              </li>
            </ol>
          </nav>
          
          <div className="mt-3 sm:mt-4">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Settings</h1>
            <p className="mt-1.5 sm:mt-2 text-sm sm:text-base text-gray-600">
              Manage your application settings and preferences.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-8">
          {/* Settings Navigation */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Settings</h2>
              <nav className="space-y-1.5 sm:space-y-2">
                {settingSections.map((section) => (
                  <div key={section.id}>
                    {section.href ? (
                      <Link
                        href={section.href}
                        className="flex items-center px-2 sm:px-3 py-2 text-xs sm:text-sm font-medium text-gray-700 hover:text-[#31BCFF] hover:bg-blue-50/50 rounded-lg transition-all group"
                      >
                        <section.icon className="h-4 w-4 sm:h-5 sm:w-5 mr-2 sm:mr-3 flex-shrink-0 text-gray-400 group-hover:text-[#31BCFF]" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{section.name}</p>
                          <p className="text-xs text-gray-500 truncate">{section.description}</p>
                        </div>
                        <ChevronRightIcon className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0 text-gray-400 group-hover:text-[#31BCFF]" />
                      </Link>
                    ) : section.hasSubmenus ? (
                      <>
                        <button
                          onClick={() => toggleMenuExpansion(section.id)}
                          className="w-full flex items-center px-2 sm:px-3 py-2 text-xs sm:text-sm font-medium text-gray-700 hover:text-[#31BCFF] hover:bg-blue-50/50 rounded-lg transition-all group"
                        >
                          <section.icon className="h-4 w-4 sm:h-5 sm:w-5 mr-2 sm:mr-3 flex-shrink-0 text-gray-400 group-hover:text-[#31BCFF]" />
                          <div className="flex-1 text-left min-w-0">
                            <p className="font-medium truncate">{section.name}</p>
                            <p className="text-xs text-gray-500 truncate">{section.description}</p>
                          </div>
                          <ChevronRightIcon className={`h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0 text-gray-400 group-hover:text-[#31BCFF] transition-transform ${
                            expandedMenus.has(section.id) ? 'rotate-90' : ''
                          }`} />
                        </button>
                        {expandedMenus.has(section.id) && section.submenus && (
                          <div className="ml-6 sm:ml-8 mt-1 sm:mt-2 space-y-1">
                            {section.submenus.map((submenu) => (
                              <button
                                key={submenu.id}
                                onClick={() => setActiveSection(submenu.id)}
                                className={`w-full flex items-start px-2 sm:px-3 py-2 text-xs sm:text-sm rounded-lg transition-all ${
                                  activeSection === submenu.id
                                    ? 'bg-[#31BCFF] text-white'
                                    : 'text-gray-600 hover:text-[#31BCFF] hover:bg-blue-50/50'
                                }`}
                              >
                                <div className="flex-1 text-left min-w-0">
                                  <p className="font-medium truncate">{submenu.name}</p>
                                  <p className={`text-xs truncate ${
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
                        className={`w-full flex items-center px-2 sm:px-3 py-2 text-xs sm:text-sm font-medium rounded-lg transition-all group ${
                          activeSection === section.id
                            ? 'bg-[#31BCFF] text-white'
                            : section.disabled
                            ? 'text-gray-400 cursor-not-allowed opacity-50'
                            : 'text-gray-700 hover:text-[#31BCFF] hover:bg-blue-50/50'
                        }`}
                      >
                        <section.icon className={`h-4 w-4 sm:h-5 sm:w-5 mr-2 sm:mr-3 flex-shrink-0 ${
                          activeSection === section.id
                            ? 'text-white'
                            : section.disabled
                            ? 'text-gray-300'
                            : 'text-gray-400 group-hover:text-[#31BCFF]'
                        }`} />
                        <div className="flex-1 text-left min-w-0">
                          <p className="font-medium truncate">{section.name}</p>
                          <p className={`text-xs truncate ${
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
                          <span className="text-xs bg-gray-100 text-gray-500 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full flex-shrink-0">
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
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sm:p-8 text-center">
                <div className="flex items-center justify-center mb-3 sm:mb-4">
                  {activeSettingSection?.icon && (
                    <activeSettingSection.icon className="h-10 w-10 sm:h-12 sm:w-12 text-gray-400 mr-2 sm:mr-3 flex-shrink-0" />
                  )}
                  {activeSubmenu && (
                    <ClockIcon className="h-5 w-5 sm:h-6 sm:w-6 text-gray-400 flex-shrink-0" />
                  )}
                </div>
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2 break-words">
                  {activeSubmenu 
                    ? `${activeSettingSection?.name} - ${activeSubmenu.name}`
                    : activeSettingSection?.name || 'Settings Section'
                  }
                </h3>
                <p className="text-sm sm:text-base text-gray-600 mb-3 sm:mb-4 break-words px-4">
                  {activeSubmenu 
                    ? activeSubmenu.description 
                    : activeSettingSection?.description || 'This settings section is coming soon.'
                  }
                </p>
                <p className="text-xs sm:text-sm text-gray-500">
                  {activeSubmenu 
                    ? t('punch_clock.general_setting.coming_soon')
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
