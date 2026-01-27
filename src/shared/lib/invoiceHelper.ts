import { getCurrentUserOrEmployee } from '@/shared/lib/auth'
import Swal from 'sweetalert2'
import { prisma } from './prisma'
import { AccountType, InvoiceStatus, LedgerEntryType, Prisma, VoucherType } from '@prisma/client'
import { isValid } from 'date-fns'

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

export async function generateInvoiceNumber(
  businessId: string,
  tx?: Prisma.TransactionClient
) {
  const year = new Date().getFullYear();
  const txClient = tx || prisma;

  await txClient.$executeRaw`
    SELECT 1 FROM "Business"
    WHERE id = ${businessId}
    FOR UPDATE
  `;
  // Get invoice settings for the starting number
  const settings = await txClient.invoiceGeneralSetting.findUnique({
    where: { businessId }
  });

  const lastInvoice = await txClient.invoice.findFirst({
    where: { businessId, year, status: InvoiceStatus.OUTSTANDING },
    orderBy: { sequence: 'desc' }
  });

  const firstInvoiceNumber = settings?.firstInvoiceNumber || 1;
  const nextSeq = lastInvoice ? lastInvoice.sequence + 1 : firstInvoiceNumber;

  return {
    year,
    sequence: nextSeq,
    invoiceNumber: `${businessId}-${year}-${nextSeq}`
  };
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

export async function sendEmail(invoiceId: string, type?: string) {
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
        text: type === "invoiced" ? "Email sent to the customer!" : "Invoice created and sent email to the customer!",
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
 * Create a credit note for an existing invoice
 * This will:
 * 1. Mark original invoice as CREDITED
 * 2. Create new invoice with negative amounts (credit note)
 * 3. Post credit note to ledger (reversed entries)
 */
export async function createCreditNote(params: {
  originalInvoiceId: string;
  reason?: string;
  creditNoteDate?: Date;
  businessId: string
}) {
  const { originalInvoiceId, reason, creditNoteDate = new Date(), businessId } = params;

  // Fetch original invoice with all details
  const originalInvoice = await prisma.invoice.findUnique({
    where: { id: originalInvoiceId },
    include: {
      customer: true,
      invoiceLines: {
        include: {
          product: true
        }
      },
      project: true,
      department: true
    }
  });

  if (!originalInvoice) {
    throw new Error('Original invoice not found');
  }

  // Validate invoice can be credited
  if (originalInvoice.status === InvoiceStatus.DRAFT) {
    throw new Error('Cannot credit a draft invoice');
  }

  if (originalInvoice.status === InvoiceStatus.CREDITED) {
    throw new Error('Invoice has already been credited');
  }

  if (originalInvoice.status === InvoiceStatus.CREDIT_NOTE) {
    throw new Error('Cannot credit a credit note');
  }

  let creditNote: any = null;

  await prisma.$transaction(async (tx) => {

    // Generate credit note number
    const { year, sequence, creditNoteNumber } = await generateCreditNoteNumber(originalInvoice.businessId, tx);

    // 1. Update original invoice status to CREDITED
    await tx.invoice.update({
      where: { id: originalInvoiceId },
      data: {
        status: InvoiceStatus.CREDITED,
        updatedAt: new Date()
      }
    });

    const voucher = await generateVoucherNumber(businessId, VoucherType.CREDIT_NOTE, tx);

    // 2. Create credit note (new invoice with negative amounts)
    creditNote = await tx.invoice.create({
      data: {
        invoiceNumber: creditNoteNumber,
        year: year,
        sequence: sequence,
        invoiceDate: creditNoteDate,
        dueDate: creditNoteDate, // Credit notes don't have due dates
        status: InvoiceStatus.CREDIT_NOTE,

        customerId: originalInvoice.customerId,
        businessId: originalInvoice.businessId,
        projectId: originalInvoice.projectId,
        departmentId: originalInvoice.departmentId,
        contactPersonId: originalInvoice.contactPersonId,

        // Negative amounts for credit note
        totalExclVAT: -originalInvoice.totalExclVAT,
        totalVatAmount: -originalInvoice.totalVatAmount,
        totalInclVAT: -originalInvoice.totalInclVAT,

        // Link to original invoice
        creditedInvoiceId: originalInvoiceId,

        notes: reason || `Kreditnota for faktura ${formatInvoiceNumberForDisplay(originalInvoice.invoiceNumber)} opprettet automatisk. customer: ${originalInvoice.customer?.customerName || ''}`,
        voucherId: voucher.id,

        invoiceLines: {
          create: originalInvoice.invoiceLines.map(line => ({
            productId: line.productId,
            quantity: line.quantity, // Keep positive for display
            pricePerUnit: line.pricePerUnit,
            discountPercentage: line.discountPercentage,

            // Negative amounts for credit note
            subtotal: -line.subtotal,
            discountAmount: -line.discountAmount,
            lineTotal: -line.lineTotal,

            productName: line.productName,
            productNumber: line.productNumber,
          }))
        }
      },
      include: {
        invoiceLines: {
          include: {
            product: {
              include: {
                ledgerAccount: true
              }
            }
          }
        }
      }
    });
  });

  // 3. Post credit note to ledger using the standard function
  // The invoiceToLedgerPosting function will detect it's a credit note
  // and automatically reverse the entries
  if (!creditNote) {
    throw new Error('Failed to create credit note');
  }
  await invoiceToLedgerPosting(creditNote.id);

  return {
    success: true,
    creditNote,
    message: `Credit note created for invoice ${originalInvoice.invoiceNumber}`
  };
}

/**
 * Generate next credit note number
 * Format: CN-YYYY-NNNN (e.g., CN-2025-0001)
 */
export async function generateCreditNoteNumber(businessId: string, tx?: Prisma.TransactionClient) {
  const year = new Date().getFullYear();
  const txClient = tx || prisma;

  // ✅ Lock the business row
  await txClient.$executeRaw`
    SELECT 1 FROM "Business" 
    WHERE id = ${businessId} 
    FOR UPDATE
  `;

  const last = await txClient.invoice.findFirst({
    where: {
      businessId,
      year
    },
    orderBy: { sequence: 'desc' }
  });

  const sequence = last ? last.sequence + 1 : 1;

  const creditNoteNumber = `CN-${businessId}-${year}-${sequence.toString().padStart(4, '0')}`;

  return { year, sequence, creditNoteNumber };
}

export async function generateVoucherNumber(
  businessId: string,
  type: VoucherType,
  tx?: Prisma.TransactionClient
) {
  const year = new Date().getFullYear();
  const txClient = tx || prisma;

  // ✅ Lock the business row
  await txClient.$executeRaw`
    SELECT 1 FROM "Business" 
    WHERE id = ${businessId} 
    FOR UPDATE
  `;

  // ✅ Find the last sequence for this business + year
  const lastVoucher = await txClient.voucher.findFirst({
    where: { businessId, year },
    orderBy: { sequence: "desc" }
  });

  const nextSeq = lastVoucher ? lastVoucher.sequence + 1 : 1;

  // ✅ Format: businessId-year-sequence
  // Example: cmjba1dlg0000pgutvum2gxvn-2025-1
  const voucherNumber = `${businessId}-${year}-${nextSeq}`;

  console.log('Generated voucherNumber:', voucherNumber);

  // Create voucher row
  const voucher = await txClient.voucher.create({
    data: {
      businessId,
      year,
      sequence: nextSeq,
      voucherNumber,
      type
    }
  });

  return voucher;
}

export async function generateCustomerNumber(
  businessId: string,
  tx?: Prisma.TransactionClient
) {
  const year = new Date().getFullYear();
  const txClient = tx || prisma;

  await txClient.$executeRaw`
    SELECT 1 FROM "Business"
    WHERE id = ${businessId}
    FOR UPDATE
  `;
  // Get invoice settings for the starting number
  const settings = await txClient.invoiceGeneralSetting.findUnique({
    where: { businessId }
  });

  const lastCustomer = await txClient.customer.findFirst({
    where: { businessId, year },
    orderBy: { sequence: 'desc' }
  });

  const firstCustomerNumber = settings?.customerNumberSeriesStart || 10000;
  const nextSeq = lastCustomer ? lastCustomer.sequence + 1 : firstCustomerNumber;

  if (nextSeq > (settings?.customerNumberSeriesEnd || 19999)) {
    throw new Error('Customer number series exceeded the maximum limit for the year.');
  }

  return {
    year,
    sequence: nextSeq,
    customerNumber: `${businessId}-${year}-${nextSeq}`
  };
}

export function formatCustomerNumberForDisplay(number: string): string {
  const parts = number.split('-');

  if (parts.length >= 3) {
    const sequence = parts[parts.length - 1];
    return sequence;
  }

  return number;
}

// src/shared/lib/voucherHelper.ts

export function formatVoucherNumberForDisplay(voucherNumber: string): string {
  // Split: "cmjba1dlg0000pgutvum2gxvn-2025-1" 
  // Returns: "2025-1"
  const parts = voucherNumber.split('-');

  if (parts.length >= 3) {
    // Get last two parts: year and sequence
    const year = parts[parts.length - 2];
    const sequence = parts[parts.length - 1];
    return `${year}-${sequence}`;
  }

  // Fallback if format is unexpected
  return voucherNumber;
}

export function formatInvoiceNumberForDisplay(number: string): string {
  // Credit note
  if (number.startsWith('CN-')) {
    return formatCreditNoteNumberForDisplay(number);
  }

  // Normal invoice
  const parts = number.split('-');

  if (parts.length >= 3) {
    const sequence = parts[parts.length - 1];
    return sequence;
  }

  return number;
}

export function formatCreditNoteNumberForDisplay(creditNoteNumber: string): string {
  // Expected format: "CN-cmjba1dlg0000pgutvum2gxvn-2025-1888"
  const parts = creditNoteNumber.split('-');

  if (parts.length >= 4) {
    const cn = parts[parts.length - 4];
    const year = parts[parts.length - 2];
    const sequence = parts[parts.length - 1];
    return `${cn}-${year}-${sequence}`; // Remove leading zeros
  }

  return creditNoteNumber; // Fallback
}

export function parseVoucherNumber(voucherNumber: string) {
  // Split: "cmjba1dlg0000pgutvum2gxvn-2025-1"
  const parts = voucherNumber.split('-');

  if (parts.length >= 3) {
    const sequence = parts[parts.length - 1];
    const year = parts[parts.length - 2];
    const businessId = parts.slice(0, -2).join('-'); // Handle if businessId contains dashes

    return {
      businessId,
      year: parseInt(year),
      sequence: parseInt(sequence),
      displayNumber: `${year}-${sequence}`
    };
  }

  return null;
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
          id: true,
          customerName: true,
        }
      },
      invoiceLines: {
        include: {
          product: {
            include: {
              ledgerAccount: true
            }
          }
        }
      }
    }
  });

  if (!invoice) {
    throw new Error('Invoice not found');
  }

  // Check if this is a credit note
  const isCreditNote = invoice.status === InvoiceStatus.CREDIT_NOTE;

  // For normal invoices, must be SENT status
  if (!isCreditNote && invoice.status !== InvoiceStatus.SENT) {
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

  const vatPayable = await prisma.ledgerAccount.findFirst({
    where: { accountNumber: 2701 }
  });

  if (!accountsReceivable || !vatPayable) {
    throw new Error('Required ledger accounts not found (1500, 2701)');
  }

  await prisma.$transaction(async (tx) => {
    // Update invoice status (only for normal invoices, not credit notes)
    if (!isCreditNote) {
      await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          status: InvoiceStatus.OUTSTANDING,
          sentAt: invoice.sentAt || new Date()
        }
      });
    }

    for (const line of invoice.invoiceLines) {
      const ledgerAccountId = line.product.ledgerAccount?.id;
      if (!ledgerAccountId) {
        throw new Error(`Product ${line.productName} has no linked ledger account`);
      }

      const lineTotal = Math.abs(parseFloat(line.lineTotal.toString()));

      if (isCreditNote) {
        // CREDIT NOTE: DR Sales Account / CR 1500 (REVERSED)
        await tx.ledgerEntry.create({
          data: {
            entryType: LedgerEntryType.CREDIT_NOTE,
            businessId,
            invoiceId: invoice.id,
            voucherId: invoice.voucherId ?? "",
            documentDate,
            postingDate,
            debitAccountId: ledgerAccountId,
            creditAccountId: accountsReceivable.id,
            amount: lineTotal,
            projectId: invoice.projectId,
            departmentId: invoice.departmentId,
            description: `Kredit nota ${formatInvoiceNumberForDisplay(invoice.invoiceNumber)} til ${invoice.customer?.customerName || 'customer'} ${invoice.customer?.id || ''}`
          }
        });
      } else {
        // NORMAL INVOICE: DR 1500 / CR Sales Account
        await tx.ledgerEntry.create({
          data: {
            entryType: LedgerEntryType.INVOICE_POST,
            businessId,
            invoiceId: invoice.id,
            voucherId: invoice.voucherId ?? "",
            documentDate,
            postingDate,
            debitAccountId: accountsReceivable.id,
            creditAccountId: ledgerAccountId,
            amount: lineTotal,
            projectId: invoice.projectId,
            departmentId: invoice.departmentId,
            description: `Faktura nummer ${formatInvoiceNumberForDisplay(invoice.invoiceNumber)} til ${invoice.customer?.customerName || 'customer'} ${invoice.customer?.id || ''}`
          }
        });
      }
    }

    // VAT Entry
    const vatAmount = Math.abs(parseFloat(invoice.totalVatAmount.toString()));

    if (vatAmount > 0) {
      if (isCreditNote) {
        // CREDIT NOTE: DR 2701 / CR 1500 (REVERSED)
        await tx.ledgerEntry.create({
          data: {
            entryType: LedgerEntryType.CREDIT_NOTE,
            businessId,
            invoiceId: invoice.id,
            voucherId: invoice.voucherId ?? "",
            documentDate,
            postingDate,
            debitAccountId: vatPayable.id,
            creditAccountId: accountsReceivable.id,
            amount: vatAmount,
            projectId: invoice.projectId,
            departmentId: invoice.departmentId,
            description: `Kredit nota ${formatInvoiceNumberForDisplay(invoice.invoiceNumber)} till ${invoice.customer?.customerName || 'customer'} ${invoice.customer?.id || ''}`
          }
        });
      } else {
        // NORMAL INVOICE: DR 1500 / CR 2701
        await tx.ledgerEntry.create({
          data: {
            entryType: LedgerEntryType.INVOICE_POST,
            businessId,
            invoiceId: invoice.id,
            voucherId: invoice.voucherId ?? "",
            documentDate,
            postingDate,
            debitAccountId: accountsReceivable.id,
            creditAccountId: vatPayable.id,
            amount: vatAmount,
            projectId: invoice.projectId,
            departmentId: invoice.departmentId,
            description: `Faktura nummer ${formatInvoiceNumberForDisplay(invoice.invoiceNumber)} til ${invoice.customer?.customerName || 'customer'} ${invoice.customer?.id || ''}`
          }
        });
      }
    }
  });

  return {
    success: true,
    message: `${isCreditNote ? 'Credit note' : 'Invoice'} ${invoice.invoiceNumber} posted to ledger`,
    entriesCreated: invoice.invoiceLines.length + (Number(invoice.totalVatAmount) > 0 ? 1 : 0)
  };
}


