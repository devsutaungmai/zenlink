// app/api/ledger/report/download/route.ts
import { generateLedgerReport, getBusinessId } from '@/shared/lib/invoiceHelper';
import { NextRequest, NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export async function GET(request: NextRequest) {
  try {
    const businessId = await getBusinessId();
    if (!businessId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const format = searchParams.get('format') || 'excel';
    const accountNumbersParam = searchParams.get('accountNumbers');

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    const accountNumbers = accountNumbersParam
      ? accountNumbersParam.split(',').map(n => parseInt(n.trim()))
      : undefined;

    // Get complete report (no pagination)
    const report = await generateLedgerReport(
      businessId,
      new Date(startDate),
      new Date(endDate),
      accountNumbers
    );

    // Generate file based on format
    switch (format) {
      case 'excel':
        return await generateExcel(report, startDate, endDate);
      case 'pdf':
        return await generatePDF(report, startDate, endDate);
      case 'csv':
        return await generateCSV(report, startDate, endDate);
      default:
        return NextResponse.json({ error: 'Invalid format' }, { status: 400 });
    }
  } catch (error) {
    console.error('Download error:', error);
    return NextResponse.json(
      { error: 'Failed to generate download' },
      { status: 500 }
    );
  }
}

async function generateExcel(report: any, startDate: string, endDate: string) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('General Ledger');

  // Set column widths
  worksheet.columns = [
    { width: 8 },   // Account number
    { width: 30 },  // Account name
    { width: 10 },  // Closed
    { width: 12 },  // Date
    { width: 15 },  // Voucher
    { width: 45 },  // Description
    { width: 10 },  // VAT code
    { width: 15 },  // VAT name
    { width: 12 },  // Currency
    { width: 15 },  // Amount currency
    { width: 15 },  // Amount
  ];

  // Title row
  worksheet.mergeCells('A1:K1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = `Account specification (general ledger) - ${startDate} - ${endDate}`;
  titleCell.font = { size: 14, bold: true };
  titleCell.alignment = { horizontal: 'left', vertical: 'middle' };
  worksheet.getRow(1).height = 25;

  let currentRow = 3;

  // Header row
  const headerRow = worksheet.getRow(currentRow);
  headerRow.values = [
    'Account number',
    'Account name',
    'Closed',
    'Date',
    'Voucher',
    'Description',
    'VAT code',
    'VAT name',
    'Currency',
    'Amount currency',
    'Amount'
  ];
  headerRow.font = { bold: true };
  headerRow.eachCell((cell) => {
  cell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' }
  };
});
  headerRow.alignment = { horizontal: 'left', vertical: 'middle' };
  currentRow++;

  const spacer = worksheet.getRow(currentRow);
  spacer.values = []; // makes an empty row
  currentRow++;

  // Process each account
  for (const account of report.accounts) {
    // Opening balance row
    const openingRow = worksheet.getRow(currentRow);
    openingRow.values = [
      account.code,
      account.name,
      '',
      startDate,
      '',
      'Opening balance',
      '',
      '',
      '',
      '',
      account.openingBalance.toFixed(2)
    ];
    worksheet.getCell(`K${currentRow}`).alignment = { horizontal: 'right' };
    currentRow++;

    // Entries
    for (const entry of account.entries) {
      const entryRow = worksheet.getRow(currentRow);
      entryRow.values = [
        account.code,
        account.name,
        entry.closed ? 'Closed' : '',
        entry.date,
        entry.voucherNo,
        entry.description,
        entry.vatCode || '',
        entry.vatName || '',
        entry.currency || '',
        entry.amount.toFixed(2),
        entry.amount.toFixed(2)
      ];

      // Right align numbers
      worksheet.getCell(`J${currentRow}`).alignment = { horizontal: 'right' };
      worksheet.getCell(`K${currentRow}`).alignment = { horizontal: 'right' };

      // Color negative amounts red
      if (entry.amount < 0) {
        worksheet.getCell(`J${currentRow}`).font = { color: { argb: 'FFFF0000' } };
        worksheet.getCell(`K${currentRow}`).font = { color: { argb: 'FFFF0000' } };
      }

      currentRow++;
    }

    // Closing balance row
    const closingRow = worksheet.getRow(currentRow);
    closingRow.values = [
      account.code,
      account.name,
      '',
      endDate,
      '',
      'Closing balance',
      '',
      '',
      '',
      '',
      account.closingBalance.toFixed(2)
    ];
    worksheet.getCell(`K${currentRow}`).alignment = { horizontal: 'right' };
    closingRow.font = { bold: true };
    currentRow++;
    const spacer = worksheet.getRow(currentRow);
    spacer.values = []; // makes an empty row
    currentRow++;
  }

  // Total amount row
  const totalRow = worksheet.getRow(currentRow);
  totalRow.values = ['Total amount', '', '', '', '', '', '', '', '', '', report.totalBalance.toFixed(2)];
  totalRow.font = { bold: true };
  worksheet.getCell(`K${currentRow}`).alignment = { horizontal: 'right' };

  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer();

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="general-ledger-${startDate}-${endDate}.xlsx"`
    }
  });
}


async function generatePDF(report: any, startDate: string, endDate: string) {
  const doc = new jsPDF('p', 'mm', 'a4');

  // Company info (top left)
  doc.setFontSize(10);
  doc.text('Pooh Cafe', 14, 15);
  doc.text('NO 993 101 583', 14, 20);

  // Title (top right)
  doc.setFontSize(10);
  doc.text(`Account specification (general ledger) ${startDate} - ${endDate}`, 200, 15, { align: 'right' });

  // Main title
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Account specification (general ledger)', 14, 35);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`${startDate} - ${endDate}`, 14, 42);

  let startY = 50;

  // Process each account
  for (const account of report.accounts) {
    // Check if we need a new page
    if (startY > 250) {
      doc.addPage();
      startY = 20;
    }

    // Account header
    doc.setFillColor(240, 240, 250);
    doc.rect(14, startY - 5, 182, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(`${account.code} ${account.name}`, 16, startY);
    startY += 10;

    // Opening balance row
    const openingData = [[
      '',
      '',
      '',
      'Opening balance:',
      '',
      '',
      '',
      account.openingBalance.toFixed(2)
    ]];

    // Entries
    const entriesData = account.entries.map((entry:any) => [
      entry.closed ? 'Closed' : '',
      entry.voucherNo,
      entry.date,
      entry.description.length > 40 ? entry.description.substring(0, 40) + '...' : entry.description,
      entry.vatCode || '',
      entry.currency || '',
      '',
      entry.amount.toFixed(2)
    ]);

    // Total row
    const totalData = [[
      '',
      '',
      '',
      'Total:',
      '',
      '',
      '',
      account.entries.reduce((sum:any, e:any) => sum + e.amount, 0).toFixed(2)
    ]];

    // Closing balance row
    const closingData = [[
      '',
      '',
      '',
      'Closing balance:',
      '',
      '',
      '',
      account.closingBalance.toFixed(2)
    ]];

    // Combine all data
    const tableData = [...openingData, ...entriesData, ...totalData, ...closingData];

    autoTable(doc, {
      startY: startY,
      head: [[
        'Closed',
        'Voucher number',
        'Date',
        'Description',
        'VAT code',
        'Currency',
        'Amount',
        'Amount (NOK)'
      ]],
      body: tableData,
      theme: 'grid',
      styles: {
        fontSize: 8,
        cellPadding: 2
      },
      headStyles: {
        fillColor: [200, 200, 200],
        textColor: [0, 0, 0],
        fontStyle: 'bold'
      },
      columnStyles: {
        7: { halign: 'right', fontStyle: 'normal' },
        6: { halign: 'right' }
      },
      didParseCell: function (data:any) {
        // Bold for opening/closing/total rows
        if (data.row.index === 0 || 
            data.row.index === tableData.length - 2 || 
            data.row.index === tableData.length - 1) {
          data.cell.styles.fontStyle = 'bold';
        }
        
        // Color negative amounts red
        if (data.column.index === 7 && data.cell.raw) {
          const value = parseFloat(data.cell.raw.toString());
          if (value < 0) {
            data.cell.styles.textColor = [255, 0, 0];
          }
        }
      }
    });

    startY = (doc as any).lastAutoTable.finalY + 10;
  }

  // Total amount at bottom
  doc.setFont('helvetica', 'bold');
  doc.text('Total amount', 14, startY);
  doc.text(report.totalBalance.toFixed(2), 200, startY, { align: 'right' });

  const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

  return new NextResponse(pdfBuffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="general-ledger-${startDate}-${endDate}.pdf"`
    }
  });
}


