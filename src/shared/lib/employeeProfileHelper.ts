import { prisma } from './prisma'

export interface ProfileStatus {
  isComplete: boolean
  hasPinSet: boolean
  isInvited: boolean
  issues: string[]
  behavior: 'SHOW_WARNING' | 'BLOCK_SCHEDULING' | 'NONE'
}

export interface EmployeeWithUser {
  id: string
  user?: {
    id: string
    pin?: string | null
    email?: string | null
    password?: string | null
  } | null
}

export async function checkEmployeeProfileStatus(
  businessId: string,
  employee: EmployeeWithUser
): Promise<ProfileStatus> {
  const settings = await prisma.employeeSettings.findUnique({
    where: { businessId }
  })

  if (!settings || settings.incompleteProfileBehavior === 'NONE') {
    return {
      isComplete: true,
      hasPinSet: true,
      isInvited: true,
      issues: [],
      behavior: 'NONE'
    }
  }

  const issues: string[] = []
  
  const hasPinSet = !!(employee.user?.pin && employee.user.pin.length > 0)
  const isInvited = !!(employee.user?.password && employee.user.password.length > 0)

  if (!hasPinSet) {
    issues.push('PIN not set')
  }
  if (!isInvited) {
    issues.push('Not invited to system')
  }

  return {
    isComplete: issues.length === 0,
    hasPinSet,
    isInvited,
    issues,
    behavior: settings.incompleteProfileBehavior
  }
}

export async function canEmployeeBeScheduled(
  businessId: string,
  employee: EmployeeWithUser
): Promise<{ allowed: boolean; reason?: string }> {
  const status = await checkEmployeeProfileStatus(businessId, employee)

  if (!status.isComplete && status.behavior === 'BLOCK_SCHEDULING') {
    return {
      allowed: false,
      reason: `Employee cannot be scheduled: ${status.issues.join(', ')}`
    }
  }

  return { allowed: true }
}

export async function getSchedulableEmployees(
  businessId: string,
  employees: EmployeeWithUser[]
): Promise<EmployeeWithUser[]> {
  const settings = await prisma.employeeSettings.findUnique({
    where: { businessId }
  })

  if (!settings || settings.incompleteProfileBehavior !== 'BLOCK_SCHEDULING') {
    return employees
  }

  return employees.filter(employee => {
    const hasPinSet = !!(employee.user?.pin && employee.user.pin.length > 0)
    const isInvited = !!(employee.user?.password && employee.user.password.length > 0)
    return hasPinSet && isInvited
  })
}

export async function getEmployeeEditableFields(businessId: string): Promise<string[]> {
  const settings = await prisma.employeeSettings.findUnique({
    where: { businessId }
  })

  if (!settings || !settings.employeesCanEditProfile) {
    return []
  }

  return settings.employeeEditableFields
}

export async function canEmployeeSeeColleagueContactInfo(businessId: string): Promise<boolean> {
  const settings = await prisma.employeeSettings.findUnique({
    where: { businessId }
  })

  return settings?.employeesCanSeeContactInfo ?? true
}