/**
 * Calculate TRUE account balance using proper accounting principles
 * ASSET/EXPENSE: Debit increases balance, Credit decreases
 * LIABILITY/EQUITY/INCOME: Credit increases balance, Debit decreases
 */
export async function getAccountBalance(
  accountId: string,
  businessId: string,
  startDate?: Date,
  endDate?: Date
) {
  const account = await prisma.ledgerAccount.findUnique({
    where: { id: accountId },
    select: { type: true }
  });

  if (!account) {
    throw new Error('Account not found');
  }

  const whereClause: any = {
    businessId,
    OR: [
      { debitAccountId: accountId },
      { creditAccountId: accountId }
    ]
  };

  if (startDate) {
    whereClause.postingDate = { gte: startDate };
  }
  if (endDate) {
    whereClause.postingDate = { ...whereClause.postingDate, lte: endDate };
  }

  const entries = await prisma.ledgerEntry.findMany({
    where: whereClause,
    orderBy: { postingDate: 'asc' }
  });

  let balance = 0;

  // Use proper accounting rules for balance calculation
  const isNormalDebit = account.type === 'ASSET' || account.type === 'EXPENSE';

  for (const entry of entries) {
    const amount = parseFloat(entry.amount.toString());

    if (entry.debitAccountId === accountId) {
      // This account was debited
      balance += isNormalDebit ? amount : -amount;
    } else if (entry.creditAccountId === accountId) {
      // This account was credited
      balance += isNormalDebit ? -amount : amount;
    }
  }

  return balance;
}


