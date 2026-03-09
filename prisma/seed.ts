import { AccountType, PrismaClient } from '@prisma/client'
import path from 'path';
import ExcelJS from 'exceljs';
import { fileURLToPath } from 'url';

// Fix for __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
    case 3: return AccountType.INCOME;
    case 4:
    case 5:
    case 6:
    case 7: return AccountType.EXPENSE;
    case 8: return AccountType.INCOME;     // 8000-8099, 8171-8299
    case 9: return AccountType.INCOME;
    default: return AccountType.ASSET;
  }
}

function parsePercentage(value: any): number {
  if (!value) return 0;
  
  const str = String(value).trim();
  
  // Remove % symbol if present
  const cleanStr = str.replace('%', '');
  const num = parseFloat(cleanStr);
  
  if (isNaN(num)) return 0;
  
  // If the value is a decimal (0.25), convert to percentage (25)
  if (num < 1 && num > 0) {
    return num * 100;
  }
  
  // Otherwise return as-is (already a whole number like 25)
  return num;
}


function parseDate(value: any): Date | null {
  if (!value) return null;
  
  // If it's already a Date object
  if (value instanceof Date) return value;
  
  // If it's a string in format DD.MM.YYYY
  if (typeof value === 'string') {
    const parts = value.split('.');
    if (parts.length === 3) {
      const day = parseInt(parts[0]);
      const month = parseInt(parts[1]) - 1; // Month is 0-indexed
      const year = parseInt(parts[2]);
      if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
        return new Date(year, month, day);
      }
    }
  }
  
  return null;
}

async function importLedgerAccounts() {
  try {
    // Check if default accounts already exist
    const existingCount = await prisma.ledgerAccount.count({
      where: { businessId: null }
    });

    if (existingCount > 0) {
      console.log(`Default ledger accounts already exist (${existingCount} accounts). Skipping import.`);
      return; // Exit early if data exists
    }

    console.log('📊 Starting ledger account import (no existing data found)...');

    const filePath = path.join(__dirname, 'data', 'Kontoplan.xlsx');
    console.log('📁 Reading file from:', filePath);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);

    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      throw new Error('No worksheet found in Excel file');
    }

    console.log('Worksheet name:', worksheet.name);
    console.log('Row count:', worksheet.rowCount);

    // Let's check the first 5 rows to see the structure
    console.log('\n Inspecting first 5 rows:');
    for (let i = 1; i <= 5; i++) {
      const row = worksheet.getRow(i);
      console.log(`\nRow ${i}:`);
      row.eachCell((cell, colNumber) => {
        console.log(`   Column ${colNumber}: "${getCellValue(cell.value)}"`);
      });
    }

    // Now let's try to find which row has "Kode" in it
    let headerRowNumber = 0;
    for (let i = 1; i <= 5; i++) {
      const row = worksheet.getRow(i);
      let hasKode = false;
      row.eachCell((cell) => {
        if (getCellValue(cell.value) === 'Kode') {
          hasKode = true;
        }
      });
      if (hasKode) {
        headerRowNumber = i;
        console.log(`\n Found header row at row ${i}`);
        break;
      }
    }

    if (headerRowNumber === 0) {
      throw new Error('Could not find header row with "Kode" column');
    }

    const headerRow = worksheet.getRow(headerRowNumber);
    const headers: { [key: string]: number } = {};

    headerRow.eachCell((cell, colNumber) => {
      const header = getCellValue(cell.value);
      if (header) {
        headers[header] = colNumber;
        console.log(`   Header found: "${header}" at column ${colNumber}`);
      }
    });

    console.log('\n📋 All headers:', Object.keys(headers));

    const data: any[] = [];

    // Start reading data from the row after headers
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber <= headerRowNumber) return; // Skip title and header rows

      const rowData: any = {};
      Object.entries(headers).forEach(([header, colNumber]) => {
        const cell = row.getCell(colNumber);
        rowData[header] = getCellValue(cell.value);
      });

      // Only add non-empty rows
      if (rowData['Kode']) {
        data.push(rowData);
      }
    });

    console.log(`\nFound ${data.length} accounts to import`);

    // Log first 3 rows to debug
    console.log('\n🔍 First 3 data rows:');
    data.slice(0, 3).forEach((row, idx) => {
      console.log(`   Row ${idx + 1}:`, {
        Kode: row['Kode'],
        Navn: row['Navn'],
        'Mva-kode': row['Mva-kode'],
        Aktiv: row['Aktiv']
      });
    });

    let imported = 0;
    let skipped = 0;
    let invalidRows = 0;

    for (const row of data) {
      const accountNumberStr = row['Kode'];
      const accountNumber = parseInt(accountNumberStr);

      if (isNaN(accountNumber)) {
        invalidRows++;
        continue;
      }

      if (!row['Navn']) {
        invalidRows++;
        continue;
      }

      try {
        const vatCode = await prisma.vatCode.findFirst({
          where: {businessId: null},
          orderBy:{createdAt: 'asc'}
        });
        const vatCodeId = vatCode?.id ?? null;
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
            type: getAccountType(accountNumber),
            isActive: parseNorwegianBoolean(row['Aktiv']),
            vatCodeId: vatCodeId,
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

        if (imported === 1) {
          console.log('\n First account created successfully!');
        }

        if (imported % 50 === 0) {
          console.log(`Imported ${imported} accounts...`);
        }
      } catch (error) {
        console.error(`Error importing account ${accountNumber} (${row['Navn']}):`, error);
        invalidRows++;
      }
    }

    console.log(`\n📊 Final Summary:`);
    console.log(`   ✅ Imported: ${imported}`);
    console.log(`   ⏭️  Skipped: ${skipped}`);
    console.log(`   ⚠️  Invalid: ${invalidRows}`);
    console.log(`   📝 Total: ${data.length}`);
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

    console.log(`✅ Copied ${accountsToCreate.length} accounts to business ${businessId}`);
  } catch (error) {
    console.error('   ❌ Error copying accounts:', error);
    throw error;
  }
}

