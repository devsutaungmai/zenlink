'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { PlusIcon, PencilIcon, TrashIcon, MagnifyingGlassIcon, PhoneIcon } from '@heroicons/react/24/outline'
import { useTranslation } from 'react-i18next'
import Swal from 'sweetalert2'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import {
  MobileCardList,
  MobileCard,
  MobileCardHeader,
  MobileCardGrid,
  MobileCardField,
  MobileCardSection,
  MobileCardActions,
  Badge,
} from "@/components/MobileCardList"

interface Employee {
  id: string
  firstName: string
  lastName: string
  employeeNo: string
  department: {
    name: string
  }
  employeeGroup?: {
    name: string
  }
  mobile: string
  email?: string
  isTeamLeader: boolean
  dateOfHire: Date
}

export default function EmployeesPage() {
  const { t } = useTranslation()
  const [employees, setEmployees] = useState<Employee[]>([]) 
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteEmployeeId, setInviteEmployeeId] = useState('');
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinEmployeeId, setPinEmployeeId] = useState('');
  const [pinEmployeeName, setPinEmployeeName] = useState('');
  const [newPin, setNewPin] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [pinLoading, setPinLoading] = useState(false);
  const [phoneFilter, setPhoneFilter] = useState('');
  const isPinValid = /^\d{6}$/.test(newPin);
  const normalizePhone = (value: string) => value ? value.replace(/\D/g, '') : ''

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)

  const fetchEmployees = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/employees')
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch employees')
      }
      
      const data = await response.json()
      
      if (data.employees && Array.isArray(data.employees)) {
        setEmployees(data.employees)
      } else if (Array.isArray(data)) {
        setEmployees(data)
      } else {
        console.error('Expected employees array but got:', data)
        setError('Invalid data format received')
      }
    } catch (error) {
      console.error('Error fetching employees:', error)
      setError(error instanceof Error ? error.message : 'An unknown error occurred')
      setEmployees([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEmployees()
  }, [])

  const handleDelete = async (id: string) => {
    try {
      const result = await Swal.fire({
        title: t('employees.confirm_delete'),
        text: t('employees.delete_warning'),
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#31BCFF',
        cancelButtonColor: '#d33',
        confirmButtonText: t('common.yes'),
        cancelButtonText: t('common.cancel')
      })

      if (result.isConfirmed) {
        const res = await fetch(`/api/employees/${id}`, {
          method: 'DELETE',
        })
        
        if (res.ok) {
          setEmployees(employees.filter(emp => emp.id !== id))
          
          await Swal.fire({
            title: t('common.success'),
            text: t('employees.delete_success'),
            icon: 'success',
            confirmButtonColor: '#31BCFF',
          })
        } else {
          throw new Error('Failed to delete employee')
        }
      }
    } catch (error) {
      console.error('Error deleting employee:', error)
      Swal.fire({
        title: t('common.error'),
        text: t('employees.delete_error'),
        icon: 'error',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true
      })
    }
  }

  const handleInvite = (email: string, employeeId: string) => {
    setInviteEmail(email);
    setInviteEmployeeId(employeeId);
    setShowInviteModal(true);
  };

  const handleSetPin = (employeeId: string, employeeName: string) => {
    setPinEmployeeId(employeeId)
    setPinEmployeeName(employeeName)
    setNewPin('')
    setShowPinModal(true)
  }

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isPinValid) {
      Swal.fire({
        title: t('employees.pin_modal.invalid_pin'),
        text: t('employees.pin_modal.invalid_pin'),
        icon: 'error',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true
      });
      return;
    }

    setPinLoading(true);
    try {
      const res = await fetch(`/api/employees/${pinEmployeeId}/pin`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: newPin }),
      });

      if (res.ok) {
        const data = await res.json();
        
        // Show different messages based on whether email was sent
        let successMessage = t('employees.pin_modal.success');
        if (data.emailSent) {
          successMessage += ' ' + t('employees.pin_modal.email_sent');
        }
        
        Swal.fire({
          title: t('common.success'),
          text: successMessage,
          icon: 'success',
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: data.emailSent ? 5000 : 3000, // Show longer if email was sent
          timerProgressBar: true
        });
        setShowPinModal(false);
      } else {
        const data = await res.json();
        throw new Error(data.error || 'Failed to set PIN');
      }
    } catch (error) {
      console.error('Error setting PIN:', error);
      Swal.fire({
        title: t('common.error'),
        text: t('employees.pin_modal.error'),
        icon: 'error',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true
      });
    } finally {
      setPinLoading(false);
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString()
  }

  const normalizedSearch = searchTerm.toLowerCase()
  const normalizedPhoneFilter = normalizePhone(phoneFilter)

  const filteredEmployees = employees.filter(employee => {
    const matchesSearch =
      `${employee.firstName} ${employee.lastName}`.toLowerCase().includes(normalizedSearch) ||
      employee.employeeNo?.toLowerCase().includes(normalizedSearch) ||
      employee.department.name.toLowerCase().includes(normalizedSearch) ||
      (employee.employeeGroup?.name || '').toLowerCase().includes(normalizedSearch) ||
      employee.mobile.toLowerCase().includes(normalizedSearch)

    const matchesPhone =
      normalizedPhoneFilter === '' || normalizePhone(employee.mobile).includes(normalizedPhoneFilter)

    return matchesSearch && matchesPhone
  })

  // Pagination calculations
  const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedEmployees = filteredEmployees.slice(startIndex, endIndex)

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, phoneFilter])

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    // Scroll to top of table when page changes
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#31BCFF]"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="text-center text-red-600">
          {t('common.error')}: {error}
          <button 
            onClick={fetchEmployees}
            className="ml-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            {t('common.try_again')}
          </button>
        </div>
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
              {t('employees.title')}
            </h1>
            <p className="mt-2 text-gray-600">
              {t('employees.description')}
            </p>
          </div>
          <Link
            href="/dashboard/employees/create"
            className="inline-flex items-center justify-center px-6 py-3 rounded-2xl bg-gradient-to-r from-[#31BCFF] to-[#0EA5E9] text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 group"
          >
            <PlusIcon className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform duration-200" />
            {t('employees.add_employee')}
          </Link>
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
              placeholder={t('employees.search_placeholder')}
              className="block w-full pl-12 pr-4 py-3 rounded-xl border border-gray-300 bg-white/70 backdrop-blur-sm text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-[#31BCFF]/50 focus:border-[#31BCFF] transition-all duration-200"
            />
          </div>
          <div className="relative flex-1">
            <PhoneIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={phoneFilter}
              onChange={(e) => setPhoneFilter(e.target.value)}
              placeholder={t('employees.phone_filter_placeholder', { defaultValue: 'Filter by phone number' })}
              className="block w-full pl-12 pr-4 py-3 rounded-xl border border-gray-300 bg-white/70 backdrop-blur-sm text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-[#31BCFF]/50 focus:border-[#31BCFF] transition-all duration-200"
            />
          </div>
        </div>
        <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
          <span>
            {filteredEmployees.length > 0 
              ? t('showing_paginated', { 
                  start: startIndex + 1, 
                  end: Math.min(endIndex, filteredEmployees.length), 
                  total: filteredEmployees.length 
                })
              : t('employees.showing', { current: 0, total: employees.length })
            }
          </span>
          {totalPages > 1 && (
            <span className="text-xs text-gray-400">
              {t('page_info', { current: currentPage, total: totalPages })}
            </span>
          )}
        </div>
      </div>

      {/* Employees List */}
      {filteredEmployees.length === 0 ? (
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-12 border border-gray-200/50 shadow-lg text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <MagnifyingGlassIcon className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">{t('employees.no_employees')}</h3>
          <p className="text-gray-500 mb-6">
            {searchTerm ? t('employees.no_employees_message') : t('employees.get_started')}
          </p>
          {!searchTerm && (
            <Link
              href="/dashboard/employees/create"
              className="inline-flex items-center px-6 py-3 rounded-xl bg-[#31BCFF] text-white font-medium hover:bg-[#31BCFF]/90 transition-colors duration-200"
            >
              <PlusIcon className="w-5 h-5 mr-2" />
              {t('employees.add_first_employee')}
            </Link>
          )}
        </div>
      ) : (
        <>
          {/* Mobile Card View */}
          <MobileCardList>
            {paginatedEmployees.map((employee) => (
              <MobileCard key={employee.id}>
                <MobileCardHeader
                  title={`${employee.firstName} ${employee.lastName}`}
                  subtitle={`${t('employees.table.employee_no')}: ${employee.employeeNo}`}
                  badge={
                    employee.isTeamLeader ? (
                      <Badge variant="blue">
                        {t('employees.table.team_leader')}
                      </Badge>
                    ) : null
                  }
                />

                <MobileCardGrid columns={2}>
                  <MobileCardField
                    label={t('employees.table.department')}
                    value={
                      <div className="flex flex-wrap gap-1">
                        {employee.departments && employee.departments.length > 0 ? (
                          employee.departments.map((dept: any) => (
                            <span key={dept.departmentId} className="inline-flex items-center px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-xs">
                              {dept.department.name}
                            </span>
                          ))
                        ) : employee.department ? (
                          employee.department.name
                        ) : (
                          <span className="text-gray-400 italic">No department</span>
                        )}
                      </div>
                    }
                  />
                  <MobileCardField
                    label={t('employees.table.group')}
                    value={
                      <div className="flex flex-wrap gap-1">
                        {employee.employeeGroups && employee.employeeGroups.length > 0 ? (
                          employee.employeeGroups.map((grp: any) => (
                            <span key={grp.employeeGroupId} className="inline-flex items-center px-2 py-0.5 rounded-md bg-green-50 text-green-700 text-xs">
                              {grp.employeeGroup.name}
                            </span>
                          ))
                        ) : employee.employeeGroup ? (
                          employee.employeeGroup.name
                        ) : (
                          <span className="text-gray-400 italic">{t('employees.table.no_group')}</span>
                        )}
                      </div>
                    }
                  />
                </MobileCardGrid>

                <MobileCardSection>
                  <MobileCardField
                    label={t('employees.table.contact')}
                    value={
                      <>
                        <div>{employee.mobile}</div>
                        {employee.email && (
                          <div className="text-gray-500 mt-0.5">{employee.email}</div>
                        )}
                      </>
                    }
                  />
                </MobileCardSection>

                <MobileCardActions>
                  <button
                    onClick={() => handleInvite(employee.email || '', employee.id)}
                    className="p-2 text-gray-400 hover:text-[#31BCFF] hover:bg-blue-50 rounded-lg transition-all duration-200"
                    title={t('employees.table.send_invite')}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="w-5 h-5"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25H4.5a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
                      />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleSetPin(employee.id, `${employee.firstName} ${employee.lastName}`)}
                    className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all duration-200"
                    title={t('employees.table.set_pin')}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="w-5 h-5"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z"
                      />
                    </svg>
                  </button>
                  <Link
                    href={`/dashboard/employees/${employee.id}/edit`}
                    className="p-2 text-gray-400 hover:text-[#31BCFF] hover:bg-blue-50 rounded-lg transition-all duration-200"
                    title={t('employees.table.edit_employee')}
                  >
                    <PencilIcon className="h-5 w-5" />
                  </Link>
                  <button
                    onClick={() => handleDelete(employee.id)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                    title={t('employees.table.delete_employee')}
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </MobileCardActions>
              </MobileCard>
            ))}
          </MobileCardList>

          {/* Desktop Table View */}
          <div className="hidden lg:block bg-white/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50/80">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('employees.table.employee')}
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('employees.table.employee_no')}
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('employees.table.department')}
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('employees.table.group')}
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('employees.table.contact')}
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('employees.table.actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200/50">
                  {paginatedEmployees.map((employee) => (
                    <tr key={employee.id} className="hover:bg-blue-50/30 transition-colors duration-200">
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {employee.firstName} {employee.lastName}
                          </div>
                          {employee.isTeamLeader && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mt-1">
                              {t('employees.table.team_leader')}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{employee.employeeNo}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {employee.departments && employee.departments.length > 0 ? (
                            employee.departments.map((dept: any) => (
                              <span key={dept.departmentId} className="inline-flex items-center px-2 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-medium">
                                {dept.department.name}
                              </span>
                            ))
                          ) : employee.department ? (
                            <span className="text-sm text-gray-900">{employee.department.name}</span>
                          ) : (
                            <span className="text-sm text-gray-400 italic">No department</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {employee.employeeGroups && employee.employeeGroups.length > 0 ? (
                            employee.employeeGroups.map((grp: any) => (
                              <span key={grp.employeeGroupId} className="inline-flex items-center px-2 py-1 rounded-md bg-green-50 text-green-700 text-xs font-medium">
                                {grp.employeeGroup.name}
                              </span>
                            ))
                          ) : employee.employeeGroup ? (
                            <span className="text-sm text-gray-900">{employee.employeeGroup.name}</span>
                          ) : (
                            <span className="text-sm text-gray-400 italic">{t('employees.table.no_group')}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{employee.mobile}</div>
                        {employee.email && (
                          <div className="text-sm text-gray-500">{employee.email}</div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleInvite(employee.email || '', employee.id)}
                            className="p-2 text-gray-400 hover:text-[#31BCFF] hover:bg-blue-50 rounded-lg transition-all duration-200"
                            title={t('employees.table.send_invite')}
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth={1.5}
                              stroke="currentColor"
                              className="w-4 h-4"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25H4.5a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
                              />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleSetPin(employee.id, `${employee.firstName} ${employee.lastName}`)}
                            className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all duration-200"
                            title={t('employees.table.set_pin')}
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth={1.5}
                              stroke="currentColor"
                              className="w-4 h-4"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z"
                              />
                            </svg>
                          </button>
                          <Link
                            href={`/dashboard/employees/${employee.id}/edit`}
                            className="p-2 text-gray-400 hover:text-[#31BCFF] hover:bg-blue-50 rounded-lg transition-all duration-200"
                            title={t('employees.table.edit_employee')}
                          >
                            <PencilIcon className="h-4 w-4" />
                          </Link>
                          <button
                            onClick={() => handleDelete(employee.id)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                            title={t('employees.table.delete_employee')}
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
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center px-6 py-4 border-t border-gray-200/50">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      onClick={() => currentPage > 1 && handlePageChange(currentPage - 1)}
                      className={currentPage <= 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                  
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                    // Show first page, last page, current page, and pages around current page
                    if (
                      page === 1 ||
                      page === totalPages ||
                      (page >= currentPage - 1 && page <= currentPage + 1)
                    ) {
                      return (
                        <PaginationItem key={page}>
                          <PaginationLink
                            onClick={() => handlePageChange(page)}
                            isActive={page === currentPage}
                            className="cursor-pointer"
                          >
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      )
                    } else if (
                      page === currentPage - 2 ||
                      page === currentPage + 2
                    ) {
                      return (
                        <PaginationItem key={page}>
                          <PaginationEllipsis />
                        </PaginationItem>
                      )
                    }
                    return null
                  })}
                  
                  <PaginationItem>
                    <PaginationNext 
                      onClick={() => currentPage < totalPages && handlePageChange(currentPage + 1)}
                      className={currentPage >= totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </div>

        {/* Pagination for Mobile */}
        {totalPages > 1 && (
          <div className="lg:hidden flex items-center justify-center px-4 py-4">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    onClick={() => currentPage > 1 && handlePageChange(currentPage - 1)}
                    className={currentPage <= 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                  />
                </PaginationItem>
                
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                  // Show first page, last page, current page, and pages around current page
                  if (
                    page === 1 ||
                    page === totalPages ||
                    (page >= currentPage - 1 && page <= currentPage + 1)
                  ) {
                    return (
                      <PaginationItem key={page}>
                        <PaginationLink
                          onClick={() => handlePageChange(page)}
                          isActive={page === currentPage}
                          className="cursor-pointer"
                        >
                          {page}
                        </PaginationLink>
                      </PaginationItem>
                    )
                  } else if (
                    page === currentPage - 2 ||
                    page === currentPage + 2
                  ) {
                    return (
                      <PaginationItem key={page}>
                        <PaginationEllipsis />
                      </PaginationItem>
                    )
                  }
                  return null
                })}
                
                <PaginationItem>
                  <PaginationNext 
                    onClick={() => currentPage < totalPages && handlePageChange(currentPage + 1)}
                    className={currentPage >= totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </>
      )}

      {/* Modals */}
      {/* Email Invite Modal */}
      <Dialog open={showInviteModal} onOpenChange={(open) => !open && setShowInviteModal(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('employees.invite_modal.title')}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setInviteLoading(true);
              try {
                const res = await fetch('/api/employees/invite', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ 
                    email: inviteEmail,
                    employeeId: inviteEmployeeId,
                  }),
                });
                if (res.ok) {
                  // Update the employee's email in the local state
                  setEmployees(employees.map(emp => 
                    emp.id === inviteEmployeeId 
                      ? { ...emp, email: inviteEmail } 
                      : emp
                  ));
                  
                  Swal.fire({
                    title: t('common.success'),
                    text: t('employees.invite_modal.success'),
                    icon: 'success',
                    toast: true,
                    position: 'top-end',
                    showConfirmButton: false,
                    timer: 3000,
                    timerProgressBar: true
                  });
                } else {
                  const data = await res.json();
                  throw new Error(data.error || 'Failed to send invite');
                }
              } catch (error) {
                console.error('Error sending invite:', error);
                Swal.fire({
                  title: t('common.error'),
                  text: t('employees.invite_modal.error'),
                  icon: 'error',
                  toast: true,
                  position: 'top-end',
                  showConfirmButton: false,
                  timer: 3000,
                  timerProgressBar: true
                });
              } finally {
                setInviteLoading(false);
                setShowInviteModal(false);
              }
            }}
            className="space-y-4"
          >
            <div>
              <Label htmlFor="invite-email" className='mb-3'>{t('employees.invite_modal.email')}</Label>
              <Input
                id="invite-email"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowInviteModal(false)}
                disabled={inviteLoading}
              >
                {t('common.cancel')}
              </Button>
              <Button 
                type="submit"
                disabled={inviteLoading}
                className="bg-[#31BCFF] hover:bg-[#31BCFF]/90 text-white"
              >
                {inviteLoading ? t('employees.invite_modal.sending') : t('employees.invite_modal.send')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* PIN Modal */}
      <Dialog open={showPinModal} onOpenChange={(open) => !open && !pinLoading && setShowPinModal(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('employees.pin_modal.title', { name: pinEmployeeName })}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handlePinSubmit} className="space-y-4">
            <div>
              <Label htmlFor="pin-input" className='mb-3'>{t('employees.pin_modal.pin_label')}</Label>
              <Input
                id="pin-input"
                type="text"
                value={newPin}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, ''); // Only allow digits
                  if (value.length <= 6) {
                    setNewPin(value);
                  }
                }}
                placeholder="123456"
                maxLength={6}
                className="text-center text-lg font-mono tracking-wider"
                disabled={pinLoading}
                required
              />
              <p className="mt-1 text-xs text-gray-500">
                {t('employees.pin_modal.pin_description')}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                {t('employees.pin_modal.pin_not_viewable', { defaultValue: 'Existing PINs cannot be displayed for security reasons. Set a new PIN below.' })}
              </p>
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowPinModal(false)}
                disabled={pinLoading}
              >
                {t('common.cancel')}
              </Button>
              <Button
                type="submit"
                disabled={!isPinValid || pinLoading}
                className={`bg-[#31BCFF] hover:bg-[#31BCFF]/90 text-white ${(!isPinValid || pinLoading) ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {pinLoading ? t('employees.pin_modal.setting') : t('employees.pin_modal.set_pin')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
