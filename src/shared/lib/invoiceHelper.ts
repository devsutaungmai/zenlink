import { getCurrentUserOrEmployee } from '@/shared/lib/auth'
import Swal from 'sweetalert2'

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

export async function exportToPDF(invoiceId: string) {
  try {
    const response = await fetch(`/api/invoices/export/pdf?invoiceId=${invoiceId}`)

    if (response.ok) {
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `invoice_${invoiceId}.pdf`
      a.click()
      window.URL.revokeObjectURL(url)

      return true
    } else {
      console.error('Failed to export PDF')
      return false
    }
  } catch (error) {
    console.error('Error exporting PDF:', error)
    return false
  }
}

export async function sendEmail(invoiceId: string) {
        try {
            const response = await fetch('/api/invoices/email/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    invoiceId: invoiceId,
                }),
            })

            if (response.ok) {
                Swal.fire({
                    title: 'Success!',
                    text: 'Invoice created and sent email to the customer!',
                    icon: 'success',
                    toast: true,
                    position: 'top-end',
                    showConfirmButton: false,
                    timer: 3000,
                    timerProgressBar: true
                });
            } else {
                const data = await response.json();
                throw new Error(data.error || 'Failed to send invite');
            }
        } catch (error) {
            console.error('Error sending invite:', error);
            Swal.fire({
                title: 'Partial Success!',
                text: 'Invoice created but Email functionality failed!',
                icon: 'info',
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 3000,
                timerProgressBar: true
            });
        }
    }
