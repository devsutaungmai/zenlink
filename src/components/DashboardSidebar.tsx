import Link from 'next/link'
import { Fragment } from 'react'
import { Dialog, Transition, Disclosure } from '@headlessui/react'
import { XMarkIcon, ChevronDownIcon, Cog6ToothIcon } from '@heroicons/react/24/outline'
import {
  HomeIcon,
  BuildingOfficeIcon,
  UsersIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline'
import { APP_NAME } from '@/app/constants/constants'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
  { name: 'Users', href: '/dashboard/users', icon: UsersIcon },
  {
    name: 'Employees',
    icon: UserGroupIcon,
    children: [
      { name: 'Department A', href: '/dashboard/employees/department-a' },
      { name: 'Department B', href: '/dashboard/employees/department-b' },
      { name: 'Department C', href: '/dashboard/employees/department-c' },
      { name: 'Department D', href: '/dashboard/employees/department-d' },
    ],
  },
  { name: 'Settings', href: '/dashboard/settings', icon: Cog6ToothIcon },
]

interface DashboardSidebarProps {
  mobileMenuOpen: boolean
  setMobileMenuOpen: (open: boolean) => void
}

export default function DashboardSidebar({ mobileMenuOpen, setMobileMenuOpen }: DashboardSidebarProps) {
  const SidebarContent = () => (
    <nav className="mt-5 flex-1 px-2 space-y-1">
      {navigation.map((item) => (
        !item.children ? (
          <Link
            key={item.name}
            href={item.href}
            className="group flex items-center px-2 py-2 text-sm font-medium rounded-md text-gray-600 hover:bg-gray-50 hover:text-[#31BCFF]"
            onClick={() => setMobileMenuOpen(false)}
          >
            <item.icon className="mr-3 h-6 w-6 text-gray-400 group-hover:text-[#31BCFF]" />
            {item.name}
          </Link>
        ) : (
          <Disclosure key={item.name} as="div" className="space-y-1">
            {({ open }) => (
              <>
                <Disclosure.Button className="group flex w-full items-center px-2 py-2 text-sm font-medium rounded-md text-gray-600 hover:bg-gray-50 hover:text-[#31BCFF]">
                  <item.icon className="mr-3 h-6 w-6 text-gray-400 group-hover:text-[#31BCFF]" />
                  <span className="flex-1">{item.name}</span>
                  <ChevronDownIcon
                    className={`${
                      open ? 'rotate-180 transform' : ''
                    } h-5 w-5 text-gray-400 transition-transform duration-200`}
                  />
                </Disclosure.Button>
                <Disclosure.Panel className="space-y-1">
                  {item.children.map((subItem) => (
                    <Link
                      key={subItem.name}
                      href={subItem.href}
                      className="group flex items-center pl-11 pr-2 py-2 text-sm font-medium text-gray-600 rounded-md hover:text-[#31BCFF] hover:bg-gray-50"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {subItem.name}
                    </Link>
                  ))}
                </Disclosure.Panel>
              </>
            )}
          </Disclosure>
        )
      ))}
    </nav>
  )

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
        <div className="flex-1 flex flex-col min-h-0 bg-white border-r border-gray-200">
          <div className="flex-1 flex flex-col pt-20 pb-4 overflow-y-auto">
            <SidebarContent />
          </div>
        </div>
      </div>

      {/* Mobile Sidebar */}
      <Transition.Root show={mobileMenuOpen} as={Fragment}>
        <Dialog as="div" className="relative z-40 md:hidden" onClose={setMobileMenuOpen}>
          <Transition.Child
            as={Fragment}
            enter="transition-opacity ease-linear duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="transition-opacity ease-linear duration-300"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-gray-600 bg-opacity-75" />
          </Transition.Child>

          <div className="fixed inset-0 flex z-40">
            <Transition.Child
              as={Fragment}
              enter="transition ease-in-out duration-300 transform"
              enterFrom="-translate-x-full"
              enterTo="translate-x-0"
              leave="transition ease-in-out duration-300 transform"
              leaveFrom="translate-x-0"
              leaveTo="-translate-x-full"
            >
              <Dialog.Panel className="relative flex-1 flex flex-col max-w-xs w-full bg-white">
                <Transition.Child
                  as={Fragment}
                  enter="ease-in-out duration-300"
                  enterFrom="opacity-0"
                  enterTo="opacity-100"
                  leave="ease-in-out duration-300"
                  leaveFrom="opacity-100"
                  leaveTo="opacity-0"
                >
                  <div className="absolute top-0 right-0 -mr-12 pt-2">
                    <button
                      type="button"
                      className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <span className="sr-only">Close sidebar</span>
                      <XMarkIcon className="h-6 w-6 text-white" aria-hidden="true" />
                    </button>
                  </div>
                </Transition.Child>
                <div className="flex-1 h-0 pt-20 pb-4 overflow-y-auto">
                  <SidebarContent />
                </div>
              </Dialog.Panel>
            </Transition.Child>
            <div className="flex-shrink-0 w-14" aria-hidden="true" />
          </div>
        </Dialog>
      </Transition.Root>
    </>
  )
}