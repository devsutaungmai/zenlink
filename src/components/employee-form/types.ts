import { Sex } from '@prisma/client'

export interface EmployeeFormData {
  firstName: string
  lastName: string
  birthday: Date
  sex: Sex
  socialSecurityNo: string
  address: string
  countryCode: string
  mobile: string
  employeeNo: string
  bankAccount: string
  hoursPerMonth: number
  dateOfHire: Date
  isTeamLeader: boolean
  departmentId: string // Keep for backward compatibility
  departmentIds: string[] // New field for multiple departments
  employeeGroupId?: string // Keep for backward compatibility
  employeeGroupIds: string[] // New field for multiple employee groups
  email?: string
  profilePhoto?: string | null
  salaryRate?: number
  id?: string
}

export interface EmployeeFormProps {
  initialData?: Partial<EmployeeFormData>
  onSubmit: (data: EmployeeFormData) => void
  loading: boolean
  departments: Array<{ id: string; name: string }>
  employeeGroups: Array<{ id: string; name: string }>
}
