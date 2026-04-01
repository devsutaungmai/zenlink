'use client'
import Link from 'next/link'
import { useState } from 'react'
import { APP_NAME } from '@/app/constants/constants'

interface NavbarProps {
  isAuthenticated?: boolean
}

export default function Navbar({ isAuthenticated = false }: NavbarProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <nav className="bg-transparent fixed w-full z-50">
      <div className="container mx-auto px-6">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="text-2xl font-bold text-[#31BCFF]">
            {APP_NAME}
          </Link>
          
          {/* Desktop Auth Buttons */}
          <div className="hidden md:flex space-x-4">
            {isAuthenticated ? (
              <Link 
                href="/dashboard" 
                className="px-4 py-2 bg-[#31BCFF] text-white rounded-md font-medium hover:bg-[#31BCFF]/90 transition-colors"
              >
                Dashboard
              </Link>
            ) : (
              <>
                <Link 
                  href="/login" 
                  className="px-4 py-2 text-[#31BCFF] font-medium hover:bg-[#31BCFF]/10 rounded-md transition-colors"
                >
                  Login
                </Link>
                <Link 
                  href="/register" 
                  className="px-4 py-2 bg-[#31BCFF] text-white rounded-md font-medium hover:bg-[#31BCFF]/90 transition-colors"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle menu"
          >
            <svg
              className="w-6 h-6 text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {isMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-white border-t">
              <div className="border-t pt-3 mt-3 space-y-2">
                {isAuthenticated ? (
                  <Link 
                    href="/dashboard" 
                    className="block px-3 py-2 bg-[#31BCFF] text-white rounded-md font-medium hover:bg-[#31BCFF]/90 text-center transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Dashboard
                  </Link>
                ) : (
                  <>
                    <Link 
                      href="/login" 
                      className="block px-3 py-2 text-[#31BCFF] font-medium hover:bg-[#31BCFF]/10 rounded-md transition-colors"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Login
                    </Link>
                    <Link 
                      href="/register" 
                      className="block px-3 py-2 bg-[#31BCFF] text-white rounded-md font-medium hover:bg-[#31BCFF]/90 text-center transition-colors"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Get Started
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
