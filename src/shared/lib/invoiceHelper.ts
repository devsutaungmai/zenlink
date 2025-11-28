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

export async function generateInvoiceNumber() {
  const year = new Date().getFullYear()

  const lastInvoice = await prisma.invoice.findFirst({
    where: { invoiceNumber: { startsWith: `INV-${year}` } },
    orderBy: { invoiceNumber: 'desc' }
  })

  let nextNumber = 1

  if (lastInvoice) {
    const parts = lastInvoice.invoiceNumber.split('-')
    nextNumber = parseInt(parts[2]) + 1
  }

  return `INV-${year}-${String(nextNumber).padStart(6, '0')}`
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
}) {
  const { originalInvoiceId, reason, creditNoteDate = new Date() } = params;

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

  // Generate credit note number
  const creditNoteNumber = await generateCreditNoteNumber(originalInvoice.businessId);

  let creditNote: any = null;

  await prisma.$transaction(async (tx) => {
    // 1. Update original invoice status to CREDITED
    await tx.invoice.update({
      where: { id: originalInvoiceId },
      data: { 
        status: InvoiceStatus.CREDITED,
        updatedAt: new Date()
      }
    });

    // 2. Create credit note (new invoice with negative amounts)
    creditNote = await tx.invoice.create({
      data: {
        invoiceNumber: creditNoteNumber,
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
        vatAmount: -originalInvoice.vatAmount,
        vatPercentage: originalInvoice.vatPercentage,
        totalInclVAT: -originalInvoice.totalInclVAT,
        
        // Link to original invoice
        creditedInvoiceId: originalInvoiceId,
        
        notes: reason || `Kreditnota for faktura ${originalInvoice.invoiceNumber}`,
        
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
    message: `Credit note ${creditNoteNumber} created for invoice ${originalInvoice.invoiceNumber}`
  };
}

/**
 * Generate next credit note number
 * Format: CN-YYYY-NNNN (e.g., CN-2025-0001)
 */
export async function generateCreditNoteNumber(businessId: string): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `CN-${year}-`;
  
  // Find last credit note for this year
  const lastCreditNote = await prisma.invoice.findFirst({
    where: {
      businessId,
      status: InvoiceStatus.CREDIT_NOTE,
      invoiceNumber: {
        startsWith: prefix
      }
    },
    orderBy: {
      invoiceNumber: 'desc'
    }
  });

  let nextNumber = 1;
  if (lastCreditNote) {
    const lastNumber = parseInt(lastCreditNote.invoiceNumber.split('-')[2]);
    nextNumber = lastNumber + 1;
  }

  return `${prefix}${nextNumber.toString().padStart(4, '0')}`;
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
    where: { accountNumber: 1500, businessId }
  });

  const vatPayable = await prisma.ledgerAccount.findFirst({
    where: { accountNumber: 2700, businessId }
  });

  if (!accountsReceivable || !vatPayable) {
    throw new Error('Required ledger accounts not found (1500, 2700)');
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
      const salesAccount = line.product.salesAccount;
      if (!salesAccount?.ledgerAccountId) {
        throw new Error(`Product ${line.productName} has no linked ledger account`);
      }

      const lineTotal = Math.abs(parseFloat(line.lineTotal.toString()));

      if (isCreditNote) {
        // CREDIT NOTE: DR Sales Account / CR 1500 (REVERSED)
        await tx.ledgerEntry.create({
          data: {
            businessId,
            invoiceId: invoice.id,
            documentDate,
            postingDate,
            debitAccountId: salesAccount.ledgerAccountId,
            creditAccountId: accountsReceivable.id,
            amount: lineTotal,
            projectId: invoice.projectId,
            departmentId: invoice.departmentId,
            description: `Kreditnota ${invoice.invoiceNumber}`
          }
        });
      } else {
        // NORMAL INVOICE: DR 1500 / CR Sales Account
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
    }

    // VAT Entry
    const vatAmount = Math.abs(parseFloat(invoice.vatAmount.toString()));
    
    if (vatAmount > 0) {
      if (isCreditNote) {
        // CREDIT NOTE: DR 2700 / CR 1500 (REVERSED)
        await tx.ledgerEntry.create({
          data: {
            businessId,
            invoiceId: invoice.id,
            documentDate,
            postingDate,
            debitAccountId: vatPayable.id,
            creditAccountId: accountsReceivable.id,
            amount: vatAmount,
            projectId: invoice.projectId,
            departmentId: invoice.departmentId,
            description: `Kreditnota ${invoice.invoiceNumber} - MVA`
          }
        });
      } else {
        // NORMAL INVOICE: DR 1500 / CR 2700
        await tx.ledgerEntry.create({
          data: {
            businessId,
            invoiceId: invoice.id,
            documentDate,
            postingDate,
            debitAccountId: accountsReceivable.id,
            creditAccountId: vatPayable.id,
            amount: vatAmount,
            projectId: invoice.projectId,
            departmentId: invoice.departmentId,
            description: `Faktura nummer ${invoice.invoiceNumber} - MVA`
          }
        });
      }
    }
  });

  return {
    success: true,
    message: `${isCreditNote ? 'Credit note' : 'Invoice'} ${invoice.invoiceNumber} posted to ledger`,
    entriesCreated: invoice.invoiceLines.length + (Number(invoice.vatAmount) > 0 ? 1 : 0)
  };
}

