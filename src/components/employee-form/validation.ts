import { z } from 'zod'

export const employeeValidationSchema = z.object({
  firstName: z.string()
    .min(1, 'First name is required')
    .min(2, 'First name must be at least 2 characters')
    .max(50, 'First name must be less than 50 characters')
    .regex(/^[a-zA-ZÀ-ÿ\s'-]+$/, 'First name can only contain letters, spaces, apostrophes and hyphens'),
  
  lastName: z.string()
    .min(1, 'Last name is required')
    .min(2, 'Last name must be at least 2 characters')
    .max(50, 'Last name must be less than 50 characters')
    .regex(/^[a-zA-ZÀ-ÿ\s'-]+$/, 'Last name can only contain letters, spaces, apostrophes and hyphens'),
  
  birthday: z.union([z.date(), z.string().transform((str) => new Date(str))]).refine((date) => {
    const actualDate = date instanceof Date ? date : new Date(date)
    if (isNaN(actualDate.getTime())) return false
    
    const today = new Date()
    const hundredYearsAgo = new Date(today.getFullYear() - 100, today.getMonth(), today.getDate())
    const eighteenYearsAgo = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate())
    return actualDate >= hundredYearsAgo && actualDate <= eighteenYearsAgo
  }, 'Employee must be between 18 and 100 years old'),
  
  sex: z.enum(['MALE', 'FEMALE', 'OTHER']),
  
  socialSecurityNo: z.string()
    .min(1, 'Social security number is required')
    .min(9, 'Social security number must be at least 9 characters')
    .max(20, 'Social security number must be less than 20 characters'),
  
  address: z.string()
    .min(1, 'Address is required')
    .min(10, 'Address must be at least 10 characters')
    .max(200, 'Address must be less than 200 characters'),
  
  countryCode: z.string()
    .min(1, 'Country code is required')
    .regex(/^\+\d{1,4}$/, 'Invalid country code format'),
  
  mobile: z.string()
    .min(1, 'Mobile number is required')
    .min(8, 'Mobile number must be at least 8 digits')
    .max(15, 'Mobile number must be less than 15 digits')
    .regex(/^[0-9]+$/, 'Mobile number can only contain numbers'),
  
  employeeNo: z.string()
    .min(1, 'Employee number is required')
    .min(1, 'Employee number must be at least 1 characters')
    .max(20, 'Employee number must be less than 20 characters'),
  
  bankAccount: z.string()
    .min(1, 'Bank account is required')
    .min(8, 'Bank account must be at least 8 characters')
    .max(30, 'Bank account must be less than 30 characters'),
  
  hoursPerMonth: z.number()
    .min(1, 'Hours per month must be at least 1')
    .max(744, 'Hours per month cannot exceed 744 (31 days × 24 hours)'),
  
  dateOfHire: z.union([z.date(), z.string().transform((str) => new Date(str))]).refine((date) => {
    const actualDate = date instanceof Date ? date : new Date(date)
    if (isNaN(actualDate.getTime())) return false
    
    const today = new Date()
    const tenYearsAgo = new Date(today.getFullYear() - 10, today.getMonth(), today.getDate())
    const oneYearFromNow = new Date(today.getFullYear() + 1, today.getMonth(), today.getDate())
    return actualDate >= tenYearsAgo && actualDate <= oneYearFromNow
  }, 'Date of hire must be within the last 10 years or up to 1 year in the future'),
  
  departmentId: z.string()
    .min(1, 'Department is required'),
  
  employeeGroupId: z.string().optional(),
  
  email: z.union([
    z.literal(''),
    z.string().email('Invalid email format')
  ]).optional(),
  
  isTeamLeader: z.boolean()
})