export async function importMvaCodes() {
  try {
    // Check if default MVA codes already exist
    const existingCount = await prisma.vatCode.count({
      where: { businessId: null }
    });

    if (existingCount > 0) {
      console.log(`Default MVA codes already exist (${existingCount} codes). Skipping import.`);
      return;
    }

    console.log('📊 Starting MVA code import (no existing data found)...');

    const filePath = path.join(__dirname, 'data', 'Mva-koder.xlsx');
    console.log('📁 Reading file from:', filePath);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);

    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      throw new Error('No worksheet found in Excel file');
    }

    console.log('Worksheet name:', worksheet.name);
    console.log('Row count:', worksheet.rowCount);

    // Inspect first 5 rows
    console.log('\n🔍 Inspecting first 5 rows:');
    for (let i = 1; i <= 5; i++) {
      const row = worksheet.getRow(i);
      console.log(`\nRow ${i}:`);
      row.eachCell((cell, colNumber) => {
        console.log(`Column ${colNumber}: "${getCellValue(cell.value)}"`);
      });
    }

    // Find header row (looking for "Aktiv", "Kode", "Navn", etc.)
    let headerRowNumber = 0;
    for (let i = 1; i <= 10; i++) {
      const row = worksheet.getRow(i);
      let hasAktiv = false;
      let hasKode = false;
      
      row.eachCell((cell) => {
        const value = getCellValue(cell.value);
        if (value === 'Aktiv') hasAktiv = true;
        if (value === 'Kode') hasKode = true;
      });
      
      if (hasAktiv && hasKode) {
        headerRowNumber = i;
        console.log(`\n✅ Found header row at row ${i}`);
        break;
      }
    }

    if (headerRowNumber === 0) {
      throw new Error('Could not find header row with "Aktiv" and "Kode" columns');
    }

    const headerRow = worksheet.getRow(headerRowNumber);
    const headers: { [key: string]: number } = {};

    headerRow.eachCell((cell, colNumber) => {
      const header = getCellValue(cell.value);
      if (header) {
        headers[header] = colNumber;
        console.log(`   Header found: "${header}" at column ${colNumber}`);
      }
    });

    console.log('\n📋 All headers:', Object.keys(headers));

    const data: any[] = [];

    // Start reading data from the row after headers
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber <= headerRowNumber) return; // Skip header rows

      const rowData: any = {};
      Object.entries(headers).forEach(([header, colNumber]) => {
        const cell = row.getCell(colNumber);
        rowData[header] = getCellValue(cell.value);
      });

      // Only add non-empty rows (must have Kode)
      if (rowData['Kode'] !== null && rowData['Kode'] !== undefined && rowData['Kode'] !== '') {
        data.push(rowData);
      }
    });

    console.log(`\nFound ${data.length} MVA codes to import`);

    // Log first 3 rows to debug
    console.log('\n🔍 First 3 data rows:');
    data.slice(0, 3).forEach((row, idx) => {
      console.log(`   Row ${idx + 1}:`, {
        Aktiv: row['Aktiv'],
        Kode: row['Kode'],
        Navn: row['Navn'],
        Sats: row['Sats']
      });
    });

    let imported = 0;
    let skipped = 0;
    let invalidRows = 0;

    for (const row of data) {
      const code = row['Kode'];

      if (!code || !row['Navn']) {
        invalidRows++;
        continue;
      }

      try {
        const existing = await prisma.vatCode.findFirst({
          where: {
            code: String(code),
            businessId: null
          }
        });

        if (existing) {
          skipped++;
          continue;
        }

        await prisma.vatCode.create({
          data: {
            code: String(code),
            name: row['Navn'] || '',
            rate: parsePercentage(row['Sats']),
            description: row['Beskrivelse'] || '',
            isActive: parseNorwegianBoolean(row['Aktiv']),
            validFrom: parseDate(row['Gyldig fra']),
            validTo: parseDate(row['Gyldig til']),
            offsetAccountNumber: row['Avgiftskonto'] || null,
            settlementAccountNumber: row['Avsetningskonto'] || null,
            businessId: null // Default template codes
          }
        });

        imported++;

        if (imported === 1) {
          console.log('\n✅ First MVA code created successfully!');
        }

        if (imported % 10 === 0) {
          console.log(`Imported ${imported} MVA codes...`);
        }
      } catch (error) {
        console.error(`Error importing MVA code ${code} (${row['Navn']}):`, error);
        invalidRows++;
      }
    }

    console.log(`\n📊 Final Summary:`);
    console.log(`   ✅ Imported: ${imported}`);
    console.log(`   ⏭️  Skipped: ${skipped}`);
    console.log(`   ⚠️  Invalid: ${invalidRows}`);
    console.log(`   📝 Total: ${data.length}`);
  } catch (error) {
    console.error('❌ Error during MVA code import:', error);
    throw error;
  }
}

