'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { 
  DocumentTextIcon,
  ArrowLeftIcon,
  PlusIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'
import Swal from 'sweetalert2'
import { useTranslation } from 'react-i18next'

interface Department {
  id: string
  name: string
}

interface EmployeeGroup {
  id: string
  name: string
}

interface Employee {
  id: string
  firstName: string
  lastName: string
  employeeNo: string | null
}

interface PayrollPeriod {
  id: string
  name: string
  startDate: string
  endDate: string
}

export default function GeneratePayrollEntriesPage() {
  const router = useRouter()
  const { t } = useTranslation('payroll-entries')
  
  const [departments, setDepartments] = useState<Department[]>([])
  const [employeeGroups, setEmployeeGroups] = useState<EmployeeGroup[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [payrollPeriods, setPayrollPeriods] = useState<PayrollPeriod[]>([])
  
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([])
  const [selectedEmployeeGroups, setSelectedEmployeeGroups] = useState<string[]>([])
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([])
  const [selectedPayrollPeriod, setSelectedPayrollPeriod] = useState<string>('')
  
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [showCreatePeriodModal, setShowCreatePeriodModal] = useState(false)
  const [creatingPeriod, setCreatingPeriod] = useState(false)
  const [newPeriod, setNewPeriod] = useState({
    name: '',
    startDate: '',
    endDate: ''
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      
      const deptResponse = await fetch('/api/departments')
      if (deptResponse.ok) {
        const deptData = await deptResponse.json()
        setDepartments(deptData || [])
      }

      const groupResponse = await fetch('/api/employee-groups')
      if (groupResponse.ok) {
        const groupData = await groupResponse.json()
        setEmployeeGroups(groupData || [])
      }

      const empResponse = await fetch('/api/employees')
      if (empResponse.ok) {
        const empData = await empResponse.json()
        setEmployees(empData || [])
      }

      const periodResponse = await fetch('/api/payroll-periods')
      if (periodResponse.ok) {
        const periodData = await periodResponse.json()
        setPayrollPeriods(periodData.payrollPeriods || [])
      }
      
    } catch (error) {
      console.error('Error fetching data:', error)
      await Swal.fire({
        title: t('generate.error_title'),
        text: t('generate.error_load_data'),
        icon: 'error',
        confirmButtonColor: '#31BCFF',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreatePeriod = async () => {
    if (!newPeriod.name || !newPeriod.startDate || !newPeriod.endDate) {
      await Swal.fire({
        title: t('generate.missing_fields'),
        text: t('generate.fill_all_fields'),
        icon: 'warning',
        confirmButtonColor: '#31BCFF',
      })
      return
    }

    try {
      setCreatingPeriod(true)
      const response = await fetch('/api/payroll-periods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newPeriod.name,
          startDate: new Date(newPeriod.startDate).toISOString(),
          endDate: new Date(newPeriod.endDate).toISOString(),
        })
      })

      const data = await response.json()

      if (response.ok) {
        await Swal.fire({
          toast: true,
          position: 'top-end',
          title: t('generate.period_created'),
          icon: 'success',
          showConfirmButton: false,
          timer: 2000
        })
        
        // Refresh periods and select the new one
        const periodResponse = await fetch('/api/payroll-periods')
        if (periodResponse.ok) {
          const periodData = await periodResponse.json()
          setPayrollPeriods(periodData.payrollPeriods || [])
          setSelectedPayrollPeriod(data.id)
        }
        
        setShowCreatePeriodModal(false)
        setNewPeriod({ name: '', startDate: '', endDate: '' })
      } else {
        throw new Error(data.error || 'Failed to create payroll period')
      }
    } catch (error) {
      console.error('Error creating payroll period:', error)
      await Swal.fire({
        title: t('generate.error_title'),
        text: error instanceof Error ? error.message : t('generate.error_create_period'),
        icon: 'error',
        confirmButtonColor: '#31BCFF',
      })
    } finally {
      setCreatingPeriod(false)
    }
  }

  const handleGenerate = async () => {
    if (!selectedPayrollPeriod) {
      await Swal.fire({
        title: t('generate.missing_period_title'),
        text: t('generate.missing_period_text'),
        icon: 'warning',
        confirmButtonColor: '#31BCFF',
      })
      return
    }

    try {
      setGenerating(true)

      const selectedPeriod = payrollPeriods.find(p => p.id === selectedPayrollPeriod)
      if (!selectedPeriod) {
        throw new Error('Selected payroll period not found')
      }

      const response = await fetch('/api/payroll-entries/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startDate: selectedPeriod.startDate,
          endDate: selectedPeriod.endDate,
          employeeIds: selectedEmployees,
          departmentIds: selectedDepartments,
          employeeGroupIds: selectedEmployeeGroups,
          payrollPeriodId: selectedPayrollPeriod
        })
      })

      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Server error: request timed out or returned an invalid response. Please try again.')
      }

      const data = await response.json()

      if (response.ok) {
        await Swal.fire({
          title: t('generate.success_title'),
          html: `
            <div class="text-left">
              <p><strong>✅ ${t('generate.created_entries')}:</strong> ${data.created} ${t('generate.payroll_entries')}</p>
              <p><strong>⚠️ ${t('generate.skipped_employees')}:</strong> ${data.skipped} ${t('generate.employees_label')}</p>
              ${data.skippedEmployees.length > 0 ? 
                `<div class="mt-3">
                  <p><strong>${t('generate.skipped_employees_label')}:</strong></p>
                  <ul class="text-sm text-gray-600 mt-1">
                    ${data.skippedEmployees.map((emp: any) => 
                      `<li>• ${emp.name}: ${emp.reason}</li>`
                    ).join('')}
                  </ul>
                </div>` : ''
              }
            </div>
          `,
          icon: 'success',
          confirmButtonColor: '#31BCFF',
          width: 600
        })
        
        router.push('/dashboard/payroll-entries')
      } else {
        throw new Error(data.error || 'Failed to generate payroll entries')
      }
    } catch (error) {
      console.error('Error generating payroll entries:', error)
      await Swal.fire({
        title: t('generate.error_title'),
        text: error instanceof Error ? error.message : t('generate.error_generate'),
        icon: 'error',
        confirmButtonColor: '#31BCFF',
      })
    } finally {
      setGenerating(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#31BCFF]"></div>
        <span className="ml-4 text-gray-600">{t('generate.loading')}</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between">
          <div className="mb-4 sm:mb-0">
            <div className="flex items-center gap-3 mb-2">
              <Link
                href="/dashboard/payroll-entries"
                className="inline-flex items-center text-gray-600 hover:text-[#31BCFF] transition-colors duration-200"
              >
                <ArrowLeftIcon className="w-5 h-5 mr-2" />
                {t('generate.back_to_entries')}
              </Link>
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
              {t('generate.title')}
            </h1>
            <p className="mt-2 text-gray-600">
              {t('generate.subtitle')}
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 shadow-lg p-8">
        <div className="space-y-6">
          {/* Payroll Period Selection */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label htmlFor="payrollPeriod" className="block text-sm font-medium text-gray-700">
                {t('generate.payroll_period_required')}
              </label>
              <button
                type="button"
                onClick={() => setShowCreatePeriodModal(true)}
                className="inline-flex items-center text-sm text-[#31BCFF] hover:text-[#31BCFF]/80 font-medium"
              >
                <PlusIcon className="w-4 h-4 mr-1" />
                {t('generate.create_period')}
              </button>
            </div>
            <select
              id="payrollPeriod"
              value={selectedPayrollPeriod}
              onChange={(e) => setSelectedPayrollPeriod(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#31BCFF]/50 focus:border-[#31BCFF]"
            >
              <option value="">{t('generate.select_payroll_period')}</option>
              {payrollPeriods.map((period) => (
                <option key={period.id} value={period.id}>
                  {period.name} ({new Date(period.startDate).toLocaleDateString()} - {new Date(period.endDate).toLocaleDateString()})
                </option>
              ))}
            </select>
            <p className="mt-1 text-sm text-gray-500">
              {t('generate.period_hint')}
            </p>
          </div>

          {/* Department Filter */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <label className="block text-sm font-medium text-gray-700">
                {t('generate.departments')}
              </label>
              {departments.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    if (selectedDepartments.length === departments.length) {
                      setSelectedDepartments([])
                    } else {
                      setSelectedDepartments(departments.map(d => d.id))
                    }
                  }}
                  className="text-xs text-[#31BCFF] hover:text-[#31BCFF]/80 font-medium"
                >
                  {selectedDepartments.length === departments.length ? t('form.deselect_all') : t('form.select_all')}
                </button>
              )}
            </div>
            {departments.length === 0 ? (
              <p className="text-sm text-gray-500 py-4 px-3 bg-gray-50 rounded-lg">{t('generate.no_departments')}</p>
            ) : (
              <div className="border border-gray-300 rounded-lg max-h-40 overflow-y-auto bg-white">
                <label className="flex items-center px-4 py-2 hover:bg-gray-50 cursor-pointer border-b bg-blue-50">
                  <input
                    type="checkbox"
                    checked={selectedDepartments.length === 0}
                    onChange={() => setSelectedDepartments([])}
                    className="h-4 w-4 text-[#31BCFF] focus:ring-[#31BCFF] border-gray-300 rounded"
                  />
                  <span className="ml-3 text-sm font-medium text-gray-900">{t('form.all')}</span>
                </label>
                {departments.map((dept) => (
                  <label key={dept.id} className="flex items-center px-4 py-2 hover:bg-gray-50 cursor-pointer border-b last:border-b-0">
                    <input
                      type="checkbox"
                      checked={selectedDepartments.includes(dept.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedDepartments(prev => [...prev, dept.id])
                        } else {
                          setSelectedDepartments(prev => prev.filter(id => id !== dept.id))
                        }
                      }}
                      className="h-4 w-4 text-[#31BCFF] focus:ring-[#31BCFF] border-gray-300 rounded"
                    />
                    <span className="ml-3 text-sm text-gray-900">{dept.name}</span>
                  </label>
                ))}
              </div>
            )}
            <p className="mt-2 text-sm text-gray-500">
              {selectedDepartments.length > 0 
                ? t('generate.departments_selected', { count: selectedDepartments.length })
                : t('generate.departments_hint')
              }
            </p>
          </div>

          {/* Employee Group Filter */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <label className="block text-sm font-medium text-gray-700">
                {t('generate.employee_groups')}
              </label>
              {employeeGroups.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    if (selectedEmployeeGroups.length === employeeGroups.length) {
                      setSelectedEmployeeGroups([])
                    } else {
                      setSelectedEmployeeGroups(employeeGroups.map(g => g.id))
                    }
                  }}
                  className="text-xs text-[#31BCFF] hover:text-[#31BCFF]/80 font-medium"
                >
                  {selectedEmployeeGroups.length === employeeGroups.length ? t('form.deselect_all') : t('form.select_all')}
                </button>
              )}
            </div>
            {employeeGroups.length === 0 ? (
              <p className="text-sm text-gray-500 py-4 px-3 bg-gray-50 rounded-lg">{t('generate.no_groups')}</p>
            ) : (
              <div className="border border-gray-300 rounded-lg max-h-40 overflow-y-auto bg-white">
                <label className="flex items-center px-4 py-2 hover:bg-gray-50 cursor-pointer border-b bg-blue-50">
                  <input
                    type="checkbox"
                    checked={selectedEmployeeGroups.length === 0}
                    onChange={() => setSelectedEmployeeGroups([])}
                    className="h-4 w-4 text-[#31BCFF] focus:ring-[#31BCFF] border-gray-300 rounded"
                  />
                  <span className="ml-3 text-sm font-medium text-gray-900">{t('form.all')}</span>
                </label>
                {employeeGroups.map((group) => (
                  <label key={group.id} className="flex items-center px-4 py-2 hover:bg-gray-50 cursor-pointer border-b last:border-b-0">
                    <input
                      type="checkbox"
                      checked={selectedEmployeeGroups.includes(group.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedEmployeeGroups(prev => [...prev, group.id])
                        } else {
                          setSelectedEmployeeGroups(prev => prev.filter(id => id !== group.id))
                        }
                      }}
                      className="h-4 w-4 text-[#31BCFF] focus:ring-[#31BCFF] border-gray-300 rounded"
                    />
                    <span className="ml-3 text-sm text-gray-900">{group.name}</span>
                  </label>
                ))}
              </div>
            )}
            <p className="mt-2 text-sm text-gray-500">
              {selectedEmployeeGroups.length > 0 
                ? t('generate.groups_selected', { count: selectedEmployeeGroups.length })
                : t('generate.groups_hint')
              }
            </p>
          </div>

          {/* Employee Filter */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <label className="block text-sm font-medium text-gray-700">
                {t('generate.employees')}
              </label>
              {employees.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    if (selectedEmployees.length === employees.length) {
                      setSelectedEmployees([])
                    } else {
                      setSelectedEmployees(employees.map(e => e.id))
                    }
                  }}
                  className="text-xs text-[#31BCFF] hover:text-[#31BCFF]/80 font-medium"
                >
                  {selectedEmployees.length === employees.length ? t('form.deselect_all') : t('form.select_all')}
                </button>
              )}
            </div>
            {employees.length === 0 ? (
              <p className="text-sm text-gray-500 py-4 px-3 bg-gray-50 rounded-lg">{t('generate.no_employees')}</p>
            ) : (
              <div className="border border-gray-300 rounded-lg max-h-48 overflow-y-auto bg-white">
                <label className="flex items-center px-4 py-2 hover:bg-gray-50 cursor-pointer border-b bg-blue-50">
                  <input
                    type="checkbox"
                    checked={selectedEmployees.length === 0}
                    onChange={() => setSelectedEmployees([])}
                    className="h-4 w-4 text-[#31BCFF] focus:ring-[#31BCFF] border-gray-300 rounded"
                  />
                  <span className="ml-3 text-sm font-medium text-gray-900">{t('form.all')}</span>
                </label>
                {employees.map((emp) => (
                  <label key={emp.id} className="flex items-center px-4 py-2 hover:bg-gray-50 cursor-pointer border-b last:border-b-0">
                    <input
                      type="checkbox"
                      checked={selectedEmployees.includes(emp.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedEmployees(prev => [...prev, emp.id])
                        } else {
                          setSelectedEmployees(prev => prev.filter(id => id !== emp.id))
                        }
                      }}
                      className="h-4 w-4 text-[#31BCFF] focus:ring-[#31BCFF] border-gray-300 rounded"
                    />
                    <span className="ml-3 text-sm text-gray-900">
                      {emp.firstName} {emp.lastName}
                      {emp.employeeNo && <span className="text-gray-500 ml-1">({emp.employeeNo})</span>}
                    </span>
                  </label>
                ))}
              </div>
            )}
            <p className="mt-2 text-sm text-gray-500">
              {selectedEmployees.length > 0 
                ? t('generate.employees_selected', { count: selectedEmployees.length })
                : t('generate.employees_hint')
              }
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-4 pt-6 border-t border-gray-200">
            <Link
              href="/dashboard/payroll-entries"
              className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors duration-200"
            >
              {t('generate.cancel')}
            </Link>
            <button
              onClick={handleGenerate}
              disabled={generating || !selectedPayrollPeriod}
              className="px-8 py-3 bg-gradient-to-r from-[#31BCFF] to-[#0EA5E9] text-white font-medium rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center"
            >
              {generating ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  {t('generate.generating')}
                </>
              ) : (
                <>
                  <DocumentTextIcon className="w-5 h-5 mr-2" />
                  {t('generate.generate_button')}
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Create Payroll Period Modal */}
      {showCreatePeriodModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">{t('generate.create_period_title')}</h3>
              <button
                onClick={() => {
                  setShowCreatePeriodModal(false)
                  setNewPeriod({ name: '', startDate: '', endDate: '' })
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <XMarkIcon className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('generate.period_name')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newPeriod.name}
                  onChange={(e) => setNewPeriod(prev => ({ ...prev, name: e.target.value }))}
                  placeholder={t('generate.period_name_placeholder')}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#31BCFF]/50 focus:border-[#31BCFF]"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('generate.start_date')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={newPeriod.startDate}
                  onChange={(e) => setNewPeriod(prev => ({ ...prev, startDate: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#31BCFF]/50 focus:border-[#31BCFF]"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('generate.end_date')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={newPeriod.endDate}
                  onChange={(e) => setNewPeriod(prev => ({ ...prev, endDate: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#31BCFF]/50 focus:border-[#31BCFF]"
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
              <button
                onClick={() => {
                  setShowCreatePeriodModal(false)
                  setNewPeriod({ name: '', startDate: '', endDate: '' })
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
              >
                {t('generate.cancel')}
              </button>
              <button
                onClick={handleCreatePeriod}
                disabled={creatingPeriod}
                className="px-6 py-2 bg-gradient-to-r from-[#31BCFF] to-[#0EA5E9] text-white font-medium rounded-lg shadow hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {creatingPeriod ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {t('generate.creating')}
                  </>
                ) : (
                  <>
                    <PlusIcon className="w-4 h-4 mr-1" />
                    {t('generate.create')}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
