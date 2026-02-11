"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import {
    Filter,
    Search,
    Download,
    Settings,
    ChevronDown,
    ChevronUp,
    Calendar,
    X,
    Columns3,
} from "lucide-react"
import { da } from "date-fns/locale"
import { formatCustomerNumberForDisplay, formatDateLocal, formatVoucherNumberForDisplay } from "@/shared/lib/invoiceHelper"
import { Description } from "@/components/invoice/Description"

// --- Data types ---

interface CustomerLedgerRow {
    postingDate?: string
    description?: string
    dueDate?: string
    voucher?: string
    amount?: number
    balance?: number
    payable?: number
    isClosingBalance?: boolean
}

interface CustomerGroup {
    customerId: string
    customerName: string
    customerNumber: string
    rows: CustomerLedgerRow[]
}

// --- Sample data matching the screenshot ---

// const SAMPLE_DATA: CustomerGroup[] = [
//   {
//     customerId: "cus_1",
//     customerName: "A-B Transport AS",
//     customerNumber: "10000",
//     rows: [
//       {
//         postingDate: "15.01.2023",
//         description: "Invoice 1 for A-B Transport AS",
//         dueDate: "11.12.2024",
//         voucher: "2",
//         amount: 280000.0,
//         balance: 280000.0,
//       },
//       {
//         postingDate: "25.01.2023",
//         description: "Bank journal",
//         dueDate: "25.01.2023",
//         voucher: "49",
//         amount: -280000.0,
//         balance: -280000.0,
//       },
//       {
//         isClosingBalance: true,
//         postingDate: "03.02.2026",
//         description: "Sum",
//         amount: 0.0,
//         balance: 0.0,
//       },
//     ],
//   },
//   {
//     customerId: "cus_2",
//     customerName: "AIA (Life Insurance)",
//     customerNumber: "10094",
//     rows: [
//       {
//         postingDate: "21.10.2025",
//         description: "Invoice 10139 for AIA (Life Insurance)",
//         dueDate: "04.11.2025",
//         voucher: "288",
//         amount: 71.25,
//         balance: 71.25,
//       },
//       {
//         isClosingBalance: true,
//         postingDate: "03.02.2026",
//         description: "Sum",
//         amount: 71.25,
//         balance: 71.25,
//       },
//     ],
//   },
//   {
//     customerId: "cus_3",
//     customerName: "Akkurat AS",
//     customerNumber: "10018",
//     rows: [
//       {
//         postingDate: "15.07.2023",
//         description: "Invoice 19 for Akkurat AS",
//         dueDate: "07.08.2024",
//         voucher: "17",
//         amount: 180000.0,
//         balance: 180000.0,
//       },
//       {
//         postingDate: "15.09.2023",
//         description: "Invoice 21 for Akkurat AS",
//         dueDate: "21.10.2024",
//         voucher: "21",
//         amount: 240000.0,
//         balance: 240000.0,
//       },
//       {
//         postingDate: "10.09.2025",
//         description: "Invoice 10127 for Akkurat AS",
//         dueDate: "24.09.2025",
//         voucher: "247",
//         amount: 136.25,
//         balance: 136.25,
//       },
//       {
//         isClosingBalance: true,
//         postingDate: "03.02.2026",
//         description: "Sum",
//         amount: 420136.25,
//         balance: 420136.25,
//       },
//     ],
//   },
//   {
//     customerId: "cus_4",
//     customerName: "asda asd asd",
//     customerNumber: "10085",
//     rows: [
//       {
//         postingDate: "27.08.2025",
//         description: "Invoice 10101 for asda asd asd",
//         dueDate: "10.09.2025",
//         voucher: "210",
//         amount: 7.74,
//         balance: 7.74,
//       },
//       {
//         isClosingBalance: true,
//         postingDate: "03.02.2026",
//         description: "Sum",
//         amount: 7.74,
//         balance: 7.74,
//       },
//     ],
//   },
// ]

// --- Number formatting ---

function formatNumber(value: number | undefined): string {
    if (value === undefined) return ""
    const formatted = Math.abs(value).toLocaleString("nb-NO", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })
    return value < 0 ? `-${formatted}` : formatted
}

// --- Main component ---

