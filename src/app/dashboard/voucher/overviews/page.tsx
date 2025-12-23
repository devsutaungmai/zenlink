"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Search, File, Printer } from "lucide-react";
import { formatVoucherNumberForDisplay } from "@/shared/lib/invoiceHelper";

export default function VoucherOverview() {
  const [vouchers, setVouchers] = useState<any>([]);
  const [expandedRows, setExpandedRows] = useState<string[]>([]);
  const [selectedVouchers, setSelectedVouchers] = useState<string[]>([]);

  // Filters
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [periodMonth, setPeriodMonth] = useState("12");
  const [periodYear, setPeriodYear] = useState("2025");
  const [registeredBy, setRegisteredBy] = useState("not-chosen");
  const [editedBy, setEditedBy] = useState("not-chosen");

  const [voucherFrom, setVoucherFrom] = useState("");
  const [voucherTo, setVoucherTo] = useState("");

  const [meta, setMeta] = useState({ total: 0, from: 1, to: 0 });

  async function loadData() {
    const url = new URL("/api/vouchers", window.location.origin);

    url.searchParams.set("page", page.toString());
    url.searchParams.set("limit", limit.toString());
    url.searchParams.set("periodMonth", periodMonth);
    url.searchParams.set("periodYear", periodYear);

    url.searchParams.set("registeredBy", registeredBy);
    url.searchParams.set("editedBy", editedBy);

    if (voucherFrom) url.searchParams.set("voucherFrom", voucherFrom);
    if (voucherTo) url.searchParams.set("voucherTo", voucherTo);

    const res = await fetch(url);
    const data = await res.json();

    setVouchers(data.vouchers);
    setMeta(data.meta);
    setExpandedRows(data.vouchers.map((v: any) => v.id));
  }

  useEffect(() => {
    loadData();
  }, [page, periodMonth, periodYear, registeredBy, editedBy, voucherFrom, voucherTo]);

  const toggleRow = (id: string) => {
    setExpandedRows(prev => prev.includes(id)
      ? prev.filter(x => x !== id)
      : [...prev, id]);
  };

  const toggleVoucher = (id: string) => {
    setSelectedVouchers(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-[1600px] mx-auto space-y-6">

        {/* HEADER */}
        <h1 className="text-2xl font-medium mb-6">Voucher overview (journal)</h1>

        {/* FILTERS */}
        <div className="bg-card border rounded-lg p-6 mb-6">
          <div className="grid gap-6">

            {/* Voucher # Filter */}
            <div className="grid grid-cols-[200px_20px_120px_1fr] items-center gap-3">
              <label className="text-sm text-muted-foreground">Voucher number</label>
              <span className="text-center text-muted-foreground">-</span>
              <Input
                value={voucherTo}
                onChange={e => setVoucherTo(e.target.value)}
                className="pr-8"
              />
              <div></div>
            </div>

            {/* PERIOD + USER FILTERS */}
            <div className="grid grid-cols-3 gap-4">
              <div className="flex items-center gap-3">
                <ChevronLeft
                  className="cursor-pointer"
                  onClick={() => setPeriodMonth(m => (parseInt(m) === 1 ? "12" : (parseInt(m) - 1).toString().padStart(2, "0")))}
                />
                <div className="flex-1">
                  <label className="text-sm text-muted-foreground block mb-1">Period</label>
                  <div className="text-sm font-medium">
                    {`Month ${periodMonth}, ${periodYear}`}
                  </div>
                </div>
                <ChevronRight
                  className="cursor-pointer"
                  onClick={() => setPeriodMonth(m => (parseInt(m) === 12 ? "01" : (parseInt(m) + 1).toString().padStart(2, "0")))}
                />
              </div>

              {/* Registered by filter */}
              <Select value={registeredBy} onValueChange={setRegisteredBy}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="not-chosen">(Not chosen)</SelectItem>
                  <SelectItem value="user1">User 1</SelectItem>
                  <SelectItem value="user2">User 2</SelectItem>
                </SelectContent>
              </Select>

              {/* Edited by filter */}
              <Select value={editedBy} onValueChange={setEditedBy}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="not-chosen">(Not chosen)</SelectItem>
                  <SelectItem value="user1">User 1</SelectItem>
                  <SelectItem value="user2">User 2</SelectItem>
                </SelectContent>
              </Select>

            </div>
          </div>
        </div>

        {/* VOUCHER LIST */}
        <div className="bg-card border rounded-lg overflow-hidden">
          {/* HEADER */}
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-lg font-medium">Vouchers</h2>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">
                {meta.from} - {meta.to} of {meta.total}
              </span>

              <ChevronLeft
                className="cursor-pointer"
                onClick={() => setPage(p => Math.max(1, p - 1))}
              />
              <ChevronRight
                className="cursor-pointer"
                onClick={() =>
                  setPage(p => (meta.to >= meta.total ? p : p + 1))
                }
              />

              <Button variant="link" className="text-blue-600 flex items-center gap-1">
                <Printer className="h-4 w-4" /> Print selected vouchers
              </Button>
            </div>
          </div>

          {/* COLUMN HEADERS */}
          <div className="bg-muted/30">
            <div className="grid grid-cols-[40px_100px_1fr_300px_80px_120px] gap-4 px-4 py-3 text-sm font-medium text-muted-foreground">
              <div></div>
              <div>Date</div>
              <div>Description</div>
              <div>Account</div>
              <div>VAT</div>
              <div className="text-right">Amount</div>
            </div>
          </div>

          {/* LIST */}
          <div>
            {vouchers.map((v: any) => {
              const expanded = expandedRows.includes(v.id);
              const selected = selectedVouchers.includes(v.id);

              return (
                <div key={v.id} className="border-b">

                  {/* MAIN ROW */}
                  <div className="grid grid-cols-[40px_100px_1fr_300px_80px_120px] gap-4 px-4 py-2">
                    <Checkbox checked={selected} onCheckedChange={() => toggleVoucher(v.id)} />
                    <div></div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => toggleRow(v.id)}
                        className="text-blue-600 hover:underline font-medium"
                      >
                        {formatVoucherNumberForDisplay(v.id)}
                      </button>
                      {/* <span className="text-sm text-muted-foreground">- {v.title}</span> */}
                    </div>
                    <div></div>
                    <div></div>
                    <div className="text-right text-xs text-muted-foreground italic">{v.timestamp}</div>
                  </div>

                  {/* TRANSACTIONS */}
                  {expanded && v.transactions.map((t: any, i: any) => (
                    <div key={i} className="grid grid-cols-[40px_100px_1fr_300px_80px_120px] gap-4 px-4 py-2 text-sm">
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
            })}
          </div>

          {/* FOOTER PAGINATION */}
          <div className="flex items-center justify-end p-4 gap-3 border-t">
            <span className="text-sm text-muted-foreground">
              {meta.from} - {meta.to} of {meta.total}
            </span>

            <ChevronLeft
              className="cursor-pointer"
              onClick={() => setPage(p => Math.max(1, p - 1))}
            />

            <ChevronRight
              className="cursor-pointer"
              onClick={() =>
                setPage(p => (meta.to >= meta.total ? p : p + 1))
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}
