'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import DashboardNavbar from '@/components/DashboardNavbar'
import { useUser } from '@/shared/lib/useUser'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const { user, loading } = useUser()

  // Authentication check - redirect if not logged in
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  // Show loading while checking authentication
  if (loading || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#31BCFF]"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardNavbar />
      
      <div className="flex flex-col flex-1">
        <div className="pt-16 pb-24 lg:pb-0"> {/* Padding for fixed top+bottom navs */}
          <div className="py-8 px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}