import { Shift } from '@prisma/client'

export type ShiftWithRelations = Shift & {
  departmentId?: string | null
  functionId?: string | null
  employeeGroupId?: string | null
  employee?: {
    firstName: string
    lastName: string
    department?: {
      name: string
    }
  }
  employeeGroup?: {
    name: string
  }
  function?: {
    id: string
    name: string
    color?: string | null
    categoryId?: string
    category: {
      id?: string
      name: string
      departmentId?: string
      department: {
        name: string
      }
    }
  }
  shiftExchanges?: Array<{
    id: string
    status: string
    fromEmployee: {
      id: string
      firstName: string
      lastName: string
      department: {
        name: string
      }
    }
    toEmployee: {
      id: string
      firstName: string
      lastName: string
      department: {
        name: string
      }
    }
  }>
}
