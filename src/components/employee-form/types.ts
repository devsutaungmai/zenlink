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
  departmentId: string
  departmentIds: string[]
  employeeGroupId?: string
  employeeGroupIds: string[]
  roleIds: string[]
  email?: string
  profilePhoto?: string | null
  salaryRate?: number
  id?: string
}

export interface Role {
  id: string
  name: string
  description?: string | null
  isSystem?: boolean
  isDefault?: boolean
  departments?: Array<{ departmentId: string }>
}

export interface EmployeeFormProps {
  initialData?: Partial<EmployeeFormData>
  onSubmit: (data: EmployeeFormData) => void
  loading: boolean
  departments: Array<{ id: string; name: string }>
  employeeGroups: Array<{ id: string; name: string }>
  roles?: Role[]
  readOnly?: boolean
  canViewSensitive?: boolean
}