async function generateCSV(report: any, startDate: string, endDate: string) {
  const rows: string[][] = [];

  // Header
  rows.push(['Account specification (general ledger)', `${startDate} - ${endDate}`]);
  rows.push([]);
  rows.push([
    'Account number',
    'Account name',
    'Closed',
    'Date',
    'Voucher',
    'Description',
    'VAT code',
    'VAT name',
    'Currency',
    'Amount currency',
    'Amount'
  ]);

  // Process each account
  for (const account of report.accounts) {
    // Opening balance
    rows.push([
      account.code,
      account.name,
      '',
      startDate,
      '',
      'Opening balance',
      '',
      '',
      '',
      '',
      account.openingBalance.toFixed(2)
    ]);

    // Entries
    for (const entry of account.entries) {
      rows.push([
        account.code,
        account.name,
        entry.closed ? 'Closed' : '',
        entry.date,
        entry.voucherNo,
        entry.description,
        entry.vatCode || '',
        entry.vatName || '',
        entry.currency || '',
        entry.amount.toFixed(2),
        entry.amount.toFixed(2)
      ]);
    }

    // Closing balance
    rows.push([
      account.code,
      account.name,
      '',
      endDate,
      '',
      'Closing balance',
      '',
      '',
      '',
      '',
      account.closingBalance.toFixed(2)
    ]);
  }

  // Total
  rows.push([]);
  rows.push(['Total amount', '', '', '', '', '', '', '', '', '', report.totalBalance.toFixed(2)]);

  // Convert to CSV
  const csvContent = rows
    .map(row => row.map(cell => `"${cell}"`).join(','))
    .join('\n');

  return new NextResponse(csvContent, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="general-ledger-${startDate}-${endDate}.csv"`
    }
  });
}