export default function CustomerLedger() {
    const [data, setData] = useState<CustomerGroup[]>([])
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState<"open" | "statement">("open")
    const [searchQuery, setSearchQuery] = useState("")
    const [hideReversals, setHideReversals] = useState(false)
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
        new Set(data.map((g) => g.customerId))
    )

    const toggleGroup = (id: string) => {
        setExpandedGroups((prev) => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }
    const filteredData = data.filter((group) => {
        if (!searchQuery) return true
        const q = searchQuery.toLowerCase()
        return (
            group.customerName.toLowerCase().includes(q) ||
            group.customerNumber.includes(q) ||
            group.rows.some((r) => r.description?.toLowerCase().includes(q))
        )
    })

    useEffect(() => {
        async function load() {
            try {
                setLoading(true)

                const res = await fetch(
                    `/api/ledger/report/customer-ledger?startDate=2024-01-01&endDate=2026-12-31`,
                    { cache: "no-store" }
                )

                const json = await res.json()

                // transform API → UI structure
                const mapped: CustomerGroup[] = (json ?? []).map((c: any) => ({
                    customerId: c.customerId,
                    customerName: c.customerName,
                    customerNumber: c.customerNumber,
                    rows: (c.rows ?? []).map((r: any) => ({
                        postingDate: formatDateLocal(r.postingDate),
                        description: r.description,
                        dueDate: formatDateLocal(r.dueDate),
                        voucher: r.voucherNumber,
                        amount: r.amount,
                        balance: r.balance,
                        isClosingBalance: r.isClosingBalance ?? false,
                    })),
                }))


                setData(mapped)

                // auto expand all
                setExpandedGroups(new Set(mapped.map((g) => g.customerId)))
            } catch (e) {
                console.error("Failed loading ledger", e)
            } finally {
                setLoading(false)
            }
        }

        load()
    }, [])


    return (
        <div className="min-h-screen bg-[#f7f8fa]">
            {/* Header */}
            <header className="border-b border-[#e0e4e8] bg-white px-4 py-3 sm:px-6 sm:py-4">
                <h1 className="text-xl font-normal tracking-wide text-[#2c3e50] sm:text-2xl uppercase">
                    Customer Ledger
                </h1>
            </header>

            {/* Toolbar */}
            <div className="border-b border-[#e0e4e8] bg-white px-4 py-3 sm:px-6">
                {/* Top row: tabs, filters, search */}
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-3">
                    {/* Open Items / Statement tabs */}
                    <div className="inline-flex rounded-md border border-[#d0d5dd] overflow-hidden">
                        <button
                            onClick={() => setActiveTab("open")}
                            className={`px-3 py-1.5 text-sm font-medium transition-colors ${activeTab === "open"
                                ? "bg-white text-[#2c3e50] shadow-sm"
                                : "bg-[#f2f4f7] text-[#667085] hover:bg-[#e8eaed]"
                                }`}
                        >
                            Open Items
                        </button>
                        <button
                            onClick={() => setActiveTab("statement")}
                            className={`px-3 py-1.5 text-sm font-medium transition-colors border-l border-[#d0d5dd] ${activeTab === "statement"
                                ? "bg-white text-[#2c3e50] shadow-sm"
                                : "bg-[#f2f4f7] text-[#667085] hover:bg-[#e8eaed]"
                                }`}
                        >
                            Statement
                        </button>
                    </div>

                    {/* Customer dropdown */}
                    <div className="relative">
                        <select className="appearance-none rounded-md border border-[#d0d5dd] bg-white px-3 py-1.5 pr-8 text-sm text-[#2c3e50] focus:outline-none focus:ring-1 focus:ring-[#2a7de1]">
                            <option>Customer</option>
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-[#667085]" />
                    </div>

                    {/* Date picker */}
                    <div className="flex items-center gap-1.5 rounded-md border border-[#d0d5dd] bg-white px-3 py-1.5 text-sm text-[#2c3e50]">
                        <span>03.02.2026</span>
                        <Calendar className="h-4 w-4 text-[#667085]" />
                    </div>

                    {/* Total overdue filter */}
                    <div className="flex items-center gap-1.5 rounded-full border border-[#d0d5dd] bg-white px-3 py-1.5 text-sm text-[#2c3e50]">
                        <span>Total overdue</span>
                        <button className="rounded-full bg-[#667085] p-0.5 text-white hover:bg-[#475467]">
                            <X className="h-3 w-3" />
                        </button>
                        <ChevronDown className="h-3 w-3 text-[#667085]" />
                    </div>

                    {/* Search */}
                    <div className="relative flex-shrink-0">
                        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#667085]" />
                        <Input
                            placeholder="Search"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="h-8 w-[160px] border-[#d0d5dd] pl-8 text-sm"
                        />
                    </div>

                    {/* Hide reversals */}
                    <label className="flex items-center gap-2 text-sm text-[#2c3e50] cursor-pointer">
                        <Checkbox
                            checked={hideReversals}
                            onCheckedChange={(v) => setHideReversals(v === true)}
                        />
                        Hide reversals
                    </label>

                    {/* Right-side icons */}
                    <div className="ml-auto flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Filter className="h-4 w-4 text-[#667085]" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Columns3 className="h-4 w-4 text-[#667085]" />
                        </Button>
                    </div>
                </div>

                {/* Bottom row: action buttons */}
                <div className="flex flex-wrap items-center gap-2">
                    <Button className="bg-[#3182ce] hover:bg-[#3182ce] text-white text-sm h-8 px-4 rounded-md">
                        Match all
                    </Button>
                    <Button
                        variant="outline"
                        className="text-sm h-8 px-4 text-[#667085] border-[#d0d5dd] bg-white hover:bg-[#f2f4f7]"
                    >
                        Unmatch
                    </Button>
                    <Button
                        variant="outline"
                        className="text-sm h-8 px-4 text-[#667085] border-[#d0d5dd] bg-white hover:bg-[#f2f4f7]"
                    >
                        Show matches
                    </Button>

                    <div className="ml-auto flex items-center gap-2">
                        <Button
                            variant="outline"
                            className="text-sm h-8 px-4 text-[#2c3e50] border-[#d0d5dd] bg-white hover:bg-[#f2f4f7]"
                        >
                            Register payment
                        </Button>
                        <Button
                            variant="outline"
                            className="text-sm h-8 px-4 text-[#2c3e50] border-[#d0d5dd] bg-white hover:bg-[#f2f4f7]"
                        >
                            Pay out
                        </Button>
                        <Button
                            variant="outline"
                            className="text-sm h-8 px-4 text-[#2c3e50] border-[#d0d5dd] bg-white hover:bg-[#f2f4f7]"
                        >
                            Write off
                        </Button>
                    </div>
                </div>
            </div>

            {loading && (
                <div className="p-6 text-center text-sm text-gray-500">
                    Loading customer ledger...
                </div>
            )}


            {/* Table */}
            <div className="px-4 py-3 sm:px-6 sm:py-4">
                {/* Desktop table */}
                <div className="hidden md:block overflow-auto">
                    <table className="w-full border-collapse text-sm">
                        <thead>
                            <tr className="bg-[#3a5a6e] text-white">
                                <th className="p-2.5 text-left font-medium w-[100px]" />
                                <th className="p-2.5 text-left font-medium w-[120px]">Date</th>
                                <th className="p-2.5 text-left font-medium w-[260px]">Text</th>
                                <th className="p-2.5 text-left font-medium">Description</th>
                                <th className="p-2.5 text-left font-medium w-[110px]">Due date</th>
                                <th className="p-2.5 text-left font-medium w-[90px]">Voucher</th>
                                <th className="p-2.5 text-right font-medium w-[140px]">Amount</th>
                                <th className="p-2.5 text-right font-medium w-[130px]">Balance</th>
                                <th className="p-2.5 text-right font-medium w-[100px]">Payable</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredData.map((group) => (
                                <CustomerGroupSection
                                    key={group.customerId}
                                    customerId={group.customerId}
                                    group={group}
                                    isExpanded={expandedGroups.has(group.customerId)}
                                    onToggle={() => toggleGroup(group.customerId)}
                                />
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Mobile cards */}
                <div className="md:hidden space-y-4">
                    {filteredData.map((group) => (
                        <MobileCustomerGroup
                            key={group.customerId}
                            customerId={group.customerId}
                            group={group}
                            isExpanded={expandedGroups.has(group.customerId)}
                            onToggle={() => toggleGroup(group.customerId)}
                        />
                    ))}
                </div>
            </div>
        </div>
    )
}

// --- Desktop group section ---

function CustomerGroupSection({
    group,
    customerId,
    isExpanded,
    onToggle,
}: {
    group: CustomerGroup
    customerId: string
    isExpanded: boolean
    onToggle: () => void
}) {
    const sum = group.rows.reduce((acc, r) => acc + (r.amount ?? 0), 0)

    const customerLabel = group.customerNumber
        ? `${group.customerName}, ${formatCustomerNumberForDisplay(group.customerNumber)} (${formatCustomerNumberForDisplay(group.customerNumber)})`
        : group.customerName

    return (
        <>
            {/* Customer header row */}
            <tr
                className="border-b border-[#e0e4e8] bg-[#f7f8fa] cursor-pointer hover:bg-[#eef1f4]"
                onClick={onToggle}
            >
                <td colSpan={9} className="p-2.5">
                    <div className="flex items-center gap-2">
                        {isExpanded ? (
                            <ChevronUp className="h-4 w-4 text-[#667085]" />
                        ) : (
                            <ChevronDown className="h-4 w-4 text-[#667085]" />
                        )}
                        <span className="font-semibold text-[#2a7de1] text-sm">
                            {customerLabel}
                        </span>
                    </div>
                </td>
            </tr>

            {/* Entry rows */}
            {isExpanded &&
                [...group.rows, { isSumRow: true } as any].map((row, idx) => {
                    const isSum = (row as any).isSumRow === true
                    const isLink =
                        !isSum &&
                        row.description &&
                        row.description.toLowerCase().startsWith("invoice")

                    return (
                        <tr
                            key={`${group.customerId}-${idx}`}
                            className={`border-b border-[#e8eaed] ${isSum
                                ? "bg-white font-medium"
                                : "bg-white hover:bg-[#f7f8fa]"
                                }`}
                        >
                            {/* Checkbox column */}
                            <td className="p-2.5">
                                {isSum && (
                                    <span className="inline-block w-4 h-4 text-[#667085]" />
                                )}
                            </td>
                            {/* Date */}
                            <td className="p-2.5 text-[#2c3e50]">
                                {isSum ? (
                                    <span className="font-medium">{row.postingDate}</span>
                                ) : (
                                    row.postingDate
                                )}
                            </td>
                            {/* Text (description as link) */}
                            <td className="p-2.5">
                                {isSum ? (
                                    <span className="font-semibold text-[#2c3e50]">Sum</span>
                                ) : isLink ? (
                                    <span className="text-[#2a7de1] hover:underline cursor-pointer">
                                        {row.description}
                                    </span>
                                ) : (
                                    <span className="text-[#2a7de1] hover:underline cursor-pointer">
                                        {row.description}
                                    </span>
                                )}
                            </td>
                            {/* Description (empty in data) */}
                            <td className="p-2.5 text-[#2c3e50]" />
                            {/* Due date */}
                            <td className="p-2.5 text-[#2c3e50]">{isSum ? "" : row.dueDate}</td>
                            {/* Voucher */}
                            <td className="p-2.5 text-[#2c3e50]">{isSum ? "" : formatVoucherNumberForDisplay(row.voucher ?? "")}</td>
                            {/* Amount */}
                            <td
                                className={`p-2.5 text-right tabular-nums ${isSum ? "font-semibold text-[#2c3e50]" : "text-[#2c3e50]"
                                    }`}
                            >
                                {formatNumber(isSum ? sum : row.amount)}
                            </td>
                            {/* Balance */}
                            <td
                                className={`p-2.5 text-right tabular-nums ${isSum ? "font-semibold text-[#2c3e50]" : "text-[#2c3e50]"
                                    }`}
                            >
                                {formatNumber(isSum ? sum : row.balance)}
                            </td>
                            {/* Payable */}
                            <td className="p-2.5 text-right tabular-nums text-[#2c3e50]" />
                        </tr>
                    )
                })}
        </>
    )
}

// --- Mobile group cards ---

function MobileCustomerGroup({
    group,
    customerId,
    isExpanded,
    onToggle,
}: {
    group: CustomerGroup
    customerId: string
    isExpanded: boolean
    onToggle: () => void
}) {
    // const sumRow = group.rows.find((r) => r.isClosingBalance)
    const sum = group.rows.reduce((acc, r) => acc + (r.amount ?? 0), 0)

    return (
        <div className="border border-[#e0e4e8] rounded-lg overflow-hidden bg-white">
            {/* Header */}
            <button
                onClick={onToggle}
                className="w-full bg-[#f7f8fa] border-b border-[#e0e4e8] p-3 flex items-center justify-between"
            >
                <div className="flex flex-col items-start gap-0.5">
                    <span className="font-semibold text-[#2a7de1] text-sm">
                        {group.customerName}
                    </span>
                    <span className="text-xs text-[#667085]">
                        {formatCustomerNumberForDisplay(group.customerNumber)}
                    </span>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-[#2c3e50] tabular-nums">
                        {formatNumber(sum)}
                    </span>
                    {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-[#667085]" />
                    ) : (
                        <ChevronDown className="h-4 w-4 text-[#667085]" />
                    )}
                </div>
            </button>

            {/* Rows */}
            {isExpanded && (
                <div className="divide-y divide-[#e8eaed]">
                    {[...group.rows, { isSumRow: true } as any].map((row, idx) => {
                        const isSum = (row as any).isSumRow === true
                        return (
                            <div
                                key={idx}
                                className={`p-3 ${isSum ? "bg-[#f7f8fa]" : ""}`}
                            >
                                {isSum ? (
                                    <div className="flex items-center justify-between">
                                        <span className="font-semibold text-sm text-[#2c3e50]">
                                            Sum
                                        </span>
                                        <div className="text-right">
                                            <div className="text-sm font-semibold tabular-nums text-[#2c3e50]">
                                                {formatNumber(row.amount)}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-1.5">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs text-[#667085]">
                                                {row.postingDate}
                                            </span>
                                            {row.dueDate && (
                                                <span className="text-xs text-[#667085]">
                                                    Due: {row.dueDate}
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-sm text-[#2a7de1]">
                                            {row.description}
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs text-[#667085]">
                                                Voucher: {formatVoucherNumberForDisplay(row.voucher ?? "")}
                                            </span>
                                            <span className="text-sm font-medium tabular-nums text-[#2c3e50]">
                                                {formatNumber(isSum ? sum : row.amount)}
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
