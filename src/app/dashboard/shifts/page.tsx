'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon, 
  MagnifyingGlassIcon,
  ArrowsRightLeftIcon,
  ClockIcon
} from '@heroicons/react/24/outline'
import { useTranslation } from 'react-i18next'
import { CardGridSkeleton, TableSkeleton } from '@/components/skeletons/ScheduleSkeleton'
import Swal from 'sweetalert2'
import ShiftExchangeInfo from '@/components/ShiftExchangeInfo'
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"

interface Shift {
  id: string
  date: string
  startTime: string
  endTime: string
  shiftType: string
  wage: number
  wageType: string
  approved: boolean
  shiftTypeConfig?: {
    id: string
    name: string
  }
  employee?: {
    firstName: string
    lastName: string
    department?: {
      id: string
      name: string
    }
  }
  employeeGroup?: {
    id: string
    name: string
  }
  shiftExchanges?: Array<{
    id: string
    status: string
    fromEmployee: {
      firstName: string
      lastName: string
      department: {
        name: string
      }
    }
    toEmployee: {
      firstName: string
      lastName: string
      department: {
        name: string
      }
    }
  }>
}

interface EmployeeOption {
  id: string
  firstName: string
  lastName: string
  department?: {
    id: string
    name: string
  }
}

interface Department {
  id: string
  name: string
}

interface EmployeeGroup {
  id: string
  name: string
}

