import { getCurrentUserOrEmployee } from '@/shared/lib/auth'

export interface InvoiceCalculation {
  subtotal: number
  discountAmount: number
  totalExclVAT: number
  vatAmount: number
  totalInclVAT: number
}

export async function getBusinessId() {
  const auth = await getCurrentUserOrEmployee()
  if (!auth) {
    return null
  }

  if (auth.type === 'user') {
    return (auth.data as any).businessId
  } else {
    return (auth.data as any).department.businessId
  }
}

export function calculateInvoiceTotals(
  quantity: number,
  pricePerUnit: number,
  discountPercentage: number = 0,
  vatPercentage: number = 25
): InvoiceCalculation {
  // Step 1: Calculate subtotal
  const subtotal = quantity * pricePerUnit
  
  // Step 2: Calculate discount
  const discountAmount = subtotal * (discountPercentage / 100)
  
  // Step 3: Calculate total excluding VAT
  const totalExclVAT = subtotal - discountAmount
  
  // Step 4: Calculate VAT
  const vatAmount = totalExclVAT * (vatPercentage / 100)
  
  // Step 5: Calculate total including VAT
  const totalInclVAT = totalExclVAT + vatAmount
  
  return {
    subtotal: Math.round(subtotal * 100) / 100,
    discountAmount: Math.round(discountAmount * 100) / 100,
    totalExclVAT: Math.round(totalExclVAT * 100) / 100,
    vatAmount: Math.round(vatAmount * 100) / 100,
    totalInclVAT: Math.round(totalInclVAT * 100) / 100
  }
}

export function generateInvoiceNumber(prefix: string = 'INV'): string {
  const year = new Date().getFullYear()
  const timestamp = Date.now()
  return `${prefix}-${year}-${timestamp}`
}