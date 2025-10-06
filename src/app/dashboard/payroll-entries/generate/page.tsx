'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { 
  DocumentTextIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline'
import Swal from 'sweetalert2'

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
        title: 'Error!',
        text: 'Failed to load data for payroll generation.',
        icon: 'error',
        confirmButtonColor: '#31BCFF',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleGenerate = async () => {
    if (!selectedPayrollPeriod) {
      await Swal.fire({
        title: 'Missing Information',
        text: 'Please select a payroll period.',
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

      const data = await response.json()

      if (response.ok) {
        await Swal.fire({
          title: 'Success!',
          html: `
            <div class="text-left">
              <p><strong>✅ Created:</strong> ${data.created} payroll entries</p>
              <p><strong>⚠️ Skipped:</strong> ${data.skipped} employees</p>
              ${data.skippedEmployees.length > 0 ? 
                `<div class="mt-3">
                  <p><strong>Skipped employees:</strong></p>
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
        title: 'Error!',
        text: error instanceof Error ? error.message : 'Failed to generate payroll entries',
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
        <span className="ml-4 text-gray-600">Loading data...</span>
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
                Back to Payroll Entries
              </Link>
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
              Generate Payroll Entries
            </h1>
            <p className="mt-2 text-gray-600">
              Create payroll entries automatically from approved attendance records
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 shadow-lg p-8">
        <div className="space-y-6">
          {/* Payroll Period Selection */}
          <div>
            <label htmlFor="payrollPeriod" className="block text-sm font-medium text-gray-700 mb-2">
              Payroll Period <span className="text-red-500">*</span>
            </label>
            <select
              id="payrollPeriod"
              value={selectedPayrollPeriod}
              onChange={(e) => setSelectedPayrollPeriod(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#31BCFF]/50 focus:border-[#31BCFF]"
            >
              <option value="">Select payroll period...</option>
              {payrollPeriods.map((period) => (
                <option key={period.id} value={period.id}>
                  {period.name} ({new Date(period.startDate).toLocaleDateString()} - {new Date(period.endDate).toLocaleDateString()})
                </option>
              ))}
            </select>
            <p className="mt-1 text-sm text-gray-500">
              Attendance data will be pulled from the period&apos;s date range
            </p>
          </div>

          {/* Department Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Departments (Optional)
            </label>
            {departments.length === 0 ? (
              <p className="text-sm text-gray-500 py-4 px-3 bg-gray-50 rounded-lg">No departments available</p>
            ) : (
              <div className="border border-gray-300 rounded-lg max-h-40 overflow-y-auto bg-white">
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
                ? `${selectedDepartments.length} department(s) selected`
                : 'Select departments to filter employees, or leave empty to include all departments'
              }
            </p>
          </div>

          {/* Employee Group Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Employee Groups (Optional)
            </label>
            {employeeGroups.length === 0 ? (
              <p className="text-sm text-gray-500 py-4 px-3 bg-gray-50 rounded-lg">No employee groups available</p>
            ) : (
              <div className="border border-gray-300 rounded-lg max-h-40 overflow-y-auto bg-white">
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
                ? `${selectedEmployeeGroups.length} group(s) selected`
                : 'Select employee groups to filter employees, or leave empty to include all groups'
              }
            </p>
          </div>

          {/* Employee Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Individual Employees (Optional)
            </label>
            {employees.length === 0 ? (
              <p className="text-sm text-gray-500 py-4 px-3 bg-gray-50 rounded-lg">No employees available</p>
            ) : (
              <div className="border border-gray-300 rounded-lg max-h-48 overflow-y-auto bg-white">
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
                ? `${selectedEmployees.length} employee(s) selected`
                : 'Select specific employees, or leave empty to include all employees matching the above filters'
              }
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-4 pt-6 border-t border-gray-200">
            <Link
              href="/dashboard/payroll-entries"
              className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors duration-200"
            >
              Cancel
            </Link>
            <button
              onClick={handleGenerate}
              disabled={generating || !selectedPayrollPeriod}
              className="px-8 py-3 bg-gradient-to-r from-[#31BCFF] to-[#0EA5E9] text-white font-medium rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center"
            >
              {generating ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Generating...
                </>
              ) : (
                <>
                  <DocumentTextIcon className="w-5 h-5 mr-2" />
                  Generate Payroll Entries
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
