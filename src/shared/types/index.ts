export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  role: 'ADMIN' | 'MANAGER' | 'EMPLOYEE'
}

export interface Employee {
  id: string
  firstName: string
  lastName: string
  email: string
  position?: string
  phone?: string
  status?: 'ACTIVE' | 'INACTIVE'
  employeeNo?: string
}

export interface Shift {
  id: string
  date: string
  startTime: string
  endTime: string | null
  shiftType: 'NORMAL' | 'OVERTIME' | 'HOLIDAY' | 'TRAINING'
  wage: number
  wageType: 'HOURLY' | 'FLAT'
  approved: boolean
  employeeId: string
  employeeGroupId?: string
  note?: string
  employeeGroup?: {
    id: string
    name: string
  }
}

export interface EmployeeGroup {
  id: string
  name: string
  employees?: Employee[]
}

export interface ShiftExchange {
  id: string
  shiftId: string
  fromEmployeeId: string
  toEmployeeId: string
  type: 'SWAP' | 'HANDOVER'
  status: 'EMPLOYEE_PENDING' | 'EMPLOYEE_ACCEPTED' | 'EMPLOYEE_REJECTED' | 'ADMIN_PENDING' | 'APPROVED' | 'REJECTED'
  reason?: string
  requestedAt: string
  employeeResponseAt?: string
  employeeResponseBy?: string
  approvedAt?: string
  approvedBy?: string
  fromEmployee: {
    id: string
    firstName: string
    lastName: string
    employeeNo?: string
  }
  toEmployee: {
    id: string
    firstName: string
    lastName: string
    employeeNo?: string
  }
}

export interface PayrollPeriod {
  id: string
  name: string
  startDate: string
  endDate: string
  status: 'DRAFT' | 'FINALIZED' | 'CLOSED'
  businessId: string
  createdAt: string
  updatedAt: string
}

export interface PayrollPeriodFormData {
  name: string
  startDate: string
  endDate: string
  status?: 'DRAFT' | 'FINALIZED' | 'CLOSED'
}

export interface PayrollEntry {
  id: string
  employeeId: string
  payrollPeriodId: string
  regularHours: number
  overtimeHours: number
  regularRate: number
  overtimeRate: number
  grossPay: number
  deductions: number
  netPay: number
  bonuses: number
  status: 'DRAFT' | 'APPROVED' | 'PAID'
  notes?: string
  createdAt: string
  updatedAt: string
  employee: {
    id: string
    firstName: string
    lastName: string
    employeeNo?: string
    email?: string
    employeeGroup?: {
      id: string
      name: string
    } | null
    employeeGroups?: Array<{
      employeeGroupId: string
      isPrimary: boolean
      employeeGroup: {
        id: string
        name: string
      }
    }>
  }
  payrollPeriod: {
    id: string
    name: string
    startDate: string
    endDate: string
  }
}

export interface PayrollEntryFormData {
  employeeId: string
  regularHours: number
  overtimeHours: number
  regularRate: number
  overtimeRate: number
  deductions: number
  bonuses: number
  status?: 'DRAFT' | 'APPROVED' | 'PAID'
  notes?: string
}
