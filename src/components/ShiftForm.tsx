'use client'

import React, { useState, useEffect } from 'react'
import { AutoBreakType, ShiftType, WageType } from '@prisma/client'
import { useUser } from '@/shared/lib/useUser'
import { formatTimeFromDateTime } from '@/shared/lib/timeFormatting'
import { useTranslation } from 'react-i18next'
import { ShiftExchange } from '@/shared/types'
import Swal from 'sweetalert2'
import { Send } from 'lucide-react'
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
  isPublished?: boolean
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
  departments?: Array<{
    departmentId: string;
    isPrimary: boolean;
  }>;
  employeeGroups?: Array<{
    employeeGroupId: string;
    isPrimary: boolean;
    employeeGroup: {
      id: string;
      name: string;
    };
  }>;
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
  employeeGroups?: Array<{ id: string; name: string }>
}

interface ShiftFormProps {
  initialData?: ShiftFormData & { id?: string }
  onSubmit?: (data: ShiftFormData) => void
  onDelete?: (shiftId: string) => Promise<void> | void
  onCancel: () => void
  loading: boolean
  employees: EmployeeForForm[]
  employeeGroups: { id: string; name: string; wage?: number | null; functions?: Array<{ id: string; name: string }> }[]
  showEmployee?: boolean
  showStartTime?: boolean
  showDate?: boolean
  readOnly?: boolean
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
  readOnly = false,
}: ShiftFormProps) {
  const { t } = useTranslation()
  const { user } = useUser()

  const safeEmployees = Array.isArray(employees) ? employees : []
  const isEmployee = user?.role === 'EMPLOYEE'
  const isDisabled = isEmployee || readOnly

  const today = new Date()
  const todayString = today.toISOString().split('T')[0]

  const [displayDate, setDisplayDate] = useState<string>('')
  const [shiftTypeOptions, setShiftTypeOptions] = useState<ShiftTypeOption[]>([
    { id: 'NORMAL', name: 'Normal', isCustom: false }
  ])
  const [loadingShiftTypes, setLoadingShiftTypes] = useState(false)

  const [formData, setFormData] = useState<ShiftFormData>(() => {
    const convertDateTimeToTimeString = (dateTime: any): string | undefined => {
      return formatTimeFromDateTime(dateTime) || undefined
    }

    const baseData = initialData ? {
      ...initialData,
      date: initialData.date || todayString,
      startTime: initialData.startTime || '09:00',
      endTime: initialData.endTime || '17:00',
      shiftType: initialData.shiftType || 'NORMAL' as ShiftType,
      wage: initialData.wage ?? 0,
      wageType: initialData.wageType || 'HOURLY' as WageType,
      isPublished: initialData.isPublished ?? false,
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
      isPublished: false,
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

    // If there's an employeeId on a new shift (no id = not an existing shift), calculate the default wage
    if (!initialData?.id && baseData.employeeId && !baseData.wage) {
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

  const previousEmployeeIdRef = React.useRef<string | undefined>(initialData?.employeeId)

  useEffect(() => {
    if (!formData.employeeId) {
      previousEmployeeIdRef.current = undefined
      return
    }

    if (previousEmployeeIdRef.current === formData.employeeId) {
      return
    }

    const selectedEmployee = employees.find(emp => emp.id === formData.employeeId);
    if (!selectedEmployee) {
      return
    }

    const updates: Partial<ShiftFormData> = {};
    
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

    if (selectedEmployee.employeeGroupId && !formData.employeeGroupId) {
      updates.employeeGroupId = selectedEmployee.employeeGroupId;
    }

    if (selectedEmployee.departmentId && !formData.departmentId) {
      updates.departmentId = selectedEmployee.departmentId;
    }

    previousEmployeeIdRef.current = formData.employeeId
    setFormData(prev => ({ ...prev, ...updates }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.employeeId, formData.employeeGroupId, formData.departmentId, employees, employeeGroups]);

  const [activeTab, setActiveTab] = useState<'basic' | 'break' | 'exchange' | 'requests'>('basic')
  const [shiftExchanges, setShiftExchanges] = useState<ShiftExchange[]>([])
  const [exchangeLoading, setExchangeLoading] = useState(false)
  const [shiftRequests, setShiftRequests] = useState<any[]>([])
  const [requestsLoading, setRequestsLoading] = useState(false)
  const [requestActionLoading, setRequestActionLoading] = useState<string | null>(null)
  const [requestValidationError, setRequestValidationError] = useState<{ requestId: string; type: 'blocked' | 'confirm' | 'error'; violations: string[]; warnings: string[]; message?: string } | null>(null)
  const [employeeRequestLoading, setEmployeeRequestLoading] = useState(false)
  const [employeeHasRequested, setEmployeeHasRequested] = useState(false)
  const [bulkCopyCount, setBulkCopyCount] = useState(1)
  const [employeeRequestId, setEmployeeRequestId] = useState<string | null>(null)

  const isOpenShift = initialData?.id && !formData.employeeId
  const currentEmployeeId = user?.employee?.id

  useEffect(() => {
    if (initialData?.id && isOpenShift) {
      fetchShiftRequests(initialData.id)
    }
  }, [initialData?.id, isOpenShift])

  useEffect(() => {
    if (isEmployee && currentEmployeeId && shiftRequests.length > 0) {
      const myRequest = shiftRequests.find(
        (r: any) => r.employeeId === currentEmployeeId && r.status === 'PENDING'
      )
      setEmployeeHasRequested(!!myRequest)
      setEmployeeRequestId(myRequest?.id || null)
    } else {
      setEmployeeHasRequested(false)
      setEmployeeRequestId(null)
    }
  }, [shiftRequests, currentEmployeeId, isEmployee])

  const handleEmployeeRequestShift = async () => {
    if (!initialData?.id || !currentEmployeeId) return
    setEmployeeRequestLoading(true)
    try {
      const res = await fetch('/api/shift-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shiftId: initialData.id, employeeId: currentEmployeeId })
      })
      if (res.ok) {
        Swal.fire({
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 3000,
          timerProgressBar: true,
          icon: 'success',
          title: 'Shift request submitted!',
        })
        fetchShiftRequests(initialData.id)
      } else {
        const data = await res.json()
        Swal.fire({
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 3000,
          timerProgressBar: true,
          icon: 'error',
          title: data.error || 'Failed to request shift',
        })
      }
    } catch (error) {
      console.error('Error requesting shift:', error)
    } finally {
      setEmployeeRequestLoading(false)
    }
  }

  const handleEmployeeCancelRequest = async () => {
    if (!employeeRequestId || !initialData?.id) return
    setEmployeeRequestLoading(true)
    try {
      const res = await fetch(`/api/shift-requests/${employeeRequestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CANCELLED' })
      })
      if (res.ok) {
        Swal.fire({
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 3000,
          timerProgressBar: true,
          icon: 'success',
          title: 'Request cancelled',
        })
        fetchShiftRequests(initialData.id)
      } else {
        const data = await res.json()
        Swal.fire({
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 3000,
          timerProgressBar: true,
          icon: 'error',
          title: data.error || 'Failed to cancel request',
        })
      }
    } catch (error) {
      console.error('Error cancelling request:', error)
    } finally {
      setEmployeeRequestLoading(false)
    }
  }

  const fetchShiftRequests = async (shiftId: string) => {
    setRequestsLoading(true)
    try {
      const res = await fetch(`/api/shift-requests?shiftId=${shiftId}`)
      if (res.ok) {
        const data = await res.json()
        setShiftRequests(data)
      }
    } catch (error) {
      console.error('Error fetching shift requests:', error)
    } finally {
      setRequestsLoading(false)
    }
  }

  const handleRequestAction = async (requestId: string, action: 'APPROVED' | 'REJECTED', forceApprove?: boolean) => {
    setRequestActionLoading(requestId)
    setRequestValidationError(null)
    try {
      const res = await fetch(`/api/shift-requests/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: action, ...(forceApprove ? { forceApprove: true } : {}) })
      })
      if (res.ok) {
        if (action === 'APPROVED' && initialData?.id) {
          window.location.reload()
        } else if (initialData?.id) {
          fetchShiftRequests(initialData.id)
        }
      } else {
        const data = await res.json()

        if (res.status === 409 && data.requiresConfirmation) {
          setRequestValidationError({
            requestId,
            type: 'confirm',
            violations: data.violations || [],
            warnings: data.warnings || [],
          })
          return
        }

        if (res.status === 422) {
          setRequestValidationError({
            requestId,
            type: 'blocked',
            violations: data.violations || [],
            warnings: data.warnings || [],
          })
          return
        }

        setRequestValidationError({
          requestId,
          type: 'error',
          violations: [],
          warnings: [],
          message: data.error || 'Failed to update request',
        })
      }
    } catch (error) {
      console.error('Error updating shift request:', error)
    } finally {
      setRequestActionLoading(null)
    }
  }

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

  const linkedFunctionGroups = React.useMemo(() => {
    if (!formData.functionId) return []
    const targetFunction = functions.find(func => func.id === formData.functionId)
    if (!targetFunction || !Array.isArray(targetFunction.employeeGroups)) {
      return []
    }
    return targetFunction.employeeGroups
  }, [formData.functionId, functions])

  const singleLinkedFunctionGroup = linkedFunctionGroups.length === 1 ? linkedFunctionGroups[0] : undefined

  const resolvedLinkedGroupId = React.useMemo(() => {
    if (!formData.functionId) return undefined
    if (singleLinkedFunctionGroup) {
      return singleLinkedFunctionGroup.id
    }
    if (linkedFunctionGroups.length > 1 && formData.employeeGroupId) {
      return linkedFunctionGroups.some(group => group.id === formData.employeeGroupId)
        ? formData.employeeGroupId
        : undefined
    }
    return undefined
  }, [formData.functionId, linkedFunctionGroups, formData.employeeGroupId, singleLinkedFunctionGroup])

  const activeLinkedGroup = React.useMemo(() => {
    if (!formData.functionId) return undefined
    if (singleLinkedFunctionGroup) return singleLinkedFunctionGroup
    if (formData.employeeGroupId) {
      return linkedFunctionGroups.find(group => group.id === formData.employeeGroupId)
    }
    return undefined
  }, [formData.functionId, formData.employeeGroupId, linkedFunctionGroups, singleLinkedFunctionGroup])

  const filteredEmployees = React.useMemo(() => {
    const currentEmployee = formData.employeeId 
      ? safeEmployees.find(emp => emp.id === formData.employeeId)
      : null;

    const employeeBelongsToGroup = (emp: EmployeeForForm, groupId: string): boolean => {
      return !!(emp.employeeGroups?.some(eg => eg.employeeGroupId === groupId) || emp.employeeGroupId === groupId);
    }

    const employeeBelongsToDepartment = (emp: EmployeeForForm, deptId: string): boolean => {
      return !!(emp.departments?.some(d => d.departmentId === deptId) || emp.departmentId === deptId);
    }

    let filtered = safeEmployees;

    if (formData.departmentId) {
      filtered = filtered.filter(emp => employeeBelongsToDepartment(emp, formData.departmentId!));
    } else if (formData.employeeGroupId) {
      filtered = filtered.filter(emp => employeeBelongsToGroup(emp, formData.employeeGroupId!));
    }

    if (currentEmployee && !filtered.some(emp => emp.id === currentEmployee.id)) {
      return [currentEmployee, ...filtered];
    }

    return filtered;
  }, [safeEmployees, formData.departmentId, formData.employeeGroupId, formData.employeeId])

  const employeeSelectDisabled = isEmployee
  const employeeGroupSelectDisabled = isEmployee || (formData.functionId ? linkedFunctionGroups.length === 1 && !!formData.employeeGroupId : false)

  const filteredDepartments = React.useMemo(() => {
    if (!formData.employeeId) return departments
    const selectedEmployee = safeEmployees.find(emp => emp.id === formData.employeeId)
    if (!selectedEmployee) return departments
    const employeeDepts = selectedEmployee.departments || []
    if (employeeDepts.length > 0) {
      const deptIds = employeeDepts.map(d => d.departmentId)
      return departments.filter(d => deptIds.includes(d.id))
    }
    if (selectedEmployee.departmentId) {
      return departments.filter(d => d.id === selectedEmployee.departmentId)
    }
    return departments
  }, [departments, formData.employeeId, safeEmployees])

  const availableEmployeeGroupOptions = formData.functionId
    ? linkedFunctionGroups.length > 0
      ? linkedFunctionGroups
      : employeeGroups
    : employeeGroups

  // Helper function to check if employee belongs to a group (used in useEffect)
  const employeeBelongsToGroup = React.useCallback((emp: EmployeeForForm, groupId: string): boolean => {
    // Check employeeGroups array first (many-to-many)
    if (emp.employeeGroups && emp.employeeGroups.length > 0) {
      return emp.employeeGroups.some(eg => eg.employeeGroupId === groupId)
    }
    // Fallback to legacy employeeGroupId field
    return emp.employeeGroupId === groupId
  }, [])

  // Helper function to get the first group an employee belongs to from a list of valid groups
  const getEmployeeGroupFromValid = React.useCallback((emp: EmployeeForForm, validGroupIds: string[]): string | undefined => {
    // Check employeeGroups array first (many-to-many)
    if (emp.employeeGroups && emp.employeeGroups.length > 0) {
      const matchingGroup = emp.employeeGroups.find(eg => validGroupIds.includes(eg.employeeGroupId))
      return matchingGroup?.employeeGroupId
    }
    // Fallback to legacy employeeGroupId field
    if (emp.employeeGroupId && validGroupIds.includes(emp.employeeGroupId)) {
      return emp.employeeGroupId
    }
    return undefined
  }, [])

  useEffect(() => {
    if (!formData.functionId) {
      return
    }

    // When a department is selected, employee filtering is department-based — skip group restrictions
    if (formData.departmentId) {
      return
    }

    if (linkedFunctionGroups.length === 0 && loadingFunctions) {
      return
    }

    if (linkedFunctionGroups.length === 0 && initialData?.employeeId && functions.length === 0) {
      return
    }

    if (linkedFunctionGroups.length === 0) {
      return
    }

    if (linkedFunctionGroups.length === 1) {
      const onlyGroup = linkedFunctionGroups[0]
      const employeeValid = formData.employeeId
        ? safeEmployees.some(emp => emp.id === formData.employeeId && employeeBelongsToGroup(emp, onlyGroup.id))
        : true

      if (formData.employeeGroupId === onlyGroup.id && employeeValid) {
        return
      }

      setFormData(prev => ({
        ...prev,
        employeeGroupId: onlyGroup.id,
        employeeId: employeeValid ? prev.employeeId : undefined,
      }))
      return
    }

    const validGroupIds = linkedFunctionGroups.map(group => group.id)
    const hasValidGroupSelection = formData.employeeGroupId && validGroupIds.includes(formData.employeeGroupId)

    if (!hasValidGroupSelection) {
      if (initialData?.employeeId && formData.employeeId === initialData.employeeId) {
        const employee = safeEmployees.find(emp => emp.id === formData.employeeId)
        if (employee) {
          const employeeGroupId = getEmployeeGroupFromValid(employee, validGroupIds)
          if (employeeGroupId) {
            setFormData(prev => ({
              ...prev,
              employeeGroupId: employeeGroupId,
            }))
            return
          }
        }
      }
      
      if (formData.employeeGroupId || formData.employeeId) {
        setFormData(prev => ({
          ...prev,
          employeeGroupId: undefined,
          employeeId: undefined,
        }))
      }
      return
    }

    if (formData.employeeId) {
      const employeeValid = safeEmployees.some(
        emp => emp.id === formData.employeeId && employeeBelongsToGroup(emp, formData.employeeGroupId!)
      )

      if (!employeeValid) {
        setFormData(prev => ({
          ...prev,
          employeeId: undefined,
        }))
      }
    }
  }, [formData.functionId, formData.employeeGroupId, formData.employeeId, linkedFunctionGroups, safeEmployees, loadingFunctions, initialData?.employeeId, functions.length, employeeBelongsToGroup, getEmployeeGroupFromValid])


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

    const matchingType = shiftTypeOptions.find(
      st => st.id === initialData.shiftTypeId
    )

    if (!matchingType) return

    const existingBreakStart = formatTimeFromDateTime(initialData.breakStart)
    const existingBreakEnd = formatTimeFromDateTime(initialData.breakEnd)
    const hasExistingBreakTimes = Boolean(existingBreakStart && existingBreakEnd)

    if (hasExistingBreakTimes) {
      setShowBreakFields(true)
      setFormData(prev => ({
        ...prev,
        autoBreakType: matchingType.autoBreakType ?? 'MANUAL_BREAK',
        autoBreakValue: matchingType.autoBreakValue !== undefined && matchingType.autoBreakValue !== null
          ? Number(matchingType.autoBreakValue)
          : null,
        breakStart: existingBreakStart || undefined,
        breakEnd: existingBreakEnd || undefined,
      }))
      return
    }

    if (matchingType.autoBreakType === 'AUTO_BREAK' && matchingType.autoBreakValue !== undefined && matchingType.autoBreakValue !== null) {
      setShowBreakFields(true)
      recalcAutoBreak(matchingType.autoBreakType, Number(matchingType.autoBreakValue))
      return
    }

    setShowBreakFields(false)
    setFormData(prev => ({
      ...prev,
      autoBreakType: 'MANUAL_BREAK',
      autoBreakValue: null,
      breakStart: '',
      breakEnd: '',
    }))
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

    if (formData.employeeId && !formData.employeeGroupId) {
      Swal.fire({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        icon: 'warning',
        title: t('shifts.form.employee_group_required', 'Employee group is required when assigning an employee')
      })
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

    if (onSubmit) {
      const dataWithBulk = { ...submissionData, _bulkCopyCount: bulkCopyCount } as any
      onSubmit(dataWithBulk as ShiftFormData)
    }
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
    !isDisabled &&
    onDelete &&
    initialData?.id &&
    initialData?.approved === false
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {readOnly && !isEmployee && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-sm text-blue-700">
            {t('shifts.form.read_only_notice')}
          </p>
        </div>
      )}
      {isEmployee && (
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <p className="text-sm text-yellow-700">
            {t('shifts.form.employee_notice')}
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
            {t('shifts.form.basic_information')}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('break')}
            className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${activeTab === 'break'
                ? 'border-[#31BCFF] text-[#31BCFF]'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            {t('shifts.form.break_time')}
          </button>
          {initialData?.id && isOpenShift && (
            <button
              type="button"
              onClick={() => setActiveTab('requests')}
              className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${activeTab === 'requests'
                  ? 'border-emerald-500 text-emerald-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              Requests{shiftRequests.filter(r => r.status === 'PENDING').length > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-emerald-500 rounded-full">
                  {shiftRequests.filter(r => r.status === 'PENDING').length}
                </span>
              )}
            </button>
          )}
          {initialData?.id && shiftExchanges.length > 0 && (
            <button
              type="button"
              onClick={() => setActiveTab('exchange')}
              className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${activeTab === 'exchange'
                  ? 'border-[#31BCFF] text-[#31BCFF]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              {t('shifts.form.exchange_history')}
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
                {t('shifts.form.date')} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={displayDate}
                onChange={handleDateChange}
                disabled={isDisabled}
                placeholder="DD/MM/YYYY"
                className={`block w-full rounded-md border border-gray-300 px-3 py-2.5 text-sm shadow-sm focus:border-[#31BCFF] focus:ring-[#31BCFF] ${isDisabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                required
              />
              <p className="mt-1 text-xs text-gray-500">{t('shifts.form.format_date')}</p>
            </div>
          )}

          {/* Shift Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('shifts.form.shift_type')} <span className="text-red-500">*</span>
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
              disabled={isDisabled || loadingShiftTypes}
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
              <p className="mt-1 text-xs text-gray-500">{t('shifts.form.loading_shift_types')}</p>
            )}
          </div>

          {/* Start Time */}
          {showStartTime && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('shifts.form.start_time')} <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                value={formData.startTime || ''}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                disabled={isDisabled}
                className={`block w-full rounded-md border border-gray-300 px-3 py-2.5 text-sm shadow-sm focus:border-[#31BCFF] focus:ring-[#31BCFF] ${isDisabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                required
              />
            </div>
          )}

          {/* End Time */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('shifts.form.end_time')} <span className="text-red-500">*</span>
            </label>
            <input
              type="time"
              value={formData.endTime || ''}
              onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
              disabled={isDisabled}
              className={`block w-full rounded-md border border-gray-300 px-3 py-2.5 text-sm shadow-sm focus:border-[#31BCFF] focus:ring-[#31BCFF] ${isDisabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
              required
            />
          </div>

          {/* Department */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('shifts.form.department')} {formData.employeeId && <span className="text-red-500">*</span>}
            </label>
            <select
              value={formData.departmentId || ''}
              onChange={(e) => setFormData({ ...formData, departmentId: e.target.value || undefined, categoryId: undefined, functionId: undefined })}
              disabled={isDisabled || loadingDepartments}
              className={`block w-full rounded-md border border-gray-300 px-3 py-2.5 text-sm shadow-sm focus:border-[#31BCFF] focus:ring-[#31BCFF] ${isDisabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
              required={!!formData.employeeId}
            >
              <option value="">{t('shifts.form.select_department')}</option>
              {filteredDepartments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('shifts.form.category')} {formData.employeeId && formData.departmentId && <span className="text-red-500">*</span>}
            </label>
            <select
              value={formData.categoryId || ''}
              onChange={(e) => setFormData({ ...formData, categoryId: e.target.value || undefined, functionId: undefined })}
              disabled={isDisabled || !formData.departmentId || loadingCategories}
              className={`block w-full rounded-md border border-gray-300 px-3 py-2.5 text-sm shadow-sm focus:border-[#31BCFF] focus:ring-[#31BCFF] ${isEmployee || !formData.departmentId ? 'bg-gray-100 cursor-not-allowed' : ''}`}
              required={!!formData.employeeId && !!formData.departmentId}
            >
              <option value="">
                {!formData.departmentId ? t('shifts.form.select_department_first') : loadingCategories ? t('shifts.form.loading') : t('shifts.form.select_category')}
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
              {t('shifts.form.function')} {formData.employeeId && formData.categoryId && <span className="text-red-500">*</span>}
            </label>
            <select
              value={formData.functionId || ''}
              onChange={(e) => setFormData({ ...formData, functionId: e.target.value || undefined })}
              disabled={isDisabled || !formData.categoryId || loadingFunctions}
              className={`block w-full rounded-md border border-gray-300 px-3 py-2.5 text-sm shadow-sm focus:border-[#31BCFF] focus:ring-[#31BCFF] ${isEmployee || !formData.categoryId ? 'bg-gray-100 cursor-not-allowed' : ''}`}
              required={!!formData.employeeId && !!formData.categoryId}
            >
              <option value="">
                {!formData.categoryId ? t('shifts.form.select_category_first') : loadingFunctions ? t('shifts.form.loading') : t('shifts.form.select_function')}
              </option>
              {functions.map((func) => (
                <option key={func.id} value={func.id}>
                  {func.name}
                </option>
              ))}
            </select>
            {formData.functionId && linkedFunctionGroups.length > 0 && (
              <p className="mt-1 text-xs text-gray-500">
                Linked employee group{linkedFunctionGroups.length > 1 ? 's' : ''}: {linkedFunctionGroups.map(group => group.name).join(', ')}.
                {linkedFunctionGroups.length === 1
                  ? ' Employee options are limited to this group.'
                  : ' Select one of these groups below to choose eligible employees.'}
              </p>
            )}
          </div>

          {/* Employee */}
          {showEmployee && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('shifts.form.employee')}
              </label>
              <select
                value={formData.employeeId || ''}
                onChange={(e) => setFormData({ ...formData, employeeId: e.target.value || undefined })}
                disabled={employeeSelectDisabled}
                className={`block w-full rounded-md border border-gray-300 px-3 py-2.5 text-sm shadow-sm focus:border-[#31BCFF] focus:ring-[#31BCFF] ${employeeSelectDisabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
              >
                <option value="">
                  {formData.employeeId 
                    ? 'Select an employee'
                    : formData.departmentId
                      ? filteredEmployees.length > 0
                        ? 'Select employee or leave empty for Open Shift'
                        : 'No employees in this department - will be Open Shift'
                      : 'Select an employee (optional - Open Shift if empty)'}
                </option>
                {filteredEmployees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.firstName} {employee.lastName} {employee.employeeNo && `(${employee.employeeNo})`}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">
                {formData.employeeId
                  ? 'Currently assigned employee is shown.'
                  : formData.departmentId
                    ? filteredEmployees.length > 0
                      ? 'Showing employees in the selected department. Leave empty to create an Open Shift.'
                      : 'No employees in this department. Saving will create an Open Shift.'
                    : formData.employeeGroupId
                      ? 'Only employees in the selected group shown. Leave empty for Open Shift.'
                      : 'Leave empty to create an Open Shift.'}
              </p>
            </div>
          )}

          {/* Employee Group */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('shifts.form.employee_group')} {formData.employeeId && <span className="text-red-500">*</span>}
            </label>
            <select
              value={formData.employeeGroupId || ''}
              onChange={(e) => setFormData({ ...formData, employeeGroupId: e.target.value || undefined })}
              disabled={employeeGroupSelectDisabled}
              required={!!formData.employeeId}
              className={`block w-full rounded-md border border-gray-300 px-3 py-2.5 text-sm shadow-sm focus:border-[#31BCFF] focus:ring-[#31BCFF] ${employeeGroupSelectDisabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
            >
              <option value="">
                {formData.functionId
                  ? linkedFunctionGroups.length === 0
                    ? 'Select a group'
                    : linkedFunctionGroups.length === 1
                      ? `${linkedFunctionGroups[0].name} (linked)`
                      : 'Select from linked groups'
                  : 'Select a group'}
              </option>
              {availableEmployeeGroupOptions.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
            {formData.functionId && linkedFunctionGroups.length === 1 && (
              <p className="mt-1 text-xs text-gray-500">
                Automatically set to {linkedFunctionGroups[0].name} because of the selected function.
              </p>
            )}
            {formData.functionId && linkedFunctionGroups.length > 1 && (
              <p className="mt-1 text-xs text-gray-500">
                Select one of the linked employee groups to control which employees are available.
              </p>
            )}
          </div>

          {/* Wage */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('shifts.form.wage')} <span className="text-red-500">*</span>
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
              disabled={isDisabled}
              className={`block w-full rounded-md border border-gray-300 px-3 py-2.5 text-sm shadow-sm focus:border-[#31BCFF] focus:ring-[#31BCFF] ${isDisabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
              required
            />
          </div>

          {/* Notes */}
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('shifts.form.notes')}</label>
            <textarea
              value={formData.note || ''}
              onChange={(e) => setFormData({ ...formData, note: e.target.value || undefined })}
              rows={2}
              disabled={isDisabled}
              className={`block w-full rounded-md border border-gray-300 px-3 py-2.5 text-sm text-gray-900 shadow-sm focus:border-[#31BCFF] focus:ring-[#31BCFF] ${isDisabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
            />
          </div>

          {/* Publish & Approved */}
          <div className="sm:col-span-2 flex items-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={() => !isDisabled && setFormData({ ...formData, isPublished: !formData.isPublished })}
              disabled={isDisabled}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors ${
                formData.isPublished
                  ? 'bg-blue-500 text-white border-blue-500 hover:bg-blue-600'
                  : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
              } ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <Send className="w-3.5 h-3.5" />
              {formData.isPublished ? 'Published' : 'Publish'}
            </button>
            <label className="flex items-center space-x-2 cursor-pointer ml-auto">
              <input
                type="checkbox"
                checked={formData.approved}
                onChange={(e) => setFormData({ ...formData, approved: e.target.checked })}
                disabled={isDisabled}
                className={`rounded border-gray-300 text-[#31BCFF] focus:ring-[#31BCFF] h-4 w-4 ${isDisabled ? 'cursor-not-allowed' : ''}`}
              />
              <span className="text-sm font-medium text-gray-700">{t('shifts.form.approved')}</span>
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
              <h3 className="text-sm font-medium text-gray-900">{t('shifts.form.enable_break_time')}</h3>
              <p className="text-xs sm:text-sm text-gray-500 mt-0.5">{t('shifts.form.add_break_periods')}</p>
            </div>
            <label className="flex items-center flex-shrink-0">
              <input
                type="checkbox"
                checked={showBreakFields}
                onChange={toggleBreakFields}
                disabled={isDisabled}
                className={`rounded border-gray-300 text-[#31BCFF] focus:ring-[#31BCFF] h-4 w-4 ${isDisabled ? 'cursor-not-allowed' : ''}`}
              />
            </label>
          </div>

          {/* Break Fields */}
          {showBreakFields && (
            <div className="grid grid-cols-1 gap-4 sm:gap-6 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('shifts.form.break_start_time')}
                </label>
                <input
                  type="time"
                  value={formData.breakStart || ''}
                  onChange={(e) => setFormData({ ...formData, breakStart: e.target.value || undefined })}
                  disabled={isDisabled}
                  className={`block w-full rounded-md border border-gray-300 px-3 py-2.5 text-sm shadow-sm focus:border-[#31BCFF] focus:ring-[#31BCFF] ${isDisabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                />
                <p className="mt-1 text-xs text-gray-500">{t('shifts.form.break_start_hint')}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('shifts.form.break_end_time')}
                </label>
                <input
                  type="time"
                  value={formData.breakEnd || ''}
                  onChange={(e) => setFormData({ ...formData, breakEnd: e.target.value || undefined })}
                  disabled={isDisabled}
                  className={`block w-full rounded-md border border-gray-300 px-3 py-2.5 text-sm shadow-sm focus:border-[#31BCFF] focus:ring-[#31BCFF] ${isDisabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                />
                <p className="mt-1 text-xs text-gray-500">{t('shifts.form.break_end_hint')}</p>
              </div>

              {/* Paid Break */}
              <div className="sm:col-span-2">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.breakPaid || false}
                    onChange={(e) => setFormData({ ...formData, breakPaid: e.target.checked })}
                    disabled={isDisabled}
                    className={`rounded border-gray-300 text-[#31BCFF] focus:ring-[#31BCFF] h-4 w-4 ${isDisabled ? 'cursor-not-allowed' : ''}`}
                  />
                  <span className="text-sm font-medium text-gray-700">{t('shifts.form.paid_break')}</span>
                </label>
                <p className="mt-1 text-xs text-gray-500">{t('shifts.form.paid_break_hint')}</p>
              </div>

              {/* Break Duration Display */}
              {formData.breakStart && formData.breakEnd && (
                <div className="sm:col-span-2">
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <p className="text-xs sm:text-sm text-blue-700">
                      <strong>{t('shifts.form.break_duration')}</strong> {calculateBreakDuration(formData.breakStart, formData.breakEnd)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Break Time Guidelines */}
          <div className="p-3 sm:p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <h4 className="text-xs sm:text-sm font-medium text-amber-800 mb-2">{t('shifts.form.break_guidelines')}</h4>
            <ul className="text-xs sm:text-sm text-amber-700 space-y-1">
              <li>{t('shifts.form.guideline_unpaid')}</li>
              <li>{t('shifts.form.guideline_paid')}</li>
              <li>{t('shifts.form.guideline_start')}</li>
              <li>{t('shifts.form.guideline_end')}</li>
              <li>{t('shifts.form.guideline_lunch')}</li>
            </ul>
          </div>
        </div>
      )}

      {/* Shift Requests Tab */}
      {activeTab === 'requests' && initialData?.id && isOpenShift && (
        <div className="space-y-4">
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
            <h3 className="text-sm font-medium text-emerald-900 mb-1">Open Shift Requests</h3>
            <p className="text-xs text-emerald-700">
              Employees who have requested this open shift. Approve one to assign the shift.
            </p>
          </div>

          {requestsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
            </div>
          ) : shiftRequests.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-sm text-gray-500">No requests for this shift yet</p>
              <p className="text-xs text-gray-400 mt-1">Employees can request this shift from their dashboard</p>
            </div>
          ) : (
            <div className="space-y-3">
              {shiftRequests.map((request: any) => (
                <div
                  key={request.id}
                  className={`p-4 bg-white border rounded-lg shadow-sm ${
                    request.status === 'PENDING' ? 'border-amber-200' :
                    request.status === 'APPROVED' ? 'border-green-200' :
                    'border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                        request.status === 'PENDING' ? 'bg-amber-500' :
                        request.status === 'APPROVED' ? 'bg-green-500' :
                        'bg-gray-400'
                      }`}>
                        {request.employee?.firstName?.charAt(0)}{request.employee?.lastName?.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {request.employee?.firstName} {request.employee?.lastName}
                        </p>
                        {request.employee?.employeeNo && (
                          <p className="text-xs text-gray-500">#{request.employee.employeeNo}</p>
                        )}
                        <p className="text-xs text-gray-400">
                          Requested {new Date(request.createdAt).toLocaleDateString('en-GB', {
                            day: '2-digit', month: 'short', year: 'numeric',
                            hour: '2-digit', minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      request.status === 'PENDING' ? 'bg-amber-100 text-amber-800' :
                      request.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                      request.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {request.status}
                    </span>
                  </div>

                  {request.note && (
                    <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-600">
                      <strong>Note:</strong> {request.note}
                    </div>
                  )}

                  {request.status === 'PENDING' && !isEmployee && (
                    <div className="mt-3 space-y-2">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleRequestAction(request.id, 'APPROVED')}
                          disabled={requestActionLoading === request.id}
                          className="flex-1 px-3 py-1.5 text-xs font-medium text-white bg-green-600 rounded hover:bg-green-700 disabled:opacity-50"
                        >
                          {requestActionLoading === request.id ? 'Processing...' : 'Approve & Assign'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRequestAction(request.id, 'REJECTED')}
                          disabled={requestActionLoading === request.id}
                          className="flex-1 px-3 py-1.5 text-xs font-medium text-white bg-red-600 rounded hover:bg-red-700 disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </div>

                      {requestValidationError && requestValidationError.requestId === request.id && (
                        <div className={`p-3 rounded-lg border text-xs ${
                          requestValidationError.type === 'blocked' ? 'bg-red-50 border-red-300' :
                          requestValidationError.type === 'confirm' ? 'bg-amber-50 border-amber-300' :
                          'bg-red-50 border-red-300'
                        }`}>
                          <p className={`font-semibold mb-1 ${
                            requestValidationError.type === 'blocked' ? 'text-red-800' :
                            requestValidationError.type === 'confirm' ? 'text-amber-800' :
                            'text-red-800'
                          }`}>
                            {requestValidationError.type === 'blocked' ? 'Cannot Approve' :
                             requestValidationError.type === 'confirm' ? 'Rule Violations Detected' :
                             'Error'}
                          </p>
                          {requestValidationError.message && (
                            <p className="text-red-700">{requestValidationError.message}</p>
                          )}
                          {requestValidationError.violations.length > 0 && (
                            <ul className="list-disc pl-4 mt-1 space-y-0.5">
                              {requestValidationError.violations.map((v, i) => (
                                <li key={i} className="text-red-600">{v}</li>
                              ))}
                            </ul>
                          )}
                          {requestValidationError.warnings.length > 0 && (
                            <ul className="list-disc pl-4 mt-1 space-y-0.5">
                              {requestValidationError.warnings.map((w, i) => (
                                <li key={i} className="text-amber-600">{w}</li>
                              ))}
                            </ul>
                          )}
                          <div className="mt-2 flex gap-2">
                            {requestValidationError.type === 'confirm' && (
                              <button
                                type="button"
                                onClick={() => handleRequestAction(request.id, 'APPROVED', true)}
                                disabled={requestActionLoading === request.id}
                                className="px-3 py-1 text-xs font-medium text-white bg-amber-600 rounded hover:bg-amber-700 disabled:opacity-50"
                              >
                                {requestActionLoading === request.id ? 'Processing...' : 'Approve Anyway'}
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setRequestValidationError(null)}
                              className="px-3 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
                            >
                              Dismiss
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {request.status === 'APPROVED' && (
                    <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded">
                      <p className="text-xs text-green-700">
                        Approved - shift assigned to {request.employee?.firstName} {request.employee?.lastName}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
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

      {/* Employee Open Shift Request */}
      {isEmployee && isOpenShift && currentEmployeeId && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-emerald-900">This is an Open Shift</h3>
              <p className="text-xs text-emerald-700 mt-0.5">
                {employeeHasRequested
                  ? 'You have already requested this shift. Waiting for manager approval.'
                  : 'You can request this shift and a manager will review your request.'}
              </p>
            </div>
            {employeeHasRequested ? (
              <button
                type="button"
                onClick={handleEmployeeCancelRequest}
                disabled={employeeRequestLoading}
                className="px-4 py-2 text-sm font-medium text-red-700 bg-red-100 border border-red-300 rounded-md hover:bg-red-200 disabled:opacity-50"
              >
                {employeeRequestLoading ? 'Cancelling...' : 'Cancel Request'}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleEmployeeRequestShift}
                disabled={employeeRequestLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 border border-transparent rounded-md hover:bg-emerald-700 disabled:opacity-50"
              >
                {employeeRequestLoading ? 'Requesting...' : 'Request this Shift'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Bulk Duplication - only for new shifts */}
      {!initialData?.id && !isEmployee && !readOnly && (
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
              {t('shifts.form.number_of_copies') || 'Number of copies'}
            </label>
            <input
              type="number"
              min={1}
              max={50}
              value={bulkCopyCount}
              onChange={(e) => setBulkCopyCount(Math.min(50, Math.max(1, parseInt(e.target.value) || 1)))}
              className="w-20 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-[#31BCFF] focus:border-transparent"
            />
            <span className="text-xs text-gray-500">
              {bulkCopyCount === 1
                ? (t('shifts.form.single_shift') || 'Creates 1 shift')
                : (t('shifts.form.multiple_shifts', { count: bulkCopyCount }) || `Creates ${bulkCopyCount} identical shifts`)}
            </span>
          </div>
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
                {t('shifts.form.delete_shift')}
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t('shifts.form.delete_confirm_title')}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t('shifts.form.delete_confirm_message')}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={loading}>{t('shifts.form.cancel')}</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-red-600 hover:bg-red-700 focus:ring-red-500"
                  onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                    e.preventDefault()
                    handleDeleteConfirm()
                  }}
                  disabled={loading}
                >
                  {t('shifts.form.delete_shift')}
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
            {readOnly ? t('shifts.form.close') : t('shifts.form.cancel')}
          </button>
          {!readOnly && (
            <button
              type="submit"
              disabled={loading || isEmployee}
              className={`w-full sm:w-auto px-4 py-2 text-sm font-medium text-white border border-transparent rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#31BCFF] disabled:opacity-50 ${
                isEmployee ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#31BCFF] hover:bg-[#31BCFF]/90'
              }`}
              title={isEmployee ? "Employees cannot create or edit shifts" : ""}
            >
              {loading ? t('shifts.form.saving') : isEmployee ? t('shifts.form.not_authorized') : t('shifts.form.save')}
            </button>
          )}
        </div>
      </div>
    </form>
  )
}
