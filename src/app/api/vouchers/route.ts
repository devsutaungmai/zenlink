import { prisma } from "@/shared/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "10");

  const periodMonth = searchParams.get("periodMonth");
  const periodYear = searchParams.get("periodYear");

  const registeredBy = searchParams.get("registeredBy");
  const editedBy = searchParams.get("editedBy");

  const voucherFrom = searchParams.get("voucherFrom");
  const voucherTo = searchParams.get("voucherTo");

  const where: any = {};

  if (registeredBy && registeredBy !== "not-chosen")
    where.createdBy = registeredBy;

  if (editedBy && editedBy !== "not-chosen")
    where.updatedBy = editedBy;

  if (voucherFrom || voucherTo) {
    where.voucherNumber = {};
    if (voucherFrom) where.voucherNumber.gte = voucherFrom;
    if (voucherTo) where.voucherNumber.lte = voucherTo;
  }

  // Correct month range
  if (periodMonth && periodYear) {
    const start = new Date(Number(periodYear), Number(periodMonth) - 1, 1);
    const end = new Date(Number(periodYear), Number(periodMonth), 0);
    where.createdAt = { gte: start, lte: end };
  }

  const total = await prisma.voucher.count({ where });

  const vouchers = await prisma.voucher.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * limit,
    take: limit,
    include: {
      ledgerEntries: {
        include: {
          debitAccount: true,
          creditAccount: true,
          invoice: {
            select: {
              invoiceNumber: true,
              customer: { select: { customerName: true, id: true } }
            }
          }
        },
        orderBy: { createdAt: "asc" }
      }
    }

  });


  const formatted = vouchers.map((v: any) => {
    const txs = (v.ledgerEntries ?? []).flatMap((e: any) => {
      const date = e.postingDate ? new Date(e.postingDate).toISOString().split("T")[0] : "";
      // Prefer the entry description; if missing, try build from invoice
      const invoiceNum = e.invoice?.invoiceNumber;
      const custName = e.invoice?.customer?.customerName;
      const fallbackDesc = invoiceNum ? `${e.entryType === 'PAYMENT_RECEIVED' ? 'Payment' : e.entryType === 'CREDIT_NOTE' ? 'Kreditnota' : 'Faktura'} ${invoiceNum}${custName ? ` til ${custName}` : ''}` : "";
      const desc = e.description || fallbackDesc || "";

      const amountNum = Number(e.amount || 0);

      const debitAccountLabel = e.debitAccount
        ? `${e.debitAccount.accountNumber} ${e.debitAccount.name}`
        : "";

      const creditAccountLabel = e.creditAccount
        ? `${e.creditAccount.accountNumber} ${e.creditAccount.name}`
        : "";

      // Build debit row (positive)
      const debitRow = {
        date,
        description: desc,
        account: debitAccountLabel,
        vat: e.vatCode || "",
        amount: amountNum
      };

      // Build credit row (negative)
      const creditRow = {
        date,
        description: desc,
        account: creditAccountLabel,
        vat: e.vatCode || "",
        amount: -amountNum
      };

      // If an account is missing, still include the opposite line (helps debugging)
      // Return both rows in order: debit first, credit second
      return [debitRow, creditRow];
    });

    return {
      id: v.voucherNumber,
      title: `${v.type ?? "VOUCHER"} - ${v.voucherNumber}`,
      timestamp: v.createdAt?.toISOString() ?? "",
      transactions: txs
    };
  });



  return NextResponse.json({
    vouchers: formatted,
    meta: {
      total,
      page,
      limit,
      from: (page - 1) * limit + 1,
      to: Math.min(page * limit, total)
    }
  });
}
