'use client'

import Link from 'next/link'
import { APP_NAME } from '@/app/constants/constants'

const footerSections = {
  Product: [
    { label: 'Home', href: '/' },
  ],
  Account: [
    { label: 'Login', href: '/login' },
    { label: 'Register', href: '/register' },
  ],
}

export default function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-gray-900 text-gray-400">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="py-12 grid grid-cols-1 md:grid-cols-[minmax(0,1.4fr)_repeat(2,minmax(0,1fr))] gap-10">
          <div className="space-y-4">
            <Link href="/" className="text-2xl font-bold text-[#31BCFF] tracking-tight">
              {APP_NAME}
            </Link>
            <p className="text-sm leading-relaxed max-w-md">
              ZenLink helps teams manage employee scheduling, attendance, and payroll in one place.
            </p>
          </div>

          {Object.entries(footerSections).map(([section, links]) => (
            <div key={section} className="space-y-4">
              <h4 className="text-white font-semibold text-sm tracking-wide uppercase">
                {section}
              </h4>
              <ul className="space-y-2.5">
                {links.map(({ label, href }) => (
                  <li key={label}>
                    <Link
                      href={href}
                      className="text-sm hover:text-[#31BCFF] transition-colors duration-150"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-gray-800 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm">
          <p>© {currentYear} {APP_NAME}. All rights reserved.</p>
          <p className="text-center sm:text-right">
            Employee scheduling, attendance, and payroll management.
          </p>
        </div>
      </div>
    </footer>
  )
}
