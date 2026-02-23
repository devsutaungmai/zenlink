"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import Link from 'next/link'
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
import { DateRangePicker } from "@/components/ui/date-range-picker"
import { MatchedItemsDialog } from "@/components/invoice/MatchedItemsDialog"
import { CustomerCombobox } from "@/components/invoice/CustomerCombobox"
import { Customer } from "../../invoices/create/page"

// --- Data types ---

interface CustomerLedgerRow {
    postingDate?: string
    description?: string
    dueDate?: string
    voucher?: string
    amount?: number
    balance?: number
    entryType?: string
}

export interface OpenItem {
    customerId: string
    matchGroupId: string
    balance: number
    invoiceRow?: CustomerLedgerRow
    rows?: CustomerLedgerRow[]
    isGrouped: boolean
}

interface CustomerGroup {
    customerId: string
    customerName: string
    customerNumber: string
    invoiceId?: string
    rows?: CustomerLedgerRow[]       // statement mode
    openItems?: OpenItem[]           // open items mode
}

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
    const [activeTab, setActiveTab] = useState<"open" | "statement">("statement")
    const [searchQuery, setSearchQuery] = useState("")
    const [customerFilter, setCustomerFilter] = useState<string>("")
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
        new Set(data.map((g) => g.customerId))
    )
    const [customers, setCustomers] = useState<Customer[]>([])

    const today = new Date()

    const [dateRange, setDateRange] = useState({
        startDate: formatDateLocal(today),
        endDate: formatDateLocal(new Date(today.getFullYear(), today.getMonth() + 1, 0)),
    })

    const [matchDialogOpen, setMatchDialogOpen] = useState(false)
    const [selectedMatchGroup, setSelectedMatchGroup] = useState<OpenItem | null>(null)

    const openMatchDialog = (item: OpenItem) => {
        setSelectedMatchGroup(item)
        setMatchDialogOpen(true)
    }

    const toggleGroup = (id: string) => {
        setExpandedGroups((prev) => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }

    const filteredData = data.filter((group) => {
        // Customer filter
        if (customerFilter && group.customerId !== customerFilter) return false

        // Search filter
        if (!searchQuery) return true
        const q = searchQuery.toLowerCase()

        const inStatement = group.rows?.some((r) =>
            r.description?.toLowerCase().includes(q)
        )
        const inOpenItems = group.openItems?.some(item =>
            item.rows?.some(r => r.description?.toLowerCase().includes(q))
        )

        return (
            group.customerName.toLowerCase().includes(q) ||
            group.customerNumber.includes(q) ||
            inStatement ||
            inOpenItems
        )
    })

    const subTotal = filteredData.reduce((acc, group) => {
        if (activeTab === "open") {
            return acc + (group.openItems?.reduce((a, i) => a + i.balance, 0) ?? 0)
        }
        return acc + (group.rows?.reduce((a, r) => a + (r.amount ?? 0), 0) ?? 0)
    }, 0)


    useEffect(() => {
        fetchCustomerLedger()
    }, [dateRange, activeTab, customerFilter])

    const fetchCustomerLedger = async () => {
        try {
            setLoading(true)
            const params = new URLSearchParams({
                startDate: dateRange.startDate,
                endDate: dateRange.endDate,
            });
            if (activeTab === "open") {
                params.append("onlyOpenItems", "true")
            }

            if (customerFilter) params.append("customerId", customerFilter)

            const res = await fetch(
                `/api/ledger/report/customer-ledger?${params}`,
                { cache: "no-store" }
            )

            const json = await res.json()

            // transform API → UI structure
            const mapped: CustomerGroup[] = (json ?? []).map((c: any) => {

                // OPEN ITEMS MODE
                if (activeTab === "open") {
                    return {
                        postingDate: c.postingDate,
                        customerId: c.customerId,
                        customerName: c.customerName,
                        customerNumber: c.customerNumber,
                        openItems: (c.openItems ?? []).map((item: any) => {
                            const invoice = item.rows?.find((r: any) => r.entryType === "INVOICE_POST")

                            return {
                                customerId: c.customerId,
                                matchGroupId: item.matchGroupId,
                                balance: item.balance,
                                isGrouped: true,
                                // main row shown in table
                                invoiceRow: {
                                    postingDate: formatDateLocal(invoice?.postingDate),
                                    description: invoice?.description,
                                    dueDate: formatDateLocal(invoice?.dueDate),
                                    voucher: invoice?.voucher,
                                    amount: invoice?.amount,
                                    entryType: invoice?.entryType,
                                },

                                // keep for dialog (optional)
                                rows: (item.rows ?? []).map((r: any) => ({
                                    customerId: c.customerId,
                                    postingDate: formatDateLocal(r.postingDate),
                                    description: r.description,
                                    amount: r.amount,
                                    entryType: r.entryType,
                                }))
                            }
                        })

                    }
                }

                //  STATEMENT MODE
                return {
                    customerId: c.customerId,
                    customerName: c.customerName,
                    customerNumber: c.customerNumber,
                    rows: (c.rows ?? []).map((r: any) => ({
                        customerId: c.customerId,
                        postingDate: formatDateLocal(r.postingDate),
                        description: r.description,
                        dueDate: formatDateLocal(r.dueDate),
                        voucher: r.voucher,
                        amount: r.amount,
                        balance: r.balance,
                        entryType: r.entryType,
                    }))
                }
            })

            setData(mapped)
            // auto expand all
            setExpandedGroups(new Set(mapped.map((g) => g.customerId)))
        } catch (e) {
            console.error("Failed loading ledger", e)
        } finally {
            setLoading(false)
        }
    }

    const handleUnmatch = (item: OpenItem) => {
        setData(prev =>
            prev.map(group => {
                if (group.customerId !== item.customerId) return group
                return {
                    ...group,
                    openItems: (group.openItems ?? []).map(oi => {
                        if (oi.matchGroupId !== item.matchGroupId) return oi
                        return {
                            ...oi,
                            isGrouped: false,
                            // ← no invoiceRow: undefined here
                            rows: [...(oi.rows ?? [])],
                        }
                    })
                }
            })
        )
        setSelectedMatchGroup(null)
    }

    const handleMatch = (item: OpenItem) => {
        setData(prev =>
            prev.map(group => ({
                ...group,
                openItems: (group.openItems ?? []).map(oi => {
                    if (oi.matchGroupId !== item.matchGroupId) return oi  // ← only match the selected one
                    if (oi.isGrouped) return oi
                    if (!oi.invoiceRow) return oi

                    return {
                        ...oi,
                        isGrouped: true,
                    }
                })
            }))
        )
        setSelectedMatchGroup(null)
    }

    const fetchCustomers = async () => {
        try {
            const res = await fetch('/api/customers')
            if (res.ok) {
                const data = await res.json()
                setCustomers(data)
            }
        } catch (error) {
            console.error('Error fetching customers:', error)
        }
    }

    useEffect(() => {
        fetchCustomers();
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
                                ? "bg-[#3182ce] text-white shadow-sm"
                                : "bg-[#f2f4f7] text-[#667085] hover:bg-[#e8eaed]"
                                }`}
                        >
                            Open Items
                        </button>
                        <button
                            onClick={() => setActiveTab("statement")}
                            className={`px-3 py-1.5 text-sm font-medium transition-colors border-l border-[#d0d5dd] ${activeTab === "statement"
                                ? "bg-[#3182ce] text-white shadow-sm"
                                : "bg-[#f2f4f7] text-[#667085] hover:bg-[#e8eaed]"
                                }`}
                        >
                            Statement
                        </button>
                    </div>

                    {/* Customer dropdown */}
                    <div className="relative">
                        {/* <select className="appearance-none rounded-md border border-[#d0d5dd] bg-white px-3 py-1.5 pr-8 text-sm text-[#2c3e50] focus:outline-none focus:ring-1 focus:ring-[#2a7de1]">
                            <option>Customer</option>
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-[#667085]" /> */}
                        <CustomerCombobox
                            customers={customers}
                            value={customerFilter ?? ""}
                            onChange={setCustomerFilter}
                            placeholder="Select Customer"
                            paddingYValue="py-1"
                        />
                    </div>

                    {/* Date picker */}
                    <div className="flex items-center gap-1.5 rounded-md bg-white px-3 py-1.5 text-sm text-[#2c3e50]">
                        {/* <span>03.02.2026</span>
                        <Calendar className="h-4 w-4 text-[#667085]" /> */}
                        <DateRangePicker
                            dateRange={dateRange}
                            onDateRangeChange={setDateRange}
                        />
                    </div>

                    {/* Total overdue filter */}
                    {/* <div className="flex items-center gap-1.5 rounded-full border border-[#d0d5dd] bg-white px-3 py-1.5 text-sm text-[#2c3e50]">
                        <span>Total overdue</span>
                        <button className="rounded-full bg-[#667085] p-0.5 text-white hover:bg-[#475467]">
                            <X className="h-3 w-3" />
                        </button>
                        <ChevronDown className="h-3 w-3 text-[#667085]" />
                    </div> */}

                    {/* Search */}
                    <div className="relative flex-shrink-0">
                        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#667085]" />
                        <Input
                            placeholder="Search customer..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="h-8 w-[180px] border-[#d0d5dd] pl-8 text-sm"
                        />

                    </div>

                    {/* Hide reversals */}
                    {/* <label className="flex items-center gap-2 text-sm text-[#2c3e50] cursor-pointer">
                        <Checkbox
                            checked={hideReversals}
                            onCheckedChange={(v) => setHideReversals(v === true)}
                        />
                        Hide reversals
                    </label> */}

                    {/* Right-side icons */}
                    {/* <div className="ml-auto flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Filter className="h-4 w-4 text-[#667085]" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Columns3 className="h-4 w-4 text-[#667085]" />
                        </Button>
                    </div> */}
                </div>

                {/* Bottom row: action buttons */}
                <div className="flex flex-wrap items-center gap-2">
                    <Button
                        onClick={() => selectedMatchGroup && handleMatch(selectedMatchGroup)}
                        disabled={!selectedMatchGroup}
                        className="bg-[#3182ce] hover:bg-[#3182ce] text-white text-sm h-8 px-4 rounded-md" >
                        Match
                    </Button>
                    <Button
                        variant="outline"
                        className="text-sm h-8 px-4 text-[#667085] border-[#d0d5dd] bg-white hover:bg-[#f2f4f7]"
                        onClick={() => selectedMatchGroup && handleUnmatch(selectedMatchGroup)}
                        disabled={!selectedMatchGroup}
                    >
                        Unmatch
                    </Button>
                    <Button
                        variant="outline"
                        className="text-sm h-8 px-4 text-[#667085] border-[#d0d5dd] bg-white hover:bg-[#f2f4f7]"
                        onClick={(e) => {
                            e.stopPropagation()
                            if (selectedMatchGroup) {
                                openMatchDialog(selectedMatchGroup)
                            }
                        }}
                        disabled={!selectedMatchGroup}
                    >
                        Show matches
                    </Button>

                    {/* <div className="ml-auto flex items-center gap-2">
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
                    </div> */}
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
                            {filteredData.map((group) => {



                                return (activeTab === "open"
                                    ? (

                                        // In CustomerLedger table body:
                                        <OpenItemsCustomerSection
                                            key={group.customerId}
                                            group={group}
                                            isExpanded={expandedGroups.has(group.customerId)}
                                            onToggle={() => toggleGroup(group.customerId)}
                                            onOpenMatch={openMatchDialog}
                                            selectedMatchGroup={selectedMatchGroup}
                                            onSelectMatchGroup={setSelectedMatchGroup}
                                        />

                                    )
                                    : (
                                        <CustomerGroupSection key={group.customerId} customerId={group.customerId} invoiceId={group.invoiceId} group={group} isExpanded={expandedGroups.has(group.customerId)} onToggle={() => toggleGroup(group.customerId)} />
                                    ))
                            }
                            )}

                        </tbody>
                        <tfoot>
                            <tr className="border-b bg-white font-semibold">
                                <td></td>
                                <td className="p-2.5 font-semibold text-right" colSpan={7}>
                                     {activeTab === "open" ? "Total Outstanding" : "Total"}
                                </td>
                                <td className="p-2.5 font-semibold text-right">
                                    {formatNumber(subTotal)}
                                </td>
                            </tr>
                        </tfoot>
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
                <MatchedItemsDialog
                    open={matchDialogOpen}
                    onClose={() => setMatchDialogOpen(false)}
                    matchGroup={selectedMatchGroup}
                    onUnmatch={handleUnmatch}
                />
            </div>
        </div>
    )
}

// --- Desktop group section ---

function CustomerGroupSection({
    group,
    customerId,
    invoiceId,
    isExpanded,
    onToggle,
}: {
    group: CustomerGroup
    customerId: string
    invoiceId?: string
    isExpanded: boolean
    onToggle: () => void
}) {
    const rows = group.rows ?? [];
    const sum = rows.reduce((acc, r) => acc + (r.amount ?? 0), 0)

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
                [...rows, { isSumRow: true } as any].map((row, idx) => {
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
                                    <span className="font-semibold text-[#2c3e50]">Net Balance</span>
                                ) : isLink ? (
                                    <Link
                                        href={`/dashboard/invoices/create?invoiceId=${invoiceId}&copy=true&overview=true`}
                                    >
                                        <span className="text-[#2a7de1] hover:underline cursor-pointer">
                                            {row.description}
                                        </span>
                                    </Link>
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

function OpenItemsCustomerSection({
    group, isExpanded, onToggle, onOpenMatch, selectedMatchGroup, onSelectMatchGroup,
}: {
    group: CustomerGroup
    isExpanded: boolean
    onToggle: () => void
    onOpenMatch: (item: OpenItem) => void
    selectedMatchGroup: OpenItem | null
    onSelectMatchGroup: (item: OpenItem | null) => void
}) {
    const customerTotal =
        group.openItems?.reduce((a, i) => a + i.balance, 0) ?? 0

    return (
        <>
            {/* Customer header */}
            <tr className="bg-[#f7f8fa] cursor-pointer" onClick={onToggle}>
                <td colSpan={9} className="p-2.5 font-semibold text-[#2a7de1]">
                    {group.customerName} ({formatCustomerNumberForDisplay(group.customerNumber)})
                </td>
            </tr>

            {isExpanded && group.openItems?.map((item) => (
                <OpenItemBlock
                    key={item.matchGroupId + (item.isGrouped ? "_g" : "_u")}
                    item={item}
                    onOpenMatch={onOpenMatch}
                    isSelected={selectedMatchGroup?.matchGroupId === item.matchGroupId}
                    onSelect={onSelectMatchGroup}
                />
            ))}

            <tr className="border-b bg-white font-semibold">
                <td></td><td></td>
                <td>Remaining balance</td>
                <td></td><td></td><td></td>
                <td></td>
                <td className="p-2.5 text-right text-red-600">{formatNumber(customerTotal)}</td>
                <td></td>
            </tr>

        </>
    )
}

function OpenItemBlock({ item, onOpenMatch, isSelected, onSelect }: {
    item: OpenItem
    onOpenMatch: (item: OpenItem) => void
    isSelected: boolean
    onSelect: (item: OpenItem | null) => void
}) {
    if (item.isGrouped && item.invoiceRow) {
        const row = item.invoiceRow
        return (
            <tr
                className={`border-b hover:bg-[#f7f8fa] cursor-pointer ${isSelected ? "bg-blue-50" : "bg-white"}`}
                onClick={() => onSelect(isSelected ? null : item)}
            >
                <td className="p-2.5 text-[#2a7de1] flex items-center gap-2">
                    <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onSelect(isSelected ? null : item)}
                        onClick={e => e.stopPropagation()}
                        className="cursor-pointer"
                    />
                    <button
                        onClick={(e) => {
                            e.stopPropagation()
                            onOpenMatch(item)
                        }}
                        className="text-gray-500 hover:text-blue-600"
                    >
                        🔗
                    </button>

                </td>
                <td className="p-2.5">{row.postingDate}</td>
                <td className="p-2.5">{row.description}</td>
                <td className="p-2.5"></td>
                <td className="p-2.5"></td>
                <td className="p-2.5 text-right">{formatNumber(row.amount)}</td>
                <td className="p-2.5 text-right font-semibold">{formatNumber(item.balance)}</td>
                <td className="p-2.5 text-right font-semibold text-red-600">{formatNumber(item.balance)}</td>
                <td></td>
            </tr>
        )
    }

    // Expanded/unmatched rows
    return (
        <>
            {item.rows?.map((row, i) => {
                const isInvoice = row.entryType === "INVOICE_POST"
                const isThisSelected = isSelected && isInvoice

                return (
                    <tr
                        key={i}
                        className={`border-b cursor-pointer ${isThisSelected ? "bg-blue-50" : "bg-white hover:bg-[#f7f8fa]"}`}
                        onClick={() => isInvoice ? onSelect(isThisSelected ? null : item) : undefined}
                    >
                        <td className="p-2.5">
                            {isInvoice && (
                                <input
                                    type="checkbox"
                                    checked={isThisSelected}
                                    onChange={() => onSelect(isThisSelected ? null : item)}
                                    onClick={e => e.stopPropagation()}
                                    className="cursor-pointer"
                                />
                            )}
                        </td>
                        <td className="p-2.5">{row.postingDate}</td>
                        <td className="p-2.5 text-[#2a7de1]">{row.description}</td>
                        <td></td><td></td>
                        <td className="p-2.5 text-right">{formatNumber(row.amount)}</td>
                        <td></td><td></td><td></td>
                    </tr>
                )
            })}
            <tr className="border-b bg-white font-semibold">
                <td></td><td></td>
                <td>Remaining balance</td>
                <td></td><td></td><td></td>
                <td className="p-2.5 text-right">{formatNumber(item.balance)}</td>
                <td className="p-2.5 text-right text-red-600">{formatNumber(item.balance)}</td>
                <td></td>
            </tr>
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
    const sum = group.rows?.reduce((acc, r) => acc + (r.amount ?? 0), 0) || 0
    const rows = group.rows ?? []
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
                    {
                        [...rows, { isSumRow: true } as any].map((row, idx) => {
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
