import { z } from 'zod'

// Customer Contact validation schema
const customerContactSchema = z.object({
  name: z.string()
    .min(1, 'Contact name is required')
    .min(2, 'Contact name must be at least 2 characters')
    .max(100, 'Contact name must be less than 100 characters'),

  phoneNumber: z.string()
    .max(20, 'Phone number must be less than 20 characters')
    .regex(/^[0-9\s+()-]*$/, 'Phone number can only contain numbers and phone symbols')
    .optional()
    .or(z.literal('')),

  email: z.union([z.literal(''), z.string().email('Invalid email format')]).optional(),

  isPrimary: z.boolean().optional()
})

// Helper to set the first contact as primary if none are marked primary
export function ensurePrimaryContact(contacts?: Array<z.infer<typeof customerContactSchema>>) {
  const arr = Array.isArray(contacts) ? contacts.slice() : []
  if (arr.length > 0 && !arr.some(c => c?.isPrimary === true)) {
    arr[0] = { ...arr[0], isPrimary: true }
  }
  return arr
}

export const customerValidationSchema = z.object({
  customerName: z.string()
    .min(1, 'Customer name is required')
    .min(2, 'Customer name must be at least 2 characters')
    .max(100, 'Customer name must be less than 100 characters'),

  customerNumber: z
    .string()
    .min(1, 'Customer number is required')
    .refine(val => {
      const num = Number(val);
      return !isNaN(num) && num >= 10000;
    }, {
      message: 'Customer number must be at least 10000'
    })
    .refine(val => {
      const num = Number(val);
      return !isNaN(num) && num <= 19999;
    }, {
      message: 'Customer number must be equal to or less than 19999'
    }),


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

  departmentId: z.string().optional().or(z.literal('')),

  customerContacts: z.array(customerContactSchema).default([]),

  // Payment term validation
  customerPaymentTerm: z.object({
    dueDateType: z.enum(['DAYS_AFTER', 'FIXED_DATE']),
    dueDateValue: z.number().optional(),
    dueDateUnit: z.enum(['DAYS', 'MONTHS'])
  })
})

export const projectValidationSchema = z.object({
  name: z.string()
    .min(1, 'Project name is required')
    .min(2, 'Project name must be at least 2 characters')
    .max(100, 'Project name must be less than 100 characters'),

  projectNumber: z
    .string()
    .min(1, 'Project number is required')
    .refine(val => {
      const num = Number(val);
      return !isNaN(num) && num >= 1000;
    }, {
      message: 'Project number must be at least 1000'
    })
    .refine(val => {
      const num = Number(val);
      return !isNaN(num) && num <= 9999;
    }, {
      message: 'Project number must be equal to or less than 9999'
    }),
  categoryId: z.string().optional().or(z.literal('')),
  customerId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),

})

export const productValidationSchema = z.object({
  productName: z.string()
    .min(1, 'Product name is required')
    .min(2, 'Product name must be at least 2 characters')
    .max(100, 'Product name must be less than 100 characters'),

  productNumber: z
    .string()
    .min(1, 'Product number is required')
    .refine(val => {
      const num = Number(val);
      return !isNaN(num) && num >= 1000;
    }, {
      message: 'Product number must be at least 1000'
    })
    .refine(val => {
      const num = Number(val);
      return !isNaN(num) && num <= 9999;
    }, {
      message: 'Product number must be equal to or less than 9999'
    }),

  salesPrice: z.number().optional().default(0),
  costPrice: z.number().optional().default(0),
  discountPercentage: z.number().optional().default(0),
  unitId: z.string().optional().or(z.literal('')),
  productGroupId: z.string().optional().or(z.literal('')),
  ledgerAccountId: z.string().optional().or(z.literal('')),
})