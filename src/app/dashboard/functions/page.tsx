'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { PlusIcon, PencilIcon, TrashIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import Swal from 'sweetalert2'

interface Category {
  id: string
  name: string
  color?: string | null
  department?: {
    id: string
    name: string
  } | null
  departments?: Array<{
    id: string
    department: {
      id: string
      name: string
    }
  }>
}

interface Function {
  id: string
  name: string
  color?: string | null
  categoryId: string
  category: Category
  _count: {
    employees: number
    shifts: number
  }
}

export default function FunctionsPage() {
  const router = useRouter()
  const [functions, setFunctions] = useState<Function[]>([])
  const [filteredFunctions, setFilteredFunctions] = useState<Function[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchFunctions()
  }, [])

  useEffect(() => {
    const filtered = functions.filter(func => {
      const searchLower = searchTerm.toLowerCase();
      const matchesName = func.name.toLowerCase().includes(searchLower);
      const matchesCategory = func.category.name.toLowerCase().includes(searchLower);

      const deptNames = func.category.departments && func.category.departments.length > 0
        ? func.category.departments.map((cd: any) => cd.department.name).join(' ')
        : func.category.department?.name || '';
      const matchesDept = deptNames.toLowerCase().includes(searchLower);
      
      return matchesName || matchesCategory || matchesDept;
    });
    setFilteredFunctions(filtered);
  }, [searchTerm, functions])

  const fetchFunctions = async () => {
    try {
      const response = await fetch('/api/functions')
      if (response.ok) {
        const data = await response.json()
        setFunctions(data)
        setFilteredFunctions(data)
      } else {
        console.error('Failed to fetch functions')
      }
    } catch (error) {
      console.error('Error fetching functions:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: `Do you want to delete the function "${name}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#EF4444',
      cancelButtonColor: '#6B7280',
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'Cancel'
    })

    if (result.isConfirmed) {
      try {
        const response = await fetch(`/api/functions/${id}`, {
          method: 'DELETE'
        })

        if (response.ok) {
          await Swal.fire({
            title: 'Deleted!',
            text: 'Function has been deleted.',
            icon: 'success',
            confirmButtonColor: '#3B82F6'
          })
          fetchFunctions()
        } else {
          await Swal.fire({
            title: 'Error!',
            text: 'Failed to delete function.',
            icon: 'error',
            confirmButtonColor: '#EF4444'
          })
        }
      } catch (error) {
        console.error('Error deleting function:', error)
        await Swal.fire({
          title: 'Error!',
          text: 'An error occurred while deleting the function.',
          icon: 'error',
          confirmButtonColor: '#EF4444'
        })
      }
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 mb-8 shadow-sm">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Functions</h1>
              <p className="mt-2 text-gray-600">
                Manage specific roles and tasks within categories
              </p>
            </div>
            <Link
              href="/dashboard/functions/create"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 shadow-md hover:shadow-lg"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Add Function
            </Link>
          </div>

          {/* Stats */}
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="text-sm font-medium text-gray-500">Total Functions</div>
              <div className="mt-1 text-2xl font-semibold text-gray-900">{functions.length}</div>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="text-sm font-medium text-gray-500">Total Employees</div>
              <div className="mt-1 text-2xl font-semibold text-gray-900">
                {functions.reduce((sum, func) => sum + func._count.employees, 0)}
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="text-sm font-medium text-gray-500">Total Shifts</div>
              <div className="mt-1 text-2xl font-semibold text-gray-900">
                {functions.reduce((sum, func) => sum + func._count.shifts, 0)}
              </div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search functions, categories, or departments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Functions Grid */}
        {filteredFunctions.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm">
            <p className="text-gray-500 text-lg">No functions found</p>
            <p className="text-gray-400 mt-2">
              {searchTerm ? 'Try adjusting your search' : 'Create your first function to get started'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredFunctions.map((func) => (
              <div
                key={func.id}
                className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden"
              >
                <div
                  className="h-2"
                  style={{ backgroundColor: func.color || func.category.color || '#3B82F6' }}
                />
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {func.name}
                      </h3>
                      <div className="flex flex-col space-y-1">
                        <span
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium w-fit"
                          style={{
                            backgroundColor: `${func.category.color || '#3B82F6'}20`,
                            color: func.category.color || '#3B82F6'
                          }}
                        >
                          {func.category.name}
                        </span>
                        <span className="text-xs text-gray-500">
                          {func.category.departments && func.category.departments.length > 0
                            ? func.category.departments.map((cd: any) => cd.department.name).join(', ')
                            : func.category.department?.name || 'Business-Wide'
                          }
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
                    <div>
                      <span className="font-medium">{func._count.employees}</span> employees
                    </div>
                    <div>
                      <span className="font-medium">{func._count.shifts}</span> shifts
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    <Link
                      href={`/dashboard/functions/${func.id}/edit`}
                      className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors duration-200"
                    >
                      <PencilIcon className="h-4 w-4 mr-1.5" />
                      Edit
                    </Link>
                    <button
                      onClick={() => handleDelete(func.id, func.name)}
                      className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-red-300 rounded-lg text-sm font-medium text-red-700 bg-white hover:bg-red-50 transition-colors duration-200"
                    >
                      <TrashIcon className="h-4 w-4 mr-1.5" />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
