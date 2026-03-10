'use client'

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useUser } from '@/shared/lib/useUser'
import { useRouter } from 'next/navigation'
import SalaryCodeManagement from '@/components/SalaryCodeManagement'
import SalaryCodeCategoryManagement from '@/components/SalaryCodeCategoryManagement'

export default function SalaryCodesPage() {
  const { t } = useTranslation('salary-codes')
  const { user, loading } = useUser()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'codes' | 'categories'>('codes')

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
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('codes')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'codes'
                ? 'border-[#31BCFF] text-[#31BCFF]'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {t('tabs.salaryCodes')}
          </button>
          <button
            onClick={() => setActiveTab('categories')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'categories'
                ? 'border-[#31BCFF] text-[#31BCFF]'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {t('tabs.categories')}
          </button>
        </nav>
      </div>
      
      {activeTab === 'codes' ? (
        <SalaryCodeManagement />
      ) : (
        <SalaryCodeCategoryManagement />
      )}
    </div>
  )
}
