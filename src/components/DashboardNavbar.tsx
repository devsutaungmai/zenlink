import Link from 'next/link'
import { Fragment, useState } from 'react'
import { Menu, Transition, Disclosure } from '@headlessui/react'
import { APP_NAME } from '@/app/constants'
import { 
  BellIcon, 
  UserCircleIcon, 
  ChevronDownIcon,
  HomeIcon,
  UsersIcon,
  UserGroupIcon,
  UserIcon,
  Cog6ToothIcon,
  Bars3Icon,
  XMarkIcon,
  ClockIcon,
  CurrencyDollarIcon,
  CalendarIcon
} from '@heroicons/react/24/outline'
import { useRouter } from 'next/navigation'
import { useUser } from '@/app/lib/useUser'
import { useTranslation } from 'react-i18next'
import LanguageSwitcher from './LanguageSwitcher'
import NotificationCenter from './NotificationCenter'

type NavigationChild = {
  name: string
  href: string
}

type NavigationItem = {
  name: string
  href?: string
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  children?: NavigationChild[]
}

interface DashboardNavbarProps {
  setMobileMenuOpen: (open: boolean) => void
}

export default function DashboardNavbar({ setMobileMenuOpen }: DashboardNavbarProps) {
  const router = useRouter()
  const { user, loading } = useUser()
  const { t } = useTranslation()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  
  const adminNavigation: NavigationItem[] = [
    { name: t('navigation.home'), href: '/dashboard', icon: HomeIcon },
    {
      name: t('navigation.employees'),
      icon: UserGroupIcon,
      children: [
        { name: t('navigation.departments'), href: '/dashboard/departments' },
        { name: t('navigation.employees'), href: '/dashboard/employees' },
        { name: t('navigation.employee_groups'), href: '/dashboard/employee-groups' },
        { name: t('navigation.contracts'), href: '/dashboard/contracts' },
        { name: t('navigation.documents'), href: '/dashboard/documents' },
      ],
    },
    {
      name: t('navigation.schedule'),
      icon: ClockIcon,
      children: [
        { name: t('navigation.shift'), href: '/dashboard/shifts' },
        { name: t('navigation.schedule'), href: '/dashboard/schedule' },
        { name: t('navigation.punch_clock'), href: '/dashboard/punch-clock' },
        { name: t('navigation.availability'), href: '/dashboard/availability' },
        { name: t('navigation.sick_leaves'), href: '/dashboard/sick-leaves' },
        { name: t('navigation.pending_requests'), href: '/dashboard/pending-requests' },
      ],
    },
    {
      name: t('navigation.payroll'),
      icon: CurrencyDollarIcon,
      children: [
        { name: t('navigation.payroll_periods'), href: '/dashboard/payroll-periods' },
        { name: t('navigation.payroll_entries'), href: '/dashboard/payroll-entries' },
        { name: 'Salary Codes', href: '/dashboard/salary-codes' },
        { name: 'Pay Rules', href: '/dashboard/pay-rules' },
        { name: 'Overtime Rules', href: '/dashboard/overtime-rules' },
      ],
    },
    { name: t('navigation.settings'), href: '/dashboard/settings', icon: Cog6ToothIcon },
  ]

  const employeeNavigation: NavigationItem[] = [
    { name: t('navigation.home'), href: '/dashboard', icon: HomeIcon },
    { name: t('navigation.your_hours'), href: '/dashboard/hours', icon: ClockIcon },
    { name: t('navigation.schedule'), href: '/dashboard/schedule', icon: CalendarIcon },
    { name: t('navigation.availability'), href: '/employee/availability', icon: ClockIcon },
    { name: t('navigation.sick_leaves'), href: '/employee/sick-leaves', icon: UserIcon },
  ]

  const navigation = user?.role === 'EMPLOYEE' ? employeeNavigation : adminNavigation

  const handleLogout = async () => {
    try {
      const res = await fetch('/api/auth/logout', {
        method: 'POST',
      })
      
      if (res.ok) {
        router.push('/login')
      }
    } catch (error) {
      console.error('Error logging out:', error)
    }
  }

  return (
    <nav className="bg-white/80 backdrop-blur-xl border-b border-gray-200/50 shadow-lg fixed w-full z-30">
      <div className="px-6 h-18 flex items-center justify-between">
        {/* Left section with logo */}
        <div className="flex items-center">
          <button
            type="button"
            className="md:hidden -ml-0.5 -mt-0.5 h-12 w-12 inline-flex items-center justify-center rounded-xl text-gray-500 hover:text-gray-900 hover:bg-gray-100/50 transition-all duration-200"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <span className="sr-only">Open menu</span>
            {isMenuOpen ? (
              <XMarkIcon className="h-6 w-6" aria-hidden="true" />
            ) : (
              <Bars3Icon className="h-6 w-6" aria-hidden="true" />
            )}
          </button>
          <Link href="/dashboard" className="text-2xl font-bold bg-gradient-to-r from-[#31BCFF] to-[#0EA5E9] bg-clip-text text-transparent ml-2 md:ml-0 hover:scale-105 transition-transform duration-200">
            {APP_NAME}
          </Link>
        </div>

        {/* Center section with navigation - conditionally rendered based on user role */}
        <div className="hidden md:flex items-center space-x-1">
          {navigation.map((item) => 
            !item.children ? (
              <Link
                key={item.name}
                href={item.href || '#'}
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
                              className={`${
                                active ? 'bg-blue-50/70 text-[#31BCFF]' : 'text-gray-700'
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
          
          <NotificationCenter />
          
          <Menu as="div" className="relative">
            <Menu.Button className="flex items-center space-x-3 px-3 py-2 hover:bg-gray-50/50 rounded-xl transition-all duration-200 group">
              <div className="relative">
                <UserCircleIcon className="h-9 w-9 text-gray-600 group-hover:text-[#31BCFF] transition-colors duration-200" />
                <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-green-500 rounded-full border-2 border-white"></div>
              </div>
              <div className="hidden md:block text-left">
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
                        className={`${
                          active ? 'bg-blue-50/70 text-[#31BCFF]' : 'text-gray-700'
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
                        className={`${
                          active ? 'bg-red-50/70 text-red-600' : 'text-red-500'
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

      {/* Mobile menu - also conditionally rendered based on user role */}
      <Transition
        show={isMenuOpen}
        enter="transition ease-out duration-200 transform"
        enterFrom="opacity-0 scale-95 -translate-y-2"
        enterTo="opacity-100 scale-100 translate-y-0"
        leave="transition ease-in duration-150 transform"
        leaveFrom="opacity-100 scale-100 translate-y-0"
        leaveTo="opacity-0 scale-95 -translate-y-2"
      >
        <div className="md:hidden">
          <div className="px-4 pt-2 pb-3 space-y-1 bg-white/95 backdrop-blur-xl shadow-xl border-t border-gray-200/50">
            {navigation.map((item) => 
              !item.children ? (
                <Link
                  key={item.name}
                  href={item.href || '#'}
                  className="flex items-center px-4 py-3 rounded-xl text-base font-medium text-gray-700 hover:text-[#31BCFF] hover:bg-blue-50/50 transition-all duration-200 group"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <item.icon className="h-5 w-5 mr-3 group-hover:scale-110 transition-transform duration-200" aria-hidden="true" />
                  {item.name}
                </Link>
              ) : (
                <Disclosure key={item.name} as="div">
                  {({ open }) => (
                    <>
                      <Disclosure.Button className="flex items-center w-full px-4 py-3 text-base font-medium text-gray-700 rounded-xl hover:text-[#31BCFF] hover:bg-blue-50/50 transition-all duration-200 group">
                        <item.icon className="h-5 w-5 mr-3 group-hover:scale-110 transition-transform duration-200" />
                        <span className="flex-1">{item.name}</span>
                        <ChevronDownIcon
                          className={`${
                            open ? 'rotate-180' : ''
                          } w-5 h-5 transition-transform duration-200`}
                        />
                      </Disclosure.Button>
                      <Disclosure.Panel className="px-4 pt-2 pb-2 space-y-1">
                        {item.children?.map((child) => (
                          <Link
                            key={child.name}
                            href={child.href}
                            className="flex items-center pl-9 pr-4 py-3 text-sm font-medium text-gray-600 rounded-xl hover:text-[#31BCFF] hover:bg-blue-50/50 transition-all duration-200 group"
                            onClick={() => setIsMenuOpen(false)}
                          >
                            <div className="w-2 h-2 bg-current rounded-full mr-3 opacity-60 group-hover:scale-125 transition-transform duration-200"></div>
                            {child.name}
                          </Link>
                        ))}
                      </Disclosure.Panel>
                    </>
                  )}
                </Disclosure>
              )
            )}
          </div>
        </div>
      </Transition>
    </nav>
  )
}
