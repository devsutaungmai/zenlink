'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { PlusIcon, PencilIcon, TrashIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { useTranslation } from 'react-i18next'
import { CardGridSkeleton } from '@/components/skeletons/ScheduleSkeleton'
import Swal from 'sweetalert2'
import { usePermissions } from '@/shared/lib/usePermissions'
import { PERMISSIONS } from '@/shared/lib/permissions'

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
  const { hasPermission } = usePermissions()
  const [functions, setFunctions] = useState<Function[]>([])
  const [filteredFunctions, setFilteredFunctions] = useState<Function[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)

  const canCreateFunctions = hasPermission(PERMISSIONS.FUNCTIONS_CREATE)
  const canEditFunctions = hasPermission(PERMISSIONS.FUNCTIONS_EDIT)
  const canDeleteFunctions = hasPermission(PERMISSIONS.FUNCTIONS_DELETE)

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
      confirmButtonColor: '#31BCFF',
      cancelButtonColor: '#d33',
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
            confirmButtonColor: '#31BCFF'
          })
          fetchFunctions()
        } else {
          let errorMessage = t('delete_error')
          try {
            const data = await response.json()
            if (data?.code === 'FUNCTION_IN_USE') {
              errorMessage = t('delete_in_use')
            } else if (data?.message) {
              errorMessage = data.message
            }
          } catch (err) {
            console.error('Error parsing delete response:', err)
          }

          await Swal.fire({
            title: t('error'),
            text: errorMessage,
            icon: 'error',
            confirmButtonColor: '#31BCFF'
          })
        }
      } catch (error) {
        console.error('Error deleting function:', error)
        await Swal.fire({
          title: t('error'),
          text: t('delete_error'),
          icon: 'error',
          confirmButtonColor: '#31BCFF'
        })
      }
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <CardGridSkeleton count={9} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between">
          <div className="mb-4 sm:mb-0">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
              {t('page_title')}
            </h1>
            <p className="mt-2 text-gray-600">
              {t('page_description')}
            </p>
            <div className="mt-4 flex items-center space-x-4 text-sm text-gray-500">
              <span className="flex items-center">
                <div className="w-2 h-2 bg-[#31BCFF] rounded-full mr-2"></div>
                {t('total_functions')}: {functions.length}
              </span>
              <span className="flex items-center">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                {t('total_employees')}: {functions.reduce((sum, func) => sum + func._count.employees, 0)}
              </span>
              <span className="flex items-center">
                <div className="w-2 h-2 bg-purple-500 rounded-full mr-2"></div>
                {t('total_shifts')}: {functions.reduce((sum, func) => sum + func._count.shifts, 0)}
              </span>
            </div>
          </div>
          {canCreateFunctions && (
            <Link
              href="/dashboard/functions/create"
              className="inline-flex items-center justify-center px-6 py-3 rounded-2xl bg-gradient-to-r from-[#31BCFF] to-[#0EA5E9] text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 group"
            >
              <PlusIcon className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform duration-200" />
              {t('add_function')}
            </Link>
          )}
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 border border-gray-200/50 shadow-lg">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 flex items-center pl-4">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t('search_placeholder')}
              className="block w-full pl-12 pr-4 py-3 rounded-xl border border-gray-300 bg-white/70 backdrop-blur-sm text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-[#31BCFF]/50 focus:border-[#31BCFF] transition-all duration-200"
            />
          </div>
          <div className="flex items-center text-sm text-gray-500">
            {t('showing', { current: filteredFunctions.length, total: functions.length })}
          </div>
        </div>
      </div>

      {/* Functions Grid */}
      {filteredFunctions.length === 0 ? (
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-12 border border-gray-200/50 shadow-lg text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <MagnifyingGlassIcon className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">{t('no_functions_found')}</h3>
          <p className="text-gray-500 mb-6">
            {searchTerm ? t('try_adjusting_search') : t('create_first_function')}
          </p>
          {!searchTerm && canCreateFunctions && (
            <Link
              href="/dashboard/functions/create"
              className="inline-flex items-center px-6 py-3 rounded-xl bg-[#31BCFF] text-white font-medium hover:bg-[#31BCFF]/90 transition-colors duration-200"
            >
              <PlusIcon className="w-5 h-5 mr-2" />
              {t('add_function')}
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredFunctions.map((func) => (
            <div
              key={func.id}
              className="group bg-white/80 backdrop-blur-xl rounded-2xl p-6 border border-gray-200/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] hover:border-[#31BCFF]/30"
            >
              {/* Function Header with Color Indicator */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: func.color || func.category.color || '#31BCFF' }}
                    />
                    <h3 className="text-lg font-semibold text-gray-900 group-hover:text-[#31BCFF] transition-colors duration-200">
                      {func.name}
                    </h3>
                  </div>
                  <span
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                    style={{
                      backgroundColor: `${func.category.color || '#31BCFF'}20`,
                      color: func.category.color || '#31BCFF'
                    }}
                  >
                    {func.category.name}
                  </span>
                  {(func.category.departments && func.category.departments.length > 0 
                    ? func.category.departments.map((cd: any) => cd.department.name).join(', ')
                    : func.category.department?.name) && (
                    <p className="text-sm text-gray-500 mt-1">
                      {func.category.departments && func.category.departments.length > 0
                        ? func.category.departments.map((cd: any) => cd.department.name).join(', ')
                        : func.category.department?.name || t('business_wide')}
                    </p>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  {canDeleteFunctions && (
                    <button
                      onClick={() => handleDelete(func.id, func.name)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                      title="Delete Function"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Function Stats */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 mb-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">{t('employees_count')}</p>
                    <p className="text-2xl font-bold text-gray-900">{func._count.employees}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">{t('shifts_count')}</p>
                    <p className="text-2xl font-bold text-gray-900">{func._count.shifts}</p>
                  </div>
                </div>
              </div>

              {/* Quick Action */}
              {canEditFunctions && (
                <div className="mt-4 pt-4 border-t border-gray-200/50">
                  <Link
                    href={`/dashboard/functions/${func.id}/edit`}
                    className="w-full inline-flex items-center justify-center px-4 py-2 rounded-xl bg-gray-50 text-gray-700 font-medium hover:bg-[#31BCFF] hover:text-white transition-all duration-200 group/btn"
                  >
                    <PencilIcon className="w-4 h-4 mr-2 group-hover/btn:scale-110 transition-transform duration-200" />
                    {t('edit')}
                  </Link>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
