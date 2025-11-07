'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import ShiftForm from '@/components/ShiftForm'

interface Employee {
  id: string
  firstName: string
  lastName: string
}

interface EmployeeGroup {
  id: string
  name: string
}

export default function CreateShiftPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [employeeGroups, setEmployeeGroups] = useState<EmployeeGroup[]>([])
  const [dataLoading, setDataLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [employeesRes, groupsRes] = await Promise.all([
          fetch('/api/employees'),
          fetch('/api/employee-groups')
        ])

        if (!employeesRes.ok || !groupsRes.ok) {
          throw new Error('Failed to fetch required data')
        }

        const [employeesData, groupsData] = await Promise.all([
          employeesRes.json(),
          groupsRes.json()
        ])

        setEmployees(employeesData)
        setEmployeeGroups(groupsData)
      } catch (error) {
        console.error('Error fetching data:', error)
        setError('Failed to load required data. Please try again later.')
      } finally {
        setDataLoading(false)
      }
    }

    fetchData()
  }, [])

  const handleSubmit = async (formData: any) => {
    setLoading(true)
    setError(null)

    try {
      // Convert empty strings to undefined for optional fields
      const cleanedData = {
        ...formData,
        employeeId: formData.employeeId || undefined,
        employeeGroupId: formData.employeeGroupId || undefined,
        breakStart: formData.breakStart || undefined,
        breakEnd: formData.breakEnd || undefined,
        note: formData.note || undefined
      }

      const res = await fetch('/api/shifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...cleanedData,
          date: cleanedData.date ?? undefined,
          breakStart: cleanedData.breakStart ?? undefined,
          breakEnd: cleanedData.breakEnd ??  undefined
        }),
      })

      if (!res.ok) {
        throw new Error('Failed to create shift')
      }

      router.push('/dashboard/shifts')
      router.refresh()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    router.push('/dashboard/shifts')
  }

  if (dataLoading) {
    return (
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center h-32">
            Loading shift data...
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-md">
            {error}
          </div>
          <button
            onClick={() => {}}
            className="mt-4 px-4 py-2 text-sm font-medium text-white bg-[#31BCFF] rounded-md hover:bg-[#31BCFF]/90"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-semibold text-gray-900">Create Shift</h1>
        
        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-md">
            {error}
          </div>
        )}

        <div className="mt-6">
          <ShiftForm 
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            loading={loading}
            employees={employees}
            employeeGroups={employeeGroups}
          />
        </div>
      </div>
    </div>
  )
}