/**
 * Calculate account balance for a given date range
 * Opening balance = all movements before startDate
 * Closing balance = opening + movements in period
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

  for (const entry of entries) {
    const amount = parseFloat(entry.amount.toString());
    
    // For ASSET and EXPENSE accounts: Debit increases, Credit decreases
    // For LIABILITY, EQUITY, INCOME accounts: Credit increases, Debit decreases
    const isNormalDebit = account.type === 'ASSET' || account.type === 'EXPENSE';
    
    if (entry.debitAccountId === accountId) {
      balance += isNormalDebit ? amount : -amount;
    } else if (entry.creditAccountId === accountId) {
      balance += isNormalDebit ? -amount : amount;
    }
  }

  return balance;
}

/**
 * Generate ledger report with opening/closing balances 
 * Returns data formatted for the GeneralLedger component
 */
export async function generateLedgerReport(
  businessId: string,
  startDate: Date,
  endDate: Date,
  accountNumbers?: number[] // Optional: filter specific accounts
) {
  // Get all accounts or specific accounts
  const whereClause: any = { businessId, isActive: true };
  if (accountNumbers && accountNumbers.length > 0) {
    whereClause.accountNumber = { in: accountNumbers };
  }

  const accounts = await prisma.ledgerAccount.findMany({
    where: whereClause,
    orderBy: { accountNumber: 'asc' }
  });

  const accountGroups = [];

  for (const account of accounts) {
    // Calculate opening balance (all entries before start date)
    const dayBeforeStart = new Date(startDate);
    dayBeforeStart.setDate(dayBeforeStart.getDate() - 1);
    dayBeforeStart.setHours(23, 59, 59, 999);

    const openingBalance = await getAccountBalance(
      account.id,
      businessId,
      undefined,
      dayBeforeStart
    );

    // Get entries in date range
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
        invoice: {
          select: {
            invoiceNumber: true,
            status: true,
            customer: {
              select: { customerName: true }
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

    // Skip accounts with no activity and zero opening balance
    if (entries.length === 0 && Math.abs(openingBalance) < 0.01) {
      continue;
    }

    //if it is normal debit like ASSET or EXPENSE (cash, bank, supplies, rent, etc)
    const isNormalDebit = account.type === 'ASSET' || account.type === 'EXPENSE';
    let runningBalance = openingBalance;

    // console.log("ledger entries for account", account.accountNumber, entries);

    const ledgerEntries = entries.map(entry => {
      const amount = parseFloat(entry.amount.toString());
      const isDebit = entry.debitAccountId === account.id;

    // Account Type	      Normal Side	    Debit does…	  Credit does…
    //ASSET / EXPENSE	    Debit	          Increase	    Decrease
    //LIABILITY/EQUITY    Credit	        Decrease	    Increase
    ///INCOME	

      // Calculate movement based on account type
      let movement = 0;
      if (isDebit) {
        movement = isNormalDebit ? amount : -amount;
      } else {
        movement = isNormalDebit ? -amount : amount;
      }
      
      runningBalance += movement;

      // Generate voucher number from invoice or entry ID
      const voucherNo = entry.invoice?.invoiceNumber || `V-${entry.id.slice(-8)}`;

      return {
        id: entry.id,
        closed: true, // You can add logic to determine if entry is closed
        voucherNo,
        date: entry.postingDate?.toISOString().split('T')[0] || '',
        description: entry.description || '',
        vatCode: '25%', // Add VAT code logic if needed
        currency: undefined, // Add currency if you support multi-currency
        amount: isDebit ? amount : -amount, // Show as signed amount
        hasAttachment: false // Add attachment logic if needed
      };
    });

    accountGroups.push({
      id: account.id,
      code: account.accountNumber.toString(),
      name: account.name,
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