export default function ShiftsPage() {
  const { t } = useTranslation()
  const [shifts, setShifts] = useState<Shift[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [employees, setEmployees] = useState<EmployeeOption[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [employeeGroups, setEmployeeGroups] = useState<EmployeeGroup[]>([])
  
  // Filter states
  const [selectedDepartment, setSelectedDepartment] = useState<string>('')
  const [selectedGroup, setSelectedGroup] = useState<string>('')
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([])
  const [showFilters, setShowFilters] = useState(false)

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10) // You can make this configurable

  useEffect(() => {
    fetchShifts()
    fetchEmployees()
    fetchDepartments()
    fetchEmployeeGroups()
  }, [])

  const fetchEmployees = async () => {
    try {
      const res = await fetch('/api/employees')
      const data = await res.json()
      setEmployees(data)
    } catch (error) {
      console.error('Error fetching employees:', error)
    }
  }

  const fetchDepartments = async () => {
    try {
      const res = await fetch('/api/departments')
      const data = await res.json()
      setDepartments(data)
    } catch (error) {
      console.error('Error fetching departments:', error)
    }
  }

  const fetchEmployeeGroups = async () => {
    try {
      const res = await fetch('/api/employee-groups')
      const data = await res.json()
      setEmployeeGroups(data)
    } catch (error) {
      console.error('Error fetching employee groups:', error)
    }
  }

  const fetchShifts = async () => {
    try {
      const res = await fetch('/api/shifts')
      const data = await res.json()
      setShifts(data)
    } catch (error) {
      console.error('Error fetching shifts:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const result = await Swal.fire({
        title: t('shifts.confirm_delete'),
        text: t('shifts.delete_warning'),
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#31BCFF',
        cancelButtonColor: '#d33',
        confirmButtonText: t('shifts.delete_confirm'),
        cancelButtonText: t('cancel')
      })

      if (result.isConfirmed) {
        const res = await fetch(`/api/shifts/${id}`, {
          method: 'DELETE',
        })
        
        if (res.ok) {
          setShifts(shifts.filter(shift => shift.id !== id))
          
          await Swal.fire({
            title: t('shifts.deleted'),
            text: t('shifts.delete_success'),
            icon: 'success',
            confirmButtonColor: '#31BCFF',
          })
        } else {
          throw new Error('Failed to delete shift')
        }
      }
    } catch (error) {
      console.error('Error deleting shift:', error)
      await Swal.fire({
        title: t('error'),
        text: t('shifts.delete_error'),
        icon: 'error',
        confirmButtonColor: '#31BCFF',
      })
    }
  }

  const handleExchange = async (shift: Shift) => {
    // Build options for select input
    const optionsHtml = employees
      .map(emp => `<option value="${emp.id}">${emp.firstName} ${emp.lastName}</option>`)
      .join('')

    const { value: employeeId } = await Swal.fire({
      title: t('shifts.exchange_shift'),
      html: `
        <label for="employee-select" style="display:block;text-align:left;margin-bottom:8px;">${t('shifts.select_new_employee')}</label>
        <select id="employee-select" class="swal2-input" style="width:100%">
          <option value="">${t('shifts.select_employee')}</option>
          ${optionsHtml}
        </select>
      `,
      focusConfirm: false,
      preConfirm: () => {
        const select = (document.getElementById('employee-select') as HTMLSelectElement)
        return select.value
      },
      showCancelButton: true,
      confirmButtonColor: '#31BCFF',
    })

    if (employeeId) {
      try {
        const res = await fetch(`/api/shifts/${shift.id}/exchange`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ newEmployeeId: employeeId }),
        })
        
        if (res.ok) {
          await Swal.fire(t('success'), t('shifts.exchange_success'), 'success')
          fetchShifts()
        } else {
          const errorData = await res.json()
          
          if (res.status === 409 && errorData.conflict) {
            await Swal.fire({
              title: t('shifts.scheduling_conflict'),
              html: `
                <div class="text-left">
                  <p>${errorData.error}</p>
                  <p class="mt-2"><strong>${t('shifts.conflicting_shift_time')}:</strong> ${errorData.conflict.time}</p>
                </div>
              `,
              icon: 'warning',
              confirmButtonColor: '#31BCFF'
            })
          } else {
            throw new Error(errorData.error || 'Failed to exchange shift')
          }
        }
      } catch (error) {
        console.error('Error exchanging shift:', error)
        await Swal.fire(t('error'), t('shifts.exchange_error'), 'error')
      }
    }
  }

  const handleViewHistory = async (shiftId: string) => {
    try {
      const res = await fetch(`/api/shifts/${shiftId}/exchanges`)
      
      if (!res.ok) {
        throw new Error('Failed to fetch exchange history')
      }
      
      const exchanges = await res.json()
      
      if (exchanges.length === 0) {
        await Swal.fire({
          title: t('shifts.no_history'),
          text: t('shifts.no_exchange_history'),
          icon: 'info',
          confirmButtonColor: '#31BCFF',
        })
        return
      }
      
      // Format the exchange history for display
      const historyHtml = exchanges.map((exchange: any) => `
        <div class="border-b pb-2 mb-2">
          <p><strong>${t('shifts.from')}:</strong> ${exchange.fromEmployee.firstName} ${exchange.fromEmployee.lastName}</p>
          <p><strong>${t('shifts.to')}:</strong> ${exchange.toEmployee.firstName} ${exchange.toEmployee.lastName}</p>
          <p><strong>${t('shifts.date')}:</strong> ${new Date(exchange.exchangedAt).toLocaleString()}</p>
        </div>
      `).join('')
      
      await Swal.fire({
        title: t('shifts.exchange_history'),
        html: `<div class="text-left">${historyHtml}</div>`,
        confirmButtonColor: '#31BCFF',
        width: 600,
      })
    } catch (error) {
      console.error('Error fetching exchange history:', error)
      await Swal.fire(t('error'), t('shifts.history_error'), 'error')
    }
  }

  const getShiftTypeDisplayName = (shift: Shift) => {
    return shift.shiftTypeConfig?.name || shift.shiftType
  }

  const filteredShifts = shifts.filter(shift => {
    // Text search filter
    const shiftTypeDisplayName = getShiftTypeDisplayName(shift)
    const matchesSearch = !searchTerm || 
      shift.employee?.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      shift.employee?.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      shift.employeeGroup?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      shiftTypeDisplayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      shift.date.toLowerCase().includes(searchTerm.toLowerCase()) ||
      shift.employee?.department?.name.toLowerCase().includes(searchTerm.toLowerCase())

    // Department filter
    const matchesDepartment = !selectedDepartment || 
      (shift.employee?.department?.name && 
       departments.find(dept => dept.id === selectedDepartment)?.name === shift.employee.department.name)

    // Employee group filter
    const matchesGroup = !selectedGroup || 
      (shift.employeeGroup?.name && 
       employeeGroups.find(group => group.id === selectedGroup)?.name === shift.employeeGroup.name)

    // Employee selection filter
    const matchesEmployees = selectedEmployees.length === 0 || 
      (shift.employee && selectedEmployees.includes(shift.employee.firstName + ' ' + shift.employee.lastName))

    return matchesSearch && matchesDepartment && matchesGroup && matchesEmployees
  })

  // Pagination calculations
  const totalPages = Math.ceil(filteredShifts.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedShifts = filteredShifts.slice(startIndex, endIndex)

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, selectedDepartment, selectedGroup, selectedEmployees])

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    // Scroll to top of table when page changes
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const clearFilters = () => {
    setSelectedDepartment('')
    setSelectedGroup('')
    setSelectedEmployees([])
    setSearchTerm('')
    setCurrentPage(1)
  }

  const handleEmployeeToggle = (employeeName: string) => {
    setSelectedEmployees(prev => 
      prev.includes(employeeName) 
        ? prev.filter(name => name !== employeeName)
        : [...prev, employeeName]
    )
  }

  if (loading) {
    return (
      <div className="p-6">
        <CardGridSkeleton count={8} />
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-blue-100">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
              {t('shifts.title')}
            </h1>
            <p className="mt-1 sm:mt-2 text-sm sm:text-base text-gray-600">
              {t('shifts.description')}
            </p>
          </div>
          <Link
            href="/dashboard/shifts/create"
            className="inline-flex items-center justify-center px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl bg-gradient-to-r from-[#31BCFF] to-[#0EA5E9] text-white text-sm sm:text-base font-medium shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 group"
          >
            <PlusIcon className="w-4 h-4 sm:w-5 sm:h-5 mr-2 group-hover:scale-110 transition-transform duration-200 flex-shrink-0" />
            <span className="whitespace-nowrap">{t('shifts.create_shift')}</span>
          </Link>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white/80 backdrop-blur-xl rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-gray-200/50 shadow-lg">
        <div className="flex flex-col gap-3 sm:gap-4">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t('shifts.search_placeholder')}
              className="block w-full pl-10 sm:pl-12 pr-3 sm:pr-4 py-2.5 sm:py-3 text-sm sm:text-base rounded-lg sm:rounded-xl border border-gray-300 bg-white/70 backdrop-blur-sm text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-[#31BCFF]/50 focus:border-[#31BCFF] transition-all duration-200"
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="flex-1 px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base rounded-lg sm:rounded-xl border border-gray-300 bg-white/70 backdrop-blur-sm text-gray-900 focus:ring-2 focus:ring-[#31BCFF]/50 focus:border-[#31BCFF] transition-all duration-200"
            >
              <option value="">{t('shifts.filters.all_departments')}</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
            <select
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              className="flex-1 px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base rounded-lg sm:rounded-xl border border-gray-300 bg-white/70 backdrop-blur-sm text-gray-900 focus:ring-2 focus:ring-[#31BCFF]/50 focus:border-[#31BCFF] transition-all duration-200"
            >
              <option value="">{t('shifts.filters.all_groups')}</option>
              {employeeGroups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base rounded-lg sm:rounded-xl border border-gray-300 bg-white/70 backdrop-blur-sm text-gray-900 hover:bg-white transition-all duration-200 whitespace-nowrap"
            >
              {showFilters ? t('common.hide') : t('common.show')} {t('common.filters')}
            </button>
          </div>
        </div>

        {/* Advanced Employee Filters */}
        {showFilters && (
          <div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-gray-50/50 rounded-lg sm:rounded-xl border border-gray-200">
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                {t('shifts.filters.select_employees')}
              </label>
              <div className="max-h-32 overflow-y-auto border border-gray-300 rounded-lg bg-white">
                {employees.map((employee) => {
                  const employeeName = `${employee.firstName} ${employee.lastName}`
                  return (
                    <label key={employee.id} className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedEmployees.includes(employeeName)}
                        onChange={() => handleEmployeeToggle(employeeName)}
                        className="h-4 w-4 text-[#31BCFF] focus:ring-[#31BCFF] border-gray-300 rounded flex-shrink-0"
                      />
                      <span className="ml-2 text-xs sm:text-sm text-gray-700">
                        {employeeName}
                        {employee.department && (
                          <span className="text-gray-500"> ({employee.department.name})</span>
                        )}
                      </span>
                    </label>
                  )
                })}
              </div>
            </div>
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-0 mt-3 pt-3 border-t border-gray-200">
              <div className="text-xs sm:text-sm text-gray-600">
                {t('shifts.showing', { current: filteredShifts.length, total: shifts.length })}
              </div>
              <button
                onClick={clearFilters}
                className="text-xs sm:text-sm text-[#31BCFF] hover:text-[#31BCFF]/80 font-medium text-left sm:text-right"
              >
                {t('shifts.filters.clear_filters')}
              </button>
            </div>
          </div>
        )}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mt-3 sm:mt-4 text-xs sm:text-sm text-gray-500">
              <span>
                {t('shifts.showing_paginated', { 
                  start: filteredShifts.length === 0 ? 0 : startIndex + 1,
                  end: Math.min(endIndex, filteredShifts.length),
                  total: filteredShifts.length,
                  totalAll: shifts.length
                })}
              </span>
              {totalPages > 1 && (
                <span className="text-xs">
                  {t('shifts.page_info', { current: currentPage, total: totalPages })}
                </span>
              )}
            </div>
      </div>

      {/* Shifts List */}
      {filteredShifts.length === 0 ? (
        <div className="bg-white/80 backdrop-blur-xl rounded-xl sm:rounded-2xl p-8 sm:p-12 border border-gray-200/50 shadow-lg text-center">
          <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
            <MagnifyingGlassIcon className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" />
          </div>
          <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">{t('shifts.no_shifts_found')}</h3>
          <p className="text-sm sm:text-base text-gray-500 mb-4 sm:mb-6">
            {searchTerm || selectedDepartment || selectedGroup || selectedEmployees.length > 0 
              ? t('shifts.adjust_search') 
              : t('shifts.get_started')}
          </p>
          {!searchTerm && !selectedDepartment && !selectedGroup && selectedEmployees.length === 0 && (
            <Link
              href="/dashboard/shifts/create"
              className="inline-flex items-center px-4 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base rounded-lg sm:rounded-xl bg-[#31BCFF] text-white font-medium hover:bg-[#31BCFF]/90 transition-colors duration-200"
            >
              <PlusIcon className="w-4 h-4 sm:w-5 sm:h-5 mr-2 flex-shrink-0" />
              {t('shifts.create_first_shift')}
            </Link>
          )}
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden lg:block bg-white/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50/80">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('shifts.table.employee')}
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('shifts.table.date')}
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('shifts.table.time')}
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('shifts.table.type')}
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('common.employee_group')}
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('shifts.table.status')}
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('shifts.table.actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200/50">
                  {paginatedShifts.map((shift) => (
                    <React.Fragment key={shift.id}>
                      <tr className="hover:bg-blue-50/30 transition-colors duration-200">
                        <td className="px-6 py-4">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {shift.employee ? `${shift.employee.firstName} ${shift.employee.lastName}` : '-'}
                            </div>
                            {shift.employee?.department && (
                              <div className="text-sm text-gray-500">
                                {shift.employee.department.name}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">
                            {new Date(shift.date).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">
                            {shift.startTime} - {shift.endTime}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {getShiftTypeDisplayName(shift)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">
                            {shift.employeeGroup?.name || '-'}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            shift.approved 
                              ? 'bg-green-100 text-green-800 border-green-200' 
                              : 'bg-blue-100 text-blue-800 border-blue-200'
                          } border`}>
                            {shift.approved ? t('shifts.status.approved') : 'In Progress'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <Link
                              href={`/dashboard/shifts/${shift.id}/edit`}
                              className="p-2 text-gray-400 hover:text-[#31BCFF] hover:bg-blue-50 rounded-lg transition-all duration-200"
                              title={t('shifts.edit_shift')}
                            >
                              <PencilIcon className="h-4 w-4" />
                            </Link>
                            {/* <button
                              onClick={() => handleExchange(shift)}
                              className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all duration-200"
                              title={t('shifts.exchange_shift')}
                            >
                              <ArrowsRightLeftIcon className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleViewHistory(shift.id)}
                              className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all duration-200"
                              title={t('shifts.view_exchanges')}
                            >
                              <ClockIcon className="h-4 w-4" />
                            </button> */}
                            <button
                              onClick={() => handleDelete(shift.id)}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                              title={t('shifts.delete_shift')}
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {/* Show exchange information in a separate row if shift is approved and has exchanges */}
                      {shift.approved && shift.shiftExchanges && shift.shiftExchanges.some(exchange => exchange.status === 'APPROVED') && (
                        <tr className="bg-blue-50">
                          <td colSpan={7} className="px-6 py-2">
                            <ShiftExchangeInfo shift={shift} />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
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
                        onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                        className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                    
                    {/* First page */}
                    {currentPage > 2 && (
                      <>
                        <PaginationItem>
                          <PaginationLink onClick={() => handlePageChange(1)} className="cursor-pointer">
                            1
                          </PaginationLink>
                        </PaginationItem>
                        {currentPage > 3 && <PaginationEllipsis />}
                      </>
                    )}
                    
                    {/* Previous page */}
                    {currentPage > 1 && (
                      <PaginationItem>
                        <PaginationLink 
                          onClick={() => handlePageChange(currentPage - 1)} 
                          className="cursor-pointer"
                        >
                          {currentPage - 1}
                        </PaginationLink>
                      </PaginationItem>
                    )}
                    
                    {/* Current page */}
                    <PaginationItem>
                      <PaginationLink isActive className="cursor-default">
                        {currentPage}
                      </PaginationLink>
                    </PaginationItem>
                    
                    {/* Next page */}
                    {currentPage < totalPages && (
                      <PaginationItem>
                        <PaginationLink 
                          onClick={() => handlePageChange(currentPage + 1)} 
                          className="cursor-pointer"
                        >
                          {currentPage + 1}
                        </PaginationLink>
                      </PaginationItem>
                    )}
                    
                    {/* Last page */}
                    {currentPage < totalPages - 1 && (
                      <>
                        {currentPage < totalPages - 2 && <PaginationEllipsis />}
                        <PaginationItem>
                          <PaginationLink onClick={() => handlePageChange(totalPages)} className="cursor-pointer">
                            {totalPages}
                          </PaginationLink>
                        </PaginationItem>
                      </>
                    )}
                    
                    <PaginationItem>
                      <PaginationNext 
                        onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                        className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </div>

          {/* Mobile Card View */}
          <div className="lg:hidden space-y-3">
            {paginatedShifts.map((shift) => (
              <div key={shift.id} className="bg-white/80 backdrop-blur-xl rounded-xl border border-gray-200/50 shadow-lg p-4 space-y-3">
                {/* Header with Employee and Status */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-gray-900">
                      {shift.employee ? `${shift.employee.firstName} ${shift.employee.lastName}` : '-'}
                    </div>
                    {shift.employee?.department && (
                      <div className="text-xs text-gray-500 mt-0.5">
                        {shift.employee.department.name}
                      </div>
                    )}
                  </div>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${
                    shift.approved 
                      ? 'bg-green-100 text-green-800 border-green-200' 
                      : 'bg-blue-100 text-blue-800 border-blue-200'
                  } border`}>
                    {shift.approved ? t('shifts.status.approved') : 'In Progress'}
                  </span>
                </div>

                {/* Date and Time */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-xs text-gray-500 mb-0.5">{t('shifts.table.date')}</div>
                    <div className="font-medium text-gray-900">
                      {new Date(shift.date).toLocaleDateString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-0.5">{t('shifts.table.time')}</div>
                    <div className="font-medium text-gray-900">
                      {shift.startTime} - {shift.endTime}
                    </div>
                  </div>
                </div>

                {/* Type and Group */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-xs text-gray-500 mb-0.5">{t('shifts.table.type')}</div>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {getShiftTypeDisplayName(shift)}
                    </span>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-0.5">{t('common.employee_group')}</div>
                    <div className="text-sm text-gray-900">
                      {shift.employeeGroup?.name || '-'}
                    </div>
                  </div>
                </div>

                {/* Exchange Info */}
                {shift.approved && shift.shiftExchanges && shift.shiftExchanges.some(exchange => exchange.status === 'APPROVED') && (
                  <div className="pt-2 border-t border-gray-200">
                    <ShiftExchangeInfo shift={shift} />
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-200">
                  <Link
                    href={`/dashboard/shifts/${shift.id}/edit`}
                    className="p-2 text-gray-400 hover:text-[#31BCFF] hover:bg-blue-50 rounded-lg transition-all duration-200"
                    title={t('shifts.edit_shift')}
                  >
                    <PencilIcon className="h-5 w-5" />
                  </Link>
                  {/* <button
                    onClick={() => handleExchange(shift)}
                    className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all duration-200"
                    title={t('shifts.exchange_shift')}
                  >
                    <ArrowsRightLeftIcon className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => handleViewHistory(shift.id)}
                    className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all duration-200"
                    title={t('shifts.view_exchanges')}
                  >
                    <ClockIcon className="h-5 w-5" />
                  </button> */}
                  <button
                    onClick={() => handleDelete(shift.id)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                    title={t('shifts.delete_shift')}
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
            ))}

            {/* Mobile Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center px-4 py-4">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious 
                        onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                        className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                    
                    <PaginationItem>
                      <PaginationLink isActive className="cursor-default">
                        {currentPage}
                      </PaginationLink>
                    </PaginationItem>
                    
                    {currentPage < totalPages && (
                      <PaginationItem>
                        <PaginationLink 
                          onClick={() => handlePageChange(currentPage + 1)} 
                          className="cursor-pointer"
                        >
                          {currentPage + 1}
                        </PaginationLink>
                      </PaginationItem>
                    )}
                    
                    <PaginationItem>
                      <PaginationNext 
                        onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                        className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
