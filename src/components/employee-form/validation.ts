import { z } from 'zod'

export interface EmployeeSettingsForValidation {
  requireFirstName: boolean
  requireLastName: boolean
  requireBirthday: boolean
  requireGender: boolean
  requireAddress: boolean
  requirePhone: boolean
  requireEmail: boolean
  requireSocialSecurityNo: boolean
  requireEmployeeNo: boolean
  requireDateOfHire: boolean
  requireHoursPerMonth: boolean
  requireBankAccount: boolean
  requireDepartment: boolean
  requireSalaryRate: boolean
}

export const defaultValidationSettings: EmployeeSettingsForValidation = {
  requireFirstName: true,
  requireLastName: true,
  requireBirthday: true,
  requireGender: true,
  requireAddress: false,
  requirePhone: true,
  requireEmail: false,
  requireSocialSecurityNo: false,
  requireEmployeeNo: true,
  requireDateOfHire: true,
  requireHoursPerMonth: true,
  requireBankAccount: false,
  requireDepartment: true,
  requireSalaryRate: false,
}

export function createEmployeeValidationSchema(settings: EmployeeSettingsForValidation = defaultValidationSettings) {
  return z.object({
  firstName: settings.requireFirstName
    ? z.string()
        .min(1, 'First name is required')
        .min(2, 'First name must be at least 2 characters')
        .max(50, 'First name must be less than 50 characters')
        .regex(/^[a-zA-ZÀ-ÿ\s'-]+$/, 'First name can only contain letters, spaces, apostrophes and hyphens')
    : z.string().max(50).optional().or(z.literal('')),
  
  lastName: settings.requireLastName
    ? z.string()
        .min(1, 'Last name is required')
        .min(2, 'Last name must be at least 2 characters')
        .max(50, 'Last name must be less than 50 characters')
        .regex(/^[a-zA-ZÀ-ÿ\s'-]+$/, 'Last name can only contain letters, spaces, apostrophes and hyphens')
    : z.string().max(50).optional().or(z.literal('')),
  
  birthday: settings.requireBirthday
    ? z.union([z.date(), z.string().transform((str) => new Date(str))]).refine((date) => {
        const actualDate = date instanceof Date ? date : new Date(date)
        if (isNaN(actualDate.getTime())) return false
        const today = new Date()
        const hundredYearsAgo = new Date(today.getFullYear() - 100, today.getMonth(), today.getDate())
        const eighteenYearsAgo = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate())
        return actualDate >= hundredYearsAgo && actualDate <= eighteenYearsAgo
      }, 'Employee must be between 18 and 100 years old')
    : z.union([z.date(), z.string(), z.null()]).optional(),
  
  sex: settings.requireGender
    ? z.enum(['MALE', 'FEMALE', 'OTHER'])
    : z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
  
  socialSecurityNo: settings.requireSocialSecurityNo
    ? z.string()
        .min(1, 'Social security number is required')
        .min(9, 'Social security number must be at least 9 characters')
        .max(20, 'Social security number must be less than 20 characters')
    : z.string().max(20, 'Social security number must be less than 20 characters').optional().or(z.literal('')),
  
  address: settings.requireAddress
    ? z.string()
        .min(1, 'Address is required')
        .min(10, 'Address must be at least 10 characters')
        .max(200, 'Address must be less than 200 characters')
    : z.string().max(200, 'Address must be less than 200 characters').optional().or(z.literal('')),
  
  countryCode: settings.requirePhone
    ? z.string()
        .min(1, 'Country code is required')
        .regex(/^\+\d{1,4}$/, 'Invalid country code format')
    : z.string().regex(/^\+\d{1,4}$/, 'Invalid country code format').optional().or(z.literal('')),
  
  mobile: settings.requirePhone
    ? z.string()
        .min(1, 'Mobile number is required')
        .min(8, 'Mobile number must be at least 8 digits')
        .max(15, 'Mobile number must be less than 15 digits')
        .regex(/^[0-9]+$/, 'Mobile number can only contain numbers')
    : z.string().max(15, 'Mobile number must be less than 15 digits').regex(/^[0-9]*$/, 'Mobile number can only contain numbers').optional().or(z.literal('')),
  
  employeeNo: settings.requireEmployeeNo
    ? z.string()
        .min(1, 'Employee number is required')
        .max(20, 'Employee number must be less than 20 characters')
    : z.string().max(20).optional().or(z.literal('')),
  
  bankAccount: settings.requireBankAccount
    ? z.string()
        .min(1, 'Bank account is required')
        .min(8, 'Bank account must be at least 8 characters')
        .max(30, 'Bank account must be less than 30 characters')
    : z.string().max(30, 'Bank account must be less than 30 characters').optional().or(z.literal('')),
  
  hoursPerMonth: settings.requireHoursPerMonth
    ? z.coerce.number()
        .min(1, 'Hours per month must be at least 1')
        .max(744, 'Hours per month cannot exceed 744 (31 days × 24 hours)')
    : z.coerce.number().max(744).optional(),
  
  dateOfHire: settings.requireDateOfHire
    ? z.union([z.date(), z.string().transform((str) => new Date(str))]).refine((date) => {
        const actualDate = date instanceof Date ? date : new Date(date)
        if (isNaN(actualDate.getTime())) return false
        const today = new Date()
        const tenYearsAgo = new Date(today.getFullYear() - 10, today.getMonth(), today.getDate())
        const oneYearFromNow = new Date(today.getFullYear() + 1, today.getMonth(), today.getDate())
        return actualDate >= tenYearsAgo && actualDate <= oneYearFromNow
      }, 'Date of hire must be within the last 10 years or up to 1 year in the future')
    : z.union([z.date(), z.string(), z.null()]).optional(),
  
  departmentId: settings.requireDepartment
    ? z.string().min(1, 'Department is required')
    : z.string().optional().or(z.literal('')),
  
  employeeGroupId: z.string().optional(),
  
  email: settings.requireEmail
    ? z.string().min(1, 'Email is required').email('Invalid email format')
    : z.union([
        z.literal(''),
        z.string().email('Invalid email format')
      ]).optional(),
  
  isTeamLeader: z.boolean()
  })
}

export const employeeValidationSchema = createEmployeeValidationSchema(defaultValidationSettings)
