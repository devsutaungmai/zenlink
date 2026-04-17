'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  ChevronRightIcon,
  ShieldCheckIcon,
  BuildingOfficeIcon,
  ClockIcon,
  UsersIcon,
  RectangleGroupIcon,
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
import Swal from 'sweetalert2'

interface SettingSubmenu {
  id: string
  name: string
  description: string
  component?: React.ComponentType<any>
}

interface SettingSection {
  id: string
  name: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  component?: React.ComponentType<any>
  hasSubmenus?: boolean
  submenus?: SettingSubmenu[]
  disabled?: boolean
  href?: string
}

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState<string>('labor-laws')
  const [isDirty, setIsDirty] = useState(false)
  const { t } = useTranslation('settings')
  const { hasPermission } = usePermissions()

  const canManageContractTemplates = hasPermission(PERMISSIONS.CONTRACT_TEMPLATES_MANAGE)
  const canManageLaborLaw = hasPermission(PERMISSIONS.SETTINGS_LABOR_LAW)
  const canManagePunchClock = hasPermission(PERMISSIONS.PUNCH_CLOCK_SETTINGS)
  const canManageBusiness = hasPermission(PERMISSIONS.SETTINGS_BUSINESS)
  const canManageShiftTypes = hasPermission(PERMISSIONS.SETTINGS_SHIFT_TYPES)


  const handleSectionChange = async (newSectionId: string) => {
    if (isDirty) {
      const result = await Swal.fire({
        title: t('common.confirm'),
        text: 'You have unsaved changes. Are you sure you want to leave?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#31BCFF',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Leave',
        cancelButtonText: 'Cancel',
      })
      if (!result.isConfirmed) return
      setIsDirty(false)
    }
    setActiveSection(newSectionId)
  }

  const settingSections = useMemo((): SettingSection[] => {
    const sections: SettingSection[] = []

    if (canManageLaborLaw) {
      sections.push({
        id: 'labor-laws',
        name: t('labor.title'),
        description: t('labor.description'),
        icon: ShieldCheckIcon,
        component: LaborLawSettings,
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
            component: PunchClockAccessSettings,
          },
          {
            id: 'punch-clock-profiles',
            name: t('punch_clock.menu.profiles.title'),
            description: t('punch_clock.menu.profiles.description'),
            component: PunchClockProfiles,
          },
        ],
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
            component: PeopleGeneralSettings,
          },
          {
            id: 'people-labor-law-profiles',
            name: t('people.menu.labor_law_profiles.title'),
            description: t('people.menu.labor_law_profiles.description'),
            component: LaborLawProfilesSettings,
          },
          {
            id: 'people-contract-rules',
            name: t('people.menu.contract_rules.title') || 'Contract Rules',
            description: t('people.menu.contract_rules.description') || 'Define contract rules and policies',
            component: ContractRulesSettings,
          },
          {
            id: 'people-contract-setup',
            name: t('people.menu.contract_setup.title'),
            description: t('people.menu.contract_setup.description'),
            component: ContractTemplateForm,
          },
        ],
      })
    }


    if (canManageBusiness) {
      sections.push({
        id: 'business',
        name: t('business_setting.menu.title'),
        description: t('business_setting.menu.description'),
        icon: BuildingOfficeIcon,
        component: BusinessInfoSettings,
      })
    }

    if (canManageShiftTypes) {
      sections.push({
        id: 'shift-types',
        name: t('shift_types.menu.title'),
        description: t('shift_types.menu.description'),
        icon: RectangleGroupIcon,
        component: ShiftTypeSettings,
      })
    }

    sections.push({
      id: 'invoice-settings',
      name: 'Invoice Settings',
      description: 'Manage your invoice preferences',
      icon: ShieldCheckIcon,
      component: GeneralSetting,
    })

    return sections
  }, [t, canManageContractTemplates, canManageLaborLaw, canManagePunchClock, canManageBusiness, canManageShiftTypes])

  const activeTopSection = settingSections.find((section) => {
    if (section.id === activeSection) return true
    if (section.hasSubmenus && section.submenus) {
      return section.submenus.some((sub) => sub.id === activeSection)
    }
    return false
  })

  const activeSubmenu = activeTopSection?.hasSubmenus && activeTopSection.submenus
    ? activeTopSection.submenus.find((sub) => sub.id === activeSection)
    : null

  const ActiveComponent = activeTopSection?.component || activeSubmenu?.component


  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page header */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-8 pt-6 pb-0">
        {/* Breadcrumb */}
        <nav className="flex items-center space-x-2 text-sm text-gray-500 mb-3">
          <Link href="/dashboard" className="hover:text-gray-700 transition-colors">Dashboard</Link>
          <ChevronRightIcon className="h-4 w-4 text-gray-400" />
          <span className="text-gray-900 font-medium">Settings</span>
        </nav>

        <h1 className="text-2xl font-bold text-gray-900 mb-1">Settings</h1>
        <p className="text-sm text-gray-500 mb-4">Manage your application settings and preferences.</p>

        {/* ── Horizontal Tab Bar ── */}
        <div className="flex items-end space-x-1 overflow-x-auto scrollbar-hide -mb-px">
          {settingSections.map((section) => {
            const isActive = activeTopSection?.id === section.id
            return (
              <TabButton
                key={section.id}
                section={section}
                isActive={isActive}
                onSelect={handleSectionChange}
              />
            )
          })}
        </div>
      </div>

      {/* ── Sub-tab row (for sections with submenus) ── */}
      {activeTopSection?.hasSubmenus && activeTopSection.submenus && (
        <div className="bg-white border-b border-gray-200 px-4 sm:px-8">
          <div className="flex items-end space-x-1 overflow-x-auto scrollbar-hide">
            {activeTopSection.submenus.map((submenu) => (
              <button
                key={submenu.id}
                onClick={() => handleSectionChange(submenu.id)}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeSection === submenu.id
                    ? 'border-[#31BCFF] text-[#31BCFF]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {submenu.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Content Area ── */}
      <div className="px-4 sm:px-8 py-6">
        {ActiveComponent ? (
          <ActiveComponent onDirtyChange={setIsDirty} />
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-10 text-center max-w-lg mx-auto mt-8">
            {activeTopSection?.icon && (
              <activeTopSection.icon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            )}
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {activeSubmenu
                ? `${activeTopSection?.name} — ${activeSubmenu.name}`
                : activeTopSection?.name || 'Profile Settings'}
            </h3>
            <p className="text-gray-500 text-sm mb-1">
              {activeSubmenu ? activeSubmenu.description : activeTopSection?.description || 'Update personal information'}
            </p>
            <p className="text-gray-400 text-xs">
              We&apos;re working on bringing you more configuration options.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Tab Button helper ──────────────────────────────────────────────
function TabButton({
  section,
  isActive,
  onSelect,
}: {
  section: SettingSection
  isActive: boolean
  onSelect: (id: string) => void
}) {
  const handleClick = () => {
    if (section.href) {
      window.location.href = section.href
    } else if (section.hasSubmenus && section.submenus?.length) {
      onSelect(section.submenus[0].id)
    } else {
      onSelect(section.id)
    }
  }

  return (
    <button
      onClick={handleClick}
      className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
        isActive
          ? 'border-[#31BCFF] text-[#31BCFF]'
          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
      }`}
    >
      <section.icon className={`h-4 w-4 flex-shrink-0 ${isActive ? 'text-[#31BCFF]' : 'text-gray-400'}`} />
      {section.name}
    </button>
  )
}
