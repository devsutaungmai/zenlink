'use client'

import React, { useState, useEffect } from 'react'
import { 
  BuildingOfficeIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface Department {
  id: string
  name: string
  _count?: {
    employees: number
  }
}

interface DepartmentSelectionModalProps {
  isOpen: boolean
  onClose: () => void
  onDepartmentSelected: (departmentId: string) => void
  employeeId: string
  title?: string
  description?: string
}

export default function DepartmentSelectionModal({
  isOpen,
  onClose,
  onDepartmentSelected,
  employeeId,
  title = "Select Department",
  description = "Please select the department for this shift."
}: DepartmentSelectionModalProps) {
  const [departments, setDepartments] = useState<Department[]>([])
  const [selectedDepartment, setSelectedDepartment] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      fetchDepartments()
    }
  }, [isOpen])

  const fetchDepartments = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/departments')
      if (!response.ok) {
        throw new Error('Failed to fetch departments')
      }
      
      const data = await response.json()
      setDepartments(data)
    } catch (error) {
      console.error('Error fetching departments:', error)
      setError('Failed to load departments')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = () => {
    if (selectedDepartment) {
      onDepartmentSelected(selectedDepartment)
      setSelectedDepartment('')
    }
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose()
      setSelectedDepartment('')
      setError(null)
    }
  }

  if (!isOpen) return null

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <BuildingOfficeIcon className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="text-lg font-semibold text-gray-900">{title}</div>
              <p className="text-sm text-gray-600 font-normal">{description}</p>
            </div>
          </DialogTitle>
        </DialogHeader>
        {/* Content */}
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading departments...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <BuildingOfficeIcon className="w-8 h-8 text-red-600" />
              </div>
              <h4 className="text-lg font-medium text-red-900 mb-2">Error Loading Departments</h4>
              <p className="text-red-700 mb-4">{error}</p>
              <Button onClick={fetchDepartments} variant="outline">
                Try Again
              </Button>
            </div>
          ) : departments.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <BuildingOfficeIcon className="w-8 h-8 text-gray-500" />
              </div>
              <h4 className="text-lg font-medium text-gray-900 mb-2">No Departments Available</h4>
              <p className="text-gray-600">Contact your administrator to set up departments.</p>
            </div>
          ) : (
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-4">
                Available Departments ({departments.length})
              </h4>
              
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {departments.map((dept) => (
                  <label
                    key={dept.id}
                    className={`flex items-center p-4 border rounded-lg cursor-pointer transition-all ${
                      selectedDepartment === dept.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="department"
                      value={dept.id}
                      checked={selectedDepartment === dept.id}
                      onChange={(e) => setSelectedDepartment(e.target.value)}
                      className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                    />
                    <div className="ml-3 flex-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <h5 className="text-sm font-medium text-gray-900">{dept.name}</h5>
                          {dept._count && (
                            <p className="text-xs text-gray-500">
                              {dept._count.employees} employee{dept._count.employees !== 1 ? 's' : ''}
                            </p>
                          )}
                        </div>
                        {selectedDepartment === dept.id && (
                          <CheckCircleIcon className="w-5 h-5 text-blue-600" />
                        )}
                      </div>
                    </div>
                  </label>
                ))}
              </div>

              <div className="flex gap-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => handleOpenChange(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={!selectedDepartment}
                  className="flex-1"
                >
                  Continue
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
