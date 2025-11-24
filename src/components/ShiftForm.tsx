'use client'

import React, { useState, useEffect } from 'react'
import { AutoBreakType, ShiftType, WageType } from '@prisma/client'
import { useUser } from '@/shared/lib/useUser'
import { ShiftExchange } from '@/shared/types'
import Swal from 'sweetalert2'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

interface ShiftTypeOption {
  id: string
  name: string
  isCustom: boolean
  autoBreakType?: AutoBreakType
  autoBreakValue?: number
}

const formatDateForDisplay = (dateStr: string): string => {
  try {
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  } catch (e) {
    return dateStr;
  }
}

const parseDateForSubmission = (displayDate: string): string => {
  try {
    const [day, month, year] = displayDate.split('/');
    return `${year}-${month}-${day}`;
  } catch (e) {
    return displayDate;
  }
}

const calculateBreakDuration = (breakStart: string, breakEnd: string): string => {
  try {
    const start = new Date(`2000-01-01T${breakStart}:00`);
    const end = new Date(`2000-01-01T${breakEnd}:00`);
    const diff = end.getTime() - start.getTime();

    if (diff <= 0) return '0 minutes';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes} minutes`;
    }
  } catch (e) {
    return 'Invalid time';
  }
}

interface ShiftFormData {
  date: string
  startTime: string
  endTime: string
  employeeId?: string
  employeeGroupId?: string
  shiftType: ShiftType
  shiftTypeId?: string
  breakStart?: string
  breakEnd?: string
  breakPaid?: boolean
  wage: number
  wageType: WageType
  note?: string
  approved: boolean
  exchangeToEmployeeId?: string
  exchangeReason?: string
  autoBreakType?: AutoBreakType
  autoBreakValue?: number | null
  departmentId?: string
  categoryId?: string
  functionId?: string
}

interface EmployeeForForm {
  id: string;
  firstName: string;
  lastName: string;
  employeeNo?: string | null;
  salaryRate?: number | null;
  employeeGroupId?: string | null;
  departmentId: string;
}

interface Department {
  id: string;
  name: string;
}

interface Category {
  id: string;
  name: string;
  color?: string | null;
  departmentId?: string | null;
  departments?: Array<{
    id: string;
    department: {
      id: string;
      name: string;
    }
  }>;
}

interface FunctionItem {
  id: string;
  name: string;
  color?: string | null;
  categoryId: string;
}

interface ShiftFormProps {
  initialData?: ShiftFormData & { id?: string }
  onSubmit: (data: ShiftFormData) => void
  onDelete?: (shiftId: string) => Promise<void> | void
  onCancel: () => void
  loading: boolean
  employees: EmployeeForForm[]
  employeeGroups: { id: string; name: string; wage?: number | null; functionId?: string | null }[]
  showEmployee?: boolean
  showStartTime?: boolean
  showDate?: boolean
}

export default function ShiftForm({
  initialData,
  onSubmit,
  onDelete,
  onCancel,
  loading,
  employees,
  employeeGroups,
  showEmployee = true,
  showStartTime = true,
  showDate = true,
}: ShiftFormProps) {
  const { user } = useUser()

  const safeEmployees = Array.isArray(employees) ? employees : []
  const isEmployee = user?.role === 'EMPLOYEE'

  const today = new Date()
  const todayString = today.toISOString().split('T')[0]

  const [displayDate, setDisplayDate] = useState<string>('')
  const [shiftTypeOptions, setShiftTypeOptions] = useState<ShiftTypeOption[]>([
    { id: 'NORMAL', name: 'Normal', isCustom: false }
  ])
  const [loadingShiftTypes, setLoadingShiftTypes] = useState(false)

  const [formData, setFormData] = useState<ShiftFormData>(() => {
    const convertDateTimeToTimeString = (dateTime: any): string | undefined => {
      if (!dateTime) return undefined;
      try {
        const date = new Date(dateTime);
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${hours}:${minutes}`;
      } catch (e) {
        return undefined;
      }
    };

    const baseData = initialData ? {
      ...initialData,
      date: initialData.date || todayString,
      startTime: initialData.startTime || '09:00',
      endTime: initialData.endTime || '17:00',
      shiftType: initialData.shiftType || 'NORMAL' as ShiftType,
      wage: initialData.wage ?? 0,
      wageType: initialData.wageType || 'HOURLY' as WageType,
      approved: initialData.approved || false,
      breakStart: convertDateTimeToTimeString(initialData.breakStart),
      breakEnd: convertDateTimeToTimeString(initialData.breakEnd),
      breakPaid: initialData.breakPaid || false,
      shiftTypeId: initialData.shiftTypeId || undefined,
      autoBreakType: initialData.autoBreakType || 'MANUAL_BREAK',
      autoBreakValue: initialData.autoBreakValue || null,
      departmentId: initialData.departmentId || undefined,
      categoryId: initialData.categoryId || undefined,
      functionId: initialData.functionId || undefined,
    } : {
      date: todayString,
      startTime: '09:00',
      endTime: '17:00',
      shiftType: 'NORMAL' as ShiftType,
      shiftTypeId: undefined,
      wage: 0,
      wageType: 'HOURLY' as WageType,
      approved: false,
      employeeId: undefined,
      employeeGroupId: undefined,
      breakStart: undefined,
      breakEnd: undefined,
      breakPaid: false,
      note: undefined,
      autoBreakType: 'MANUAL_BREAK' as AutoBreakType,
      autoBreakValue: null,
    };

    // If there's an employeeId, calculate the wage
    if (baseData.employeeId) {
      const selectedEmployee = employees.find(emp => emp.id === baseData.employeeId);
      if (selectedEmployee) {
        if (selectedEmployee.salaryRate) {
          baseData.wage = selectedEmployee.salaryRate;
          baseData.wageType = 'HOURLY';
        } else if (selectedEmployee.employeeGroupId) {
          const group = employeeGroups.find(g => g.id === selectedEmployee.employeeGroupId);
          if (group && group.wage) {
            baseData.wage = group.wage;
            baseData.wageType = 'HOURLY';
          }
        }
      }
    }

    return baseData as ShiftFormData;
  })

  useEffect(() => {
    if (formData.employeeId) {
      const selectedEmployee = employees.find(emp => emp.id === formData.employeeId);
      if (selectedEmployee) {
        const updates: Partial<ShiftFormData> = {};
        
        // Auto-populate wage
        if (selectedEmployee.salaryRate) {
          updates.wage = selectedEmployee.salaryRate;
          updates.wageType = 'HOURLY';
        } else if (selectedEmployee.employeeGroupId) {
          const group = employeeGroups.find(g => g.id === selectedEmployee.employeeGroupId);
          if (group && group.wage) {
            updates.wage = group.wage;
            updates.wageType = 'HOURLY';
          } else {
            updates.wage = 0;
          }
        } else {
          updates.wage = 0;
        }

        // Auto-populate employeeGroupId (editable)
        if (selectedEmployee.employeeGroupId && !formData.employeeGroupId) {
          updates.employeeGroupId = selectedEmployee.employeeGroupId;
        }

        // Auto-populate departmentId (editable)
        if (selectedEmployee.departmentId && !formData.departmentId) {
          updates.departmentId = selectedEmployee.departmentId;
        }

        setFormData(prev => ({ ...prev, ...updates }));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.employeeId, employees, employeeGroups]);

  const [activeTab, setActiveTab] = useState<'basic' | 'break' | 'exchange'>('basic')
  const [shiftExchanges, setShiftExchanges] = useState<ShiftExchange[]>([])
  const [exchangeLoading, setExchangeLoading] = useState(false)

  const [showBreakFields, setShowBreakFields] = useState<boolean>(() => {
    return initialData ? !!initialData.breakStart || !!initialData.breakEnd : false
  })
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false)

  const [departments, setDepartments] = useState<Department[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [functions, setFunctions] = useState<FunctionItem[]>([])
  const [loadingDepartments, setLoadingDepartments] = useState(false)
  const [loadingCategories, setLoadingCategories] = useState(false)
  const [loadingFunctions, setLoadingFunctions] = useState(false)

  const recalcAutoBreak = (type:AutoBreakType,value: number) => {
  if (!formData.startTime || !formData.endTime) return

  const start = new Date(`2000-01-01T${formData.startTime}:00`)
  const end = new Date(`2000-01-01T${formData.endTime}:00`)
  const duration = end.getTime() - start.getTime()
  const mid = new Date(start.getTime() + duration / 2)

  const breakStart = new Date(mid)
  const breakEnd = new Date(mid.getTime() + value * 60 * 1000)

  setFormData(prev => ({
    ...prev,
    autoBreakType: type,
    autoBreakValue: value,
    breakStart: breakStart.toISOString().slice(11, 16),
    breakEnd: breakEnd.toISOString().slice(11, 16),
  }))
}

  useEffect(() => {
    setDisplayDate(formatDateForDisplay(formData.date))
  }, [formData.date])

  useEffect(() => {
    fetchDepartments()
  }, [])

  useEffect(() => {
    const initializeCascadingData = async () => {
      if (initialData?.departmentId) {
        await fetchCategories(initialData.departmentId)
      }
      if (initialData?.categoryId) {
        await fetchFunctions(initialData.categoryId)
      }
    }
    initializeCascadingData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only run once on mount

  // Fetch categories when department changes (but not on initial mount if we have initialData)
  useEffect(() => {
    if (formData.departmentId) {
      // Only fetch if we don't have the right categories loaded already
      const hasCorrectCategories = categories.some(cat => cat.departmentId === formData.departmentId)
      if (!hasCorrectCategories) {
        fetchCategories(formData.departmentId)
      }
    } else {
      setCategories([])
      setFunctions([])
      // Only clear if we're not initializing with data
      if (!initialData?.departmentId) {
        setFormData(prev => ({ ...prev, categoryId: undefined, functionId: undefined }))
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.departmentId])

  // Fetch functions when category changes (but not on initial mount if we have initialData)
  useEffect(() => {
    if (formData.categoryId) {
      const hasCorrectFunctions = functions.some(func => func.categoryId === formData.categoryId)
      if (!hasCorrectFunctions) {
        fetchFunctions(formData.categoryId)
      }
    } else {
      setFunctions([])
      if (!initialData?.categoryId) {
        setFormData(prev => ({ ...prev, functionId: undefined }))
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.categoryId])

  const fetchDepartments = async () => {
    setLoadingDepartments(true)
    try {
      const response = await fetch('/api/departments')
      if (response.ok) {
        const data = await response.json()
        setDepartments(data)
      }
    } catch (error) {
      console.error('Error fetching departments:', error)
    } finally {
      setLoadingDepartments(false)
    }
  }

  const fetchCategories = async (departmentId: string) => {
    setLoadingCategories(true)
    try {
      const response = await fetch('/api/categories')
      if (response.ok) {
        const data = await response.json()
        // Filter categories that either:
        // 1. Are business-wide (no departments assigned), OR
        // 2. Include the selected department in their departments array
        const filtered = data.filter((cat: Category) => {
          // Business-wide categories (no departments)
          if (!cat.departments || cat.departments.length === 0) {
            return true
          }
          // Categories assigned to this specific department
          return cat.departments.some((cd: any) => cd.department.id === departmentId)
        })
        setCategories(filtered)
      }
    } catch (error) {
      console.error('Error fetching categories:', error)
    } finally {
      setLoadingCategories(false)
    }
  }

  const fetchFunctions = async (categoryId: string) => {
    setLoadingFunctions(true)
    try {
      const response = await fetch('/api/functions')
      if (response.ok) {
        const data = await response.json()
        const filtered = data.filter((func: any) => func.categoryId === categoryId)
        setFunctions(filtered)
      }
    } catch (error) {
      console.error('Error fetching functions:', error)
    } finally {
      setLoadingFunctions(false)
    }
  }

  const linkedFunctionGroup = React.useMemo(() => {
    if (!formData.functionId) return undefined
    return employeeGroups.find(group => group.functionId === formData.functionId)
  }, [formData.functionId, employeeGroups])

  const filteredEmployees = React.useMemo(() => {
    if (!formData.functionId) {
      return safeEmployees
    }
    if (!linkedFunctionGroup) {
      return []
    }
    return safeEmployees.filter(emp => emp.employeeGroupId === linkedFunctionGroup.id)
  }, [safeEmployees, formData.functionId, linkedFunctionGroup])

  const employeeSelectDisabled = isEmployee || (formData.functionId ? !linkedFunctionGroup || filteredEmployees.length === 0 : false)
  const employeeGroupSelectDisabled = isEmployee || !!linkedFunctionGroup

  useEffect(() => {
    if (!formData.functionId) {
      return
    }

    if (!linkedFunctionGroup) {
      if (formData.employeeGroupId || formData.employeeId) {
        setFormData(prev => ({
          ...prev,
          employeeGroupId: undefined,
          employeeId: undefined,
        }))
      }
      return
    }

    const employeeStillValid = formData.employeeId
      ? filteredEmployees.some(emp => emp.id === formData.employeeId)
      : true

    if (formData.employeeGroupId === linkedFunctionGroup.id && employeeStillValid) {
      return
    }

    setFormData(prev => ({
      ...prev,
      employeeGroupId: linkedFunctionGroup.id,
      employeeId: employeeStillValid ? prev.employeeId : undefined,
    }))
  }, [formData.functionId, formData.employeeGroupId, formData.employeeId, linkedFunctionGroup, filteredEmployees])


  useEffect(() => {
    if (initialData?.id) {
      fetchShiftExchanges()
    }
  }, [initialData?.id])

  useEffect(() => {
    fetchShiftTypes()
  }, [])

  useEffect(() => {
  if (!initialData || shiftTypeOptions.length === 0) return

  // console.log('Initial data:', initialData)
  // console.log('Available shift types:', shiftTypeOptions)

  const matchingType = shiftTypeOptions.find(
    st => st.id === initialData.shiftTypeId
  )

  if (!matchingType) return

  const hasConfigChanged =
    matchingType.autoBreakType === 'AUTO_BREAK' &&
    matchingType.autoBreakValue !== undefined &&
    matchingType.autoBreakValue !== null &&
    (matchingType.autoBreakValue !== initialData.autoBreakValue)

  if (hasConfigChanged) {

    if (matchingType.autoBreakType === 'AUTO_BREAK') {
      setShowBreakFields(true)
      recalcAutoBreak(matchingType.autoBreakType,matchingType.autoBreakValue!)
    } else if (matchingType.autoBreakType === 'MANUAL_BREAK') {
      setShowBreakFields(false)
      setShowBreakFields(false)
      setFormData(prev => ({
        ...prev,
        autoBreakType: 'MANUAL_BREAK',
        autoBreakValue: null,
        breakStart: '',
        breakEnd: '',
      }))
    }
  }else{
    // If changed to manual, clear auto-break settings
      setShowBreakFields(false)
      setFormData(prev => ({
        ...prev,
        autoBreakType: 'MANUAL_BREAK',
        autoBreakValue: null,
        breakStart: '',
        breakEnd: '',
      }))
  }
}, [initialData, shiftTypeOptions])

  const fetchShiftTypes = async () => {
    setLoadingShiftTypes(true)
    try {
      const response = await fetch('/api/shift-types')
      if (response.ok) {
        const data = await response.json()

        if (data.shiftTypes && Array.isArray(data.shiftTypes)) {
          const customOptions: ShiftTypeOption[] = data.shiftTypes.map((st: any) => ({
            id: st.id,
            name: st.name,
            isCustom: true,
            autoBreakType: st.autoBreakType,
            autoBreakValue: st.autoBreakValue,
          }))

          setShiftTypeOptions([
            { id: 'NORMAL', name: 'Normal', isCustom: false },
            ...customOptions
          ])
        } else {
          console.warn('No shift types returned from API or invalid format')
          setShiftTypeOptions([
            { id: 'NORMAL', name: 'Normal', isCustom: false }
          ])
        }
      }
    } catch (error) {
      console.error('Error fetching shift types:', error)
      setShiftTypeOptions([
        { id: 'NORMAL', name: 'Normal', isCustom: false }
      ])
    } finally {
      setLoadingShiftTypes(false)
    }
  }

  const fetchShiftExchanges = async () => {
    if (!initialData?.id) return

    setExchangeLoading(true)
    try {
      const response = await fetch(`/api/shifts/${initialData.id}/exchanges`)
      if (response.ok) {
        const exchanges = await response.json()
        setShiftExchanges(exchanges)
      }
    } catch (error) {
      console.error('Error fetching shift exchanges:', error)
    } finally {
      setExchangeLoading(false)
    }
  }

  const handleShiftExchange = async (toEmployeeId: string, reason: string) => {
    if (!initialData?.id) return

    try {
      const response = await fetch(`/api/shifts/${initialData.id}/exchanges`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          toEmployeeId,
          reason,
        }),
      })

      if (response.ok) {
        await fetchShiftExchanges()
        setFormData({
          ...formData,
          exchangeToEmployeeId: '',
          exchangeReason: '',
        })
        Swal.fire({
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 3000,
          timerProgressBar: true,
          icon: 'success',
          title: 'Shift exchange request created successfully!',
        })
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create exchange request')
      }
    } catch (error) {
      Swal.fire({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        icon: 'error',
        title: 'Failed to create shift exchange request',
      })
    }
  }

  const handleExchangeStatusUpdate = async (exchangeId: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      const response = await fetch(`/api/shift-exchanges/${exchangeId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      })

      if (response.ok) {
        await fetchShiftExchanges()
        Swal.fire({
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 3000,
          timerProgressBar: true,
          icon: 'success',
          title: `Exchange request ${status.toLowerCase()} successfully!`,
        })
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update exchange status')
      }
    } catch (error) {
      console.error('Error updating exchange status:', error)
      Swal.fire({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        icon: 'error',
        title: 'Failed to update exchange status',
      })
    }
  }

  const getExchangeStatusColor = (status: string) => {
    switch (status) {
      case 'EMPLOYEE_PENDING':
      case 'ADMIN_PENDING':
        return 'bg-yellow-100 text-yellow-800'
      case 'APPROVED':
      case 'EMPLOYEE_ACCEPTED':
        return 'bg-green-100 text-green-800'
      case 'REJECTED':
      case 'EMPLOYEE_REJECTED':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (isEmployee) {
      return
    }

    const submissionData: Partial<ShiftFormData> & { date: string } = {
      ...formData,
      date: parseDateForSubmission(displayDate),
    };

    const selectedOption = shiftTypeOptions.find(opt => opt.id === (formData.shiftTypeId || formData.shiftType));

    if (selectedOption) {
      if (selectedOption.isCustom) {
        submissionData.shiftType = 'CUSTOM' as ShiftType;
        submissionData.shiftTypeId = selectedOption.id;
      } else {
        submissionData.shiftType = selectedOption.id as ShiftType;
        delete submissionData.shiftTypeId;
      }
    }

    onSubmit(submissionData as ShiftFormData)
  }

  const toggleBreakFields = () => {
    const newShowBreakFields = !showBreakFields
    setShowBreakFields(newShowBreakFields)

    if (!newShowBreakFields) {
      setFormData({
        ...formData,
        breakStart: undefined,
        breakEnd: undefined,
      })
    } else {
      setFormData({
        ...formData,
        breakStart: '12:00',
        breakEnd: '13:00',
      })
    }
  }

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDisplayDate = e.target.value;
    setDisplayDate(newDisplayDate);

    try {
      const [day, month, year] = newDisplayDate.split('/');
      if (day && month && year && year.length === 4) {
        const parsedDate = `${year}-${month}-${day}`;
        setFormData({ ...formData, date: parsedDate });
      }
    } catch (e) {
      console.error('Error parsing date:', e)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!initialData?.id || !onDelete) return
    await onDelete(initialData.id)
    setDeleteDialogOpen(false)
  }

  const canDeleteShift = Boolean(
    !isEmployee &&
    onDelete &&
    initialData?.id &&
    initialData?.approved === false
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {isEmployee && (
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <p className="text-sm text-yellow-700">
            As an employee, you can view shifts but cannot create or edit them.
          </p>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            type="button"
            onClick={() => setActiveTab('basic')}
            className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${activeTab === 'basic'
                ? 'border-[#31BCFF] text-[#31BCFF]'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            Basic Information
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('break')}
            className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${activeTab === 'break'
                ? 'border-[#31BCFF] text-[#31BCFF]'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            Break Time
          </button>
          {initialData?.id && shiftExchanges.length > 0 && (
            <button
              type="button"
              onClick={() => setActiveTab('exchange')}
              className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${activeTab === 'exchange'
                  ? 'border-[#31BCFF] text-[#31BCFF]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              Exchange History
              <span className="ml-1.5 inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold leading-none text-white bg-blue-600 rounded-full">
                {shiftExchanges.length}
              </span>
            </button>
          )}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'basic' && (
        <div className="grid grid-cols-1 gap-4 sm:gap-6 sm:grid-cols-2">
          {showDate && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={displayDate}
                onChange={handleDateChange}
                disabled={isEmployee}
                placeholder="DD/MM/YYYY"
                className={`block w-full rounded-md border border-gray-300 px-3 py-2.5 text-sm shadow-sm focus:border-[#31BCFF] focus:ring-[#31BCFF] ${isEmployee ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                required
              />
              <p className="mt-1 text-xs text-gray-500">Format: DD/MM/YYYY</p>
            </div>
          )}

          {/* Shift Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Shift Type <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.shiftTypeId || formData.shiftType || ''}
              onChange={(e) => {
                const selectedOption = shiftTypeOptions.find(opt => opt.id === e.target.value);
                if (selectedOption) {
                  if (selectedOption.isCustom) {
                    // setFormData(prev => ({ ...prev, shiftType: 'CUSTOM' as ShiftType, shiftTypeId: selectedOption.id }));
                    // console.log('Selected autoBreakType:', selectedOption.autoBreakType)
                    setFormData(prev => {
                      let updated = {
                        ...prev,
                        shiftType: 'CUSTOM' as ShiftType,
                        shiftTypeId: selectedOption.id,
                        autoBreakType: selectedOption.autoBreakType,
                        autoBreakValue: selectedOption.autoBreakValue,
                      }

                      // Auto-break calculation
                      if (selectedOption.autoBreakType === "AUTO_BREAK" && selectedOption.autoBreakValue && prev.startTime) {
                        const [hour, minute] = prev.startTime.split(':').map(Number)
                        const start = new Date(0, 0, 0, hour, minute)
                        const breakStart = new Date(start.getTime() + 4 * 60 * 60 * 1000) // Example: 4 hrs after start
                        const breakEnd = new Date(breakStart.getTime() + selectedOption.autoBreakValue * 60 * 1000)

                        const fmt = (d: Date) =>
                          d.toTimeString().slice(0, 5) // "HH:MM" format

                        updated.breakStart = fmt(breakStart)
                        updated.breakEnd = fmt(breakEnd)
                      }

                      return updated
                    })
                    if (selectedOption.autoBreakType === "AUTO_BREAK" && selectedOption.autoBreakValue) {
                      setShowBreakFields(true);
                    }else if (selectedOption.autoBreakType === "MANUAL_BREAK") {
                      setShowBreakFields(false);
                    }
                  } else {
                    setFormData(prev => ({ ...prev, shiftType: selectedOption.id as ShiftType, shiftTypeId: undefined }));
                    setShowBreakFields(false);
                  }
                }
              }}
              disabled={isEmployee || loadingShiftTypes}
              className={`block w-full rounded-md border border-gray-300 px-3 py-2.5 text-sm shadow-sm focus:border-[#31BCFF] focus:ring-[#31BCFF] ${isEmployee || loadingShiftTypes ? 'bg-gray-100 cursor-not-allowed' : ''}`}
              required
            >
              {shiftTypeOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </select>
            {loadingShiftTypes && (
              <p className="mt-1 text-xs text-gray-500">Loading shift types...</p>
            )}
          </div>

          {/* Start Time */}
          {showStartTime && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Time <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                value={formData.startTime || ''}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                disabled={isEmployee}
                className={`block w-full rounded-md border border-gray-300 px-3 py-2.5 text-sm shadow-sm focus:border-[#31BCFF] focus:ring-[#31BCFF] ${isEmployee ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                required
              />
            </div>
          )}

          {/* End Time */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End Time <span className="text-red-500">*</span>
            </label>
            <input
              type="time"
              value={formData.endTime || ''}
              onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
              disabled={isEmployee}
              className={`block w-full rounded-md border border-gray-300 px-3 py-2.5 text-sm shadow-sm focus:border-[#31BCFF] focus:ring-[#31BCFF] ${isEmployee ? 'bg-gray-100 cursor-not-allowed' : ''}`}
              required
            />
          </div>

          {/* Department */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Department <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.departmentId || ''}
              onChange={(e) => setFormData({ ...formData, departmentId: e.target.value || undefined, categoryId: undefined, functionId: undefined })}
              disabled={isEmployee || loadingDepartments}
              className={`block w-full rounded-md border border-gray-300 px-3 py-2.5 text-sm shadow-sm focus:border-[#31BCFF] focus:ring-[#31BCFF] ${isEmployee ? 'bg-gray-100 cursor-not-allowed' : ''}`}
              required
            >
              <option value="">Select department</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category {formData.departmentId && <span className="text-red-500">*</span>}
            </label>
            <select
              value={formData.categoryId || ''}
              onChange={(e) => setFormData({ ...formData, categoryId: e.target.value || undefined, functionId: undefined })}
              disabled={isEmployee || !formData.departmentId || loadingCategories}
              className={`block w-full rounded-md border border-gray-300 px-3 py-2.5 text-sm shadow-sm focus:border-[#31BCFF] focus:ring-[#31BCFF] ${isEmployee || !formData.departmentId ? 'bg-gray-100 cursor-not-allowed' : ''}`}
              required={!!formData.departmentId}
            >
              <option value="">
                {!formData.departmentId ? 'Select department first' : loadingCategories ? 'Loading...' : 'Select category'}
              </option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Function */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Function {formData.categoryId && <span className="text-red-500">*</span>}
            </label>
            <select
              value={formData.functionId || ''}
              onChange={(e) => setFormData({ ...formData, functionId: e.target.value || undefined })}
              disabled={isEmployee || !formData.categoryId || loadingFunctions}
              className={`block w-full rounded-md border border-gray-300 px-3 py-2.5 text-sm shadow-sm focus:border-[#31BCFF] focus:ring-[#31BCFF] ${isEmployee || !formData.categoryId ? 'bg-gray-100 cursor-not-allowed' : ''}`}
              required={!!formData.categoryId}
            >
              <option value="">
                {!formData.categoryId ? 'Select category first' : loadingFunctions ? 'Loading...' : 'Select function'}
              </option>
              {functions.map((func) => (
                <option key={func.id} value={func.id}>
                  {func.name}
                </option>
              ))}
            </select>
            {formData.functionId && linkedFunctionGroup && (
              <p className="mt-1 text-xs text-gray-500">
                Linked employee group: {linkedFunctionGroup.name}. Employee options are limited to this group.
              </p>
            )}
            {formData.functionId && !linkedFunctionGroup && (
              <p className="mt-1 text-xs text-red-500">
                No employee group is linked to this function. Update your employee group settings before assigning employees.
              </p>
            )}
          </div>

          {/* Employee */}
          {showEmployee && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Employee {formData.functionId && <span className="text-red-500">*</span>}
              </label>
              <select
                value={formData.employeeId || ''}
                onChange={(e) => setFormData({ ...formData, employeeId: e.target.value || undefined })}
                disabled={employeeSelectDisabled}
                className={`block w-full rounded-md border border-gray-300 px-3 py-2.5 text-sm shadow-sm focus:border-[#31BCFF] focus:ring-[#31BCFF] ${employeeSelectDisabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                required={!!formData.functionId}
              >
                <option value="">
                  {formData.functionId
                    ? linkedFunctionGroup
                      ? filteredEmployees.length > 0
                        ? `Select an employee from ${linkedFunctionGroup.name}`
                        : 'No eligible employees in this group'
                      : 'Link this function to an employee group'
                    : 'Select an employee (optional)'}
                </option>
                {filteredEmployees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.firstName} {employee.lastName} {employee.employeeNo && `(${employee.employeeNo})`}
                  </option>
                ))}
              </select>
              <p
                className={`mt-1 text-xs ${formData.functionId && (!linkedFunctionGroup || filteredEmployees.length === 0) ? 'text-red-500' : 'text-gray-500'}`}
              >
                {formData.functionId
                  ? linkedFunctionGroup
                    ? filteredEmployees.length > 0
                      ? `Only employees in ${linkedFunctionGroup.name} can be assigned.`
                      : 'No employees currently belong to this group.'
                    : 'Link this function to an employee group to assign employees.'
                  : 'All employees in the business are shown.'}
              </p>
            </div>
          )}

          {/* Employee Group */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Employee Group</label>
            <select
              value={formData.employeeGroupId || ''}
              onChange={(e) => setFormData({ ...formData, employeeGroupId: e.target.value || undefined })}
              disabled={employeeGroupSelectDisabled}
              className={`block w-full rounded-md border border-gray-300 px-3 py-2.5 text-sm shadow-sm focus:border-[#31BCFF] focus:ring-[#31BCFF] ${employeeGroupSelectDisabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
            >
              <option value="">
                {linkedFunctionGroup ? 'Automatically linked to function' : 'Select a group'}
              </option>
              {employeeGroups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
            {linkedFunctionGroup && (
              <p className="mt-1 text-xs text-gray-500">
                Automatically set to {linkedFunctionGroup.name} because of the selected function.
              </p>
            )}
            {formData.functionId && !linkedFunctionGroup && (
              <p className="mt-1 text-xs text-red-500">
                Assign a function to an employee group before creating this shift.
              </p>
            )}
          </div>

          {/* Wage */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Wage ($) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={isNaN(formData.wage) ? '' : formData.wage}
              onChange={(e) => {
                const value = parseFloat(e.target.value)
                setFormData({ ...formData, wage: isNaN(value) ? 0 : value })
              }}
              disabled={isEmployee}
              className={`block w-full rounded-md border border-gray-300 px-3 py-2.5 text-sm shadow-sm focus:border-[#31BCFF] focus:ring-[#31BCFF] ${isEmployee ? 'bg-gray-100 cursor-not-allowed' : ''}`}
              required
            />
          </div>

          {/* Notes */}
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={formData.note || ''}
              onChange={(e) => setFormData({ ...formData, note: e.target.value || undefined })}
              rows={2}
              disabled={isEmployee}
              className={`block w-full rounded-md border border-gray-300 px-3 py-2.5 text-sm text-gray-900 shadow-sm focus:border-[#31BCFF] focus:ring-[#31BCFF] ${isEmployee ? 'bg-gray-100 cursor-not-allowed' : ''}`}
            />
          </div>

          {/* Approved */}
          <div>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.approved}
                onChange={(e) => setFormData({ ...formData, approved: e.target.checked })}
                disabled={isEmployee}
                className={`rounded border-gray-300 text-[#31BCFF] focus:ring-[#31BCFF] h-4 w-4 ${isEmployee ? 'cursor-not-allowed' : ''}`}
              />
              <span className="text-sm font-medium text-gray-700">Approved</span>
            </label>
          </div>
        </div>
      )}

      {/* Break Tab */}
      {activeTab === 'break' && (
        <div className="space-y-4 sm:space-y-6">
          {/* Break Toggle */}
          <div className="flex items-center justify-between p-3 sm:p-4 bg-gray-50 rounded-lg">
            <div className="flex-1 mr-3">
              <h3 className="text-sm font-medium text-gray-900">Enable Break Time</h3>
              <p className="text-xs sm:text-sm text-gray-500 mt-0.5">Add break periods to this shift</p>
            </div>
            <label className="flex items-center flex-shrink-0">
              <input
                type="checkbox"
                checked={showBreakFields}
                onChange={toggleBreakFields}
                disabled={isEmployee}
                className={`rounded border-gray-300 text-[#31BCFF] focus:ring-[#31BCFF] h-4 w-4 ${isEmployee ? 'cursor-not-allowed' : ''}`}
              />
            </label>
          </div>

          {/* Break Fields */}
          {showBreakFields && (
            <div className="grid grid-cols-1 gap-4 sm:gap-6 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Break Start Time
                </label>
                <input
                  type="time"
                  value={formData.breakStart || ''}
                  onChange={(e) => setFormData({ ...formData, breakStart: e.target.value || undefined })}
                  disabled={isEmployee}
                  className={`block w-full rounded-md border border-gray-300 px-3 py-2.5 text-sm shadow-sm focus:border-[#31BCFF] focus:ring-[#31BCFF] ${isEmployee ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                />
                <p className="mt-1 text-xs text-gray-500">Time when break period starts</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Break End Time
                </label>
                <input
                  type="time"
                  value={formData.breakEnd || ''}
                  onChange={(e) => setFormData({ ...formData, breakEnd: e.target.value || undefined })}
                  disabled={isEmployee}
                  className={`block w-full rounded-md border border-gray-300 px-3 py-2.5 text-sm shadow-sm focus:border-[#31BCFF] focus:ring-[#31BCFF] ${isEmployee ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                />
                <p className="mt-1 text-xs text-gray-500">Time when break period ends</p>
              </div>

              {/* Paid Break */}
              <div className="sm:col-span-2">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.breakPaid || false}
                    onChange={(e) => setFormData({ ...formData, breakPaid: e.target.checked })}
                    disabled={isEmployee}
                    className={`rounded border-gray-300 text-[#31BCFF] focus:ring-[#31BCFF] h-4 w-4 ${isEmployee ? 'cursor-not-allowed' : ''}`}
                  />
                  <span className="text-sm font-medium text-gray-700">Paid Break</span>
                </label>
                <p className="mt-1 text-xs text-gray-500">Check if this break time should be included in payroll calculations</p>
              </div>

              {/* Break Duration Display */}
              {formData.breakStart && formData.breakEnd && (
                <div className="sm:col-span-2">
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <p className="text-xs sm:text-sm text-blue-700">
                      <strong>Break Duration:</strong> {calculateBreakDuration(formData.breakStart, formData.breakEnd)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Break Time Guidelines */}
          <div className="p-3 sm:p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <h4 className="text-xs sm:text-sm font-medium text-amber-800 mb-2">Break Time Guidelines</h4>
            <ul className="text-xs sm:text-sm text-amber-700 space-y-1">
              <li>• Unpaid breaks are automatically deducted from total worked hours</li>
              <li>• Paid breaks are included in payroll calculations and not deducted from hours</li>
              <li>• Ensure break start time is after shift start time</li>
              <li>• Ensure break end time is before shift end time</li>
              <li>• Standard lunch break is typically 1 hour (12:00 - 13:00)</li>
            </ul>
          </div>
        </div>
      )}

      {/* Shift Exchange Tab */}
      {activeTab === 'exchange' && initialData?.id && (
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="text-sm font-medium text-blue-900 mb-1">Shift Exchange History</h3>
            <p className="text-xs text-blue-700">
              View all exchange requests and their current status for this shift
            </p>
          </div>

          {exchangeLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : shiftExchanges.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-sm text-gray-500">No exchange history for this shift</p>
            </div>
          ) : (
            <div className="space-y-3">
              {shiftExchanges.map((exchange, index) => (
                <div
                  key={exchange.id}
                  className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getExchangeStatusColor(exchange.status)}`}>
                          {exchange.status.replace(/_/g, ' ')}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(exchange.requestedAt).toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                      <div className="text-sm space-y-1">
                        <p className="text-gray-900">
                          <strong>From:</strong> {exchange.fromEmployee.firstName} {exchange.fromEmployee.lastName}
                          {exchange.fromEmployee.employeeNo && (
                            <span className="text-gray-500 ml-1">(#{exchange.fromEmployee.employeeNo})</span>
                          )}
                        </p>
                        <p className="text-gray-900">
                          <strong>To:</strong> {exchange.toEmployee.firstName} {exchange.toEmployee.lastName}
                          {exchange.toEmployee.employeeNo && (
                            <span className="text-gray-500 ml-1">(#{exchange.toEmployee.employeeNo})</span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>

                  {exchange.reason && (
                    <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-600">
                      <strong>Reason:</strong> {exchange.reason}
                    </div>
                  )}

                  {(exchange.status === 'ADMIN_PENDING' || exchange.status === 'EMPLOYEE_ACCEPTED') && !isEmployee && (
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleExchangeStatusUpdate(exchange.id, 'APPROVED')}
                        disabled={exchangeLoading}
                        className="flex-1 px-3 py-1.5 text-xs font-medium text-white bg-green-600 rounded hover:bg-green-700 disabled:opacity-50"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => handleExchangeStatusUpdate(exchange.id, 'REJECTED')}
                        disabled={exchangeLoading}
                        className="flex-1 px-3 py-1.5 text-xs font-medium text-white bg-red-600 rounded hover:bg-red-700 disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </div>
                  )}

                  {exchange.status === 'APPROVED' && (
                    <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded">
                      <p className="text-xs text-green-700">
                        ✓ This exchange has been approved. The shift is now assigned to {exchange.toEmployee.firstName} {exchange.toEmployee.lastName}.
                      </p>
                    </div>
                  )}

                  {exchange.status === 'REJECTED' && (
                    <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded">
                      <p className="text-xs text-red-700">
                        ✗ This exchange request was rejected.
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t">
        {canDeleteShift && (
          <AlertDialog open={isDeleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <AlertDialogTrigger asChild>
              <button
                type="button"
                disabled={loading}
                className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
              >
                Delete Shift
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this shift?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. The shift will be permanently removed from the schedule.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-red-600 hover:bg-red-700 focus:ring-red-500"
                  onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                    e.preventDefault()
                    handleDeleteConfirm()
                  }}
                  disabled={loading}
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
        <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 w-full sm:w-auto">
          <button
            type="button"
            onClick={onCancel}
            className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#31BCFF]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || isEmployee}
            className={`w-full sm:w-auto px-4 py-2 text-sm font-medium text-white border border-transparent rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#31BCFF] disabled:opacity-50 ${
              isEmployee ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#31BCFF] hover:bg-[#31BCFF]/90'
            }`}
            title={isEmployee ? "Employees cannot create or edit shifts" : ""}
          >
            {loading ? 'Saving...' : isEmployee ? 'Not Authorized' : 'Save'}
          </button>
        </div>
      </div>
    </form>
  )
}
