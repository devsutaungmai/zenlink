'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import { PayrollEntry, PayrollPeriod } from '@/shared/types'
import { 
  PlusIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  DocumentArrowDownIcon,
  TableCellsIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline'
import Swal from 'sweetalert2'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"

export default function PayrollEntriesPage() {
  const { t } = useTranslation('payroll-entries')
  const [entries, setEntries] = useState<PayrollEntry[]>([])
  const [periods, setPeriods] = useState<PayrollPeriod[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [periodFilter, setPeriodFilter] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [selectedEntries, setSelectedEntries] = useState<string[]>([])
  const [showStatusModal, setShowStatusModal] = useState(false)
  const [bulkStatus, setBulkStatus] = useState<string>('APPROVED')

  const fetchEntries = async (page = 1, status = '', periodId = '') => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10'
      })
      
      if (status && status !== 'all') {
        params.append('status', status)
      }

      if (periodId && periodId !== 'all') {
        params.append('payrollPeriodId', periodId)
      }

      const response = await fetch(`/api/payroll-entries?${params}`)
      const data = await response.json()

      if (response.ok) {
        setEntries(data.payrollEntries)
        setTotalPages(data.pagination.pages)
      } else {
        console.error('Error fetching entries:', data.error)
        await Swal.fire({
          title: 'Error!',
          text: t('errors.fetch_entries_failed'),
          icon: 'error',
          confirmButtonColor: '#31BCFF',
        })
      }
    } catch (error) {
      console.error('Error fetching entries:', error)
      await Swal.fire({
        title: 'Error!',
        text: t('errors.fetch_entries_failed'),
        icon: 'error',
        confirmButtonColor: '#31BCFF',
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchPeriods = async () => {
    try {
      const response = await fetch('/api/payroll-periods')
      const data = await response.json()

      if (response.ok) {
        setPeriods(data.payrollPeriods)
      } else {
        console.error('Error fetching periods:', data.error)
        await Swal.fire({
          title: 'Error!',
          text: t('errors.fetch_periods_failed'),
          icon: 'error',
          confirmButtonColor: '#31BCFF',
        })
      }
    } catch (error) {
      console.error('Error fetching periods:', error)
      await Swal.fire({
        title: 'Error!',
        text: t('errors.fetch_periods_failed'),
        icon: 'error',
        confirmButtonColor: '#31BCFF',
      })
    }
  }

  useEffect(() => {
    fetchEntries(currentPage, statusFilter, periodFilter)
  }, [currentPage, statusFilter, periodFilter])

  useEffect(() => {
    fetchPeriods()
  }, [])

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
        const response = await fetch(`/api/payroll-entries/${id}`, {
          method: 'DELETE'
        })

        if (response.ok) {
          setEntries(prev => prev.filter(entry => entry.id !== id))
          
          await Swal.fire({
            title: 'Deleted!',
            text: t('success.deleted'),
            icon: 'success',
            confirmButtonColor: '#31BCFF',
          })
        } else {
          const data = await response.json()
          throw new Error(data.error || t('errors.delete_failed'))
        }
      }
    } catch (error) {
      console.error('Error deleting entry:', error)
      await Swal.fire({
        title: 'Error!',
        text: error instanceof Error ? error.message : t('errors.delete_failed'),
        icon: 'error',
        confirmButtonColor: '#31BCFF',
      })
    }
  }

  const toggleSelection = (entryId: string) => {
    setSelectedEntries(prev =>
      prev.includes(entryId)
        ? prev.filter(id => id !== entryId)
        : [...prev, entryId]
    )
  }

  const toggleSelectAll = () => {
    if (selectedEntries.length === filteredEntries.length && filteredEntries.length > 0) {
      setSelectedEntries([])
    } else {
      setSelectedEntries(filteredEntries.map(e => e.id))
    }
  }

  const handleBulkApprove = async () => {
    if (selectedEntries.length === 0) {
      Swal.fire({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        icon: 'warning',
        title: 'Please select payroll entries to approve',
      })
      return
    }

    try {
      const result = await Swal.fire({
        title: 'Approve Selected Entries',
        text: `Are you sure you want to approve ${selectedEntries.length} payroll ${selectedEntries.length === 1 ? 'entry' : 'entries'}?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#31BCFF',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes, Approve',
        cancelButtonText: 'Cancel'
      })

      if (result.isConfirmed) {
        const response = await fetch('/api/payroll-entries/bulk-update', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            entryIds: selectedEntries,
            status: 'APPROVED'
          })
        })

        const data = await response.json()

        if (response.ok) {
          Swal.fire({
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000,
            timerProgressBar: true,
            icon: 'success',
            title: data.message || 'Entries approved successfully!',
          })
          setSelectedEntries([])
          fetchEntries(currentPage, statusFilter, periodFilter)
        } else {
          throw new Error(data.error)
        }
      }
    } catch (error) {
      console.error('Error approving entries:', error)
      Swal.fire({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        icon: 'error',
        title: error instanceof Error ? error.message : 'Failed to approve entries',
      })
    }
  }

  const handleBulkStatusChange = async () => {
    if (selectedEntries.length === 0) {
      Swal.fire({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        icon: 'warning',
        title: 'Please select payroll entries to update',
      })
      return
    }
    setShowStatusModal(true)
  }

  const confirmBulkStatusChange = async () => {
    try {
      const response = await fetch('/api/payroll-entries/bulk-update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entryIds: selectedEntries,
          status: bulkStatus
        })
      })

      const data = await response.json()

      if (response.ok) {
        Swal.fire({
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 3000,
          timerProgressBar: true,
          icon: 'success',
          title: data.message || 'Entries updated successfully!',
        })
        setSelectedEntries([])
        setShowStatusModal(false)
        fetchEntries(currentPage, statusFilter, periodFilter)
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      console.error('Error updating entries:', error)
      Swal.fire({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        icon: 'error',
        title: error instanceof Error ? error.message : 'Failed to update entries',
      })
    }
  }

  const handleExportPayslip = async (entryId: string, employeeName: string) => {
    try {
      const response = await fetch(`/api/payroll-entries/${entryId}/payslip`)

      if (response.ok) {
        // Get the PDF blob
        const blob = await response.blob()
        
        // Create download link
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.style.display = 'none'
        a.href = url
        a.download = `payslip-${employeeName.replace(/\s+/g, '-').toLowerCase()}.pdf`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)

        await Swal.fire({
          title: 'Success!',
          text: t('success.payslip_downloaded'),
          icon: 'success',
          confirmButtonColor: '#31BCFF',
        })
      } else {
        const data = await response.json()
        throw new Error(data.error || t('errors.generate_payslip_failed'))
      }
    } catch (error) {
      console.error('Error exporting payslip:', error)
      await Swal.fire({
        title: 'Error!',
        text: error instanceof Error ? error.message : t('errors.payslip_failed'),
        icon: 'error',
        confirmButtonColor: '#31BCFF',
      })
    }
  }

  const exportToExcel = () => {
    const approvedEntries = filteredEntries.filter(entry => entry.status === 'APPROVED' || entry.status === 'PAID' )
    
    if (approvedEntries.length === 0) {
      Swal.fire({
        title: 'No Approved Entries',
        text: 'There are no approved payroll entries to export.',
        icon: 'info',
        confirmButtonColor: '#31BCFF',
      })
      return
    }

    const headers = [
      'Employee Name',
      'Employee No',
      'Payroll Period',
      'Period Start Date',
      'Period End Date',
      'Regular Hours',
      'Overtime Hours',
      'Gross Pay',
      'Deductions',
      'Net Pay',
      'Status',
      'Created Date'
    ]
    
    const excelData = approvedEntries.map(entry => [
      `${entry.employee.firstName} ${entry.employee.lastName}`,
      entry.employee.employeeNo || '',
      entry.payrollPeriod.name,
      new Date(entry.payrollPeriod.startDate).toLocaleDateString(),
      new Date(entry.payrollPeriod.endDate).toLocaleDateString(),
      entry.regularHours.toString(),
      entry.overtimeHours.toString(),
      `$${entry.grossPay.toFixed(2)}`,
      `$${entry.deductions.toFixed(2)}`,
      `$${entry.netPay.toFixed(2)}`,
      entry.status,
      new Date(entry.createdAt).toLocaleDateString()
    ])

    // Create CSV content (Excel can open CSV files)
    const csvContent = [headers, ...excelData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n')

    // Create and download the file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `payroll-entries-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)

    // Show success message
    Swal.fire({
      title: 'Success!',
      text: t('success.excel_exported'),
      icon: 'success',
      confirmButtonColor: '#31BCFF',
    })
  }

  const getStatusBadge = (status: string) => {
    const styles = {
      DRAFT: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      APPROVED: 'bg-blue-100 text-blue-800 border-blue-200',
      PAID: 'bg-green-100 text-green-800 border-green-200'
    }
    
    const statusLabels = {
      DRAFT: t('status.draft'),
      APPROVED: t('status.approved'),
      PAID: t('status.paid')
    }
    
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium border ${styles[status as keyof typeof styles] || styles.DRAFT}`}>
        {statusLabels[status as keyof typeof statusLabels] || status}
      </span>
    )
  }

  const filteredEntries = entries.filter(entry =>
    `${entry.employee.firstName} ${entry.employee.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    entry.employee.employeeNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    entry.payrollPeriod.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#31BCFF]"></div>
        <span className="ml-4 text-gray-600">{t('loading')}</span>
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
              {t('title')}
            </h1>
            <p className="mt-2 text-gray-600">
              {t('subtitle')}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={exportToExcel}
              disabled={filteredEntries.filter(entry => entry.status === 'APPROVED').length === 0}
              className="inline-flex items-center justify-center px-4 py-3 rounded-2xl bg-white border border-gray-200 text-gray-700 font-medium shadow-sm hover:shadow-md transition-all duration-200 hover:scale-105 group disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              title={t('actions.export_excel')}
            >
              <TableCellsIcon className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform duration-200" />
              {t('export_excel')}
            </button>
            <Link
              href="/dashboard/payroll-entries/generate"
              className="inline-flex items-center justify-center px-4 py-3 rounded-2xl bg-gradient-to-r from-green-500 to-green-600 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 group"
              title="Generate payroll entries from attendance data"
            >
              <DocumentTextIcon className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform duration-200" />
              Generate Entries
            </Link>
            <Link
              href="/dashboard/payroll-entries/create"
              className="inline-flex items-center justify-center px-6 py-3 rounded-2xl bg-gradient-to-r from-[#31BCFF] to-[#0EA5E9] text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 group"
            >
              <PlusIcon className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform duration-200" />
              {t('create_entry')}
            </Link>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 border border-gray-200/50 shadow-lg">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t('search_placeholder')}
              className="block w-full pl-12 pr-4 py-3 rounded-xl border border-gray-300 bg-white/70 backdrop-blur-sm text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-[#31BCFF]/50 focus:border-[#31BCFF] transition-all duration-200"
            />
          </div>
          <div className="flex gap-4">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-3 rounded-xl border border-gray-300 bg-white/70 backdrop-blur-sm text-gray-900 focus:ring-2 focus:ring-[#31BCFF]/50 focus:border-[#31BCFF] transition-all duration-200"
            >
              <option value="all">{t('filters.all_status')}</option>
              <option value="DRAFT">{t('status.draft')}</option>
              <option value="APPROVED">{t('status.approved')}</option>
              <option value="PAID">{t('status.paid')}</option>
            </select>
            <select
              value={periodFilter}
              onChange={(e) => setPeriodFilter(e.target.value)}
              className="px-4 py-3 rounded-xl border border-gray-300 bg-white/70 backdrop-blur-sm text-gray-900 focus:ring-2 focus:ring-[#31BCFF]/50 focus:border-[#31BCFF] transition-all duration-200"
            >
              <option value="all">{t('filters.all_periods')}</option>
              {periods.map((period) => (
                <option key={period.id} value={period.id}>
                  {period.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
          <span>{t('showing', { count: filteredEntries.length, total: entries.length })}</span>
        </div>

        {/* Bulk Actions Bar */}
        {selectedEntries.length > 0 && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-blue-900">
                {selectedEntries.length} {selectedEntries.length === 1 ? 'entry' : 'entries'} selected
              </span>
              <div className="flex gap-2">
                <button
                  onClick={handleBulkApprove}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium transition-colors"
                >
                  Approve Selected
                </button>
                <button
                  onClick={handleBulkStatusChange}
                  className="px-4 py-2 bg-[#31BCFF] text-white rounded-lg hover:bg-[#31BCFF]/90 text-sm font-medium transition-colors"
                >
                  Change Status
                </button>
                <button
                  onClick={() => setSelectedEntries([])}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm font-medium transition-colors"
                >
                  Clear Selection
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Entries List */}
      {filteredEntries.length === 0 ? (
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-12 border border-gray-200/50 shadow-lg text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <MagnifyingGlassIcon className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">{t('no_entries.title')}</h3>
          <p className="text-gray-500 mb-6">
            {searchTerm ? t('no_entries.search_message') : t('no_entries.empty_message')}
          </p>
          {!searchTerm && (
            <Link
              href="/dashboard/payroll-entries/create"
              className="inline-flex items-center px-6 py-3 rounded-xl bg-[#31BCFF] text-white font-medium hover:bg-[#31BCFF]/90 transition-colors duration-200"
            >
              <PlusIcon className="w-5 h-5 mr-2" />
              {t('create_first_entry')}
            </Link>
          )}
        </div>
      ) : (
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50/80">
                <tr>
                  <th className="px-6 py-4 text-left">
                    <input
                      type="checkbox"
                      checked={selectedEntries.length === filteredEntries.length && filteredEntries.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded border-gray-300 text-[#31BCFF] focus:ring-[#31BCFF] h-4 w-4"
                    />
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('table.employee')}
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('table.period')}
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('table.hours')}
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('table.gross_pay')}
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('table.net_pay')}
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('table.status')}
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('table.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200/50">
                {filteredEntries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-blue-50/30 transition-colors duration-200">
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedEntries.includes(entry.id)}
                        onChange={() => toggleSelection(entry.id)}
                        className="rounded border-gray-300 text-[#31BCFF] focus:ring-[#31BCFF] h-4 w-4"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {entry.employee.firstName} {entry.employee.lastName}
                        </div>
                        {entry.employee.employeeNo && (
                          <div className="text-sm text-gray-500">
                            #{entry.employee.employeeNo}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{entry.payrollPeriod.name}</div>
                      <div className="text-sm text-gray-500">
                        {new Date(entry.payrollPeriod.startDate).toLocaleDateString()} - {new Date(entry.payrollPeriod.endDate).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {t('table.regular')}: {entry.regularHours}h
                      </div>
                      <div className="text-sm text-gray-500">
                        {t('table.overtime')}: {entry.overtimeHours}h
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        ${entry.grossPay.toFixed(2)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-green-600">
                        ${entry.netPay.toFixed(2)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(entry.status)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <Link
                          href={`/dashboard/payroll-entries/${entry.id}`}
                          className="p-2 text-gray-400 hover:text-[#31BCFF] hover:bg-blue-50 rounded-lg transition-all duration-200"
                          title={t('actions.view_entry')}
                        >
                          <EyeIcon className="h-4 w-4" />
                        </Link>
                        <Link
                          href={`/dashboard/payroll-entries/${entry.id}/edit`}
                          className="p-2 text-gray-400 hover:text-[#31BCFF] hover:bg-blue-50 rounded-lg transition-all duration-200"
                          title={t('actions.edit_entry')}
                        >
                          <PencilIcon className="h-4 w-4" />
                        </Link>
                        <button
                          onClick={() => handleExportPayslip(entry.id, `${entry.employee.firstName} ${entry.employee.lastName}`)}
                          className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all duration-200"
                          title={t('actions.download_payslip')}
                        >
                          <DocumentArrowDownIcon className="h-4 w-4" />
                        </button>
                        {entry.status === 'DRAFT' && (
                          <button
                            onClick={() => handleDelete(entry.id)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                            title={t('actions.delete_entry')}
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200/50">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white/50 border border-gray-300 rounded-lg hover:bg-white/70 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  {t('pagination.previous')}
                </button>
                <span className="text-sm text-gray-600">
                  {t('pagination.page_of', { current: currentPage, total: totalPages })}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white/50 border border-gray-300 rounded-lg hover:bg-white/70 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  {t('pagination.next')}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Status Change Modal */}
      <Dialog open={showStatusModal} onOpenChange={setShowStatusModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Change Status</DialogTitle>
            <DialogDescription>
              Select the new status for {selectedEntries.length} selected {selectedEntries.length === 1 ? 'entry' : 'entries'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <label className="flex items-start space-x-3 p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
              <input
                type="radio"
                name="bulkStatus"
                value="DRAFT"
                checked={bulkStatus === 'DRAFT'}
                onChange={(e) => setBulkStatus(e.target.value)}
                className="mt-1 text-[#31BCFF] focus:ring-[#31BCFF]"
              />
              <span className="flex-1">
                <span className="block font-medium text-gray-900">Draft</span>
                <p className="text-xs text-gray-500 mt-1">Mark as draft for further editing</p>
              </span>
            </label>
            <label className="flex items-start space-x-3 p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
              <input
                type="radio"
                name="bulkStatus"
                value="APPROVED"
                checked={bulkStatus === 'APPROVED'}
                onChange={(e) => setBulkStatus(e.target.value)}
                className="mt-1 text-[#31BCFF] focus:ring-[#31BCFF]"
              />
              <span className="flex-1">
                <span className="block font-medium text-gray-900">Approved</span>
                <p className="text-xs text-gray-500 mt-1">Approve for payment processing</p>
              </span>
            </label>
            <label className="flex items-start space-x-3 p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
              <input
                type="radio"
                name="bulkStatus"
                value="PAID"
                checked={bulkStatus === 'PAID'}
                onChange={(e) => setBulkStatus(e.target.value)}
                className="mt-1 text-[#31BCFF] focus:ring-[#31BCFF]"
              />
              <span className="flex-1">
                <span className="block font-medium text-gray-900">Paid</span>
                <p className="text-xs text-gray-500 mt-1">Mark as paid/completed</p>
              </span>
            </label>
          </div>
          <DialogFooter className="flex gap-3 sm:gap-3">
            <button
              onClick={() => setShowStatusModal(false)}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={confirmBulkStatusChange}
              className="flex-1 px-4 py-2 bg-[#31BCFF] text-white rounded-lg hover:bg-[#31BCFF]/90 font-medium transition-colors"
            >
              Update Status
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}
