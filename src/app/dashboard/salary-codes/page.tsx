'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@/shared/lib/useUser'
import { useRouter } from 'next/navigation'
import SalaryCodeManagement from '@/components/SalaryCodeManagement'

export default function SalaryCodesPage() {
  const { user, loading } = useUser()
  const router = useRouter()

  useEffect(() => {
    if (!loading && (!user || user.role === 'EMPLOYEE')) {
      router.push('/dashboard')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#31BCFF]"></div>
      </div>
    )
  }

  if (!user || user.role === 'EMPLOYEE') {
    return null
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <SalaryCodeManagement />
    </div>
  )
}
