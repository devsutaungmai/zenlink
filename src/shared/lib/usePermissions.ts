'use client'

import { useState, useEffect, useCallback } from 'react'
import { PERMISSIONS } from './permissions'

interface PermissionsData {
  permissions: string[]
  accessibleDepartmentIds: string[] | null
  isAdmin: boolean
}

interface UsePermissionsReturn {
  permissions: string[]
  accessibleDepartmentIds: string[] | null
  isAdmin: boolean
  loading: boolean
  hasPermission: (permission: string) => boolean
  hasAnyPermission: (permissions: string[]) => boolean
  hasAllPermissions: (permissions: string[]) => boolean
  canAccessDepartment: (departmentId: string) => boolean
  refetch: () => Promise<void>
}

export function usePermissions(): UsePermissionsReturn {
  const [data, setData] = useState<PermissionsData>({
    permissions: [],
    accessibleDepartmentIds: null,
    isAdmin: false
  })
  const [loading, setLoading] = useState(true)

  const fetchPermissions = useCallback(async () => {
    try {
      // Check sessionStorage for tab-specific session mode
      const sessionMode = typeof window !== 'undefined' 
        ? sessionStorage.getItem('zenlink_session_mode') 
        : null
      const useEmployeeSession = sessionMode === 'employee'
      const url = useEmployeeSession ? '/api/auth/permissions?preferEmployee=true' : '/api/auth/permissions'
      const res = await fetch(url)
      if (res.ok) {
        const result = await res.json()
        setData(result)
      }
    } catch (error) {
      console.error('Failed to fetch permissions:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPermissions()
  }, [fetchPermissions])

  const hasPermission = useCallback((permission: string): boolean => {
    if (data.isAdmin || data.permissions.includes('*')) return true
    return data.permissions.includes(permission)
  }, [data.permissions, data.isAdmin])

  const hasAnyPermission = useCallback((permissions: string[]): boolean => {
    if (data.isAdmin || data.permissions.includes('*')) return true
    return permissions.some(p => data.permissions.includes(p))
  }, [data.permissions, data.isAdmin])

  const hasAllPermissions = useCallback((permissions: string[]): boolean => {
    if (data.isAdmin || data.permissions.includes('*')) return true
    return permissions.every(p => data.permissions.includes(p))
  }, [data.permissions, data.isAdmin])

  const canAccessDepartment = useCallback((departmentId: string): boolean => {
    if (data.isAdmin || data.accessibleDepartmentIds === null) return true
    return data.accessibleDepartmentIds.includes(departmentId)
  }, [data.accessibleDepartmentIds, data.isAdmin])

  return {
    permissions: data.permissions,
    accessibleDepartmentIds: data.accessibleDepartmentIds,
    isAdmin: data.isAdmin,
    loading,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    canAccessDepartment,
    refetch: fetchPermissions
  }
}

// Navigation permission mappings
export const NAV_PERMISSIONS = {
  // Employee self-service
  yourHours: [PERMISSIONS.ATTENDANCE_VIEW_OWN_HOURS],
  
  // Employees menu
  departments: [PERMISSIONS.DEPARTMENTS_VIEW],
  categories: [PERMISSIONS.CATEGORIES_VIEW],
  functions: [PERMISSIONS.FUNCTIONS_VIEW],
  employees: [PERMISSIONS.EMPLOYEES_VIEW],
  employeeGroups: [PERMISSIONS.EMPLOYEE_GROUPS_VIEW],
  contracts: [PERMISSIONS.CONTRACTS_VIEW],
  roles: [PERMISSIONS.ROLES_VIEW],
  
  // Schedule menu
  schedule: [PERMISSIONS.SCHEDULE_VIEW],
  punchClock: [PERMISSIONS.PUNCH_CLOCK_SETTINGS],
  availability: [PERMISSIONS.AVAILABILITY_VIEW],
  sickLeaves: [PERMISSIONS.SICK_LEAVE_VIEW],
  pendingRequests: [PERMISSIONS.AVAILABILITY_APPROVE, PERMISSIONS.SICK_LEAVE_APPROVE, PERMISSIONS.SHIFTS_EXCHANGE_APPROVE],
  
  // Payroll menu
  payrollPeriods: [PERMISSIONS.PAYROLL_PERIODS_MANAGE],
  payrollEntries: [PERMISSIONS.PAYROLL_ENTRIES_VIEW],
  payrollReports: [PERMISSIONS.REPORTS_PAYROLL],
  salaryCodes: [PERMISSIONS.SALARY_CODES_MANAGE],
  payRules: [PERMISSIONS.PAY_RULES_VIEW],
  overtimeRules: [PERMISSIONS.OVERTIME_RULES_MANAGE],
  
  // Settings
  settings: [PERMISSIONS.SETTINGS_VIEW],
}
