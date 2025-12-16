'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon,
  MagnifyingGlassIcon,
  ShieldCheckIcon,
  UserGroupIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'
import Swal from 'sweetalert2'
import { CardGridSkeleton } from '@/components/skeletons/ScheduleSkeleton'

interface Permission {
  id: string
  code: string
  name: string
  description: string
  category: string
}

interface RolePermission {
  id: string
  permission: Permission
}

interface Role {
  id: string
  name: string
  description: string | null
  isSystem: boolean
  isDefault: boolean
  permissions: RolePermission[]
  _count: {
    users: number
  }
}

export default function RolesPage() {
  const { t } = useTranslation()
  const router = useRouter()
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [initializing, setInitializing] = useState(false)

  useEffect(() => {
    fetchRoles()
  }, [])

  const fetchRoles = async () => {
    try {
      const res = await fetch('/api/roles')
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`)
      }
      
      const data = await res.json()

      if (Array.isArray(data)) {
        setRoles(data)
      } else {
        console.error('API did not return an array:', data)
        setRoles([])
      }
    } catch (error) {
      console.error('Error fetching roles:', error)
      setRoles([])
    } finally {
      setLoading(false)
    }
  }

  const initializeRoles = async () => {
    setInitializing(true)
    try {
      const res = await fetch('/api/roles/initialize', { method: 'POST' })
      if (!res.ok) throw new Error('Failed to initialize roles')
      await fetchRoles()
      
      await Swal.fire({
        title: t('common.success'),
        text: t('roles.initializeSuccess', 'Default roles have been created successfully'),
        icon: 'success',
        confirmButtonColor: '#31BCFF',
      })
    } catch (error) {
      console.error('Error initializing roles:', error)
      await Swal.fire({
        title: t('common.error'),
        text: t('roles.initializeError', 'Failed to initialize roles'),
        icon: 'error',
        confirmButtonColor: '#31BCFF',
      })
    } finally {
      setInitializing(false)
    }
  }

  const handleDelete = async (id: string, role: Role) => {
    if (role.isSystem) {
      await Swal.fire({
        title: t('common.error'),
        text: t('roles.cannotDeleteSystem', 'System roles cannot be deleted'),
        icon: 'error',
        confirmButtonColor: '#31BCFF',
      })
      return
    }

    if (role._count.users > 0) {
      await Swal.fire({
        title: t('common.error'),
        text: t('roles.cannotDeleteWithUsers', 'Cannot delete role that is assigned to users. Please reassign users first.'),
        icon: 'error',
        confirmButtonColor: '#31BCFF',
      })
      return
    }

    try {
      const result = await Swal.fire({
        title: t('common.confirm'),
        text: t('roles.confirmDelete', 'Are you sure you want to delete this role?'),
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#31BCFF',
        cancelButtonColor: '#d33',
        confirmButtonText: t('common.yes'),
        cancelButtonText: t('common.cancel')
      })

      if (result.isConfirmed) {
        const res = await fetch(`/api/roles/${id}`, {
          method: 'DELETE',
        })
        
        if (res.ok) {
          setRoles(roles.filter(r => r.id !== id))
          
          await Swal.fire({
            title: t('common.success'),
            text: t('roles.deleteSuccess', 'Role deleted successfully'),
            icon: 'success',
            confirmButtonColor: '#31BCFF',
          })
        } else {
          const data = await res.json()
          throw new Error(data.error || 'Failed to delete role')
        }
      }
    } catch (error: any) {
      console.error('Error deleting role:', error)
      await Swal.fire({
        title: t('common.error'),
        text: error.message || t('roles.deleteError', 'Failed to delete role'),
        icon: 'error',
        confirmButtonColor: '#31BCFF',
      })
    }
  }

  const filteredRoles = roles.filter(role =>
    role.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    role.description?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const totalUsers = roles.reduce((sum, role) => sum + role._count.users, 0)

  if (loading) {
    return (
      <div className="p-6">
        <CardGridSkeleton count={6} />
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
              {t('roles.title', 'Roles & Permissions')}
            </h1>
            <p className="mt-2 text-gray-600">
              {t('roles.description', 'Manage roles and their permissions')}
            </p>
            <div className="mt-4 flex items-center space-x-4 text-sm text-gray-500">
              <span className="flex items-center">
                <div className="w-2 h-2 bg-[#31BCFF] rounded-full mr-2"></div>
                {t('roles.totalRoles', { count: roles.length })}
              </span>
              <span className="flex items-center">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                {t('roles.totalUsers', { count: totalUsers })}
              </span>
            </div>
          </div>
          <div className="flex gap-3">
            {roles.length === 0 && (
              <button
                onClick={initializeRoles}
                disabled={initializing}
                className="inline-flex items-center justify-center px-6 py-3 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-500 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 group disabled:opacity-50"
              >
                <CheckCircleIcon className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform duration-200" />
                {initializing ? t('roles.initializing', 'Initializing...') : t('roles.initializeDefaults', 'Initialize Default Roles')}
              </button>
            )}
            <Link
              href="/dashboard/roles/create"
              className="inline-flex items-center justify-center px-6 py-3 rounded-2xl bg-gradient-to-r from-[#31BCFF] to-[#0EA5E9] text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 group"
            >
              <PlusIcon className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform duration-200" />
              {t('roles.createRole', 'Create Role')}
            </Link>
          </div>
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
              placeholder={t('roles.searchPlaceholder', 'Search roles...')}
              className="block w-full pl-12 pr-4 py-3 rounded-xl border border-gray-300 bg-white/70 backdrop-blur-sm text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-[#31BCFF]/50 focus:border-[#31BCFF] transition-all duration-200"
            />
          </div>
          <div className="flex items-center text-sm text-gray-500">
            {t('common.showing', 'Showing {{current}} of {{total}}', { current: filteredRoles.length, total: roles.length })}
          </div>
        </div>
      </div>

      {/* Roles Grid */}
      {filteredRoles.length === 0 ? (
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-12 border border-gray-200/50 shadow-lg text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldCheckIcon className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {t('roles.noRolesFound', 'No roles found')}
          </h3>
          <p className="text-gray-500 mb-6">
            {searchTerm 
              ? t('roles.adjustSearch', 'Try adjusting your search criteria')
              : t('roles.getStarted', 'Get started by creating your first role or initializing default roles')}
          </p>
          {!searchTerm && (
            <div className="flex justify-center gap-3">
              <button
                onClick={initializeRoles}
                disabled={initializing}
                className="inline-flex items-center px-6 py-3 rounded-xl bg-green-500 text-white font-medium hover:bg-green-600 transition-colors duration-200"
              >
                <CheckCircleIcon className="w-5 h-5 mr-2" />
                {t('roles.initializeDefaults', 'Initialize Default Roles')}
              </button>
              <Link
                href="/dashboard/roles/create"
                className="inline-flex items-center px-6 py-3 rounded-xl bg-[#31BCFF] text-white font-medium hover:bg-[#31BCFF]/90 transition-colors duration-200"
              >
                <PlusIcon className="w-5 h-5 mr-2" />
                {t('roles.createFirstRole', 'Create Your First Role')}
              </Link>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRoles.map((role) => (
            <div
              key={role.id}
              className="group bg-white/80 backdrop-blur-xl rounded-2xl p-6 border border-gray-200/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] hover:border-[#31BCFF]/30"
            >
              {/* Role Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-lg font-semibold text-gray-900 group-hover:text-[#31BCFF] transition-colors duration-200">
                      {role.name}
                    </h3>
                    {role.isSystem && (
                      <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                        {t('roles.system', 'System')}
                      </span>
                    )}
                    {role.isDefault && (
                      <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                        {t('roles.default', 'Default')}
                      </span>
                    )}
                  </div>
                  {role.description && (
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                      {role.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  {!role.isSystem && (
                    <button
                      onClick={() => handleDelete(role.id, role)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                      title={t('roles.delete', 'Delete Role')}
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Role Stats */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 mb-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-[#31BCFF]/10 rounded-lg flex items-center justify-center mr-3">
                      <ShieldCheckIcon className="w-5 h-5 text-[#31BCFF]" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900">
                        {role.permissions.length}
                      </p>
                      <p className="text-sm text-gray-500">
                        {t('roles.permissionsLabel', 'Permissions')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center mr-3">
                      <UserGroupIcon className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900">
                        {role._count.users}
                      </p>
                      <p className="text-sm text-gray-500">
                        {t('roles.usersLabel', 'Users')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Permission Categories Preview */}
              {role.permissions.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs text-gray-500 mb-2">{t('roles.categories', 'Categories')}:</p>
                  <div className="flex flex-wrap gap-1">
                    {[...new Set(role.permissions.map(p => p.permission.category))].slice(0, 4).map((category) => (
                      <span
                        key={category}
                        className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-lg"
                      >
                        {category}
                      </span>
                    ))}
                    {[...new Set(role.permissions.map(p => p.permission.category))].length > 4 && (
                      <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-lg">
                        +{[...new Set(role.permissions.map(p => p.permission.category))].length - 4}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Quick Actions */}
              <div className="mt-4 pt-4 border-t border-gray-200/50">
                <Link
                  href={`/dashboard/roles/${role.id}`}
                  className="w-full inline-flex items-center justify-center px-4 py-2 rounded-xl bg-gray-50 text-gray-700 font-medium hover:bg-[#31BCFF] hover:text-white transition-all duration-200 group/btn"
                >
                  <PencilIcon className="w-4 h-4 mr-2 group-hover/btn:scale-110 transition-transform duration-200" />
                  {t('roles.editRole', 'Edit Role')}
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
