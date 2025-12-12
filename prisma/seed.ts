import { AccountType, InvoiceDueDateType, PaymentTimeUnit, PrismaClient } from '@prisma/client'
import path from 'path';
import ExcelJS from 'exceljs';


const prisma = new PrismaClient()

// ===== LEDGER ACCOUNT IMPORT FUNCTIONS =====

function parseNorwegianBoolean(value: any): boolean {
  if (!value) return false;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value.toLowerCase() === 'ja';
  return false;
}

function getCellValue(value: any): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') return value.toString();
  return String(value).trim();
}

function getAccountType(accountNumber: number): AccountType {
  const firstDigit = Math.floor(accountNumber / 1000);
  
  switch (firstDigit) {
    case 1: return 'ASSET' as AccountType;
    case 2: return 'LIABILITY' as AccountType;
    case 3: return 'EQUITY' as AccountType;
    case 4:
    case 5:
    case 6:
    case 7: return 'EXPENSE' as AccountType;
    case 8:
    case 9: return 'INCOME' as AccountType;
    default: return 'ASSET' as AccountType;
  }
}

async function importLedgerAccounts() {
  try {
    console.log('📊 Starting ledger account import...');

    const filePath = path.join(__dirname, 'data', 'Kontoplan.xlsx');
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    
    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      throw new Error('No worksheet found in Excel file');
    }

    const headerRow = worksheet.getRow(1);
    const headers: { [key: string]: number } = {};
    
    headerRow.eachCell((cell, colNumber) => {
      const header = getCellValue(cell.value);
      if (header) headers[header] = colNumber;
    });

    const data: any[] = [];
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      
      const rowData: any = {};
      Object.entries(headers).forEach(([header, colNumber]) => {
        const cell = row.getCell(colNumber);
        rowData[header] = getCellValue(cell.value);
      });
      
      data.push(rowData);
    });

    console.log(`Found ${data.length} accounts to import`);

    let imported = 0;
    let skipped = 0;

    for (const row of data) {
      try {
        const accountNumber = parseInt(row['Kode']);
        
        if (isNaN(accountNumber) || !row['Navn']) {
          skipped++;
          continue;
        }

        const existing = await prisma.ledgerAccount.findFirst({
          where: {
            accountNumber,
            businessId: null
          }
        });

        if (existing) {
          skipped++;
          continue;
        }

        await prisma.ledgerAccount.create({
          data: {
            accountNumber,
            name: row['Navn'] || '',
            type: getAccountType(accountNumber) ?? "",
            isActive: parseNorwegianBoolean(row['Aktiv']),
            vatCode: row['Mva-kode'] || null,
            vatSpecification: row['Mva-spesifikasjon'] || null,
            reportGroup: row['Rapportgruppe'] || null,
            saftStandardAccount: row['SAF-T standardkonto'] || null,
            industrySpecification: row['Næringsspesifikasjon'] || null,
            allowProject: parseNorwegianBoolean(row['Prosjekt']),
            requireProject: parseNorwegianBoolean(row['Prosjekt er påkrevd']),
            allowDepartment: parseNorwegianBoolean(row['Avdeling']),
            requireDepartment: parseNorwegianBoolean(row['Avdeling er påkrevd']),
            businessId: null
          }
        });

        imported++;
        
        if (imported % 50 === 0) {
          console.log(`   Imported ${imported} accounts...`);
        }
      } catch (error) {
        console.error(`   Error importing account ${row['Kode']}:`, error);
      }
    }

    console.log(`✅ Imported: ${imported} | ⏭️ Skipped: ${skipped}`);
  } catch (error) {
    console.error('❌ Error during ledger account import:', error);
    throw error;
  }
}

// Function to copy default accounts to a new business
export async function copyDefaultAccountsToBusiness(businessId: string) {
  try {
    const defaultAccounts = await prisma.ledgerAccount.findMany({
      where: { businessId: null }
    });

    const accountsToCreate = defaultAccounts.map(account => {
      const { id, createdAt, updatedAt, ...accountData } = account;
      return {
        ...accountData,
        businessId
      };
    });

    await prisma.ledgerAccount.createMany({
      data: accountsToCreate
    });

    console.log(`   ✅ Copied ${accountsToCreate.length} accounts to business ${businessId}`);
  } catch (error) {
    console.error('   ❌ Error copying accounts:', error);
    throw error;
  }
}

async function main() {
//   // First, get the first business to use as default
  const business = await prisma.business.findFirst()

  if (!business) {
    console.log('No business found. Please create a business first.')
    return
  }

  // 1. Import default ledger accounts
  await importLedgerAccounts();

}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
