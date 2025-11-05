'use client'

import React, { useState, useEffect } from 'react'
import { AutoBreakType, ShiftType, ShiftTypeConfig, WageType } from '@prisma/client'
import { useUser } from '@/shared/lib/useUser'
import { ShiftExchange } from '@/shared/types'
import Swal from 'sweetalert2'

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
}

interface EmployeeForForm {
  id: string;
  firstName: string;
  lastName: string;
  employeeNo?: string | null;
  salaryRate?: number | null;
  employeeGroupId?: string | null;
}

interface ShiftFormProps {
  initialData?: ShiftFormData & { id?: string }
  onSubmit: (data: ShiftFormData) => void
  onCancel: () => void
  loading: boolean
  employees: EmployeeForForm[]
  employeeGroups: { id: string; name: string; wage?: number | null }[]
  showEmployee?: boolean
  showStartTime?: boolean
  showDate?: boolean
}

export default function ShiftForm({
  initialData,
  onSubmit,
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
      breakStart: convertDateTimeToTimeString(initialData.breakStart),
      breakEnd: convertDateTimeToTimeString(initialData.breakEnd),
      breakPaid: initialData.breakPaid || false,
      shiftTypeId: initialData.shiftTypeId || undefined,
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

  useEffect(() => {
    if (!initialData) return

    const selectedOption = shiftTypeOptions.find(opt =>
      opt.isCustom
        ? opt.id === initialData.shiftTypeId
        : opt.id === initialData.shiftType
    )

    if (selectedOption?.isCustom && selectedOption.autoBreakType && selectedOption.autoBreakValue) {
      // Calculate the auto break
      const now = new Date()
      const breakStart = new Date(now)
      const breakEnd = new Date(now)

      if (selectedOption.autoBreakType === 'AUTO_BREAK') {
        breakEnd.setMinutes(breakStart.getMinutes() + Number(selectedOption.autoBreakValue))
      }
      setFormData(prev => ({
        ...prev,
        shiftType: 'CUSTOM' as ShiftType,
        shiftTypeId: selectedOption.id,
        breakStart: breakStart.toISOString(),
        breakEnd: breakEnd.toISOString(),
      }))
      setShowBreakFields(true)
    } else {
      setShowBreakFields(!!initialData.breakStart || !!initialData.breakEnd)
    }
  }, [initialData, shiftTypeOptions])


  useEffect(() => {
    setDisplayDate(formatDateForDisplay(formData.date))
  }, [formData.date])

  useEffect(() => {
    if (initialData?.id && activeTab === 'exchange') {
      fetchShiftExchanges()
    }
  }, [initialData?.id, activeTab])

  useEffect(() => {
    fetchShiftTypes()
  }, [])

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

          {initialData?.id && (
            <button
              type="button"
              onClick={() => setActiveTab('exchange')}
              className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${activeTab === 'exchange'
                  ? 'border-[#31BCFF] text-[#31BCFF]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              Shift Exchange
            </button>
          )}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'basic' && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {showDate && (
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Date <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={displayDate}
                onChange={handleDateChange}
                disabled={isEmployee}
                placeholder="DD/MM/YYYY"
                className={`mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-[#31BCFF] focus:ring-[#31BCFF] ${isEmployee ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                required
              />
              <p className="mt-1 text-xs text-gray-500">Format: DD/MM/YYYY</p>
            </div>
          )}

          {/* Shift Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Shift Type <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.shiftTypeId || formData.shiftType}
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
                    }
                  } else {
                    setFormData(prev => ({ ...prev, shiftType: selectedOption.id as ShiftType, shiftTypeId: undefined }));
                    setShowBreakFields(false);
                  }
                }
              }}
              disabled={isEmployee || loadingShiftTypes}
              className={`mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-[#31BCFF] focus:ring-[#31BCFF] ${isEmployee || loadingShiftTypes ? 'bg-gray-100 cursor-not-allowed' : ''}`}
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
              <label className="block text-sm font-medium text-gray-700">
                Start Time <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                disabled={isEmployee}
                className={`mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-[#31BCFF] focus:ring-[#31BCFF] ${isEmployee ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                required
              />
            </div>
          )}

          {/* End Time */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              End Time <span className="text-red-500">*</span>
            </label>
            <input
              type="time"
              value={formData.endTime}
              onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
              disabled={isEmployee}
              className={`mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-[#31BCFF] focus:ring-[#31BCFF] ${isEmployee ? 'bg-gray-100 cursor-not-allowed' : ''}`}
              required
            />
          </div>

          {/* Employee */}
          {showEmployee && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Employee</label>
              <select
                value={formData.employeeId || ''}
                onChange={(e) => setFormData({ ...formData, employeeId: e.target.value || undefined })}
                disabled={isEmployee}
                className={`mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-[#31BCFF] focus:ring-[#31BCFF] ${isEmployee ? 'bg-gray-100 cursor-not-allowed' : ''}`}
              >
                <option value="">Select an employee</option>
                {safeEmployees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.firstName} {employee.lastName}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Employee Group */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Employee Group</label>
            <select
              value={formData.employeeGroupId || ''}
              onChange={(e) => setFormData({ ...formData, employeeGroupId: e.target.value || undefined })}
              disabled={isEmployee}
              className={`mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-[#31BCFF] focus:ring-[#31BCFF] ${isEmployee ? 'bg-gray-100 cursor-not-allowed' : ''}`}
            >
              <option value="">Select a group</option>
              {employeeGroups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
          </div>

          {/* Wage */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
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
              className={`mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-[#31BCFF] focus:ring-[#31BCFF] ${isEmployee ? 'bg-gray-100 cursor-not-allowed' : ''}`}
              required
            />
          </div>

          {/* Notes */}
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700">Notes</label>
            <textarea
              value={formData.note || ''}
              onChange={(e) => setFormData({ ...formData, note: e.target.value || undefined })}
              rows={1}
              disabled={isEmployee}
              className={`mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-[#31BCFF] focus:ring-[#31BCFF] ${isEmployee ? 'bg-gray-100 cursor-not-allowed' : ''}`}
            />
          </div>

          {/* Approved */}
          <div>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.approved}
                onChange={(e) => setFormData({ ...formData, approved: e.target.checked })}
                disabled={isEmployee}
                className={`rounded border-gray-300 text-[#31BCFF] focus:ring-[#31BCFF] ${isEmployee ? 'cursor-not-allowed' : ''}`}
              />
              <span className="text-sm text-gray-700">Approved</span>
            </label>
          </div>
        </div>
      )}

      {/* Break Tab */}
      {activeTab === 'break' && (
        <div className="space-y-6">
          {/* Break Toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <h3 className="text-sm font-medium text-gray-900">Enable Break Time</h3>
              <p className="text-sm text-gray-500">Add break periods to this shift</p>
            </div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={showBreakFields}
                onChange={toggleBreakFields}
                disabled={isEmployee}
                className={`rounded border-gray-300 text-[#31BCFF] focus:ring-[#31BCFF] ${isEmployee ? 'cursor-not-allowed' : ''}`}
              />
            </label>
          </div>

          {/* Break Fields */}
          {showBreakFields && (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Break Start Time
                </label>
                <input
                  type="time"
                  value={formData.breakStart || ''}
                  onChange={(e) => setFormData({ ...formData, breakStart: e.target.value || undefined })}
                  disabled={isEmployee}
                  className={`mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-[#31BCFF] focus:ring-[#31BCFF] ${isEmployee ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                />
                <p className="mt-1 text-xs text-gray-500">Time when break period starts</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Break End Time
                </label>
                <input
                  type="time"
                  value={formData.breakEnd || ''}
                  onChange={(e) => setFormData({ ...formData, breakEnd: e.target.value || undefined })}
                  disabled={isEmployee}
                  className={`mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-[#31BCFF] focus:ring-[#31BCFF] ${isEmployee ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                />
                <p className="mt-1 text-xs text-gray-500">Time when break period ends</p>
              </div>

              {/* Paid Break */}
              <div className="sm:col-span-2">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.breakPaid || false}
                    onChange={(e) => setFormData({ ...formData, breakPaid: e.target.checked })}
                    disabled={isEmployee}
                    className={`rounded border-gray-300 text-[#31BCFF] focus:ring-[#31BCFF] ${isEmployee ? 'cursor-not-allowed' : ''}`}
                  />
                  <span className="text-sm text-gray-700">Paid Break</span>
                </label>
                <p className="mt-1 text-xs text-gray-500">Check if this break time should be included in payroll calculations</p>
              </div>

              {/* Break Duration Display */}
              {formData.breakStart && formData.breakEnd && (
                <div className="sm:col-span-2">
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <p className="text-sm text-blue-700">
                      <strong>Break Duration:</strong> {calculateBreakDuration(formData.breakStart, formData.breakEnd)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Break Guidelines */}
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <h4 className="text-sm font-medium text-amber-800 mb-2">Break Time Guidelines</h4>
            <ul className="text-sm text-amber-700 space-y-1">
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
      {activeTab === 'exchange' && (
        <div className="space-y-6">
          {initialData?.id && !isEmployee && !shiftExchanges.some(exchange => exchange.status === 'APPROVED') && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="text-lg font-medium text-blue-900 mb-4">Request Shift Exchange</h3>

              <div className="grid grid-cols-1 gap-4">
                {/* Employee Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Exchange with Employee <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.exchangeToEmployeeId || ''}
                    onChange={(e) => setFormData({ ...formData, exchangeToEmployeeId: e.target.value })}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-[#31BCFF] focus:ring-[#31BCFF]"
                  >
                    <option value="">Select an employee...</option>
                    {safeEmployees
                      .filter(emp => emp.id !== formData.employeeId)
                      .map((employee) => (
                        <option key={employee.id} value={employee.id}>
                          {employee.firstName} {employee.lastName} {employee.employeeNo ? `(${employee.employeeNo})` : ''}
                        </option>
                      ))}
                  </select>
                </div>

                {/* Exchange Reason */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reason for Exchange
                  </label>
                  <textarea
                    value={formData.exchangeReason || ''}
                    onChange={(e) => setFormData({ ...formData, exchangeReason: e.target.value })}
                    rows={3}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-[#31BCFF] focus:ring-[#31BCFF]"
                    placeholder="Explain why you want to exchange this shift..."
                  />
                </div>

                {/* Request Button */}
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      if (formData.exchangeToEmployeeId && formData.exchangeReason) {
                        handleShiftExchange(formData.exchangeToEmployeeId, formData.exchangeReason)
                      }
                    }}
                    disabled={!formData.exchangeToEmployeeId || !formData.exchangeReason}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Request Exchange
                  </button>
                </div>
              </div>
            </div>
          )}

          {shiftExchanges.some(exchange => exchange.status === 'APPROVED') && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-green-800">
                    Shift Exchange Approved
                  </h3>
                  <div className="mt-2 text-sm text-green-700">
                    <p>This shift has an approved exchange request. No new exchange requests can be created.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {shiftExchanges.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Shift Exchange History</h3>
              </div>

              <div className="px-6 py-4">
                {exchangeLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#31BCFF]"></div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {shiftExchanges.map((exchange) => (
                      <div key={exchange.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-medium text-gray-900">
                                {exchange.fromEmployee.firstName} {exchange.fromEmployee.lastName}
                              </span>
                              <span className="text-gray-500">→</span>
                              <span className="font-medium text-gray-900">
                                {exchange.toEmployee.firstName} {exchange.toEmployee.lastName}
                              </span>
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getExchangeStatusColor(exchange.status)}`}>
                                {exchange.status}
                              </span>
                            </div>

                            <div className="text-sm text-gray-600 mb-2">
                              <p><strong>From:</strong> {exchange.fromEmployee.employeeNo || 'N/A'}</p>
                              <p><strong>To:</strong> {exchange.toEmployee.employeeNo || 'N/A'}</p>
                              <p><strong>Requested:</strong> {new Date(exchange.requestedAt).toLocaleDateString()}</p>
                              {exchange.approvedAt && (
                                <p><strong>Processed:</strong> {new Date(exchange.approvedAt).toLocaleDateString()}</p>
                              )}
                            </div>

                            {exchange.reason && (
                              <div className="text-sm text-gray-600">
                                <p><strong>Reason:</strong> {exchange.reason}</p>
                              </div>
                            )}
                          </div>

                          {/* Action Buttons */}
                          {exchange.status === 'ADMIN_PENDING' && !isEmployee && (
                            <div className="flex gap-2 ml-4">
                              <button
                                type="button"
                                onClick={() => handleExchangeStatusUpdate(exchange.id, 'APPROVED')}
                                className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                              >
                                Approve
                              </button>
                              <button
                                type="button"
                                onClick={() => handleExchangeStatusUpdate(exchange.id, 'REJECTED')}
                                className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                              >
                                Reject
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end gap-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#31BCFF]"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading || isEmployee}
          className={`px-4 py-2 text-sm font-medium text-white border border-transparent rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#31BCFF] disabled:opacity-50 ${isEmployee ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#31BCFF] hover:bg-[#31BCFF]/90'
            }`}
          title={isEmployee ? "Employees cannot create or edit shifts" : ""}
        >
          {loading ? 'Saving...' : isEmployee ? 'Not Authorized' : 'Save'}
        </button>
      </div>
    </form>
  )
}
