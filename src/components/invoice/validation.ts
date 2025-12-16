import { z } from 'zod'

// Customer Contact validation schema
const customerContactSchema = z.object({
  name: z.string()
    .min(1, 'Contact name is required')
    .min(2, 'Contact name must be at least 2 characters')
    .max(100, 'Contact name must be less than 100 characters'),
  
  phoneNumber: z.string()
    .min(1, 'Contact phone number is required')
    .max(20, 'Phone number must be less than 20 characters')
    .regex(/^[0-9\s+()-]*$/, 'Phone number can only contain numbers and phone symbols'),
  
  email: z.string()
    .min(1, 'Contact email is required')
    .email('Invalid email format'),
  
  isPrimary: z.boolean()
})

export const customerValidationSchema = z.object({
  customerName: z.string()
    .min(1, 'Customer name is required')
    .min(2, 'Customer name must be at least 2 characters')
    .max(100, 'Customer name must be less than 100 characters'),
  
  customerNumber: z.string()
    .min(1, 'Customer number is required')
    .min(1, 'Customer number must be at least 1 character')
    .max(50, 'Customer number must be less than 50 characters'),
  
  organizationNumber: z.string()
    .max(50, 'Organization number must be less than 50 characters')
    .optional()
    .or(z.literal('')),
  
  address: z.string()
    .max(200, 'Address must be less than 200 characters')
    .optional()
    .or(z.literal('')),
  
  postalCode: z.string()
    .max(20, 'Postal code must be less than 20 characters')
    .regex(/^[0-9\s-]*$/, 'Postal code can only contain numbers, spaces and hyphens')
    .optional()
    .or(z.literal('')),
  
  postalAddress: z.string()
    .max(200, 'Postal address must be less than 200 characters')
    .optional()
    .or(z.literal('')),
  
  phoneNumber: z.string()
    .max(20, 'Phone number must be less than 20 characters')
    .regex(/^[0-9\s+()-]*$/, 'Phone number can only contain numbers and phone symbols')
    .optional()
    .or(z.literal('')),
  
  email: z.union([
    z.literal(''),
    z.string().email('Invalid email format')
  ]).optional(),
  
  discountPercentage: z.union([
    z.literal(''),
    z.string().refine((val) => {
      const num = parseFloat(val)
      return !isNaN(num) && num >= 0 && num <= 100
    }, 'Discount must be between 0 and 100')
  ]).optional().or(z.literal(0)),
  
  deliveryAddress: z.string()
    .max(200, 'Delivery address must be less than 200 characters')
    .optional()
    .or(z.literal('')),
  
  deliveryAddressPostalCode: z.string()
    .max(20, 'Delivery postal code must be less than 20 characters')
    .regex(/^[0-9\s-]*$/, 'Postal code can only contain numbers, spaces and hyphens')
    .optional()
    .or(z.literal('')),
  
  deliveryAddressPostalAddress: z.string()
    .max(200, 'Delivery postal address must be less than 200 characters')
    .optional()
    .or(z.literal('')),
  
  departmentId: z.string()
    .min(1, 'Department is required'),
  
  // Customer contacts validation - REQUIRED and must have at least one contact
  customerContacts: z.array(customerContactSchema)
    .min(1, 'At least one customer contact is required')
    .refine(
      (contacts) => contacts.some(contact => contact.isPrimary),
      'At least one contact must be marked as primary'
    ),
  
  // Payment term validation
  customerPaymentTerm: z.object({
    dueDateType: z.enum(['DAYS_AFTER', 'FIXED_DATE']),
    dueDateValue: z.number().optional(),
    dueDateUnit: z.enum(['DAYS', 'MONTHS'])
  })
})