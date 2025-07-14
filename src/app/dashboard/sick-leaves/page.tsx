'use client'

import React, { useEffect, useState } from 'react'
import { PlusIcon, CheckIcon, XMarkIcon, EyeIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline'
import { FileText, Calendar, User, Clock } from 'lucide-react'
import Swal from 'sweetalert2'
import SickLeaveModal from '@/components/SickLeaveModal'
import { useTranslation } from 'react-i18next'

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
  const [sickLeaves, setSickLeaves] = useState<SickLeave[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editingData, setEditingData] = useState<SickLeave | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved'>('all')

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
    fetchSickLeaves()
    fetchEmployees()
  }, [])

  const handleSubmit = async (formData: SickLeaveFormData) => {
    setSubmitting(true)
    try {
      const url = editingData ? `/api/sick-leaves/${editingData.id}` : '/api/sick-leaves'
      const method = editingData ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
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
    return `${days} day${days > 1 ? 's' : ''}`
  }

  const filteredSickLeaves = sickLeaves.filter(sl => {
    const matchesSearch = searchTerm === '' || 
      `${sl.employee.firstName} ${sl.employee.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sl.employee.employeeNo?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'approved' && sl.approved) ||
      (statusFilter === 'pending' && !sl.approved)
    
    return matchesSearch && matchesStatus
  })

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center">{t('loading')}</div>
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
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-xl font-semibold text-gray-900">{t('title')}</h1>
          <p className="mt-2 text-sm text-gray-700">
            {t('subtitle')}
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <button
            onClick={() => {
              setEditingData(null)
              setShowModal(true)
            }}
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-[#31BCFF] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#31BCFF]/90"
          >
            <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
            {t('form.submit')}
          </button>
        </div>
      </div>
      
      {/* Filters */}
      <div className="mt-4 flex flex-col sm:flex-row gap-4">
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
                        <div className="text-gray-500">to {formatDate(sickLeave.endDate)}</div>
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
                      {!sickLeave.approved && (
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
                        className="text-[#31BCFF] hover:text-[#31BCFF]/90 p-1"
                        title={t('actions.edit')}
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(sickLeave.id)}
                        className="text-red-600 hover:text-red-900 p-1"
                        title={t('actions.delete')}
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
        employees={employees}
        showEmployeeSelection={true}
      />
    </>
  )
}
