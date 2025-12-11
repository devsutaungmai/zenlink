'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { 
  ArrowLeftIcon,
  CheckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'

interface PermissionInfo {
  code: string
  name: string
  description: string
  category: string
}

interface PermissionsByCategory {
  [category: string]: PermissionInfo[]
}

interface Department {
  id: string
  name: string
}

export default function CreateRolePage() {
  const { t } = useTranslation()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [loadingPermissions, setLoadingPermissions] = useState(true)
  const [loadingDepartments, setLoadingDepartments] = useState(true)
  const [permissionsByCategory, setPermissionsByCategory] = useState<PermissionsByCategory>({})
  const [departments, setDepartments] = useState<Department[]>([])
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    permissions: [] as string[],
    departmentIds: [] as string[]
  })

  useEffect(() => {
    fetchPermissions()
    fetchDepartments()
  }, [])

  const fetchPermissions = async () => {
    try {
      const res = await fetch('/api/permissions')
      if (!res.ok) throw new Error('Failed to fetch permissions')
      const data = await res.json()
      setPermissionsByCategory(data.byCategory)
    } catch (err) {
      console.error('Error fetching permissions:', err)
    } finally {
      setLoadingPermissions(false)
    }
  }

  const fetchDepartments = async () => {
    try {
      const res = await fetch('/api/form-data')
      if (!res.ok) throw new Error('Failed to fetch departments')
      const data = await res.json()
      setDepartments(data.departments || [])
    } catch (err) {
      console.error('Error fetching departments:', err)
    } finally {
      setLoadingDepartments(false)
    }
  }

  const toggleDepartment = (deptId: string) => {
    setFormData(prev => ({
      ...prev,
      departmentIds: prev.departmentIds.includes(deptId)
        ? prev.departmentIds.filter(id => id !== deptId)
        : [...prev.departmentIds, deptId]
    }))
  }

  const togglePermission = (code: string) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(code)
        ? prev.permissions.filter(p => p !== code)
        : [...prev.permissions, code]
    }))
  }

  const toggleCategory = (category: string) => {
    const categoryPermissions = permissionsByCategory[category]?.map(p => p.code) || []
    const allSelected = categoryPermissions.every(p => formData.permissions.includes(p))
    
    if (allSelected) {
      // Remove all from this category
      setFormData(prev => ({
        ...prev,
        permissions: prev.permissions.filter(p => !categoryPermissions.includes(p))
      }))
    } else {
      // Add all from this category
      setFormData(prev => ({
        ...prev,
        permissions: [...new Set([...prev.permissions, ...categoryPermissions])]
      }))
    }
  }

  const selectAll = () => {
    const allPermissions = Object.values(permissionsByCategory)
      .flat()
      .map(p => p.code)
    setFormData(prev => ({ ...prev, permissions: allPermissions }))
  }

  const deselectAll = () => {
    setFormData(prev => ({ ...prev, permissions: [] }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch('/api/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create role')
      }

      router.push('/dashboard/roles')
    } catch (err: any) {
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  const isCategoryFullySelected = (category: string) => {
    const categoryPermissions = permissionsByCategory[category]?.map(p => p.code) || []
    return categoryPermissions.length > 0 && categoryPermissions.every(p => formData.permissions.includes(p))
  }

  const isCategoryPartiallySelected = (category: string) => {
    const categoryPermissions = permissionsByCategory[category]?.map(p => p.code) || []
    const selectedCount = categoryPermissions.filter(p => formData.permissions.includes(p)).length
    return selectedCount > 0 && selectedCount < categoryPermissions.length
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <ArrowLeftIcon className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {t('roles.createRole', 'Create Role')}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {t('roles.createRoleDescription', 'Create a new role and assign permissions')}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Role Details */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            {t('roles.roleDetails', 'Role Details')}
          </h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('roles.roleName', 'Role Name')} *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#31BCFF] focus:border-transparent"
                placeholder={t('roles.roleNamePlaceholder', 'e.g., Supervisor')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('roles.roleDescription', 'Description')}
              </label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#31BCFF] focus:border-transparent"
                placeholder={t('roles.roleDescriptionPlaceholder', 'Brief description of this role')}
              />
            </div>
          </div>

          {/* Department Restrictions */}
          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('roles.departmentRestrictions', 'Department Restrictions')}
            </label>
            <p className="text-xs text-gray-500 mb-3">
              {t('roles.departmentRestrictionsHint', 'Leave empty to make this role available to all departments. Select specific departments to restrict this role to employees in those departments only.')}
            </p>
            {loadingDepartments ? (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#31BCFF]"></div>
                Loading departments...
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {departments.map((dept) => (
                  <button
                    key={dept.id}
                    type="button"
                    onClick={() => toggleDepartment(dept.id)}
                    className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                      formData.departmentIds.includes(dept.id)
                        ? 'bg-[#31BCFF] text-white border-[#31BCFF]'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-[#31BCFF]'
                    }`}
                  >
                    {dept.name}
                  </button>
                ))}
                {departments.length === 0 && (
                  <p className="text-sm text-gray-500">No departments available</p>
                )}
              </div>
            )}
            {formData.departmentIds.length > 0 && (
              <p className="mt-2 text-xs text-[#31BCFF]">
                {t('roles.selectedDepartments', 'This role will only be available for employees in the selected departments.')}
              </p>
            )}
          </div>
        </div>

        {/* Permissions */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-gray-900">
              {t('roles.permissions', 'Permissions')}
            </h2>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={selectAll}
                className="px-3 py-1 text-sm text-[#31BCFF] hover:bg-blue-50 rounded-lg transition-colors"
              >
                {t('roles.selectAll', 'Select All')}
              </button>
              <button
                type="button"
                onClick={deselectAll}
                className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                {t('roles.deselectAll', 'Deselect All')}
              </button>
            </div>
          </div>

          {loadingPermissions ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#31BCFF]"></div>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(permissionsByCategory).map(([category, permissions]) => (
                <div key={category} className="border border-gray-200 rounded-lg overflow-hidden">
                  {/* Category Header */}
                  <div 
                    className="flex items-center justify-between px-4 py-3 bg-gray-50 cursor-pointer hover:bg-gray-100"
                    onClick={() => toggleCategory(category)}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                        isCategoryFullySelected(category)
                          ? 'bg-[#31BCFF] border-[#31BCFF]'
                          : isCategoryPartiallySelected(category)
                          ? 'bg-[#31BCFF]/50 border-[#31BCFF]'
                          : 'border-gray-300'
                      }`}>
                        {isCategoryFullySelected(category) && (
                          <CheckIcon className="w-3 h-3 text-white" />
                        )}
                        {isCategoryPartiallySelected(category) && (
                          <div className="w-2 h-0.5 bg-white"></div>
                        )}
                      </div>
                      <span className="font-medium text-gray-900">{category}</span>
                    </div>
                    <span className="text-sm text-gray-500">
                      {permissions.filter(p => formData.permissions.includes(p.code)).length} / {permissions.length}
                    </span>
                  </div>

                  {/* Permissions Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 p-4">
                    {permissions.map((permission) => (
                      <label
                        key={permission.code}
                        className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                          formData.permissions.includes(permission.code)
                            ? 'bg-blue-50 border border-[#31BCFF]'
                            : 'bg-gray-50 border border-transparent hover:bg-gray-100'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={formData.permissions.includes(permission.code)}
                          onChange={() => togglePermission(permission.code)}
                          className="mt-0.5 w-4 h-4 text-[#31BCFF] border-gray-300 rounded focus:ring-[#31BCFF]"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">
                            {permission.name}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {permission.description}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            {t('common.cancel', 'Cancel')}
          </button>
          <button
            type="submit"
            disabled={loading || !formData.name}
            className="px-4 py-2 text-sm font-medium text-white bg-[#31BCFF] rounded-lg hover:bg-[#00A3FF] disabled:opacity-50"
          >
            {loading ? t('common.saving', 'Saving...') : t('roles.createRole', 'Create Role')}
          </button>
        </div>
      </form>
    </div>
  )
}