async function seedSalaryCodeCategories() {
  console.log('\n Seeding Salary Code Categories...');
  
  const categories = [
    { code: 'HOURLY', name: 'Hourly Wages', icon: 'ClockIcon', color: 'blue', sortOrder: 1 },
    { code: 'OVERTIME', name: 'Overtime Pay', icon: 'CurrencyDollarIcon', color: 'orange', sortOrder: 2 },
    { code: 'SICK_PAY', name: 'Sick Pay', icon: 'HeartIcon', color: 'purple', sortOrder: 3 },
    { code: 'BONUS', name: 'Bonuses', icon: 'GiftIcon', color: 'green', sortOrder: 4 },
    { code: 'DEDUCTION', name: 'Deductions', icon: 'MinusIcon', color: 'gray', sortOrder: 5 },
  ];

  let created = 0;
  let skipped = 0;

  for (const cat of categories) {
    const existing = await prisma.salaryCodeCategory.findUnique({
      where: { code: cat.code }
    });

    if (existing) {
      skipped++;
      continue;
    }

    await prisma.salaryCodeCategory.create({
      data: cat
    });
    created++;
  }

  console.log(`   Created: ${created}`);
  console.log(`   Skipped (already exist): ${skipped}`);
}

async function main() {
  //   // First, get the first business to use as default
  const business = await prisma.business.findFirst()

  if (!business) {
    console.log('No business found. Please create a business first.')
    return
  }

  // Seed salary code categories (no business dependency)
  await seedSalaryCodeCategories();

  // Import default ledger accounts
  await importMvaCodes();
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
