"use client";

import { Checkbox } from "@/components/ui/checkbox";

interface VoucherRowProps {
  v: any;
  expanded: boolean;
  toggleRow: (id: string) => void;
  selected: boolean;
  toggleVoucher: (id: string) => void;
}

export function VoucherRow({
  v,
  expanded,
  toggleRow,
  selected,
  toggleVoucher
}: VoucherRowProps) {
  return (
    <div className="border-b">
      {/* MAIN ROW */}
      <div className="grid grid-cols-[40px_100px_1fr_300px_80px_120px] gap-4 px-4 py-2">
        <Checkbox checked={selected} onCheckedChange={() => toggleVoucher(v.id)} />
        <div></div>
        <div className="flex gap-2">
          <button
            onClick={() => toggleRow(v.id)}
            className="text-blue-600 hover:underline font-medium"
          >
            {v.id}
          </button>
          <span className="text-sm text-muted-foreground">- {v.title}</span>
        </div>
        <div></div>
        <div></div>
        <div className="text-right text-xs text-muted-foreground italic">
          {v.timestamp}
        </div>
      </div>

      {/* TRANSACTIONS */}
      {expanded &&
        v.transactions.map((t: any, i: number) => (
          <div
            key={i}
            className="grid grid-cols-[40px_100px_1fr_300px_80px_120px] gap-4 px-4 py-2 text-sm"
          >
            <div></div>
            <div className="text-muted-foreground">{t.date}</div>
            <div>{t.description}</div>
            <div>{t.account}</div>
            <div className="text-center">{t.vat}</div>
            <div className="text-right">{t.amount.toFixed(2)}</div>
          </div>
        ))}
    </div>
  );
}
