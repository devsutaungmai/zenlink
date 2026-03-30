import Link from 'next/link'
import { Fragment, useState, useMemo } from 'react'
import { Menu, Transition } from '@headlessui/react'
import { APP_NAME } from '@/app/constants/constants'
import {
  UserCircleIcon,
  ChevronDownIcon,
  HomeIcon,
  DocumentTextIcon,
  UserGroupIcon,
  Cog6ToothIcon,
  ClockIcon,
  CurrencyDollarIcon,
  CalendarDaysIcon
} from '@heroicons/react/24/outline'
import { usePathname, useRouter } from 'next/navigation'
import { useUser } from '@/shared/lib/useUser'
import { useTranslation } from 'react-i18next'
import LanguageSwitcher from './LanguageSwitcher'
import NotificationCenter from './NotificationCenter'
import { usePermissions, NAV_PERMISSIONS } from '@/shared/lib/usePermissions'

type NavigationChild = {
  name: string
  href: string
  permissionKey?: keyof typeof NAV_PERMISSIONS
}

type NavigationItem = {
  name: string
  href?: string
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  children?: NavigationChild[]
  permissionKey?: keyof typeof NAV_PERMISSIONS
}

export default function DashboardNavbar() {
  const router = useRouter()
  const pathname = usePathname()
  const { user, loading } = useUser()
  const { t } = useTranslation()
  const { hasAnyPermission, isAdmin, loading: permissionsLoading } = usePermissions()
  const [activeBottomMenu, setActiveBottomMenu] = useState<string | null>(null)
  const isEmployeeUser = user?.role === 'EMPLOYEE' || Boolean(user?.employee)
  const isInvoiceEnabled = process.env.NEXT_PUBLIC_FEATURE_INVOICE === 'true'
  const profileInitials = (() => {
    const first = user?.firstName?.charAt(0) ?? ''
    const last = user?.lastName?.charAt(0) ?? ''
    const initials = `${first}${last}`.trim()
    if (initials) return initials.toUpperCase()
    if (user?.email) return user.email.charAt(0).toUpperCase()
    return APP_NAME.charAt(0).toUpperCase()
  })()
  const profileDisplayName = user?.firstName || user?.lastName
    ? [user?.firstName, user?.lastName].filter(Boolean).join(' ')
    : user?.email || t('navigation.profile')
  const profileGreeting = t('common.welcome_back')

  const adminNavigation: NavigationItem[] = [
    { name: t('navigation.home'), href: '/dashboard', icon: HomeIcon },
    {
      name: t('navigation.employees'),
      icon: UserGroupIcon,
      children: [
        { name: t('navigation.departments'), href: '/dashboard/departments', permissionKey: 'departments' },
        { name: t('navigation.categories'), href: '/dashboard/categories', permissionKey: 'categories' },
        { name: t('navigation.functions'), href: '/dashboard/functions', permissionKey: 'functions' },
        { name: t('navigation.employees'), href: '/dashboard/employees', permissionKey: 'employees' },
        { name: t('navigation.employee_groups'), href: '/dashboard/employee-groups', permissionKey: 'employeeGroups' },
        { name: t('navigation.contracts'), href: '/dashboard/contracts', permissionKey: 'contracts' },
        { name: t('navigation.roles'), href: '/dashboard/roles', permissionKey: 'roles' },
        { name: t('navigation.events'), href: '/dashboard/events', permissionKey: 'events' },
      ],
    },
    {
      name: t('navigation.schedule'),
      icon: ClockIcon,
      children: [
        { name: t('navigation.schedule'), href: '/dashboard/schedule', permissionKey: 'schedule' },
        { name: t('navigation.punch_clock'), href: '/dashboard/punch-clock', permissionKey: 'punchClock' },
        { name: t('navigation.availability'), href: '/dashboard/availability', permissionKey: 'availability' },
        { name: t('navigation.sick_leaves'), href: '/dashboard/sick-leaves', permissionKey: 'sickLeaves' },
        { name: t('navigation.pending_requests'), href: '/dashboard/pending-requests', permissionKey: 'pendingRequests' },
        { name: t('navigation.your_hours'), href: '/dashboard/hours', permissionKey: 'yourHours' },
      ],
    },
    {
      name: t('navigation.payroll'),
      icon: CurrencyDollarIcon,
      children: [
        { name: t('navigation.payroll_periods'), href: '/dashboard/payroll-periods', permissionKey: 'payrollPeriods' },
        { name: t('navigation.payroll_entries'), href: '/dashboard/payroll-entries', permissionKey: 'payrollEntries' },
        // { name: t('navigation.payroll_reports'), href: '/dashboard/reports/payroll', permissionKey: 'payrollReports' },
        { name: t('navigation.salary_codes'), href: '/dashboard/salary-codes', permissionKey: 'salaryCodes' },
        { name: t('navigation.pay_rules'), href: '/dashboard/pay-rules', permissionKey: 'payRules' },
        { name: t('navigation.overtime_rules'), href: '/dashboard/overtime-rules', permissionKey: 'overtimeRules' },
      ],
    },
    ...(isInvoiceEnabled ? [{
      name: "Invoice",
      icon: CurrencyDollarIcon,
      children: [
        { name: 'General ledger', href: '/dashboard/accounts/general-ledger' },
        { name: 'Customer ledger', href: '/dashboard/accounts/customer-ledger' },
        { name: 'Voucher Overviews', href: '/dashboard/voucher/overviews' },
        { name: 'Invoice Overviews', href: '/dashboard/invoice-overviews' },
        { name: 'Invoice', href: '/dashboard/invoices' },
        { name: "Project", href: '/dashboard/projects' },
        { name: "Customer", href: '/dashboard/customers' },
        { name: "Product", href: '/dashboard/products' },
        { name: "LedgerAccount", href: '/dashboard/ledger-accounts' },
      ],
    }] as NavigationItem[] : []),
    { name: t('navigation.settings'), href: '/dashboard/settings', icon: Cog6ToothIcon, permissionKey: 'settings' },
  ]

  const employeeNavigation: NavigationItem[] = [
    { name: t('navigation.home'), href: '/dashboard', icon: HomeIcon },
    { name: t('navigation.your_hours'), href: '/dashboard/hours', icon: ClockIcon },
    { name: t('navigation.contracts'), href: '/dashboard/contracts', icon: DocumentTextIcon },
    { name: t('navigation.availability'), href: '/dashboard/availability', icon: CalendarDaysIcon },
    { name: t('navigation.sick_leaves'), href: '/dashboard/sick-leaves', icon: ClockIcon },
  ]

  const employeeDefaultHrefs = new Set([
    '/dashboard',
    '/dashboard/hours',
    '/dashboard/contracts',
    '/dashboard/availability',
    '/dashboard/sick-leaves',
  ])

  const filteredNavigation = useMemo(() => {
    if (isEmployeeUser) {
      return adminNavigation
        .map(item => {
          if (item.name === 'Invoice') {
            return null
          }

          if (item.children) {
            const filteredChildren = item.children.filter(child => {
              if (employeeDefaultHrefs.has(child.href)) return true
              if (!child.permissionKey) return true
              const requiredPermissions = NAV_PERMISSIONS[child.permissionKey]
              return hasAnyPermission(requiredPermissions)
            })

            if (filteredChildren.length === 0) return null
            return { ...item, children: filteredChildren }
          }

          if (employeeDefaultHrefs.has(item.href || '')) return item

          if (item.permissionKey) {
            const requiredPermissions = NAV_PERMISSIONS[item.permissionKey]
            if (!hasAnyPermission(requiredPermissions)) return null
          }

          return item
        })
        .filter((item): item is NavigationItem => item !== null)
    }

    if (isAdmin) {
      return adminNavigation
        .map(item => {
          if (item.children) {
            const filteredChildren = item.children.filter(child => child.permissionKey !== 'yourHours')
            if (filteredChildren.length === 0) return null
            return { ...item, children: filteredChildren }
          }

          if (item.permissionKey === 'yourHours') return null

          return item
        })
        .filter((item): item is NavigationItem => item !== null)
    }

    return adminNavigation
      .map(item => {
        if (item.children) {
          const filteredChildren = item.children.filter(child => {
            if (!child.permissionKey) return true
            const requiredPermissions = NAV_PERMISSIONS[child.permissionKey]
            return hasAnyPermission(requiredPermissions)
          })

          if (filteredChildren.length === 0) return null

          return { ...item, children: filteredChildren }
        }

        if (item.permissionKey) {
          const requiredPermissions = NAV_PERMISSIONS[item.permissionKey]
          if (!hasAnyPermission(requiredPermissions)) return null
        }

        return item
      })
      .filter((item): item is NavigationItem => item !== null)
  }, [adminNavigation, employeeNavigation, isEmployeeUser, isAdmin, hasAnyPermission])

  const navigation = filteredNavigation

  const handleLogout = async () => {
    try {
      const res = await fetch('/api/auth/logout', {
        method: 'POST',
      })

      if (res.ok) {
        // Clear tab-specific session mode
        sessionStorage.removeItem('zenlink_session_mode')
        router.push('/login')
      }
    } catch (error) {
      console.error('Error logging out:', error)
    }
  }

  const activeBottomItem = navigation.find(item => item.name === activeBottomMenu)

  const handleBottomNavClick = (item: NavigationItem) => {
    if (item.children?.length) {
      setActiveBottomMenu(prev => prev === item.name ? null : item.name)
      return
    }

    if (item.href) {
      try {
        router.push(item.href)
      } catch {
        window.location.href = item.href
      }
      setActiveBottomMenu(null)
    }
  }

  const handleChildNavClick = (href: string) => {
    try {
      router.push(href)
    } catch {
      window.location.href = href
    }
    setActiveBottomMenu(null)
  }

  const isNavItemActive = (item: NavigationItem) => {
    if (item.href) {
      if (item.href === '/dashboard') {
        return pathname === '/dashboard'
      }

      return pathname === item.href || pathname.startsWith(`${item.href}/`)
    }

    if (item.children) {
      return item.children.some(child => pathname.startsWith(child.href))
    }

    return false
  }

  return (
    <>
      <nav className="hidden lg:block bg-white/80 backdrop-blur-xl border-b border-gray-200/50 shadow-lg fixed w-full z-30">
        <div className="px-6 h-18 flex items-center justify-between">
          {/* Left section with logo */}
          <div className="flex items-center">
            <Link href="/dashboard" className="text-2xl font-bold bg-gradient-to-r from-[#31BCFF] to-[#0EA5E9] bg-clip-text text-transparent ml-2 lg:ml-0 hover:scale-105 transition-transform duration-200">
              {APP_NAME}
            </Link>
          </div>

          {/* Center section with navigation - conditionally rendered based on user role */}
          <div className="hidden lg:flex items-center space-x-1">
            {navigation.map((item) =>
              !item.children ? (
                <Link
                  key={item.name}
                  href={item.href || '#'}
                  prefetch={false}
                  className="flex items-center px-4 py-2.5 text-gray-600 hover:text-[#31BCFF] hover:bg-blue-50/50 rounded-xl transition-all duration-200 group"
                >
                  <item.icon className="h-5 w-5 mr-2 group-hover:scale-110 transition-transform duration-200" />
                  <span className="font-medium">{item.name}</span>
                </Link>
              ) : (
                <Menu key={item.name} as="div" className="relative">
                  <Menu.Button className="flex items-center px-4 py-2.5 text-gray-600 hover:text-[#31BCFF] hover:bg-blue-50/50 rounded-xl transition-all duration-200 group">
                    <item.icon className="h-5 w-5 mr-2 group-hover:scale-110 transition-transform duration-200" />
                    <span className="font-medium">{item.name}</span>
                    <ChevronDownIcon className="h-4 w-4 ml-1 group-hover:rotate-180 transition-transform duration-200" />
                  </Menu.Button>
                  <Transition
                    as={Fragment}
                    enter="transition ease-out duration-200"
                    enterFrom="transform opacity-0 scale-95 translate-y-2"
                    enterTo="transform opacity-100 scale-100 translate-y-0"
                    leave="transition ease-in duration-150"
                    leaveFrom="transform opacity-100 scale-100 translate-y-0"
                    leaveTo="transform opacity-0 scale-95 translate-y-2"
                  >
                    <Menu.Items className="absolute left-0 mt-3 w-56 origin-top-left bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl ring-1 ring-black/5 focus:outline-none border border-gray-200/50">
                      <div className="py-2">
                        {item.children?.map((child) => (
                          <Menu.Item key={child.name}>
                            {({ active }) => (
                              <Link
                                href={child.href}
                                prefetch={false}
                                className={`${active ? 'bg-blue-50/70 text-[#31BCFF]' : 'text-gray-700'
                                  } flex items-center px-4 py-3 text-sm font-medium rounded-xl mx-2 transition-all duration-200 hover:scale-105`}
                              >
                                <div className="w-2 h-2 bg-current rounded-full mr-3 opacity-60"></div>
                                {child.name}
                              </Link>
                            )}
                          </Menu.Item>
                        ))}
                      </div>
                    </Menu.Items>
                  </Transition>
                </Menu>
              )
            )}
          </div>

          {/* Right section with language switcher, notifications and profile */}
          <div className="flex items-center space-x-3">
            <LanguageSwitcher />

            <NotificationCenter userId={user?.id} employeeId={user?.employee?.id} />

            <Menu as="div" className="relative">
              <Menu.Button className="flex items-center space-x-3 px-3 py-2 hover:bg-gray-50/50 rounded-xl transition-all duration-200 group">
                <div className="relative">
                  <UserCircleIcon className="h-9 w-9 text-gray-600 group-hover:text-[#31BCFF] transition-colors duration-200" />
                  <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-green-500 rounded-full border-2 border-white"></div>
                </div>
                <div className="hidden lg:block text-left">
                  {loading ? (
                    <div className="animate-pulse">
                      <div className="h-4 bg-gray-200 rounded w-24 mb-1"></div>
                      <div className="h-3 bg-gray-200 rounded w-32"></div>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm font-semibold text-gray-900 group-hover:text-[#31BCFF] transition-colors duration-200">
                        {user?.firstName} {user?.lastName}
                      </p>
                      <p className="text-xs text-gray-500 group-hover:text-gray-600 transition-colors duration-200">{user?.email}</p>
                    </>
                  )}
                </div>
                <ChevronDownIcon className="h-4 w-4 text-gray-500 group-hover:text-[#31BCFF] group-hover:rotate-180 transition-all duration-200" />
              </Menu.Button>

              <Transition
                as={Fragment}
                enter="transition ease-out duration-200"
                enterFrom="transform opacity-0 scale-95 translate-y-2"
                enterTo="transform opacity-100 scale-100 translate-y-0"
                leave="transition ease-in duration-150"
                leaveFrom="transform opacity-100 scale-100 translate-y-0"
                leaveTo="transform opacity-0 scale-95 translate-y-2"
              >
                <Menu.Items className="absolute right-0 mt-3 w-56 origin-top-right bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl ring-1 ring-black/5 focus:outline-none border border-gray-200/50">
                  <div className="py-2">
                    <Menu.Item>
                      {({ active }) => (
                        <Link
                          href="/dashboard/profile"
                          prefetch={false}
                          className={`${active ? 'bg-blue-50/70 text-[#31BCFF]' : 'text-gray-700'
                            } flex items-center px-4 py-3 text-sm font-medium rounded-xl mx-2 transition-all duration-200 hover:scale-105`}
                        >
                          <UserCircleIcon className="h-4 w-4 mr-3 opacity-60" />
                          {t('navigation.edit_profile')}
                        </Link>
                      )}
                    </Menu.Item>
                    {/* <Menu.Item>
                    {({ active }) => (
                      <Link
                        href="/time-tracking"
                        className={`${
                          active ? 'bg-blue-50/70 text-[#31BCFF]' : 'text-gray-700'
                        } flex items-center px-4 py-3 text-sm font-medium rounded-xl mx-2 transition-all duration-200 hover:scale-105`}
                      >
                        <ClockIcon className="h-4 w-4 mr-3 opacity-60" />
                        {t('navigation.time_tracking_portal')}
                      </Link>
                    )}
                  </Menu.Item> */}
                    <div className="border-t border-gray-200/50 mx-2 my-2" />
                    <Menu.Item>
                      {({ active }) => (
                        <button
                          onClick={handleLogout}
                          className={`${active ? 'bg-red-50/70 text-red-600' : 'text-red-500'
                            } flex w-full items-center px-4 py-3 text-sm font-medium rounded-xl mx-2 transition-all duration-200 hover:scale-105`}
                        >
                          <svg className="h-4 w-4 mr-3 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                          </svg>
                          {t('navigation.logout')}
                        </button>
                      )}
                    </Menu.Item>
                  </div>
                </Menu.Items>
              </Transition>
            </Menu>
          </div>
        </div>

      </nav>

      {/* Mobile compact header */}
      <div className="lg:hidden fixed top-0 inset-x-0 z-30 bg-white/95 backdrop-blur-xl border-b border-gray-200/70 shadow-lg">
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <Link href="/dashboard" className="text-2xl font-bold bg-gradient-to-r from-[#31BCFF] to-[#0EA5E9] bg-clip-text text-transparent">
              {APP_NAME}
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <NotificationCenter userId={user?.id} employeeId={user?.employee?.id} />
            <Menu as="div" className="relative">
              <Menu.Button
                aria-label={t('navigation.profile')}
                className="flex items-center gap-3 px-3 py-1.5 rounded-full bg-gradient-to-r from-[#31BCFF] to-[#0EA5E9] text-white shadow-lg focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#31BCFF] transition-all duration-200"
              >
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-white/15 text-sm font-semibold uppercase">
                  {loading ? (
                    <span className="block h-3 w-8 rounded-full bg-white/40" />
                  ) : (
                    profileInitials
                  )}
                </div>
                <div className="flex flex-col text-left leading-tight min-w-0">
                  Profile
                </div>
                <ChevronDownIcon className="h-4 w-4 text-white/80" />
              </Menu.Button>

              <Transition
                as={Fragment}
                enter="transition ease-out duration-200"
                enterFrom="transform opacity-0 scale-95 translate-y-1"
                enterTo="transform opacity-100 scale-100 translate-y-0"
                leave="transition ease-in duration-150"
                leaveFrom="transform opacity-100 scale-100 translate-y-0"
                leaveTo="transform opacity-0 scale-95 translate-y-1"
              >
                <Menu.Items className="absolute right-0 mt-3 w-60 origin-top-right bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl ring-1 ring-black/5 focus:outline-none border border-gray-200/70 p-2">
                  {/* <div className="flex items-center gap-3 p-3 rounded-2xl bg-blue-50/60 mb-2">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-[#31BCFF] text-lg font-semibold uppercase">
                      {profileInitials}
                    </div>
                    <div className="flex flex-col text-sm">
                      <span className="text-gray-500">{t('common.welcome_back')}</span>
                      <span className="font-semibold text-gray-900 truncate">{profileDisplayName}</span>
                    </div>
                  </div> */}
                  <Menu.Item>
                    {({ active }) => (
                      <Link
                        href="/dashboard/profile"
                        prefetch={false}
                        className={`${active ? 'bg-blue-50/70 text-[#31BCFF]' : 'text-gray-700'
                          } flex items-center px-4 py-3 text-sm font-medium rounded-2xl transition-all duration-200`}
                      >
                        <UserCircleIcon className="h-5 w-5 mr-3 opacity-70" />
                        {t('navigation.edit_profile')}
                      </Link>
                    )}
                  </Menu.Item>
                  <div className="border-t border-gray-200/70 my-2" />
                  <Menu.Item>
                    {({ active }) => (
                      <button
                        onClick={handleLogout}
                        className={`${active ? 'bg-red-50/70 text-red-600' : 'text-red-500'
                          } flex w-full items-center px-4 py-3 text-sm font-semibold rounded-2xl transition-all duration-200`}
                      >
                        <svg className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        {t('navigation.logout')}
                      </button>
                    )}
                  </Menu.Item>
                </Menu.Items>
              </Transition>
            </Menu>
          </div>
        </div>
      </div>

      {/* Mobile bottom navigation */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-30" aria-label="Primary navigation">
        <div className="bg-white/95 backdrop-blur-xl border-t border-gray-200/70 shadow-2xl">
          <nav className="flex items-center justify-around px-2 py-2">
            {navigation.map(item => {
              const isActive = isNavItemActive(item)
              const hasChildren = item.children && item.children.length > 0
              return (
                <button
                  key={item.name}
                  onClick={() => handleBottomNavClick(item)}
                  className={`relative flex flex-col items-center flex-1 min-w-0 px-3 py-2 rounded-2xl transition-all duration-200 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#31BCFF] ${isActive ? 'text-[#31BCFF] bg-blue-50/60 shadow-inner' : 'text-gray-500'
                    }`}
                >
                  <item.icon className={`h-5 w-5 ${isActive ? 'text-[#31BCFF]' : 'text-gray-400'}`} />
                  <span className="text-[11px] font-medium mt-1 text-center leading-tight whitespace-normal break-words">
                    {item.name}
                  </span>
                  {hasChildren && (
                    <span className="absolute -top-1 right-3 text-[10px] text-gray-400">⋯</span>
                  )}
                </button>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Mobile sub menu drawer */}
      <Transition
        show={!!activeBottomItem?.children}
        as={Fragment}
        enter="transition ease-out duration-200"
        enterFrom="opacity-0 translate-y-4"
        enterTo="opacity-100 translate-y-0"
        leave="transition ease-in duration-150"
        leaveFrom="opacity-100 translate-y-0"
        leaveTo="opacity-0 translate-y-4"
      >
        <div className="lg:hidden" aria-live="polite">
          <div
            className="fixed inset-0 bg-black/20 z-30"
            onClick={() => setActiveBottomMenu(null)}
            aria-hidden="true"
          ></div>
          <div className="fixed bottom-20 inset-x-0 px-4 z-40">
            <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-gray-200/70 p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-base font-semibold text-gray-900">{activeBottomItem?.name}</p>
                </div>
                <button
                  onClick={() => setActiveBottomMenu(null)}
                  className="text-sm text-gray-500 hover:text-gray-800"
                >
                  {t('common.close') ?? 'Close'}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {activeBottomItem?.children?.map(child => (
                  <button
                    key={child.name}
                    onClick={() => handleChildNavClick(child.href)}
                    className="flex items-center gap-2 w-full px-3 py-3 text-sm rounded-2xl border border-gray-100 hover:border-[#31BCFF] hover:bg-blue-50/70 hover:text-[#31BCFF] transition-all duration-200"
                  >
                    <span className="h-2 w-2 rounded-full bg-current opacity-60"></span>
                    <span className="text-left">{child.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </>
  )
}
