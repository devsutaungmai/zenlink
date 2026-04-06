'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import DashboardNavbar from '@/components/DashboardNavbar'
import { useUser } from '@/shared/lib/useUser'

const STALE_THRESHOLD_MS = 5 * 60 * 1000 // 5 minutes

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const { user, loading } = useUser()
  const lastActiveRef = useRef<number>(Date.now())

  const refreshRouterCache = useCallback(() => {
    try {
      router.refresh()
    } catch {
    }
  }, [router])

  // Authentication check - redirect if not logged in or not admin/manager
  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login')
        return
      }
      // Only allow admin/manager to access dashboard
      // If user is employee-only (logged in via PIN in another tab), redirect to login
      const sessionMode = sessionStorage.getItem('zenlink_session_mode')
      if (sessionMode !== 'admin' && user.role === 'EMPLOYEE') {
        router.push('/login')
      }
    }
  }, [user, loading, router])

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const idleDuration = Date.now() - lastActiveRef.current
        if (idleDuration > STALE_THRESHOLD_MS) {
          refreshRouterCache()
        }
        lastActiveRef.current = Date.now()
      } else {
        lastActiveRef.current = Date.now()
      }
    }

    const periodicRefreshInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        refreshRouterCache()
        lastActiveRef.current = Date.now()
      }
    }, STALE_THRESHOLD_MS)

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      clearInterval(periodicRefreshInterval)
    }
  }, [refreshRouterCache])
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
        <div className="pt-16 pb-24 xl:pb-0"> {/* Padding for fixed top+bottom navs */}
          <div className="py-8 px-4 sm:px-6 xl:px-8">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}