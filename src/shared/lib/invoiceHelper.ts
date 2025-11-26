import { getCurrentUserOrEmployee } from '@/shared/lib/auth'
import Swal from 'sweetalert2'
import { prisma } from './prisma'
import { InvoiceStatus, Prisma } from '@prisma/client'

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

/**
* Post invoice to ledger when status changes to SENT
* Creates entries for:
* 1. DR 1500 (Accounts Receivable) / CR Sales Account (Revenue excl VAT)
* 2. DR 1500 (Accounts Receivable) / CR 3200 (VAT Payable)
*/
export async function invoiceToLedgerPosting(invoiceId: string) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      customer: {
        select: {
          customerName: true
        }
      },
      invoiceLines: {
        include: {
          product: {
            include: {
              salesAccount: {
                include: {
                  ledgerAccount: true
                }
              }
            }
          }
        }
      }
    }
  });

  if (!invoice) {
    throw new Error('Invoice not found');
  }

  if (invoice.status !== InvoiceStatus.SENT) {
    throw new Error('Invoice must be in SENT status to post to ledger');
  }

  // Check if already posted
  const existingEntries = await prisma.ledgerEntry.findFirst({
    where: { invoiceId: invoice.id }
  });

  if (existingEntries) {
    throw new Error('Invoice already posted to ledger');
  }

  const businessId = invoice.businessId;
  const postingDate = new Date();
  const documentDate = invoice.invoiceDate;

  // Get standard accounts
  const accountsReceivable = await prisma.ledgerAccount.findFirst({
    where: { accountNumber: 1500 }
  });

  if (!accountsReceivable) {
    throw new Error('Required ledger account not found: 1500 (Kundefordringer)');
  }

  await prisma.$transaction(async (tx) => {
    // Update invoice status to OUTSTANDING
    await tx.invoice.update({
      where: { id: invoice.id },
      data: {
        status: InvoiceStatus.OUTSTANDING,
        sentAt: invoice.sentAt || new Date()
      }
    });

    for (const line of invoice.invoiceLines) {
      const salesAccount = line.product.salesAccount;
      if (!salesAccount?.ledgerAccountId) {
        throw new Error(`Product ${line.productName} has no linked ledger account`);
      }

      const lineTotal = parseFloat(line.lineTotal.toString());

      // Entry: DR 1500 (Accounts Receivable) / CR 3000 Sales Account (Revenue excl VAT)
      // One entry per product line
      await tx.ledgerEntry.create({
        data: {
          businessId,
          invoiceId: invoice.id,
          documentDate,
          postingDate,
          debitAccountId: accountsReceivable.id,
          creditAccountId: salesAccount.ledgerAccountId,
          amount: lineTotal,
          projectId: invoice.projectId,
          departmentId: invoice.departmentId,
          description: `Faktura nummer ${invoice.invoiceNumber} til ${invoice.customer?.customerName || 'customer'}`
        }
      });
    }

    // Entry: DR 1500 / CR VAT Account - Amount: invoice.vatAmount (Coming soon)
  });

  return {
    success: true,
    message: `Invoice ${invoice.invoiceNumber} posted to ledger`,
    entriesCreated: invoice.invoiceLines.length // One per product line (VAT will be added later)
  };
}

/**
 * Calculate opening balance for an account at a specific date
 * Opening Balance = Sum of all entries BEFORE the date
 */
export async function getOpeningBalance(
  businessId: string,
  accountNumber: number,
  asOfDate: Date
): Promise<number> {
  // Get the account
  const account = await prisma.ledgerAccount.findFirst({
    where: { businessId, accountNumber }
  });

  if (!account) return 0;

  // Sum all debits before the date
  const debits = await prisma.ledgerEntry.aggregate({
    where: {
      businessId,
      debitAccountId: account.id,
      postingDate: { lt: asOfDate }
    },
    _sum: { amount: true }
  });

  // Sum all credits before the date
  const credits = await prisma.ledgerEntry.aggregate({
    where: {
      businessId,
      creditAccountId: account.id,
      postingDate: { lt: asOfDate }
    },
    _sum: { amount: true }
  });

  const debitTotal = debits._sum.amount?.toNumber() || 0;
  const creditTotal = credits._sum.amount?.toNumber() || 0;

  // For Asset/Expense accounts: Debit increases, Credit decreases
  // For Liability/Income/Equity: Credit increases, Debit decreases
  if (account.type === 'ASSET' || account.type === 'EXPENSE') {
    return debitTotal - creditTotal;
  } else {
    return creditTotal - debitTotal;
  }
}

/**
 * Calculate closing balance for an account at a specific date
 * Closing Balance = Opening Balance + Movements during the period
 */
export async function getClosingBalance(
  businessId: string,
  accountNumber: number,
  asOfDate: Date
): Promise<number> {
  const account = await prisma.ledgerAccount.findFirst({
    where: { businessId, accountNumber }
  });

  if (!account) return 0;

  // Sum all debits up to and including the date
  const debits = await prisma.ledgerEntry.aggregate({
    where: {
      businessId,
      debitAccountId: account.id,
      postingDate: { lte: asOfDate }
    },
    _sum: { amount: true }
  });

  // Sum all credits up to and including the date
  const credits = await prisma.ledgerEntry.aggregate({
    where: {
      businessId,
      creditAccountId: account.id,
      postingDate: { lte: asOfDate }
    },
    _sum: { amount: true }
  });

  const debitTotal = debits._sum.amount?.toNumber() || 0;
  const creditTotal = credits._sum.amount?.toNumber() || 0;

  if (account.type === 'ASSET' || account.type === 'EXPENSE') {
    return debitTotal - creditTotal;
  } else {
    return creditTotal - debitTotal;
  }
}

/**
 * Generate account statement (like your Tripletex screenshot)
 * Shows: Opening Balance, Transactions, Closing Balance
 */
export async function getAccountStatement(
  businessId: string,
  accountNumber: number,
  startDate: Date,
  endDate: Date
) {
  const account = await prisma.ledgerAccount.findFirst({
    where: { businessId, accountNumber }
  });

  if (!account) throw new Error('Account not found');

  // Calculate opening balance (before start date)
  const openingBalance = await getOpeningBalance(businessId, accountNumber, startDate);

  // Get all transactions in the period
  const entries = await prisma.ledgerEntry.findMany({
    where: {
      businessId,
      OR: [
        { debitAccountId: account.id },
        { creditAccountId: account.id }
      ],
      postingDate: {
        gte: startDate,
        lte: endDate
      }
    },
    include: {
      invoice: true,
      debitAccount: true,
      creditAccount: true
    },
    orderBy: { postingDate: 'asc' }
  });

  // Calculate movements
  const transactions = entries.map(entry => {
    const isDebit = entry.debitAccountId === account.id;
    const amount = entry.amount.toNumber();
    
    return {
      date: entry.postingDate,
      description: entry.description,
      voucher: entry.invoice?.invoiceNumber,
      debit: isDebit ? amount : 0,
      credit: !isDebit ? amount : 0,
      amount: isDebit ? amount : -amount
    };
  });

  // Calculate closing balance
  const closingBalance = await getClosingBalance(businessId, accountNumber, endDate);

  return {
    account: {
      number: account.accountNumber,
      name: account.name,
      type: account.type
    },
    period: { startDate, endDate },
    openingBalance,
    transactions,
    closingBalance
  };
}