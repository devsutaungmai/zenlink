'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { PlusIcon, PencilIcon, TrashIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { useTranslation } from 'react-i18next'
import { ListSkeleton } from '@/components/skeletons/CommonSkeletons'
import Swal from 'sweetalert2'

interface Department {
  id: string
  name: string
  number?: string
  address: string
  address2?: string
  postCode?: string
  city: string
  phone: string
  country: string
  _count: {
    employees: number
  }
}

export default function DepartmentsPage() {
  const { t } = useTranslation()
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchDepartments()
  }, [])

  const fetchDepartments = async () => {
    try {
      const res = await fetch('/api/departments')
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`)
      }
      
      const data = await res.json()
      
      // Ensure data is an array before setting it
      if (Array.isArray(data)) {
        setDepartments(data)
      } else {
        console.error('API did not return an array:', data)
        setDepartments([])
      }
    } catch (error) {
      console.error('Error fetching departments:', error)
      setDepartments([]) // Set empty array on error
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const result = await Swal.fire({
        title: t('common.confirm'),
        text: t('departments.delete_department'),
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#31BCFF',
        cancelButtonColor: '#d33',
        confirmButtonText: t('common.yes'),
        cancelButtonText: t('common.cancel')
      })

      if (result.isConfirmed) {
        const res = await fetch(`/api/departments/${id}`, {
          method: 'DELETE',
        })
        
        if (res.ok) {
          setDepartments(departments.filter(dept => dept.id !== id))
          
          await Swal.fire({
            title: t('common.success'),
            text: t('departments.delete_department'),
            icon: 'success',
            confirmButtonColor: '#31BCFF',
          })
        } else {
          throw new Error('Failed to delete department')
        }
      }
    } catch (error) {
      console.error('Error deleting department:', error)
      await Swal.fire({
        title: t('common.error'),
        text: t('departments.delete_department'),
        icon: 'error',
        confirmButtonColor: '#31BCFF',
      })
    }
  }

  const filteredDepartments = departments.filter(department =>
    department.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    department.number?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className="p-6">
        <ListSkeleton count={8} />
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
              {t('departments.title')}
            </h1>
            <p className="mt-2 text-gray-600">
              {t('departments.description')}
            </p>
            <div className="mt-4 flex items-center space-x-4 text-sm text-gray-500">
              <span className="flex items-center">
                <div className="w-2 h-2 bg-[#31BCFF] rounded-full mr-2"></div>
                {t('departments.total_departments', { count: departments.length })}
              </span>
              <span className="flex items-center">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                {t('departments.total_employees', { count: departments.reduce((sum, dept) => sum + dept._count.employees, 0) })}
              </span>
            </div>
          </div>
          <Link
            href="/dashboard/departments/create"
            className="inline-flex items-center justify-center px-6 py-3 rounded-2xl bg-gradient-to-r from-[#31BCFF] to-[#0EA5E9] text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 group"
          >
            <PlusIcon className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform duration-200" />
            {t('departments.create_department')}
          </Link>
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
              placeholder={t('departments.search_placeholder')}
              className="block w-full pl-12 pr-4 py-3 rounded-xl border border-gray-300 bg-white/70 backdrop-blur-sm text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-[#31BCFF]/50 focus:border-[#31BCFF] transition-all duration-200"
            />
          </div>
          <div className="flex items-center text-sm text-gray-500">
            {t('employees.showing', { current: filteredDepartments.length, total: departments.length })}
          </div>
        </div>
      </div>

      {/* Departments Grid */}
      {filteredDepartments.length === 0 ? (
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-12 border border-gray-200/50 shadow-lg text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <MagnifyingGlassIcon className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">{t('departments.no_departments_found')}</h3>
          <p className="text-gray-500 mb-6">
            {searchTerm ? t('departments.adjust_search') : t('departments.get_started')}
          </p>
          {!searchTerm && (
            <Link
              href="/dashboard/departments/create"
              className="inline-flex items-center px-6 py-3 rounded-xl bg-[#31BCFF] text-white font-medium hover:bg-[#31BCFF]/90 transition-colors duration-200"
            >
              <PlusIcon className="w-5 h-5 mr-2" />
              {t('departments.create_first_department')}
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDepartments.map((department) => (
            <div
              key={department.id}
              className="group bg-white/80 backdrop-blur-xl rounded-2xl p-6 border border-gray-200/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] hover:border-[#31BCFF]/30"
            >
              {/* Department Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 group-hover:text-[#31BCFF] transition-colors duration-200">
                    {department.name}
                  </h3>
                  {department.number && (
                    <p className="text-sm text-gray-500 mt-1">
                      {t('departments.department_number_label', { number: department.number })}
                    </p>
                  )}
                </div>
                <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <Link
                    href={`/dashboard/departments/${department.id}/edit`}
                    className="p-2 text-gray-400 hover:text-[#31BCFF] hover:bg-blue-50 rounded-lg transition-all duration-200"
                    title="Edit Department"
                  >
                    <PencilIcon className="h-4 w-4" />
                  </Link>
                  <button
                    onClick={() => handleDelete(department.id)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                    title="Delete Department"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Department Stats */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 mb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-[#31BCFF]/10 rounded-lg flex items-center justify-center mr-3">
                      <svg className="w-5 h-5 text-[#31BCFF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900">
                        {department._count.employees}
                      </p>
                      <p className="text-sm text-gray-500">
                        {department._count.employees === 1 ? t('departments.employees_count', { count: department._count.employees }) : t('departments.employees_count_plural', { count: department._count.employees })}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Department Info */}
              <div className="space-y-2 text-sm">
                <div className="flex items-center text-gray-600">
                  <svg className="w-4 h-4 mr-2 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="truncate">{department.city}, {department.country}</span>
                </div>
                {department.phone && (
                  <div className="flex items-center text-gray-600">
                    <svg className="w-4 h-4 mr-2 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <span className="truncate">{department.phone}</span>
                  </div>
                )}
              </div>

              {/* Quick Actions */}
              <div className="mt-4 pt-4 border-t border-gray-200/50">
                <Link
                  href={`/dashboard/departments/${department.id}/edit`}
                  className="w-full inline-flex items-center justify-center px-4 py-2 rounded-xl bg-gray-50 text-gray-700 font-medium hover:bg-[#31BCFF] hover:text-white transition-all duration-200 group/btn"
                >
                  <PencilIcon className="w-4 h-4 mr-2 group-hover/btn:scale-110 transition-transform duration-200" />
                  {t('departments.edit_department_action')}
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}