'use client'

import React, { useState, useEffect } from 'react'
import { format, addDays, addWeeks, subWeeks, startOfWeek, endOfWeek } from 'date-fns'
import { Employee, EmployeeGroup } from '@prisma/client'

import Swal from 'sweetalert2'
import ScheduleHeader from '@/components/schedule/ScheduleHeader'
import WeekView from '@/components/schedule/WeekView'
import DayView from '@/components/schedule/DayView'
import EmployeeGroupedView from '@/components/schedule/EmployeeGroupedView'
import GroupGroupedView from '@/components/schedule/GroupGroupedView'
import FunctionGroupedView from '@/components/schedule/FunctionGroupedView'
import ShiftFormModal from '@/components/schedule/ShiftFormModel'
import { laborLawValidator, formatValidationMessage, separateViolations, type LaborLawViolation } from '@/shared/lib/laborLawValidation'
import { ShiftWithRelations } from '@/types/schedule'

export default function SchedulePage() {
  const [showShiftModal, setShowShiftModal] = useState(false)
  const [shiftInitialData, setShiftInitialData] = useState<any>(null)
  const [modalViewType, setModalViewType] = useState<'week' | 'day'>('week')

  const [currentDate, setCurrentDate] = useState(new Date())
  const [employees, setEmployees] = useState<Employee[]>([])
  const [employeeGroups, setEmployeeGroups] = useState<EmployeeGroup[]>([])
  const [shifts, setShifts] = useState<ShiftWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'week' | 'day'>('week')
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [scheduleViewType, setScheduleViewType] = useState<'time' | 'employees' | 'groups' | 'functions'>('employees')
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())

  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedFunctionId, setSelectedFunctionId] = useState<string | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [departments, setDepartments] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [functions, setFunctions] = useState<any[]>([])
  const [shiftTypes, setShiftTypes] = useState<any[]>([])
  const [filters, setFilters] = useState({
    employeeIds: [] as string[],
    employeeGroupIds: [] as string[],
    shiftTypeIds: [] as string[],
    statuses: [] as string[],
    timeFrom: '',
    timeTo: ''
  })

  // Filter shifts based on selected department, category, function, and filters
  const filteredShifts = shifts.filter((shift: any) => {
    if (selectedDepartmentId && shift.departmentId !== selectedDepartmentId) {
      return false
    }
    if (selectedCategoryId && shift.function?.categoryId !== selectedCategoryId) {
      return false
    }
    if (selectedFunctionId && shift.functionId !== selectedFunctionId) {
      return false
    }
    if (selectedGroupId && shift.employeeGroupId !== selectedGroupId) {
      return false
    }
    
    // Apply advanced filters
    if (filters.employeeIds.length > 0 && shift.employeeId && !filters.employeeIds.includes(shift.employeeId)) {
      return false
    }
    if (filters.employeeGroupIds.length > 0 && shift.employeeGroupId && !filters.employeeGroupIds.includes(shift.employeeGroupId)) {
      return false
    }
    if (filters.shiftTypeIds.length > 0 && shift.shiftTypeId && !filters.shiftTypeIds.includes(shift.shiftTypeId)) {
      return false
    }
    if (filters.statuses.length > 0 && !filters.statuses.includes(shift.status)) {
      return false
    }
    if (filters.timeFrom && shift.startTime < filters.timeFrom) {
      return false
    }
    if (filters.timeTo && shift.startTime > filters.timeTo) {
      return false
    }
    
    return true
  })

  const startDate = startOfWeek(currentDate, { weekStartsOn: 0 })
  const endDate = endOfWeek(currentDate, { weekStartsOn: 0 })
  
  const weekDates = Array(7).fill(0).map((_, i) => addDays(startDate, i))

  useEffect(() => {
    fetchEmployees()
    fetchEmployeeGroups()
    fetchShifts()
    fetchDepartments()
    fetchCategories()
    fetchFunctions()
    fetchShiftTypes()
  }, [currentDate, selectedEmployeeId])

  const fetchEmployees = async () => {
    try {
      const res = await fetch('/api/employees')
      const data = await res.json()
      if (data.employees && Array.isArray(data.employees)) {
        setEmployees(data.employees)
      } else if (Array.isArray(data)) {
        setEmployees(data)
      } else {
        console.error('Expected employees array but got:', data)
        setEmployees([])
      }
    } catch (error) {
      console.error('Error fetching employees:', error)
      setEmployees([])
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

  const fetchDepartments = async () => {
    try {
      const res = await fetch('/api/departments')
      const data = await res.json()
      setDepartments(data)
    } catch (error) {
      console.error('Error fetching departments:', error)
      setDepartments([])
    }
  }

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/categories')
      const data = await res.json()
      setCategories(data)
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }

  const fetchFunctions = async () => {
    try {
      const res = await fetch('/api/functions')
      const data = await res.json()
      setFunctions(data)
    } catch (error) {
      console.error('Error fetching functions:', error)
    }
  }

  const fetchShiftTypes = async () => {
    try {
      const res = await fetch('/api/shift-types')
      const data = await res.json()
      setShiftTypes(data.shiftTypes || [])
    } catch (error) {
      console.error('Error fetching shift types:', error)
      setShiftTypes([])
    }
  }

  const fetchShifts = async () => {
    try {
      const start = format(startDate, 'yyyy-MM-dd')
      const end = format(endDate, 'yyyy-MM-dd')
      
      let url = `/api/shifts?startDate=${start}&endDate=${end}`
      if (selectedEmployeeId) {
        url += `&employeeId=${selectedEmployeeId}`
      }
      
      const res = await fetch(url)
      const data = await res.json()
      setShifts(data)
    } catch (error) {
      console.error('Error fetching shifts:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePreviousWeek = () => {
    setCurrentDate(prevDate => subWeeks(prevDate, 1))
  }

  const handleNextWeek = () => {
    setCurrentDate(prevDate => addWeeks(prevDate, 1))
  }

  // Check if employee already has a shift on the given date
  const checkExistingShift = (employeeId: string, shiftDate: string, excludeShiftId?: string): boolean => {
    return shifts.some(shift => {
      const shiftDateStr = typeof shift.date === 'string' 
        ? (shift.date as string).substring(0, 10) 
        : format(new Date(shift.date), 'yyyy-MM-dd');
      
      return shift.employeeId === employeeId && 
             shiftDateStr === shiftDate && 
             (!excludeShiftId || shift.id !== excludeShiftId);
    });
  };

  // Get existing shift details for better user information
  const getExistingShift = (employeeId: string, shiftDate: string, excludeShiftId?: string) => {
    return shifts.find(shift => {
      const shiftDateStr = typeof shift.date === 'string' 
        ? (shift.date as string).substring(0, 10) 
        : format(new Date(shift.date), 'yyyy-MM-dd');
      
      return shift.employeeId === employeeId && 
             shiftDateStr === shiftDate && 
             (!excludeShiftId || shift.id !== excludeShiftId);
    });
  };

  const handleShiftFormSubmit = async (formData: any) => {
    if (formData.employeeId && formData.date) {
      const hasExistingShift = checkExistingShift(formData.employeeId, formData.date, formData.id);
      
      if (hasExistingShift) {
        const employee = employees.find(emp => emp.id === formData.employeeId);
        const existingShift = getExistingShift(formData.employeeId, formData.date, formData.id);
        const employeeName = employee ? `${employee.firstName} ${employee.lastName}` : 'This employee';
        
        let conflictTitle = `Shift Conflict: ${employeeName}`;
        let conflictMessage = `Already has a shift on ${formData.date}`;
        if (existingShift) {
          conflictMessage += ` (${existingShift.startTime} - ${existingShift.endTime})`;
        }

        Swal.fire({
          text: `${conflictTitle}: ${conflictMessage}`,
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 4000,
          timerProgressBar: true,
          customClass: {
            popup: 'swal-toast-wide'
          }
        });
        
        return;
      }
    }

    // Labor Law Validation
    if (formData.employeeId && formData.startTime && formData.endTime) {
      try {
        const shiftData = {
          id: formData.id,
          date: formData.date,
          startTime: formData.startTime,
          endTime: formData.endTime,
          breakStart: formData.breakStart,
          breakEnd: formData.breakEnd,
          employeeId: formData.employeeId
        };

        // Get existing shifts for the employee to validate against weekly rules
        const shiftDate = new Date(formData.date);
        const weekStart = new Date(shiftDate);
        weekStart.setDate(shiftDate.getDate() - shiftDate.getDay());
        
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        
        const existingEmployeeShifts = shifts.filter(shift => 
          shift.employeeId === formData.employeeId &&
          shift.id !== formData.id &&
          shift.endTime !== null && // Only include completed shifts
          shift.employeeId !== null && 
          new Date(shift.date) >= weekStart &&
          new Date(shift.date) <= weekEnd
        ).map(shift => ({
          id: shift.id,
          date: typeof shift.date === 'string' ? shift.date : shift.date.toISOString().split('T')[0],
          startTime: shift.startTime,
          endTime: shift.endTime as string,
          breakStart: shift.breakStart ? (typeof shift.breakStart === 'string' ? shift.breakStart : shift.breakStart.toTimeString().substring(0, 5)) : undefined,
          breakEnd: shift.breakEnd ? (typeof shift.breakEnd === 'string' ? shift.breakEnd : shift.breakEnd.toTimeString().substring(0, 5)) : undefined,
          employeeId: shift.employeeId as string
        }));

        const validation = await laborLawValidator.validateShift(shiftData, existingEmployeeShifts);
        
        if (!validation.isValid) {
          // Separate overridable and non-overridable violations
          const { overridable, nonOverridable } = separateViolations(validation.violations);
          
          // If there are non-overridable violations, block the shift creation
          if (nonOverridable.length > 0) {
            const violationMessages = nonOverridable.map(formatValidationMessage).join('\n');
            
            Swal.fire({
              text: violationMessages,
              toast: true,
              position: 'top-end',
              showConfirmButton: false,
              timer: 5000,
              timerProgressBar: true,
              customClass: {
                popup: 'swal-toast-wide'
              }
            });
            
            return;
          }
          
          // If there are only overridable violations, show confirmation dialog
          if (overridable.length > 0) {
            setShowShiftModal(false);

            const violationsList = overridable.map(violation => {
              switch(violation.type) {
                case 'MAX_HOURS_PER_DAY':
                  return `• Shift duration: <strong>${violation.currentValue.toFixed(1)} hours</strong> (exceeds ${violation.allowedValue}h daily limit)`
                case 'MAX_OVERTIME_PER_DAY':
                  return `• Daily overtime: <strong>${violation.currentValue.toFixed(1)} hours</strong> (exceeds ${violation.allowedValue}h limit)`
                case 'MAX_OVERTIME_PER_WEEK':
                  return `• Weekly overtime: <strong>${violation.currentValue.toFixed(1)} hours</strong> (exceeds ${violation.allowedValue}h limit)`
                case 'MISSING_BREAK':
                  return `• Break requirement: <strong>${violation.currentValue} minutes</strong> (minimum ${violation.allowedValue} minutes required)`
                default:
                  return `• ${violation.message}`
              }
            }).join('<br>')
            
            const result = await Swal.fire({
              title: 'Labor Law Violations Detected',
              html: `
                <div style="text-align: left; margin: 16px 0;">
                  <p style="margin-bottom: 12px;">This shift violates the following labor law requirements:</p>
                  <div style="background-color: #fef3cd; border: 1px solid #ffeaa7; border-radius: 6px; padding: 12px; margin: 12px 0;">
                    ${violationsList}
                  </div>
                  <p style="margin-top: 16px;"><strong>Do you want to create this shift anyway?</strong></p>
                  <p style="font-size: 14px; color: #6b7280; margin-top: 8px;">As an admin, you can override these restrictions if necessary.</p>
                </div>
              `,
              icon: 'warning',
              showCancelButton: true,
              confirmButtonColor: '#31BCFF',
              cancelButtonColor: '#6b7280',
              confirmButtonText: 'Yes, Create Shift',
              cancelButtonText: 'Cancel',
              reverseButtons: true,
              heightAuto: false,
              allowOutsideClick: false,
              allowEscapeKey: false,
              customClass: {
                popup: 'swal2-popup-custom',
                title: 'swal2-title-custom',
                htmlContainer: 'swal2-html-custom'
              }
            });
            if (!result.isConfirmed) {
              setShowShiftModal(true);
              return;
            }

            const violationCount = overridable.length;
            Swal.fire({
              text: `Admin override: Shift created despite ${violationCount} labor law violation${violationCount > 1 ? 's' : ''}`,
              toast: true,
              position: 'top-end',
              showConfirmButton: false,
              timer: 4000,
              timerProgressBar: true,
              icon: 'warning',
              customClass: {
                popup: 'swal-toast-wide'
              }
            });
          }
        } else if (validation.warnings.length > 0) {
          const warningMessages = validation.warnings.map(w => w.message).join('\n');
          
          Swal.fire({
            text: warningMessages,
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 5000,
            timerProgressBar: true,
            customClass: {
              popup: 'swal-toast-wide'
            }
          });
        }
      } catch (error) {
        console.error('Error validating labor laws:', error);
      }
    }

    setLoading(true);
    try {
      const method = formData.id ? 'PUT' : 'POST';
      const url = formData.id 
        ? `/api/shifts/${formData.id}` 
        : '/api/shifts';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        await fetchShifts();
        setShowShiftModal(false);
        
        Swal.fire({
          text: `Shift ${formData.id ? 'updated' : 'created'} successfully!`,
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 3000,
          timerProgressBar: true,
          customClass: {
            popup: 'swal-toast-wide'
          }
        });
      } else {
        const errorData = await res.json();
        
        Swal.fire({
          text: errorData.error || `Failed to ${formData.id ? 'update' : 'create'} shift.`,
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 4000,
          timerProgressBar: true,
          customClass: {
            popup: 'swal-toast-wide'
          }
        });
      }
    } catch (error) {
      console.error('Error submitting shift form:', error);
      
      Swal.fire({
        text: `Failed to ${formData.id ? 'update' : 'create'} shift.`,
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 4000,
        timerProgressBar: true,
        customClass: {
          popup: 'swal-toast-wide'
        }
      });
    }
    setLoading(false);
  };

  const calculateShiftHours = (startTime: string, endTime: string): number => {
    const getMinutes = (timeStr: string): number => {
      const [hours, minutes] = timeStr.split(':').map(Number)
      return hours * 60 + minutes
    }
    
    const startMinutes = getMinutes(startTime)
    const endMinutes = getMinutes(endTime)
    
    let minutesWorked = endMinutes - startMinutes
    if (minutesWorked < 0) {
      minutesWorked += 24 * 60 
    }
    
    return minutesWorked / 60
  }

  const handleEditShift = (shift: ShiftWithRelations) => {
    setModalViewType('week');
    
    const shiftData = {
      ...shift,
      date: typeof shift.date === 'string'
        ? (shift.date as string).substring(0, 10)
        : format(shift.date, 'yyyy-MM-dd'),
      startTime: shift.startTime || '09:00',
      endTime: shift.endTime || '17:00',
      shiftType: shift.shiftType || 'NORMAL',
      wage: shift.wage || 0,
      wageType: shift.wageType || 'HOURLY',
      approved: shift.approved || false,
      employeeId: shift.employeeId || undefined,
      employeeGroupId: shift.employeeGroupId || undefined,
      departmentId: shift.departmentId || shift.function?.category?.departmentId || undefined,
      categoryId: shift.function?.categoryId || shift.function?.category?.id || undefined,
      functionId: shift.functionId || undefined,
      breakStart: shift.breakStart || undefined,
      breakEnd: shift.breakEnd || undefined,
      note: shift.note || '',
    };
    
    setShiftInitialData(shiftData);
    setShowShiftModal(true);
  };

  const getShiftPosition = (startTime: string, endTime: string) => {
    const startParts = startTime.split(':');
    const endParts = endTime.split(':');

    const startHour = parseInt(startParts[0], 10);
    const startMinutes = parseInt(startParts[1], 10);

    const endHour = parseInt(endParts[0], 10);
    const endMinutes = parseInt(endParts[1], 10);

    // Calculate offsets in minutes since midnight
    const startOffset = startHour * 60 + startMinutes;
    let endOffset = endHour * 60 + endMinutes;
    
    // If end time is earlier than start time, assume it's the next day
    if (endOffset < startOffset) {
      endOffset += 24 * 60; // Add 24 hours
    }

    // Height calculation: 1 hour = 60px
    const height = ((endOffset - startOffset) / 60) * 60;
    
    // Top position: offset from the top of the schedule grid
    // Assuming the grid starts at hour 1 (not 0)
    const top = ((startOffset - 60) / 60) * 60; // Subtract 60 minutes to adjust for grid starting at hour 1
    
    return { top, height };
  };

  const handleTodayClick = () => {
    const today = new Date()
    setCurrentDate(today)
    setSelectedDate(today)
  }

  const handleEmployeeChange = (employeeId: string | null) => {
    setSelectedEmployeeId(employeeId);
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header with navigation and filters */}
      <div className="bg-white border-b px-4 sm:px-6 lg:px-8 py-3 md:py-4">
        <ScheduleHeader
          startDate={startDate}
          endDate={endDate}
          viewMode={viewMode}
          onPreviousWeek={handlePreviousWeek}
          onNextWeek={handleNextWeek}
          onTodayClick={handleTodayClick}
          onViewModeChange={setViewMode}
          employees={employees}
          selectedEmployeeId={selectedEmployeeId}
          onEmployeeChange={handleEmployeeChange}
          departments={departments}
          employeeGroups={employeeGroups}
          shiftTypes={shiftTypes}
          categories={categories}
          functions={functions}
          selectedDepartmentId={selectedDepartmentId}
          selectedCategoryId={selectedCategoryId}
          selectedFunctionId={selectedFunctionId}
          onDepartmentChange={setSelectedDepartmentId}
          onCategoryChange={setSelectedCategoryId}
          onFunctionChange={setSelectedFunctionId}
          filters={filters}
          onFiltersChange={setFilters}
          scheduleViewType={scheduleViewType}
          onScheduleViewTypeChange={setScheduleViewType}
        />
      </div>

      {/* View Type Tabs */}
      <div className="bg-white border-b px-4 sm:px-6 lg:px-8">
        <div className="flex gap-0 md:gap-1 -mb-px overflow-x-auto scrollbar-hide">
          <button
            onClick={() => setScheduleViewType('time')}
            className={`px-3 md:px-4 py-2.5 md:py-3 text-xs md:text-sm font-medium transition-colors whitespace-nowrap ${
              scheduleViewType === 'time'
                ? 'text-[#31BCFF] border-b-2 border-[#31BCFF] bg-blue-50 md:bg-transparent'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Time
          </button>
          <button
            onClick={() => setScheduleViewType('employees')}
            className={`px-3 md:px-4 py-2.5 md:py-3 text-xs md:text-sm font-medium transition-colors whitespace-nowrap ${
              scheduleViewType === 'employees'
                ? 'text-[#31BCFF] border-b-2 border-[#31BCFF] bg-blue-50 md:bg-transparent'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Employees
          </button>
          <button
            onClick={() => setScheduleViewType('groups')}
            className={`px-3 md:px-4 py-2.5 md:py-3 text-xs md:text-sm font-medium transition-colors whitespace-nowrap ${
              scheduleViewType === 'groups'
                ? 'text-[#31BCFF] border-b-2 border-[#31BCFF] bg-blue-50 md:bg-transparent'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Groups
          </button>
          <button
            onClick={() => setScheduleViewType('functions')}
            className={`px-3 md:px-4 py-2.5 md:py-3 text-xs md:text-sm font-medium transition-colors whitespace-nowrap ${
              scheduleViewType === 'functions'
                ? 'text-[#31BCFF] border-b-2 border-[#31BCFF] bg-blue-50 md:bg-transparent'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Functions
          </button>
        </div>
      </div>

      {/* Main content area */}
      <main className="flex-1 overflow-auto">
            {viewMode === 'week' ? (
              scheduleViewType === 'time' ? (
                <WeekView
                  weekDates={weekDates}
                  shifts={filteredShifts}
                  employees={employees}
                  employeeGroups={employeeGroups}
                  functions={functions}
                  categories={categories}
                  scheduleViewType={scheduleViewType}
                  onEditShift={handleEditShift}
                  onAddShift={(formData) => {
                    if (formData) {
                      setModalViewType('week');
                      if (selectedEmployeeId) {
                        formData.employeeId = selectedEmployeeId;
                      }
                      setShiftInitialData(formData);
                    } else {
                      setModalViewType('week');
                      if (selectedEmployeeId) {
                        setShiftInitialData({
                          employeeId: selectedEmployeeId,
                        });
                      } else {
                        setShiftInitialData(null);
                      }
                    }
                    setShowShiftModal(true);
                  }}
                />
              ) : scheduleViewType === 'employees' ? (
                <EmployeeGroupedView
                  weekDates={weekDates}
                  shifts={filteredShifts}
                  employees={employees}
                  expandedGroups={expandedGroups}
                  onToggleGroup={(groupId) => {
                    const newExpanded = new Set(expandedGroups);
                    if (newExpanded.has(groupId)) {
                      newExpanded.delete(groupId);
                    } else {
                      newExpanded.add(groupId);
                    }
                    setExpandedGroups(newExpanded);
                  }}
                  onEditShift={handleEditShift}
                  onAddShift={(data) => {
                    setModalViewType('week');
                    if (data) {
                      setShiftInitialData(data);
                    } else {
                      setShiftInitialData(null);
                    }
                    setShowShiftModal(true);
                  }}
                />
              ) : scheduleViewType === 'groups' ? (
                <GroupGroupedView
                  weekDates={weekDates}
                  shifts={filteredShifts}
                  employees={employees}
                  employeeGroups={employeeGroups}
                  onEditShift={handleEditShift}
                  onAddShift={(data) => {
                    setModalViewType('week');
                    if (data) {
                      setShiftInitialData(data);
                    } else {
                      setShiftInitialData(null);
                    }
                    setShowShiftModal(true);
                  }}
                />
              ) : scheduleViewType === 'functions' ? (
                <FunctionGroupedView
                  weekDates={weekDates}
                  shifts={filteredShifts}
                  employees={employees}
                  functions={functions}
                  onEditShift={handleEditShift}
                  onAddShift={(data) => {
                    setModalViewType('week');
                    if (data) {
                      setShiftInitialData(data);
                    } else {
                      setShiftInitialData(null);
                    }
                    setShowShiftModal(true);
                  }}
                />
              ) : (
                <WeekView
                  weekDates={weekDates}
                  shifts={filteredShifts}
                  employees={employees}
                  employeeGroups={employeeGroups}
                  functions={functions}
                  categories={categories}
                  scheduleViewType={scheduleViewType}
                  onEditShift={handleEditShift}
                  onAddShift={(formData) => {
                    if (formData) {
                      setModalViewType('week');
                      if (selectedEmployeeId) {
                        formData.employeeId = selectedEmployeeId;
                      }
                      setShiftInitialData(formData);
                    } else {
                      setModalViewType('week');
                      if (selectedEmployeeId) {
                        setShiftInitialData({
                          employeeId: selectedEmployeeId,
                        });
                      } else {
                        setShiftInitialData(null);
                      }
                    }
                    setShowShiftModal(true);
                  }}
                />
              )
            ) : (
             <DayView
                selectedDate={selectedDate}
                shifts={filteredShifts.filter((shift: any) => 
                  format(
                    typeof shift.date === 'string' ? new Date(shift.date) : shift.date, 
                    'yyyy-MM-dd'
                  ) === format(selectedDate, 'yyyy-MM-dd')
                )}
                employees={employees}
                onEditShift={handleEditShift}
                onAddShift={(formData) => {
                  setModalViewType('day');
                  
                  if (formData) {
                    if (selectedEmployeeId) {
                      formData.employeeId = selectedEmployeeId;
                    }
                    setShiftInitialData(formData);
                  } else {
                    if (selectedEmployeeId) {
                      setShiftInitialData({
                        date: format(selectedDate, 'yyyy-MM-dd'),
                        employeeId: selectedEmployeeId,
                      });
                    } else {
                      setShiftInitialData({
                        date: format(selectedDate, 'yyyy-MM-dd'),
                      });
                    }
                  }
                  setShowShiftModal(true);
                }}
              />
            )}
          </main>

        <ShiftFormModal
          isOpen={showShiftModal}
          onClose={() => setShowShiftModal(false)}
          initialData={shiftInitialData}
          employees={employees}
          employeeGroups={employeeGroups}
          onSubmit={handleShiftFormSubmit}
          viewType={modalViewType}
          loading={loading}
        />
      </div>
  )
}