/**
 * Generate ledger report matching Tripletex display format
 * Groups account 1500 ONLY for INVOICE_POST and CREDIT_NOTE types
 */
export async function generateLedgerReport(
  businessId: string,
  startDate: Date,
  endDate: Date,
  accountNumbers?: number[]
) {
  // Define which accounts to include
  const whereClause: any = {};
  // Filter accounts: use provided numbers OR default to 1500-4000 range
  if (accountNumbers && accountNumbers.length > 0) {
    whereClause.accountNumber = { in: accountNumbers };
  } else {
    whereClause.accountNumber = {
      gte: 1500,
      lte: 4000
    };
  }

  // Step 1: Fetch all accounts (same as before)
  const accounts = await prisma.ledgerAccount.findMany({
    where: whereClause,
    orderBy: { accountNumber: 'asc' }
  });

  const dayBeforeStart = new Date(startDate);
  dayBeforeStart.setDate(dayBeforeStart.getDate() - 1);
  dayBeforeStart.setHours(23, 59, 59, 999);

  // ========== OPTIMIZATION START ==========

  // Step 2: Get all account IDs
  const accountIds = accounts.map(a => a.id);

  // Step 3: Fetch ALL entries for ALL accounts in ONE query (instead of looping)
  // BEFORE: You did this INSIDE the loop, one query per account
  // AFTER: We do it ONCE for all accounts
  const allEntries = await prisma.ledgerEntry.findMany({
    where: {
      businessId,
      OR: [
        { debitAccountId: { in: accountIds } },  // Get entries where ANY account is debited
        { creditAccountId: { in: accountIds } }  // Get entries where ANY account is credited
      ],
      postingDate: {
        gte: startDate,
        lte: endDate
      }
    },
    include: {
      voucher: {
        select: {
          id: true,
          voucherNumber: true
        }
      },
      invoice: {
        select: {
          invoiceNumber: true,
          status: true,
          voucher: {
            select: {
              id: true,
              voucherNumber: true
            }
          },
          customer: {
            select: {
              id: true,
              customerName: true,
              customerNumber: true
            }
          }
        }
      },
      debitAccount: true,
      creditAccount: true
    },
    orderBy: [
      { postingDate: 'asc' },
      { createdAt: 'asc' }
    ]
  });

  // Step 4: Calculate ALL opening balances in PARALLEL (instead of one-by-one)
  // BEFORE: You did await getAccountBalance() inside the loop - each one waited for the previous
  // AFTER: Promise.all() runs them all at the same time
  const openingBalances = await Promise.all(
    accounts.map(account =>
      getAccountBalance(
        account.id,
        businessId,
        undefined,
        dayBeforeStart
      )
    )
  );

  // Step 5: Organize entries by account for quick lookup
  // This creates a Map where: key = accountId, value = array of entries for that account
  const entriesByAccount = new Map<string | null, typeof allEntries>();

  allEntries.forEach(entry => {
    // Each entry appears in TWO accounts: debit and credit
    const debitId = entry.debitAccountId;
    const creditId = entry.creditAccountId;

    // Initialize arrays if they don't exist
    if (!entriesByAccount.has(debitId)) {
      entriesByAccount.set(debitId, []);
    }
    if (!entriesByAccount.has(creditId)) {
      entriesByAccount.set(creditId, []);
    }

    // Add this entry to both accounts
    entriesByAccount.get(debitId)!.push(entry);
    entriesByAccount.get(creditId)!.push(entry);
  });

  // ========== OPTIMIZATION END ==========

  const accountGroups = [];

  // Step 6: Process each account (YOUR ORIGINAL LOGIC - UNCHANGED!)
  for (let i = 0; i < accounts.length; i++) {
    const account = accounts[i];

    // Get pre-calculated opening balance from Step 4
    const openingBalance = openingBalances[i];

    // Get pre-fetched entries from Step 5 (instead of querying database)
    const entries = entriesByAccount.get(account.id) || [];

    // Skip accounts with no activity and zero opening balance
    if (entries.length === 0 && Math.abs(openingBalance) < 0.01) {
      continue;
    }

    // ========== YOUR ORIGINAL LOGIC BELOW - NO CHANGES ==========

    // For calculating running balance, use PROPER ACCOUNTING
    const isNormalDebit = account.type === 'ASSET' || account.type === 'EXPENSE';
    let runningBalance = openingBalance;

    // Group 1500 entries ONLY for INVOICE_POST and CREDIT_NOTE
    const shouldGroupByInvoice =
      account.accountNumber === 1500 ||
      (account.accountNumber >= 3000 && account.accountNumber < 4000);

    let ledgerEntries;

    if (shouldGroupByInvoice) {
      // Separate entries into grouped and ungrouped
      const groupedMap = new Map<string, {
        invoiceId: string | null;
        voucherNo: string;
        date: Date;
        description: string;
        displayAmount: number;
        trueMovement: number;
      }>();

      const allEntriesForDisplay: Array<{
        type: 'grouped' | 'ungrouped';
        date: Date;
        data: any;
      }> = [];

      for (const entry of entries) {
        const amount = parseFloat(entry.amount.toString());
        const isDebit = entry.debitAccountId === account.id;

        // Calculate TRUE movement using accounting principles
        const trueMovement = isDebit
          ? (isNormalDebit ? amount : -amount)
          : (isNormalDebit ? -amount : amount);

        // Calculate DISPLAY amount (Tripletex: Debit = +, Credit = -)
        const displayAmount = isDebit ? amount : -amount;

        // Group INVOICE_POST and CREDIT_NOTE only
        if (
          entry.entryType === LedgerEntryType.INVOICE_POST ||
          entry.entryType === LedgerEntryType.CREDIT_NOTE
        ) {
          const groupKey = entry.invoiceId || `no-invoice-${entry.id}`;
          const voucherNo = entry.voucher?.voucherNumber || `V-${entry.id.slice(-8)}`;
          const customerName = entry.invoice?.customer?.customerName || '';
          const customerId = entry.invoice?.customer?.id || '';
          const invoiceDisplayNumber = entry.invoice?.invoiceNumber ? formatInvoiceNumberForDisplay(entry.invoice?.invoiceNumber) : '';

          if (!groupedMap.has(groupKey)) {
            groupedMap.set(groupKey, {
              invoiceId: entry.invoiceId,
              voucherNo,
              date: entry.postingDate || new Date(),
              description: entry.invoiceId
                ? `Faktura nummer ${invoiceDisplayNumber} til (${customerName}) ${customerId}`
                : entry.description || '',
              displayAmount: displayAmount,
              trueMovement: trueMovement
            });
          } else {
            const group = groupedMap.get(groupKey)!;
            group.displayAmount += displayAmount;
            group.trueMovement += trueMovement;
          }
        } else {
          // Don't group PAYMENT_RECEIVED, etc.
          allEntriesForDisplay.push({
            type: 'ungrouped',
            date: entry.postingDate || new Date(),
            data: {
              entry,
              displayAmount,
              trueMovement
            }
          });
        }
      }

      // Add grouped entries to display list
      groupedMap.forEach((group) => {
        allEntriesForDisplay.push({
          type: 'grouped',
          date: group.date,
          data: group
        });
      });

      // Sort all entries by date
      allEntriesForDisplay.sort((a, b) => a.date.getTime() - b.date.getTime());

      // Build ledger entries with running balance
      ledgerEntries = allEntriesForDisplay.map((item) => {
        if (item.type === 'grouped') {
          const group = item.data;
          runningBalance += group.trueMovement;

          return {
            id: group.invoiceId || `grouped-${group.date.getTime()}`,
            closed: true,
            voucherNo: group.voucherNo,
            date: group.date.toISOString().split('T')[0],
            description: group.description,
            vatCode: undefined,
            currency: undefined,
            amount: group.displayAmount,
            balance: runningBalance,
            hasAttachment: false
          };
        } else {
          // Ungrouped entry
          const { entry, displayAmount, trueMovement } = item.data;
          runningBalance += trueMovement;

          const voucherNo = entry.voucher?.voucherNumber || `V-${entry.id.slice(-8)}`;

          return {
            id: entry.id,
            closed: true,
            voucherNo,
            date: entry.postingDate?.toISOString().split('T')[0] || '',
            description: entry.description || '',
            vatCode: undefined,
            currency: undefined,
            amount: displayAmount,
            balance: runningBalance,
            hasAttachment: false
          };
        }
      });
    } else {
      // For non-1500 accounts: Show all entries individually
      ledgerEntries = entries.map(entry => {
        const amount = parseFloat(entry.amount.toString());
        const isDebit = entry.debitAccountId === account.id;

        // TRUE movement (accounting rules)
        const trueMovement = isDebit
          ? (isNormalDebit ? amount : -amount)
          : (isNormalDebit ? -amount : amount);

        // DISPLAY amount (Tripletex: Debit = +, Credit = -)
        const displayAmount = isDebit ? amount : -amount;

        runningBalance += trueMovement;

        const voucherNo = entry.voucher?.voucherNumber || `V-${entry.id.slice(-8)}`;

        const isVATEntry =
          entry.creditAccount?.accountNumber === 2740 ||
          entry.debitAccount?.accountNumber === 2740;

        return {
          id: entry.id,
          closed: true,
          voucherNo,
          date: entry.postingDate?.toISOString().split('T')[0] || '',
          description: entry.description || '',
          vatCode: isVATEntry ? '3' : undefined,
          vatName: isVATEntry ? 'Output VAT, high rate' : undefined,
          currency: undefined,
          amount: displayAmount,
          balance: runningBalance,
          hasAttachment: false
        };
      });
    }

    accountGroups.push({
      id: account.id,
      code: account.accountNumber.toString(),
      name: account.name,
      type: account.type,
      openingBalance,
      closingBalance: runningBalance,
      entries: ledgerEntries
    });
  }

  return {
    accounts: accountGroups,
    period: {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    },
    totalBalance: accountGroups.reduce((sum, acc) => sum + acc.closingBalance, 0)
  };
}


