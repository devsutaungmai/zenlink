'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { PlusIcon, PencilIcon, TrashIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { useTranslation } from 'react-i18next'
import { CardGridSkeleton } from '@/components/skeletons/ScheduleSkeleton'
import Swal from 'sweetalert2'

interface Category {
  id: string
  name: string
  color?: string | null
  department?: {
    id: string
    name: string
  } | null
  departments?: Array<{
    id: string
    department: {
      id: string
      name: string
    }
  }>
}

interface Function {
  id: string
  name: string
  color?: string | null
  categoryId: string
  category: Category
  _count: {
    employees: number
    shifts: number
  }
}

export default function FunctionsPage() {
  const router = useRouter()
  const { t } = useTranslation('functions')
  const [functions, setFunctions] = useState<Function[]>([])
  const [filteredFunctions, setFilteredFunctions] = useState<Function[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchFunctions()
  }, [])

  useEffect(() => {
    const filtered = functions.filter(func => {
      const searchLower = searchTerm.toLowerCase();
      const matchesName = func.name.toLowerCase().includes(searchLower);
      const matchesCategory = func.category.name.toLowerCase().includes(searchLower);

      const deptNames = func.category.departments && func.category.departments.length > 0
        ? func.category.departments.map((cd: any) => cd.department.name).join(' ')
        : func.category.department?.name || '';
      const matchesDept = deptNames.toLowerCase().includes(searchLower);
      
      return matchesName || matchesCategory || matchesDept;
    });
    setFilteredFunctions(filtered);
  }, [searchTerm, functions])

  const fetchFunctions = async () => {
    try {
      const response = await fetch('/api/functions')
      if (response.ok) {
        const data = await response.json()
        setFunctions(data)
        setFilteredFunctions(data)
      } else {
        console.error('Failed to fetch functions')
      }
    } catch (error) {
      console.error('Error fetching functions:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    const result = await Swal.fire({
      title: t('delete_confirm_title'),
      text: t('delete_confirm_message', { name }),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#EF4444',
      cancelButtonColor: '#6B7280',
      confirmButtonText: t('delete_confirm'),
      cancelButtonText: t('cancel')
    })

    if (result.isConfirmed) {
      try {
        const response = await fetch(`/api/functions/${id}`, {
          method: 'DELETE'
        })

        if (response.ok) {
          await Swal.fire({
            title: t('success'),
            text: t('delete_success'),
            icon: 'success',
            confirmButtonColor: '#3B82F6'
          })
          fetchFunctions()
        } else {
          await Swal.fire({
            title: t('error'),
            text: t('delete_error'),
            icon: 'error',
            confirmButtonColor: '#EF4444'
          })
        }
      } catch (error) {
        console.error('Error deleting function:', error)
        await Swal.fire({
          title: t('error'),
          text: t('delete_error'),
          icon: 'error',
          confirmButtonColor: '#EF4444'
        })
      }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <CardGridSkeleton count={9} />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-4 sm:py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-4 sm:p-6 shadow-sm border border-blue-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                {t('page_title')}
              </h1>
              <p className="mt-2 text-sm sm:text-base text-gray-600">
                {t('page_description')}
              </p>
            </div>
            <Link
              href="/dashboard/functions/create"
              className="inline-flex items-center justify-center px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-md hover:shadow-lg text-sm sm:text-base font-medium"
            >
              <PlusIcon className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
              {t('add_function')}
            </Link>
          </div>

          {/* Stats */}
          <div className="mt-4 sm:mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <div className="bg-white rounded-lg p-3 sm:p-4 shadow-sm">
              <div className="text-xs sm:text-sm font-medium text-gray-500">{t('total_functions')}</div>
              <div className="mt-1 text-xl sm:text-2xl font-semibold text-gray-900">{functions.length}</div>
            </div>
            <div className="bg-white rounded-lg p-3 sm:p-4 shadow-sm">
              <div className="text-xs sm:text-sm font-medium text-gray-500">{t('total_employees')}</div>
              <div className="mt-1 text-xl sm:text-2xl font-semibold text-gray-900">
                {functions.reduce((sum, func) => sum + func._count.employees, 0)}
              </div>
            </div>
            <div className="bg-white rounded-lg p-3 sm:p-4 shadow-sm">
              <div className="text-xs sm:text-sm font-medium text-gray-500">{t('total_shifts')}</div>
              <div className="mt-1 text-xl sm:text-2xl font-semibold text-gray-900">
                {functions.reduce((sum, func) => sum + func._count.shifts, 0)}
              </div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-4 sm:p-6 border border-gray-200/50 shadow-lg">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder={t('search_placeholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 sm:py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
            />
          </div>
        </div>

        {/* Functions Grid */}
        {filteredFunctions.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl shadow-sm border border-gray-200">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <MagnifyingGlassIcon className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">{t('no_functions_found')}</h3>
            <p className="text-sm sm:text-base text-gray-500 mt-2">
              {searchTerm ? t('try_adjusting_search') : t('create_first_function')}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {filteredFunctions.map((func) => (
              <div
                key={func.id}
                className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden border border-gray-200"
              >
                <div
                  className="h-2"
                  style={{ backgroundColor: func.color || func.category.color || '#3B82F6' }}
                />
                <div className="p-4 sm:p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-1 truncate">
                        {func.name}
                      </h3>
                      <div className="flex flex-col space-y-1">
                        <span
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium w-fit"
                          style={{
                            backgroundColor: `${func.category.color || '#3B82F6'}20`,
                            color: func.category.color || '#3B82F6'
                          }}
                        >
                          {func.category.name}
                        </span>
                        <span className="text-xs text-gray-500 truncate">
                          {func.category.departments && func.category.departments.length > 0
                            ? func.category.departments.map((cd: any) => cd.department.name).join(', ')
                            : func.category.department?.name || t('business_wide')
                          }
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs sm:text-sm text-gray-600 mb-4">
                    <div>
                      <span className="font-medium">{func._count.employees}</span> {t('employees_count')}
                    </div>
                    <div>
                      <span className="font-medium">{func._count.shifts}</span> {t('shifts_count')}
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <Link
                      href={`/dashboard/functions/${func.id}/edit`}
                      className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors duration-200"
                    >
                      <PencilIcon className="h-4 w-4 mr-1.5" />
                      {t('edit')}
                    </Link>
                    <button
                      onClick={() => handleDelete(func.id, func.name)}
                      className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-red-300 rounded-lg text-sm font-medium text-red-700 bg-white hover:bg-red-50 transition-colors duration-200"
                    >
                      <TrashIcon className="h-4 w-4 mr-1.5" />
                      {t('delete')}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
