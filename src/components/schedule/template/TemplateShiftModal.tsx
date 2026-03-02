import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { XMarkIcon } from '@heroicons/react/24/outline'

interface Employee {
  id: string
  firstName: string
  lastName: string
  employeeNo?: string | null
  employeeGroupId?: string | null
  departmentId?: string | null
  departments?: Array<{
    departmentId: string
    isPrimary: boolean
    department: {
      id: string
      name: string
    }
  }>
  employeeGroups?: Array<{
    employeeGroupId: string
    isPrimary: boolean
    employeeGroup: {
      id: string
      name: string
    }
  }>
}

interface EmployeeGroup {
  id: string
  name: string
}

interface FunctionItem {
  id: string
  name: string
  color?: string | null
  categoryId?: string
  employeeGroups?: Array<{ id: string; name: string }>
}

interface Department {
  id: string
  name: string
}

interface Category {
  id: string
  name: string
  color?: string | null
  departmentId?: string | null
  departments?: Array<{
    id: string
    department: {
      id: string
      name: string
    }
  }>
}

interface TemplateShiftModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: any) => void
  initialData: any
  employees: Employee[]
  employeeGroups: EmployeeGroup[]
  functions: FunctionItem[]
}

export default function TemplateShiftModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  employees,
  employeeGroups,
  functions
}: TemplateShiftModalProps) {
  const { t } = useTranslation('schedule')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [employeeId, setEmployeeId] = useState('')
  const [employeeGroupId, setEmployeeGroupId] = useState('')
  const [functionId, setFunctionId] = useState('')
  const [note, setNote] = useState('')
  const [breakMinutes, setBreakMinutes] = useState<number | ''>('')
  const [breakPaid, setBreakPaid] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Store the original pre-selected employee ID to prevent it from being cleared
  const preSelectedEmployeeIdRef = useRef<string | null>(null)
  
  // Cascading dropdowns state
  const [departmentId, setDepartmentId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [departments, setDepartments] = useState<Department[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [filteredFunctions, setFilteredFunctions] = useState<FunctionItem[]>([])
  const [loadingDepartments, setLoadingDepartments] = useState(false)
  const [loadingCategories, setLoadingCategories] = useState(false)

  // Fetch departments
  const fetchDepartments = useCallback(async () => {
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
  }, [])

  // Fetch categories based on department
  const fetchCategories = useCallback(async (deptId: string) => {
    setLoadingCategories(true)
    try {
      const response = await fetch('/api/categories')
      if (response.ok) {
        const data = await response.json()
        const filtered = data.filter((cat: Category) => {
          if (!cat.departments || cat.departments.length === 0) {
            return true
          }
          return cat.departments.some((cd: any) => cd.department.id === deptId)
        })
        setCategories(filtered)
      }
    } catch (error) {
      console.error('Error fetching categories:', error)
    } finally {
      setLoadingCategories(false)
    }
  }, [])

  // Filter functions by category
  useEffect(() => {
    if (categoryId) {
      const filtered = functions.filter(f => f.categoryId === categoryId)
      setFilteredFunctions(filtered)
    } else {
      setFilteredFunctions([])
    }
  }, [categoryId, functions])

  // Load departments on mount
  useEffect(() => {
    if (isOpen) {
      fetchDepartments()
    }
  }, [isOpen, fetchDepartments])

  // Check if function is pre-selected (need this before the effects)
  const isFunctionPreSelectedCheck = Boolean(initialData?.functionId && !initialData?.employeeId && !initialData?.employeeGroupId)

  // Load categories when department changes
  useEffect(() => {
    if (departmentId) {
      fetchCategories(departmentId)
    } else {
      setCategories([])
      // Don't clear category/function if function is pre-selected
      if (!isFunctionPreSelectedCheck) {
        setCategoryId('')
        setFunctionId('')
      }
    }
  }, [departmentId, fetchCategories, isFunctionPreSelectedCheck])

  // Reset function when category changes (but not if function is pre-selected)
  useEffect(() => {
    if (!categoryId && !isFunctionPreSelectedCheck) {
      setFunctionId('')
    }
  }, [categoryId, isFunctionPreSelectedCheck])

  // Track if this is initial load to prevent resetting auto-populated values
  const [isInitialLoad, setIsInitialLoad] = useState(true)

  useEffect(() => {
    if (initialData) {
      // Use defaults matching ShiftForm: startTime 09:00, endTime 17:00
      setStartTime(initialData.startTime || '09:00')
      setEndTime(initialData.endTime || '17:00')
      setEmployeeId(initialData.employeeId || '')
      setEmployeeGroupId(initialData.employeeGroupId || '')
      setFunctionId(initialData.functionId || '')
      setNote(initialData.note || '')
      setBreakMinutes(initialData.breakMinutes || '')
      setBreakPaid(initialData.breakPaid || false)
      setDepartmentId(initialData.departmentId || '')
      setCategoryId(initialData.categoryId || '')
      setIsInitialLoad(true)
      // Store the pre-selected employee ID in ref so it persists
      preSelectedEmployeeIdRef.current = initialData.employeeId || null
    } else {
      // Default values matching ShiftForm
      setStartTime('09:00')
      setEndTime('17:00')
      setEmployeeId('')
      setEmployeeGroupId('')
      setFunctionId('')
      setNote('')
      setBreakMinutes('')
      setBreakPaid(false)
      setDepartmentId('')
      setCategoryId('')
      setIsInitialLoad(true)
      preSelectedEmployeeIdRef.current = null
    }
  }, [initialData])

  // Auto-populate department and employee group when employee is pre-selected
  useEffect(() => {
    if (!isInitialLoad) return
    if (!initialData?.employeeId) return
    
    const selectedEmployee = employees.find(emp => emp.id === initialData.employeeId)
    if (selectedEmployee) {
      // Only auto-set department if employee has exactly one department
      const employeeDepartments = selectedEmployee.departments || []
      if (employeeDepartments.length === 1 && !initialData.departmentId) {
        setDepartmentId(employeeDepartments[0].departmentId)
      }
      // Only auto-set employee group if employee has exactly one group
      const employeeGroupsList = selectedEmployee.employeeGroups || []
      if (employeeGroupsList.length === 1 && !initialData.employeeGroupId) {
        setEmployeeGroupId(employeeGroupsList[0].employeeGroupId)
      }
    }
    setIsInitialLoad(false)
  }, [initialData, employees, isInitialLoad])

  // Auto-populate department when employee group is pre-selected (find first employee's department)
  useEffect(() => {
    if (!isInitialLoad) return
    if (!initialData?.employeeGroupId || initialData?.employeeId || initialData?.departmentId) return
    
    // Find an employee in this group to get their department
    const groupEmployee = employees.find(emp => {
      // Check employeeGroups array first
      if (emp.employeeGroups && emp.employeeGroups.length > 0) {
        return emp.employeeGroups.some(eg => eg.employeeGroupId === initialData.employeeGroupId)
      }
      // Fallback to legacy employeeGroupId
      return emp.employeeGroupId === initialData.employeeGroupId
    })
    if (groupEmployee?.departmentId) {
      setDepartmentId(groupEmployee.departmentId)
    }
    setIsInitialLoad(false)
  }, [initialData, employees, isInitialLoad])

  // Auto-populate category and department when function is pre-selected
  useEffect(() => {
    if (!isInitialLoad) return
    if (!initialData?.functionId) return
    
    const selectedFunction = functions.find(f => f.id === initialData.functionId)
    if (selectedFunction?.categoryId && !initialData?.categoryId) {
      setCategoryId(selectedFunction.categoryId)
      
      // Also fetch the category to get its department
      const fetchCategoryDepartment = async () => {
        try {
          const response = await fetch('/api/categories')
          if (response.ok) {
            const allCategories = await response.json()
            const category = allCategories.find((c: Category) => c.id === selectedFunction.categoryId)
            if (category) {
              // Check if category has departments array (many-to-many) or single departmentId
              if (category.departments && category.departments.length > 0) {
                // Use the first department
                const firstDept = category.departments[0]
                if (firstDept.department?.id && !initialData?.departmentId) {
                  setDepartmentId(firstDept.department.id)
                }
              } else if (category.departmentId && !initialData?.departmentId) {
                setDepartmentId(category.departmentId)
              }
              // Update categories state so they're available
              setCategories(allCategories)
            }
          }
        } catch (error) {
          console.error('Error fetching category for department:', error)
        }
      }
      fetchCategoryDepartment()
    }
    setIsInitialLoad(false)
  }, [initialData, functions, isInitialLoad])

  // Get linked employee groups from selected function
  const linkedFunctionGroups = useMemo(() => {
    if (!functionId) return []
    const targetFunction = filteredFunctions.find(func => func.id === functionId) || functions.find(func => func.id === functionId)
    if (!targetFunction || !Array.isArray(targetFunction.employeeGroups)) {
      return []
    }
    return targetFunction.employeeGroups
  }, [functionId, filteredFunctions, functions])

  // Check if employee is pre-selected from view (locked mode) - use ref to ensure stability
  const isEmployeePreSelected = Boolean(preSelectedEmployeeIdRef.current)
  const isEmployeeGroupPreSelected = Boolean(initialData?.employeeGroupId && !preSelectedEmployeeIdRef.current)
  const isFunctionPreSelected = Boolean(initialData?.functionId && !preSelectedEmployeeIdRef.current && !initialData?.employeeGroupId)

  // Get the pre-selected employee's data for filtering - use ref for stable ID
  const preSelectedEmployee = useMemo(() => {
    if (!preSelectedEmployeeIdRef.current) return null
    return employees.find(emp => emp.id === preSelectedEmployeeIdRef.current)
  }, [preSelectedEmployeeIdRef.current, employees])

  // Get the pre-selected function's data for filtering
  const preSelectedFunction = useMemo(() => {
    if (!initialData?.functionId) return null
    return functions.find(f => f.id === initialData.functionId)
  }, [initialData?.functionId, functions])

  // Get the pre-selected employee group's data for filtering
  const preSelectedEmployeeGroup = useMemo(() => {
    if (!initialData?.employeeGroupId) return null
    return employeeGroups.find(g => g.id === initialData.employeeGroupId)
  }, [initialData?.employeeGroupId, employeeGroups])

  // Get departments that have employees in the pre-selected employee group
  const employeeGroupDepartments = useMemo(() => {
    if (!isEmployeeGroupPreSelected || !initialData?.employeeGroupId) return []
    // Find all employees in this group and get their departments
    const groupEmployees = employees.filter(emp => {
      // Check employeeGroups array first
      if (emp.employeeGroups && emp.employeeGroups.length > 0) {
        return emp.employeeGroups.some(eg => eg.employeeGroupId === initialData.employeeGroupId)
      }
      // Fallback to legacy employeeGroupId
      return emp.employeeGroupId === initialData.employeeGroupId
    })
    
    const deptIds = new Set<string>()
    groupEmployees.forEach(emp => {
      if (emp.departments && emp.departments.length > 0) {
        emp.departments.forEach(d => deptIds.add(d.departmentId))
      } else if (emp.departmentId) {
        deptIds.add(emp.departmentId)
      }
    })
    return Array.from(deptIds)
  }, [isEmployeeGroupPreSelected, initialData?.employeeGroupId, employees])

  // Filter categories based on context - when function is pre-selected, only show its category
  const availableCategories = useMemo(() => {
    if (isFunctionPreSelected && preSelectedFunction?.categoryId) {
      return categories.filter(c => c.id === preSelectedFunction.categoryId)
    }
    return categories
  }, [categories, isFunctionPreSelected, preSelectedFunction])

  // Filter functions based on context - when function is pre-selected, only show that function
  const availableFunctions = useMemo(() => {
    if (isFunctionPreSelected && preSelectedFunction) {
      return [preSelectedFunction]
    }
    return filteredFunctions
  }, [filteredFunctions, isFunctionPreSelected, preSelectedFunction])

  // Filter departments based on context
  const availableDepartments = useMemo(() => {
    // If employee is pre-selected, only show departments they belong to
    if (preSelectedEmployee) {
      const employeeDepartments = preSelectedEmployee.departments || []
      if (employeeDepartments.length > 0) {
        const employeeDeptIds = employeeDepartments.map(d => d.departmentId)
        return departments.filter(d => employeeDeptIds.includes(d.id))
      }
      // Fallback to legacy single departmentId if no departments array
      if (preSelectedEmployee.departmentId) {
        return departments.filter(d => d.id === preSelectedEmployee.departmentId)
      }
    }
    // If employee group is pre-selected, show departments of employees in that group
    if (isEmployeeGroupPreSelected && employeeGroupDepartments.length > 0) {
      return departments.filter(d => employeeGroupDepartments.includes(d.id))
    }
    return departments
  }, [departments, preSelectedEmployee, isEmployeeGroupPreSelected, employeeGroupDepartments])

  // Get the resolved linked group ID
  const resolvedLinkedGroupId = useMemo(() => {
    if (!functionId) return undefined
    if (linkedFunctionGroups.length === 1) {
      return linkedFunctionGroups[0].id
    }
    if (linkedFunctionGroups.length > 1 && employeeGroupId) {
      return linkedFunctionGroups.some(group => group.id === employeeGroupId)
        ? employeeGroupId
        : undefined
    }
    return undefined
  }, [functionId, linkedFunctionGroups, employeeGroupId])

  // Get active linked group
  const activeLinkedGroup = useMemo(() => {
    if (!functionId) return undefined
    if (linkedFunctionGroups.length === 1) return linkedFunctionGroups[0]
    if (employeeGroupId) {
      return linkedFunctionGroups.find(group => group.id === employeeGroupId)
    }
    return undefined
  }, [functionId, employeeGroupId, linkedFunctionGroups])

  // Helper function to check if employee belongs to a group
  const employeeBelongsToGroup = useCallback((emp: Employee, groupId: string): boolean => {
    // Check employeeGroups array first (many-to-many)
    if (emp.employeeGroups && emp.employeeGroups.length > 0) {
      return emp.employeeGroups.some(eg => eg.employeeGroupId === groupId)
    }
    // Fallback to legacy employeeGroupId field
    return emp.employeeGroupId === groupId
  }, [])

  // Filter employees based on function and employee group
  const filteredEmployees = useMemo(() => {
    // If employee is pre-selected, always include them in the list
    if (isEmployeePreSelected && preSelectedEmployee) {
      return [preSelectedEmployee]
    }
    
    if (functionId) {
      if (!resolvedLinkedGroupId) {
        return []
      }
      return employees.filter(emp => employeeBelongsToGroup(emp, resolvedLinkedGroupId))
    }
    if (employeeGroupId) {
      return employees.filter(emp => employeeBelongsToGroup(emp, employeeGroupId))
    }
    return employees
  }, [employees, functionId, employeeGroupId, resolvedLinkedGroupId, isEmployeePreSelected, preSelectedEmployee, employeeBelongsToGroup])

  // Available employee group options based on function and employee context
  const availableEmployeeGroupOptions = useMemo(() => {
    // If employee is pre-selected, only show groups they belong to
    if (preSelectedEmployee) {
      const employeeGroupsList = preSelectedEmployee.employeeGroups || []
      if (employeeGroupsList.length > 0) {
        return employeeGroupsList.map(eg => eg.employeeGroup)
      }
      // Fallback to legacy single employeeGroupId if no employeeGroups array
      if (preSelectedEmployee.employeeGroupId) {
        return employeeGroups.filter(g => g.id === preSelectedEmployee.employeeGroupId)
      }
    }
    // If function is selected, show linked groups
    if (functionId) {
      return linkedFunctionGroups.length > 0 ? linkedFunctionGroups : employeeGroups
    }
    return employeeGroups
  }, [preSelectedEmployee, functionId, linkedFunctionGroups, employeeGroups])

  // Auto-set employee group when function has single linked group
  useEffect(() => {
    if (!functionId) return
    if (linkedFunctionGroups.length === 1) {
      const onlyGroup = linkedFunctionGroups[0]
      if (employeeGroupId !== onlyGroup.id) {
        setEmployeeGroupId(onlyGroup.id)
      }
    }
  }, [functionId, linkedFunctionGroups, employeeGroupId])

  // Clear employee if not in filtered list (but never clear if employee is pre-selected)
  useEffect(() => {
    // Never clear employee if it was pre-selected from the view
    if (isEmployeePreSelected) return
    
    if (employeeId && filteredEmployees.length > 0) {
      const employeeValid = filteredEmployees.some(emp => emp.id === employeeId)
      if (!employeeValid) {
        setEmployeeId('')
      }
    }
  }, [employeeId, filteredEmployees, isEmployeePreSelected])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    if (!employeeGroupId) {
      setIsSubmitting(false)
      return
    }

    // Use the ref value if employee was pre-selected (ensures we send correct ID)
    const finalEmployeeId = preSelectedEmployeeIdRef.current || employeeId || null

    try {
      await onSave({
        startTime,
        endTime: endTime || null,
        employeeId: finalEmployeeId,
        employeeGroupId: employeeGroupId || null,
        functionId: functionId || null,
        departmentId: departmentId || null,
        categoryId: categoryId || null,
        note: note || null,
        breakMinutes: breakMinutes ? Number(breakMinutes) : null,
        breakPaid: breakPaid
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {initialData?.id ? t('templates.edit_shift', 'Edit Shift') : t('templates.add_shift', 'Add Shift')}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Time Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('templates.start_time', 'Start Time')} <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#31BCFF] focus:border-[#31BCFF] outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('templates.end_time', 'End Time')}
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#31BCFF] focus:border-[#31BCFF] outline-none"
              />
            </div>
          </div>

          {/* Department */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('shift_form.department', 'Department')}
            </label>
            <select
              value={departmentId}
              onChange={(e) => {
                setDepartmentId(e.target.value)
                // Don't clear category/function if function is pre-selected
                if (!isFunctionPreSelected) {
                  setCategoryId('')
                  setFunctionId('')
                }
              }}
              disabled={loadingDepartments || (isEmployeePreSelected && availableDepartments.length <= 1)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#31BCFF] focus:border-[#31BCFF] outline-none disabled:bg-gray-100"
            >
              <option value="">{loadingDepartments ? t('common.loading', 'Loading...') : t('shift_form.select_department', 'Select department')}</option>
              {availableDepartments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
            {isEmployeePreSelected && availableDepartments.length === 1 && (
              <p className="mt-1 text-xs text-gray-500">
                Department is set based on the selected employee.
              </p>
            )}
            {isEmployeePreSelected && availableDepartments.length > 1 && (
              <p className="mt-1 text-xs text-blue-500">
                Select from departments this employee belongs to.
              </p>
            )}
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('shift_form.category', 'Category')}
            </label>
            <select
              value={categoryId}
              onChange={(e) => {
                setCategoryId(e.target.value)
                // Don't clear function if function is pre-selected
                if (!isFunctionPreSelected) {
                  setFunctionId('')
                }
              }}
              disabled={!departmentId || loadingCategories || (isFunctionPreSelected && availableCategories.length <= 1)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#31BCFF] focus:border-[#31BCFF] outline-none disabled:bg-gray-100"
            >
              <option value="">
                {!departmentId 
                  ? t('shift_form.select_department_first', 'Select department first') 
                  : loadingCategories 
                    ? t('common.loading', 'Loading...') 
                    : t('shift_form.select_category', 'Select category')}
              </option>
              {availableCategories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
            {isFunctionPreSelected && availableCategories.length === 1 && (
              <p className="mt-1 text-xs text-gray-500">
                Category is set based on the selected function.
              </p>
            )}
          </div>

          {/* Function */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('templates.function', 'Function')}
            </label>
            <select
              value={functionId}
              onChange={(e) => {
                setFunctionId(e.target.value)
                // Reset employee group and employee when function changes
                if (!e.target.value) {
                  setEmployeeGroupId('')
                  setEmployeeId('')
                }
              }}
              disabled={!categoryId || isFunctionPreSelected}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#31BCFF] focus:border-[#31BCFF] outline-none disabled:bg-gray-100"
            >
              <option value="">
                {!categoryId 
                  ? t('shift_form.select_category_first', 'Select category first') 
                  : t('templates.select_function', 'Select function...')}
              </option>
              {availableFunctions.map((func) => (
                <option key={func.id} value={func.id}>
                  {func.name}
                </option>
              ))}
            </select>
            {isFunctionPreSelected && (
              <p className="mt-1 text-xs text-gray-500">
                Function is pre-selected from the view.
              </p>
            )}
            {!isFunctionPreSelected && functionId && linkedFunctionGroups.length > 0 && (
              <p className="mt-1 text-xs text-gray-500">
                Linked employee group{linkedFunctionGroups.length > 1 ? 's' : ''}: {linkedFunctionGroups.map(group => group.name).join(', ')}
              </p>
            )}
          </div>

          {/* Employee Group */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('templates.employee_group', 'Employee Group')} <span className="text-red-500">*</span>
            </label>
            <select
              value={employeeGroupId}
              onChange={(e) => {
                setEmployeeGroupId(e.target.value)
                setEmployeeId('')
              }}
              required
              disabled={isEmployeeGroupPreSelected || (isEmployeePreSelected && availableEmployeeGroupOptions.length === 1 && !!employeeGroupId) || (functionId ? linkedFunctionGroups.length === 1 && !!employeeGroupId : false)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#31BCFF] focus:border-[#31BCFF] outline-none disabled:bg-gray-100"
            >
              <option value="">
                {functionId
                  ? linkedFunctionGroups.length === 0
                    ? 'Select a group'
                    : linkedFunctionGroups.length === 1
                      ? `${linkedFunctionGroups[0].name} (linked)`
                      : 'Select from linked groups'
                  : t('templates.select_group', 'Select group...')}
              </option>
              {availableEmployeeGroupOptions.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
            {isEmployeeGroupPreSelected && (
              <p className="mt-1 text-xs text-gray-500">
                Employee group is pre-selected from the view.
              </p>
            )}
            {isEmployeePreSelected && availableEmployeeGroupOptions.length === 1 && (
              <p className="mt-1 text-xs text-gray-500">
                Employee group is set based on the selected employee.
              </p>
            )}
            {isEmployeePreSelected && availableEmployeeGroupOptions.length > 1 && (
              <p className="mt-1 text-xs text-blue-500">
                Select from groups this employee belongs to.
              </p>
            )}
            {!isEmployeePreSelected && !isEmployeeGroupPreSelected && functionId && linkedFunctionGroups.length === 1 && (
              <p className="mt-1 text-xs text-gray-500">
                Automatically set to {linkedFunctionGroups[0].name} because of the selected function.
              </p>
            )}
          </div>

          {/* Employee */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('shift_form.employee', 'Employee')}
            </label>
            <select
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              disabled={isEmployeePreSelected || (functionId ? !resolvedLinkedGroupId || filteredEmployees.length === 0 : false)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#31BCFF] focus:border-[#31BCFF] outline-none disabled:bg-gray-100"
            >
              {isEmployeePreSelected ? (
                <option value={employeeId}>
                  {preSelectedEmployee?.firstName} {preSelectedEmployee?.lastName}
                </option>
              ) : (
                <option value="">
                  {functionId
                    ? activeLinkedGroup
                      ? filteredEmployees.length > 0
                        ? `Select an employee from ${activeLinkedGroup.name}`
                        : `No eligible employees in ${activeLinkedGroup.name}`
                      : linkedFunctionGroups.length > 1
                        ? 'Select an employee group first'
                        : 'Link this function to an employee group'
                    : t('shift_form.select_employee', 'Select employee (optional)')}
                </option>
              )}
              {!isEmployeePreSelected && filteredEmployees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.firstName} {employee.lastName} {employee.employeeNo && `(${employee.employeeNo})`}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">
              {isEmployeePreSelected
                ? 'Employee is pre-selected from the view.'
                : functionId
                  ? activeLinkedGroup
                    ? filteredEmployees.length > 0
                      ? `Only employees in ${activeLinkedGroup.name} can be assigned.`
                      : `No employees currently belong to ${activeLinkedGroup.name}.`
                    : linkedFunctionGroups.length > 1
                      ? 'Select an employee group to view eligible employees.'
                      : ''
                  : employeeGroupId
                    ? 'Only employees in the selected employee group are shown.'
                    : 'Select an employee to pre-assign this shift.'}
            </p>
          </div>

          {/* Break Settings */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('templates.break_minutes', 'Break (minutes)')}
              </label>
              <input
                type="number"
                min="0"
                value={breakMinutes}
                onChange={(e) => setBreakMinutes(e.target.value ? parseInt(e.target.value) : '')}
                placeholder="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#31BCFF] focus:border-[#31BCFF] outline-none"
              />
            </div>
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={breakPaid}
                  onChange={(e) => setBreakPaid(e.target.checked)}
                  className="rounded border-gray-300 text-[#31BCFF] focus:ring-[#31BCFF] h-4 w-4"
                />
                <span className="text-sm font-medium text-gray-700">
                  {t('templates.break_paid', 'Paid Break')}
                </span>
              </label>
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('templates.note', 'Note')}
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder={t('templates.note_placeholder', 'Add a note...')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#31BCFF] focus:border-[#31BCFF] outline-none resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
            >
              {t('common.cancel', 'Cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !startTime}
              className="flex-1 px-4 py-2.5 bg-[#31BCFF] text-white rounded-lg font-medium hover:bg-[#28a8e6] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? t('common.saving', 'Saving...') : t('common.save', 'Save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