export function getAccountType(accountNumber: number): AccountType {
  // Check specific ranges first (order matters!)
  
  // 2000-2080 -> EQUITY (overrides general 2xxx LIABILITY rule)
  if (accountNumber >= 2000 && accountNumber <= 2080) {
    return AccountType.EQUITY;
  }
  
  // 8100-8170 -> EXPENSE (overrides general 8xxx INCOME rule)
  if (accountNumber >= 8100 && accountNumber <= 8170) {
    return AccountType.EXPENSE;
  }
  
  // 8300-8990 -> APPROPRIATIONS (overrides general 8xxx INCOME rule)
  if (accountNumber >= 8300 && accountNumber <= 8990) {
    return AccountType.APPROPRIATIONS;
  }
  
  // General rules based on first digit
  const firstDigit = Math.floor(accountNumber / 1000);
  
  switch (firstDigit) {
    case 1: return AccountType.ASSET;
    case 2: return AccountType.LIABILITY;  // 2081-2999
    case 3: return AccountType.EQUITY;
    case 4:
    case 5:
    case 6:
    case 7: return AccountType.EXPENSE;
    case 8: return AccountType.INCOME;     // 8000-8099, 8171-8299
    case 9: return AccountType.INCOME;
    default: return AccountType.ASSET;
  }
}
