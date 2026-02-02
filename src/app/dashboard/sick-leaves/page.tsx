'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { PlusIcon, CheckIcon, XMarkIcon, PencilIcon, TrashIcon, UserGroupIcon, DocumentTextIcon, ShieldCheckIcon, ChartBarIcon } from '@heroicons/react/24/outline'
import { FileText, Calendar, User, Clock } from 'lucide-react'
import Swal from 'sweetalert2'
import SickLeaveModal from '@/components/SickLeaveModal'
import { useTranslation } from 'react-i18next'
import { useUser } from '@/shared/lib/useUser'
import { usePermissions } from '@/shared/lib/usePermissions'
import { PERMISSIONS } from '@/shared/lib/permissions'

interface SickLeave {
  id: string
  startDate: string
  endDate: string
  reason?: string
  document?: string
  approved: boolean
  createdAt: string
  employee: {
    id: string
    firstName: string
    lastName: string
    employeeNo?: string
  }
}

interface Employee {
  id: string
  firstName: string
  lastName: string
  employeeNo?: string
}

interface SickLeaveFormData {
  employeeId?: string
  startDate: string
  endDate: string
  reason?: string
  document?: string
}

export default function SickLeavesPage() {
  const { t } = useTranslation('sick-leave')
  const { user, loading: userLoading } = useUser()
  const { hasPermission, loading: permissionsLoading } = usePermissions()
  const isEmployeeUser = user?.role === 'EMPLOYEE' || !!user?.employee
  
  const canViewSickLeave = hasPermission(PERMISSIONS.SICK_LEAVE_VIEW)
  const canCreateSickLeave = hasPermission(PERMISSIONS.SICK_LEAVE_CREATE)
  const canApproveSickLeave = hasPermission(PERMISSIONS.SICK_LEAVE_APPROVE)
  
  const [sickLeaves, setSickLeaves] = useState<SickLeave[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editingData, setEditingData] = useState<SickLeave | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved'>('all')
  const [currentEmployeeId, setCurrentEmployeeId] = useState<string | null>(null)

  const resolveEmployeeId = useCallback(async (): Promise<string | null> => {
    if (!isEmployeeUser) {
      return null
    }

    // Prefer the employee id already cached in the user object
    const directId = user?.employee?.id
    if (directId) {
      setCurrentEmployeeId(directId)
      return directId
    }

    // Try the dedicated employee endpoint (PIN-based logins)
    try {
      const response = await fetch('/api/employee/me')
      if (response.ok) {
        const employeeData = await response.json()
        if (employeeData?.id) {
          setCurrentEmployeeId(employeeData.id)
          return employeeData.id
        }
      }
    } catch (error) {
      console.error('Failed to resolve employee via /api/employee/me:', error)
    }

    // Final fallback: targeted search by user id
    if (user?.id) {
      try {
        const targetedResponse = await fetch(`/api/employees?userId=${user.id}`)
        if (targetedResponse.ok) {
          const employeesData = await targetedResponse.json()
          const match = Array.isArray(employeesData) ? employeesData[0] : null
          if (match?.id) {
            setCurrentEmployeeId(match.id)
            return match.id
          }
        }
      } catch (error) {
        console.error('Failed to resolve employee via /api/employees lookup:', error)
      }
    }

    return null
  }, [isEmployeeUser, user?.employee?.id, user?.id])

  const fetchSickLeaves = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/sick-leaves')
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || t('errors.fetch_failed'))
      }
      
      const data = await response.json()
      setSickLeaves(data)
    } catch (error) {
      console.error('Error fetching sick leaves:', error)
      setError(error instanceof Error ? error.message : t('errors.unknown'))
    } finally {
      setLoading(false)
    }
  }

  const fetchEmployees = async () => {
    try {
      const response = await fetch('/api/employees')
      
      if (!response.ok) {
        throw new Error(t('errors.fetch_employees_failed'))
      }
      
      const data = await response.json()
      setEmployees(data)
    } catch (error) {
      console.error('Error fetching employees:', error)
    }
  }

  useEffect(() => {
    if (userLoading) {
      return
    }

    fetchSickLeaves()
    if (!isEmployeeUser) {
      fetchEmployees()
    } else {
      setEmployees([])
      resolveEmployeeId()
    }
  }, [userLoading, isEmployeeUser, resolveEmployeeId])

  const handleSubmit = async (formData: SickLeaveFormData) => {
    let employeeIdForSubmission: string | null = null

    if (isEmployeeUser) {
      employeeIdForSubmission = currentEmployeeId || user?.employee?.id || null

      if (!employeeIdForSubmission) {
        employeeIdForSubmission = await resolveEmployeeId()
      }

      if (!employeeIdForSubmission) {
        Swal.fire({
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 3000,
          timerProgressBar: true,
          icon: 'error',
          title: t('errors.employee_not_found')
        })
        return
      }
    }

    setSubmitting(true)
    try {
      const url = editingData ? `/api/sick-leaves/${editingData.id}` : '/api/sick-leaves'
      const method = editingData ? 'PUT' : 'POST'

      const submissionData = isEmployeeUser
        ? { ...formData, employeeId: employeeIdForSubmission }
        : formData
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submissionData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || t('errors.save_failed'))
      }

      const result = await response.json()
      
      if (editingData) {
        setSickLeaves(sickLeaves.map(sl => sl.id === editingData.id ? result : sl))
      } else {
        setSickLeaves([result, ...sickLeaves])
      }

      Swal.fire({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        icon: 'success',
        title: t(editingData ? 'success.updated' : 'success.created')
      })

      setShowModal(false)
      setEditingData(null)
    } catch (error: any) {
      console.error('Error saving sick leave:', error)
      Swal.fire({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        icon: 'error',
        title: error.message || t('errors.save_failed')
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleApprove = async (id: string, approved: boolean) => {
    try {
      const response = await fetch(`/api/sick-leaves/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ approved }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || t('errors.update_failed'))
      }

      const result = await response.json()
      setSickLeaves(sickLeaves.map(sl => sl.id === id ? result : sl))

      Swal.fire({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        icon: 'success',
        title: t(approved ? 'success.approved' : 'success.rejected')
      })
    } catch (error: any) {
      console.error('Error updating sick leave:', error)
      Swal.fire({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        icon: 'error',
        title: error.message || t('errors.update_failed')
      })
    }
  }

  const handleDelete = async (id: string) => {
    const target = sickLeaves.find(sl => sl.id === id)
    if (target?.approved) {
      Swal.fire({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        icon: 'info',
        title: t('actions.locked_message', { defaultValue: 'Approved sick leaves cannot be deleted.' })
      })
      return
    }

    try {
      const result = await Swal.fire({
        title: t('delete.confirm_title'),
        text: t('delete.confirm_text'),
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#31BCFF',
        cancelButtonColor: '#d33',
        confirmButtonText: t('delete.confirm_button'),
        cancelButtonText: t('delete.cancel_button')
      })

      if (result.isConfirmed) {
        const response = await fetch(`/api/sick-leaves/${id}`, {
          method: 'DELETE',
        })
        
        if (response.ok) {
          setSickLeaves(sickLeaves.filter(sl => sl.id !== id))
          
          Swal.fire({
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000,
            timerProgressBar: true,
            icon: 'success',
            title: t('success.deleted')
          })
        } else {
          throw new Error(t('errors.delete_failed'))
        }
      }
    } catch (error: any) {
      console.error('Error deleting sick leave:', error)
      Swal.fire({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        icon: 'error',
        title: error.message || t('errors.delete_failed')
      })
    }
  }

  const handleEdit = (sickLeave: SickLeave) => {
    if (sickLeave.approved) {
      Swal.fire({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        icon: 'info',
        title: t('actions.locked_message', { defaultValue: 'Approved sick leaves cannot be edited.' })
      })
      return
    }

    setEditingData(sickLeave)
    setShowModal(true)
  }

  const handleViewDocument = (documentUrl: string) => {
    window.open(documentUrl, '_blank')
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  const getDuration = (startDate: string, endDate: string) => {
    const start = new Date(startDate)
    const end = new Date(endDate)
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
    return `${days} ${days > 1 ? t('table.day_plural') : t('table.day')}`
  }

  const stats = useMemo(() => {
    const totalRequests = sickLeaves.length
    const approvedCount = sickLeaves.filter(sl => sl.approved).length
    const pendingCount = totalRequests - approvedCount
    const documentedCount = sickLeaves.filter(sl => Boolean(sl.document)).length

    return {
      totalRequests,
      approvedCount,
      pendingCount,
      documentedCount
    }
  }, [sickLeaves])

  const filteredSickLeaves = sickLeaves.filter(sl => {
    const matchesSearch = searchTerm === '' || 
      `${sl.employee.firstName} ${sl.employee.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (!!sl.employee.employeeNo && sl.employee.employeeNo.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'approved' && sl.approved) ||
      (statusFilter === 'pending' && !sl.approved)
    
    return matchesSearch && matchesStatus
  })

  if (loading || userLoading || permissionsLoading) {
    return (
      <div className="p-6">
        <div className="text-center">{t('loading')}</div>
      </div>
    )
  }

  if (!canViewSickLeave && !isEmployeeUser) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-50">
        <div className="text-center p-8 bg-white rounded-lg shadow-md">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">{t('access_denied.title')}</h2>
          <p className="text-gray-600">{t('access_denied.message')}</p>
          <p className="text-sm text-gray-500 mt-2">{t('access_denied.contact_admin')}</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="text-center text-red-600">
          {t('error')}: {error}
          <button 
            onClick={fetchSickLeaves}
            className="ml-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            {t('retry')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="bg-gradient-to-r from-blue-50 via-cyan-50 to-blue-100 border border-blue-100 rounded-2xl p-4 sm:p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">
              {isEmployeeUser ? t('employee.title') : t('title')}
            </h1>
            <p className="text-sm sm:text-base text-gray-600 mt-2 max-w-2xl">
              {isEmployeeUser ? t('employee.subtitle') : t('subtitle')}
            </p>
            <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 mt-3">
              <div className="flex items-center gap-1">
                <ShieldCheckIcon className="w-4 h-4 text-green-600" />
                <span>{t('banner.approved_count', { defaultValue: '{{count}} approved', count: stats.approvedCount })}</span>
              </div>
              <div className="flex items-center gap-1">
                <ChartBarIcon className="w-4 h-4 text-yellow-500" />
                <span>{t('banner.pending_count', { defaultValue: '{{count}} pending', count: stats.pendingCount })}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
            <div className="grid grid-cols-2 gap-3 sm:gap-4 text-sm">
              <div className="bg-white rounded-xl border border-blue-100 px-4 py-3 shadow">
                <div className="flex items-center gap-2">
                  <UserGroupIcon className="w-5 h-5 text-blue-500" />
                  <span className="text-gray-500 text-xs uppercase tracking-wide">{t('stats.total_requests', { defaultValue: 'Total Requests' })}</span>
                </div>
                <p className="text-xl font-semibold text-gray-900 mt-2">{stats.totalRequests}</p>
              </div>
              <div className="bg-white rounded-xl border border-green-100 px-4 py-3 shadow">
                <div className="flex items-center gap-2">
                  <ShieldCheckIcon className="w-5 h-5 text-green-600" />
                  <span className="text-gray-500 text-xs uppercase tracking-wide">{t('stats.approved', { defaultValue: 'Approved' })}</span>
                </div>
                <p className="text-xl font-semibold text-gray-900 mt-2">{stats.approvedCount}</p>
              </div>
              <div className="bg-white rounded-xl border border-yellow-100 px-4 py-3 shadow">
                <div className="flex items-center gap-2">
                  <ChartBarIcon className="w-5 h-5 text-yellow-500" />
                  <span className="text-gray-500 text-xs uppercase tracking-wide">{t('stats.pending', { defaultValue: 'Pending' })}</span>
                </div>
                <p className="text-xl font-semibold text-gray-900 mt-2">{stats.pendingCount}</p>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 px-4 py-3 shadow">
                <div className="flex items-center gap-2">
                  <DocumentTextIcon className="w-5 h-5 text-indigo-500" />
                  <span className="text-gray-500 text-xs uppercase tracking-wide">{t('stats.documents', { defaultValue: 'With Documents' })}</span>
                </div>
                <p className="text-xl font-semibold text-gray-900 mt-2">{stats.documentedCount}</p>
              </div>
            </div>
            <button
              onClick={() => {
                setEditingData(null)
                setShowModal(true)
              }}
              className="inline-flex items-center justify-center rounded-xl border border-transparent bg-[#31BCFF] px-4 py-3 text-sm font-semibold text-white shadow-lg hover:bg-[#1FA7E6] transition"
            >
              <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
              {isEmployeeUser ? t('employee.request_button') : t('form.submit')}
            </button>
          </div>
        </div>
      </div>
      
      {/* Filters */}
      <div className="mt-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1 max-w-xs">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t('filters.search_placeholder')}
            className="block w-full rounded-md border border-gray-300 bg-white py-2 px-3 text-sm placeholder-gray-500 focus:border-[#31BCFF] focus:outline-none focus:ring-1 focus:ring-[#31BCFF]"
          />
        </div>
        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'pending' | 'approved')}
            className="block w-full rounded-md border border-gray-300 bg-white py-2 px-3 text-sm focus:border-[#31BCFF] focus:outline-none focus:ring-1 focus:ring-[#31BCFF]"
          >
            <option value="all">{t('filters.all_status')}</option>
            <option value="pending">{t('status.pending')}</option>
            <option value="approved">{t('status.approved')}</option>
          </select>
        </div>
      </div>

      {/* Sick Leaves Table */}
      <div className="mt-8 bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('table.employee')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('table.period')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('table.duration')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('table.reason')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('table.document')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('table.status')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('table.submitted')}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('table.actions')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredSickLeaves.map((sickLeave) => (
                <tr key={sickLeave.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <User className="h-8 w-8 text-gray-400 mr-3" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {sickLeave.employee.firstName} {sickLeave.employee.lastName}
                        </div>
                        {sickLeave.employee.employeeNo && (
                          <div className="text-sm text-gray-500">#{sickLeave.employee.employeeNo}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                      <div>
                        <div>{formatDate(sickLeave.startDate)}</div>
                        <div className="text-gray-500">{t('table.to')} {formatDate(sickLeave.endDate)}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      {getDuration(sickLeave.startDate, sickLeave.endDate)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 max-w-xs">
                    <div className="truncate" title={sickLeave.reason}>
                      {sickLeave.reason || '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {sickLeave.document ? (
                      <button
                        onClick={() => handleViewDocument(sickLeave.document!)}
                        className="flex items-center text-blue-600 hover:text-blue-900"
                      >
                        <FileText className="h-4 w-4 mr-1" />
                        {t('table.view')}
                      </button>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {sickLeave.approved ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <CheckIcon className="w-3 h-3 mr-1" />
                        {t('status.approved')}
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        <Clock className="w-3 h-3 mr-1" />
                        {t('status.pending')}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(sickLeave.createdAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      {!isEmployeeUser && !sickLeave.approved && (
                        <>
                          <button
                            onClick={() => handleApprove(sickLeave.id, true)}
                            className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-white bg-green-600 hover:bg-green-700"
                            title={t('actions.approve')}
                          >
                            <CheckIcon className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleApprove(sickLeave.id, false)}
                            className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-white bg-red-600 hover:bg-red-700"
                            title={t('actions.reject')}
                          >
                            <XMarkIcon className="w-3 h-3" />
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => handleEdit(sickLeave)}
                        className={`p-1 rounded ${sickLeave.approved ? 'text-gray-400 cursor-not-allowed' : 'text-[#31BCFF] hover:text-[#31BCFF]/90'}`}
                        title={sickLeave.approved ? t('actions.locked_tooltip', { defaultValue: 'Approved sick leaves cannot be edited' }) : t('actions.edit')}
                        disabled={sickLeave.approved}
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(sickLeave.id)}
                        className={`p-1 rounded ${sickLeave.approved ? 'text-gray-300 cursor-not-allowed' : 'text-red-600 hover:text-red-900'}`}
                        title={sickLeave.approved ? t('actions.locked_tooltip', { defaultValue: 'Approved sick leaves cannot be deleted' }) : t('actions.delete')}
                        disabled={sickLeave.approved}
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {filteredSickLeaves.length === 0 && (
        <div className="mt-8 bg-white shadow rounded-lg">
          <div className="text-center py-12">
            <User className="mx-auto h-12 w-12 text-gray-400" />
            <div className="mt-4 text-gray-500">{t('no_data')}</div>
          </div>
        </div>
      )}

      {/* Sick Leave Modal */}
      <SickLeaveModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false)
          setEditingData(null)
        }}
        initialData={editingData ? {
          id: editingData.id,
          employeeId: editingData.employee.id,
          startDate: editingData.startDate,
          endDate: editingData.endDate,
          reason: editingData.reason || '',
          document: editingData.document || ''
        } : undefined}
        onSubmit={handleSubmit}
        loading={submitting}
        employees={isEmployeeUser ? [] : employees}
        showEmployeeSelection={!isEmployeeUser}
        isEmployee={isEmployeeUser}
      />
    </>
  )
}
