"use client"

import React, { useEffect, useState } from "react"
import {
    ChevronDownIcon,
    ChevronUpIcon,
    FunnelIcon,
    MagnifyingGlassIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    ArrowDownTrayIcon,
    EllipsisVerticalIcon,
    PaperClipIcon,
    CheckCircleIcon,
    ClockIcon,
    PrinterIcon,
} from "@heroicons/react/24/outline"
import { Button } from "@/components/ui/button"
import * as DropdownMenu from "@radix-ui/react-dropdown-menu"
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationPrevious,
    PaginationLink,
    PaginationEllipsis,
    PaginationNext,
} from "@/components/ui/pagination"
import type { Decimal } from "@prisma/client/runtime/library"
import Link from "next/link"
import { exportToPDF, formatInvoiceNumberForDisplay, sendEmail } from "@/shared/lib/invoiceHelper"
import Swal from "sweetalert2"
import RegisterPaymentDialog from "@/components/invoice/RegisterPaymentDialog"
import CreditNoteDialog from "@/components/invoice/CreditNoteDialog"
import { useColumnVisibility } from "@/hooks/use-column-visibility"
import { is } from "zod/v4/locales"
import { ColumnVisibilityToggle } from "@/components/invoice/column-visibility-toggle"

export enum InvoiceStatus {
    DRAFT = "DRAFT", // Not sent yet
    SENT = "SENT", // Sent to customer
    PAID = "PAID", // Payment received
    OVERDUE = "OVERDUE", // Past due date
    CANCELLED = "CANCELLED",
    OUTSTANDING = "OUTSTANDING", // Cancelled
    CREDITED = "CREDITED", // Credited
    CREDIT_NOTE = "CREDIT_NOTE", // Credit note issued
}

interface Customer {
    id: string
    customerName: string
    email: string
}

interface Product {
    id: string
    productName: string
}
interface Project {
    id: string
    name: string
}
export interface Invoice {
    id: string
    invoiceNumber: string
    invoiceDate: Date
    dueDate?: Date | null
    status: InvoiceStatus

    // Customer relation
    customerId: string
    customer?: Customer
    product?: Product
    project?: Project

    // Summary calculations
    totalExclVAT: Decimal
    totalVatAmount: Decimal
    vatPercentage: Decimal
    totalInclVAT: Decimal

    // Additional fields
    notes?: string | null
    sentAt?: Date | null
    paidAt?: Date | null
}

export default function InvoiceOverview() {
    const [invoices, setInvoices] = useState<Invoice[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [activeTab, setActiveTab] = useState<"invoices" | "other">("invoices")
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
    const [searchTerm, setSearchTerm] = useState("")
    const [selectedStatus, setSelectedStatus] = useState("All statuses")
    const [dateRange, setDateRange] = useState("2024-11-20 - 2025-11-20")
    const [selectedInvoices, setSelectedInvoices] = useState<Set<string>>(new Set())

    const [currentPage, setCurrentPage] = useState(1)
    const [itemsPerPage] = useState(10)

    const totalPages = Math.ceil(invoices.length / itemsPerPage)
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    const paginatedInvoices = invoices.slice(startIndex, endIndex)
    const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState<Invoice | null>(null)
    const [selectedInvoiceForCredit, setSelectedInvoiceForCredit] = useState<Invoice | null>(null)
    const [loadingPayment, setLoadingPayment] = useState<boolean>(false);
    const [loadingCredit, setLoadingCredit] = useState<boolean>(false);
    const [loadingEmail, setLoadingEmail] = useState<Record<string, boolean>>({});
    const COLUMNS = [
        { key: "invoiceNumber", label: "Invoice no." },
        { key: "customer", label: "Customer" },
        { key: "project", label: "Project" },
        { key: "status", label: "Status" },
        { key: "sentAt", label: "Invoice date" },
        { key: "dueDate", label: "Due date" },
        { key: "totalInclVAT", label: "Amount incl. VAT" },
        { key: "totalExclVAT", label: "Amount excl. VAT" },
        { key: "totalVatAmount", label: "Total VAT amount" },
        { key: "paid", label: "Paid" },
        { key: "outstanding", label: "Outstanding" },
    ];


    const { columns, toggleColumn, resetColumns, isColumnVisible } = useColumnVisibility({
        storageKey: "invoices-columns",
        initialColumns: COLUMNS,
        defaultVisibility: {
            invoiceNumber: true,
            customer: true,
            project: true,
            status: true,
            sentAt: true,
            dueDate: true,
            totalInclVAT: true,
            totalExclVAT: true,
            totalVatAmount: true,
            paid: true,
            outstanding: true,
        }
    });

    useEffect(() => {
        fetchInvoices()
    }, [])

    const fetchInvoices = async () => {
        try {
            setLoading(true)
            setError(null)
            const res = await fetch("/api/invoices")

            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`)
            }

            let data = await res.json()

            if (Array.isArray(data)) {
                data = data.filter((invoice: Invoice) =>
                    invoice.status.toLowerCase() !== (InvoiceStatus.DRAFT.toLowerCase())
                )
                setInvoices(data)
            } else {
                console.error("API did not return an array:", data)
                setInvoices([])
                setError("Invalid response format from server")
            }
        } catch (error) {
            console.error("Error fetching invoices:", error)
            setError("Error at fetching invoices")
            setInvoices([])
        } finally {
            setLoading(false)
        }
    }

    const handlePageChange = (page: number) => {
        setCurrentPage(page)
        window.scrollTo({ top: 0, behavior: "smooth" })
    }

    const selectedTotal = Array.from(selectedInvoices).reduce((sum, id) => {
        const invoice = invoices.find((inv) => inv.id === id)
        return invoice ? sum + Number(invoice.totalInclVAT) : sum
    }, 0)

    const toggleSelectAll = () => {
        if (selectedInvoices.size === invoices.length) {
            setSelectedInvoices(new Set())
        } else {
            setSelectedInvoices(new Set(invoices.map((inv) => inv.id)))
        }
    }

    const toggleSelectInvoice = (id: string) => {
        setSelectedInvoices((prev) => {
            const newSet = new Set(prev)
            if (newSet.has(id)) {
                newSet.delete(id)
            } else {
                newSet.add(id)
            }
            return newSet
        })
    }

    const toggleRow = (id: string) => {
        setExpandedRows((prev) => {
            const newSet = new Set(prev)
            if (newSet.has(id)) {
                newSet.delete(id)
            } else {
                newSet.add(id)
            }
            return newSet
        })
    }

    const handlePDf = async (invoiceId: string) => {
        try {
            const pdfSuccess = await exportToPDF(invoiceId)
            if (pdfSuccess) {
                await Swal.fire({
                    title: "Success!",
                    text: "PDF downloaded",
                    icon: "success",
                    confirmButtonColor: "#31BCFF",
                })
            } else {
                await Swal.fire({
                    title: "Partial Success",
                    text: "PDF download failed",
                    icon: "warning",
                    confirmButtonColor: "#31BCFF",
                })
            }
        } catch (error) {
            await Swal.fire({
                title: "Partial Success",
                text: "PDF download failed",
                icon: "warning",
                confirmButtonColor: "#31BCFF",
            })
        }
    }

    const handleSendEmail = async (invoiceId: string) => {
        setLoadingEmail(prev => ({ ...prev, [invoiceId]: true }));
        await sendEmail(invoiceId, "invoiced");
        setLoadingEmail(prev => ({ ...prev, [invoiceId]: false }));
    }
    return (
        <div className="min-h-screen bg-gray-50 p-3 sm:p-6">
            <div className="max-w-[1600px] mx-auto space-y-4 sm:space-y-6">
                {/* Header */}
                <div className="space-y-4 md:flex md:items-center md:justify-between">
                    <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900">Invoice overview</h1>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                        <Button
                            variant="outline"
                            className="bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100 text-xs sm:text-sm"
                        >
                            <span className="mr-2">What is new?</span>
                            <span className="text-blue-400">💡</span>
                        </Button>
                        <Button className="bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm">New invoice</Button>
                        <DropdownMenu.Root>
                            <DropdownMenu.Trigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-10 sm:w-10">
                                    <EllipsisVerticalIcon className="h-5 w-5" />
                                </Button>
                            </DropdownMenu.Trigger>
                            <DropdownMenu.Portal>
                                <DropdownMenu.Content
                                    align="end"
                                    className="min-w-[160px] bg-white rounded-lg shadow-lg border border-gray-200 p-1 z-50"
                                >
                                    <DropdownMenu.Item className="px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded cursor-pointer outline-none">
                                        Export
                                    </DropdownMenu.Item>
                                    <DropdownMenu.Item className="px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded cursor-pointer outline-none">
                                        Print
                                    </DropdownMenu.Item>
                                </DropdownMenu.Content>
                            </DropdownMenu.Portal>
                        </DropdownMenu.Root>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-200">
                    <button
                        onClick={() => setActiveTab("invoices")}
                        className={`px-3 sm:px-4 py-3 font-medium text-xs sm:text-sm border-b-2 transition-colors ${activeTab === "invoices"
                            ? "border-blue-600 text-blue-600"
                            : "border-transparent text-gray-500 hover:text-gray-700"
                            }`}
                    >
                        Invoices
                    </button>
                </div>

                {selectedInvoices.size > 0 ? (
                    <div className="bg-blue-50 rounded-lg border border-blue-200 p-3 sm:p-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                            <div className="text-xs sm:text-sm text-gray-900">
                                <span className="font-semibold">{selectedInvoices.size}</span> invoices selected. Total amount is{" "}
                                <span className="font-semibold">{selectedTotal.toFixed(2)}</span>
                            </div>
                            <div className="flex flex-col xs:flex-row xs:flex-wrap gap-2 sm:gap-4 text-xs sm:text-sm">
                                <button className="flex items-center justify-center gap-2 text-blue-600 hover:text-blue-700 font-medium">
                                    <CheckCircleIcon className="h-4 w-4" />
                                    <span>Register payment</span>
                                </button>
                                <button className="flex items-center justify-center gap-2 text-blue-600 hover:text-blue-700 font-medium">
                                    <ClockIcon className="h-4 w-4" />
                                    <span>Payment follow-up</span>
                                </button>
                                <button className="flex items-center justify-center gap-2 text-blue-600 hover:text-blue-700 font-medium">
                                    <PrinterIcon className="h-4 w-4" />
                                    <span>Print</span>
                                </button>
                                <button className="flex items-center justify-center gap-2 text-blue-600 hover:text-blue-700 font-medium">
                                    <CheckCircleIcon className="h-4 w-4" />
                                    <span>Close entries</span>
                                </button>
                                <button
                                    onClick={() => setSelectedInvoices(new Set())}
                                    className="text-xs sm:text-sm text-gray-600 hover:text-gray-900 font-medium"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 flex-wrap">
                            <Button variant="outline" className="gap-2 bg-transparent w-full sm:w-auto text-xs sm:text-sm">
                                <FunnelIcon className="h-4 w-4" />
                                Filters
                            </Button>

                            <div className="relative w-full sm:flex-1 sm:min-w-[200px]">
                                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>

                            <select
                                value={selectedStatus}
                                onChange={(e) => setSelectedStatus(e.target.value)}
                                className="w-full sm:w-auto px-3 sm:px-4 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option>All statuses</option>
                                <option>Outstanding</option>
                                <option>Paid</option>
                                <option>Credited</option>
                                <option>Credit note</option>
                            </select>

                            <div className="flex items-center gap-2 px-3 sm:px-4 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm w-full sm:w-auto">
                                <span className="truncate">{dateRange}</span>
                                <div className="flex items-center gap-1 ml-auto">
                                    <button className="p-1 hover:bg-gray-100 rounded">
                                        <ChevronLeftIcon className="h-4 w-4" />
                                    </button>
                                    <button className="p-1 hover:bg-gray-100 rounded">
                                        <ChevronRightIcon className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center justify-end">
                                <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-10 sm:w-10">
                                    <ArrowDownTrayIcon className="h-5 w-5" />
                                </Button>
                                 <ColumnVisibilityToggle
                                            columns={columns}
                                            onColumnToggle={toggleColumn}
                                            onResetColumns={resetColumns}
                                        />
                            </div>
                        </div>
                    </div>
                )}

                <div className="hidden md:block bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="w-12 px-4 py-3">
                                        <input
                                            type="checkbox"
                                            checked={selectedInvoices.size === invoices.length && invoices.length > 0}
                                            onChange={toggleSelectAll}
                                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        />
                                    </th>
                                    <th className="w-12 px-2 py-3"></th>
                                    {isColumnVisible('invoiceNumber') && <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                                        Invoice no.
                                    </th>}
                                    {isColumnVisible('customer') && <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                                        Customer
                                    </th>}
                                    {isColumnVisible('project') && <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                                        Project
                                    </th>}
                                    {isColumnVisible('status') && <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                                        Status
                                    </th>}
                                    {isColumnVisible('sentAt') && <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                                        Invoice date
                                    </th>}
                                    {isColumnVisible('dueDate') && <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                                        Due date
                                    </th>}
                                    {isColumnVisible('totalInclVAT') && <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">
                                        Amount incl. VAT
                                    </th>}
                                    {isColumnVisible('totalExclVAT') && <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">
                                        Net amount
                                    </th>}
                                    {isColumnVisible('totalVatAmount') && <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">
                                        Total VAT amount
                                    </th>}
                                    {isColumnVisible('paid') && <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">
                                        Paid
                                    </th>}
                                    {isColumnVisible('outstanding') && <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">
                                        Outstanding
                                    </th>}
                                    <th className="w-12 px-2 py-3"></th>
                                    <th className="w-12 px-2 py-3">
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {paginatedInvoices.map((invoice) => (
                                    <React.Fragment key={invoice.id}>
                                        <tr className={`hover:bg-gray-50 ${expandedRows.has(invoice.id) ? "bg-blue-50/30" : ""}`}>
                                            <td className="px-4 py-3">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedInvoices.has(invoice.id)}
                                                    onChange={() => toggleSelectInvoice(invoice.id)}
                                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                />
                                            </td>
                                            <td className="px-2 py-3">
                                                <button onClick={() => toggleRow(invoice.id)} className="p-1 hover:bg-gray-200 rounded">
                                                    {expandedRows.has(invoice.id) ? (
                                                        <ChevronUpIcon className="h-4 w-4 text-gray-600" />
                                                    ) : (
                                                        <ChevronDownIcon className="h-4 w-4 text-gray-600" />
                                                    )}
                                                </button>
                                            </td>
                                            {isColumnVisible('invoiceNumber') && <td className="px-4 py-3">
                                                <Link
                                                    href={`/dashboard/invoices/create?invoiceId=${invoice.id}&copy=true&overview=true`}
                                                >
                                                    <span className="text-sm font-medium text-blue-600 hover:underline cursor-pointer">
                                                        {invoice.status !== InvoiceStatus.DRAFT ? formatInvoiceNumberForDisplay(invoice.invoiceNumber) : "-"}

                                                    </span>
                                                </Link>
                                            </td>
                                            }   
                                            {isColumnVisible('customer') && <td className="px-4 py-3">
                                                <div className="text-sm">
                                                    <Link
                                                        href={`/dashboard/customers/create?customerId=${invoice.customer?.id}&overview=true`}
                                                    >
                                                        <div className="text-blue-600 hover:underline cursor-pointer">
                                                            {invoice.customer?.customerName}
                                                        </div>
                                                    </Link>
                                                </div>
                                            </td>}
                                            {isColumnVisible('project') && <td className="px-4 py-3">
                                                <div className="text-sm">
                                                    <div className="text-blue-600 hover:underline cursor-pointer">{invoice.project ? invoice.project?.name : "-"}</div>
                                                </div>
                                            </td>}
                                            {isColumnVisible('status') && <td className="px-4 py-3">
                                                <span
                                                    className={`text-sm ${invoice.status === InvoiceStatus.OUTSTANDING
                                                        ? "text-gray-900"
                                                        : invoice.status === InvoiceStatus.PAID
                                                            ? "text-gray-900"
                                                            : "text-gray-900"
                                                        }`}
                                                >
                                                    {invoice.status}
                                                </span>
                                            </td>}
                                            {isColumnVisible('sentAt') && <td className="px-4 py-3 text-sm text-gray-900">
                                                {invoice.sentAt ? new Date(invoice.sentAt).toLocaleDateString() : ""}
                                            </td>}
                                            {isColumnVisible('dueDate') && <td className="px-4 py-3 text-sm text-gray-900">
                                                {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : ""}
                                            </td>}
                                            {isColumnVisible('totalInclVAT') && <td className="px-4 py-3 text-sm text-gray-900 text-right">{invoice.totalInclVAT.toString()}</td>}
                                            {isColumnVisible('totalExclVAT') && <td className="px-4 py-3 text-sm text-gray-900 text-right">{invoice.totalExclVAT.toString()}</td>}
                                            {isColumnVisible('totalVatAmount') && <td className="px-4 py-3 text-sm text-gray-900 text-right">{invoice.totalVatAmount?.toString() || "0.00"}</td>}
                                            {isColumnVisible('paid') && <td className="px-4 py-3 text-sm text-gray-900 text-right">
                                                {invoice.status === InvoiceStatus.PAID ? invoice.totalInclVAT.toString() : 0.0}
                                            </td>}
                                            {isColumnVisible('outstanding') && <td className="px-4 py-3 text-sm text-gray-900 text-right">
                                                {invoice.status === InvoiceStatus.PAID ? 0.0 : invoice.totalInclVAT.toString()}
                                            </td>}
                                            <td className="px-2 py-3">
                                                <button className="p-1 hover:bg-gray-200 rounded" onClick={() => handlePDf(invoice.id)}>
                                                    <PaperClipIcon className="h-4 w-4 text-gray-400" />
                                                </button>
                                            </td>
                                            {invoice.status !== InvoiceStatus.DRAFT &&
                                                <>
                                                    <td className="px-2 py-3">
                                                        <button
                                                            onClick={() => handleSendEmail(invoice.id)}
                                                            disabled={loadingEmail[invoice.id]}
                                                            className={`p-2 rounded-lg transition-all duration-200 ${loadingEmail[invoice.id]
                                                                ? 'text-gray-300 bg-gray-50 cursor-not-allowed'
                                                                : 'text-gray-400 hover:text-[#31BCFF] hover:bg-blue-50'
                                                                }`}
                                                        >
                                                            {loadingEmail[invoice.id] ? (
                                                                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                                </svg>
                                                            ) : (
                                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25H4.5a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                                                                </svg>
                                                            )}
                                                        </button>
                                                    </td>
                                                    <td className="px-2 py-3">
                                                        <DropdownMenu.Root>
                                                            <DropdownMenu.Trigger asChild>
                                                                <button className="p-1 hover:bg-gray-200 rounded">
                                                                    <EllipsisVerticalIcon className="h-4 w-4 text-gray-600" />
                                                                </button>
                                                            </DropdownMenu.Trigger>
                                                            <DropdownMenu.Portal>
                                                                <DropdownMenu.Content
                                                                    align="end"
                                                                    className="min-w-[220px] bg-white rounded-lg shadow-lg border border-gray-200 p-1 z-50"
                                                                >
                                                                    {invoice.status !== InvoiceStatus.PAID ? (
                                                                        <DropdownMenu.Item
                                                                            className="px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded cursor-pointer outline-none flex items-center gap-2"
                                                                            onSelect={() => setSelectedInvoiceForPayment(invoice)}
                                                                        >
                                                                            <CheckCircleIcon className="h-4 w-4" />
                                                                            Register payment
                                                                        </DropdownMenu.Item>
                                                                    ) : null}
                                                                    <DropdownMenu.Item className="px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded cursor-pointer outline-none flex items-center gap-2">
                                                                        <Link
                                                                            href={`/dashboard/invoices/create?invoiceId=${invoice.id}&copy=true`}
                                                                            className="px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded cursor-pointer outline-none flex items-center gap-2"
                                                                        >
                                                                            <span className="text-base">📋</span>
                                                                            Copy invoice
                                                                        </Link>
                                                                    </DropdownMenu.Item>
                                                                    {(invoice.status !== InvoiceStatus.CREDIT_NOTE && invoice.status !== InvoiceStatus.CREDITED) ?
                                                                        <DropdownMenu.Item
                                                                            className="px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded cursor-pointer outline-none flex items-center gap-2"
                                                                            onSelect={() => setSelectedInvoiceForCredit(invoice)}
                                                                        >
                                                                            <span className="text-base">✓</span>
                                                                            Credit Note
                                                                        </DropdownMenu.Item> : null}
                                                                </DropdownMenu.Content>
                                                            </DropdownMenu.Portal>
                                                        </DropdownMenu.Root>
                                                    </td>
                                                </>}
                                        </tr>
                                        {expandedRows.has(invoice.id) && (
                                            <tr className="bg-gray-50">
                                                <td colSpan={13} className="px-4 py-4">
                                                    <div className="ml-16 bg-white rounded-lg border border-gray-200 p-6">
                                                        <table className="w-full">
                                                            <thead className="border-b border-gray-200">
                                                                <tr>
                                                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">
                                                                        Date sent
                                                                    </th>
                                                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">
                                                                        Due date
                                                                    </th>
                                                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">
                                                                        Description
                                                                    </th>
                                                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">
                                                                        Sending type
                                                                    </th>
                                                                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-600 uppercase">
                                                                        Amount
                                                                    </th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                <tr>
                                                                    <td className="px-4 py-3 text-sm text-gray-900">
                                                                        {invoice.sentAt ? new Date(invoice.sentAt).toLocaleDateString() : ""}
                                                                    </td>
                                                                    <td className="px-4 py-3 text-sm text-gray-900">
                                                                        {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : ""}
                                                                    </td>
                                                                    <td className="px-4 py-3 text-sm text-gray-900">{invoice.notes}</td>
                                                                    <td className="px-4 py-3">
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-300">
                                                                                "email"
                                                                            </span>
                                                                            <span className="text-sm text-gray-600">{invoice.customer?.email}</span>
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-4 py-3 text-sm text-gray-900 text-right">
                                                                        {invoice.totalInclVAT.toString()}
                                                                    </td>
                                                                </tr>
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {totalPages > 1 && (
                        <div className="border-t border-gray-200 bg-white px-4 py-4">
                            <Pagination>
                                <PaginationContent>
                                    <PaginationItem>
                                        <PaginationPrevious
                                            onClick={() => currentPage > 1 && handlePageChange(currentPage - 1)}
                                            className={
                                                currentPage <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer hover:bg-gray-100"
                                            }
                                        />
                                    </PaginationItem>

                                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                                        if (page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)) {
                                            return (
                                                <PaginationItem key={page}>
                                                    <PaginationLink
                                                        onClick={() => handlePageChange(page)}
                                                        isActive={page === currentPage}
                                                        className="cursor-pointer"
                                                    >
                                                        {page}
                                                    </PaginationLink>
                                                </PaginationItem>
                                            )
                                        } else if (page === currentPage - 2 || page === currentPage + 2) {
                                            return (
                                                <PaginationItem key={page}>
                                                    <PaginationEllipsis />
                                                </PaginationItem>
                                            )
                                        }
                                        return null
                                    })}

                                    <PaginationItem>
                                        <PaginationNext
                                            onClick={() => currentPage < totalPages && handlePageChange(currentPage + 1)}
                                            className={
                                                currentPage >= totalPages
                                                    ? "pointer-events-none opacity-50"
                                                    : "cursor-pointer hover:bg-gray-100"
                                            }
                                        />
                                    </PaginationItem>
                                </PaginationContent>
                            </Pagination>
                        </div>
                    )}

                    {/* Footer Totals */}
                    <div className="border-t border-gray-200 bg-gray-50">
                        <div className="px-4 py-4 flex flex-wrap items-center justify-end gap-6 sm:gap-12 text-xs sm:text-sm">
                            <div className="flex items-center gap-2">
                                <span className="text-gray-600">Number of invoices</span>
                                <span className="font-semibold text-gray-900">{invoices.length}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-gray-600">Total incl. VAT</span>
                                <span className="font-semibold text-gray-900">
                                    {invoices.reduce((sum, inv) => sum + Number(inv.totalInclVAT), 0).toFixed(2)}
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-gray-600">Total paid</span>
                                <span className="font-semibold text-gray-900">
                                    {invoices
                                        .reduce((sum, inv) => sum + (inv.status === "PAID" ? Number(inv.totalInclVAT) : 0), 0)
                                        .toFixed(2)}
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-gray-600">Total outstanding</span>
                                <span className="font-semibold text-gray-900">
                                    {invoices
                                        .reduce((sum, inv) => sum + (inv.status !== "PAID" ? Number(inv.totalInclVAT) : 0), 0)
                                        .toFixed(2)}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="md:hidden space-y-3">
                    {paginatedInvoices.map((invoice) => (
                        <div key={invoice.id} className="bg-white rounded-lg border border-gray-200 p-3 space-y-3">
                            {/* Card Header - Invoice Number and Status */}
                            <div className="flex items-start justify-between gap-2">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={selectedInvoices.has(invoice.id)}
                                            onChange={() => toggleSelectInvoice(invoice.id)}
                                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mt-1"
                                        />
                                      {isColumnVisible('invoiceNumber') &&<h3 className="font-semibold text-blue-600 text-sm">
                                            {invoice.status !== InvoiceStatus.DRAFT ? formatInvoiceNumberForDisplay(invoice.invoiceNumber) : "-"}
                                        </h3>}
                                    </div>
                                   { isColumnVisible('customer')&&<Link
                                        href={`/dashboard/customers/create?customerId=${invoice.customer?.id}&overview=true`}
                                    >
                                        <p className="text-xs text-gray-600 ml-6">{invoice.customer?.customerName}</p>
                                    </Link>}
                                </div>
                               { isColumnVisible('status')&&<div className="text-right">
                                    <span className="inline-block px-2 py-1 text-xs font-medium bg-gray-100 rounded">
                                        {invoice.status}
                                    </span>
                                </div>}
                            </div>

                            {/* Card Details Grid */}
                            <div className="grid grid-cols-2 gap-3 text-xs">
                                {isColumnVisible('totalInclVAT')&&<div>
                                    <p className="text-gray-600">Amount</p>
                                    <p className="font-semibold text-gray-900">{invoice.totalInclVAT.toString()}</p>
                                </div>}
                                 { isColumnVisible('totalExclVAT')&&<div>
                                    <p className="text-gray-600">Net Amount</p>
                                    <p className="font-semibold text-gray-900">{invoice.totalExclVAT.toString()}</p>
                                </div>}
                                { isColumnVisible('totalVatAmount')&&<div>
                                    <p className="text-gray-600">VAT Amount</p>
                                    <p className="font-semibold text-gray-900">{invoice.totalVatAmount?.toString() || "0.00"}</p>
                                </div>}
                                {isColumnVisible('outstanding')&&<div>
                                    <p className="text-gray-600">Outstanding</p>
                                    <p className="font-semibold text-gray-900">
                                        {invoice.status === InvoiceStatus.PAID ? "0.0" : invoice.totalInclVAT.toString()}
                                    </p>
                                </div>}
                               { isColumnVisible('sentAt')&&<div>
                                    <p className="text-gray-600">Invoice Date</p>
                                    <p className="font-semibold text-gray-900">
                                        {invoice.sentAt ? new Date(invoice.sentAt).toLocaleDateString() : "-"}
                                    </p>
                                </div>}
                                {isColumnVisible('dueDate')&&<div>
                                    <p className="text-gray-600">Due Date</p>
                                    <p className="font-semibold text-gray-900">
                                        {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : "-"}
                                    </p>
                                </div>}
                                {isColumnVisible('project')&&invoice.project && (
                                    <div className="col-span-2">
                                        <p className="text-gray-600">Project</p>
                                        <p className="font-semibold text-blue-600">{invoice.project.name}</p>
                                    </div>
                                )}
                            </div>

                            {/* Card Actions */}
                            <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-200">
                                <div className="flex items-center gap-2">
                                    <button className="p-1.5 hover:bg-gray-100 rounded" onClick={() => handlePDf(invoice.id)}>
                                        <PaperClipIcon className="h-4 w-4 text-gray-400" />
                                    </button>
                                    {invoice.status !== InvoiceStatus.DRAFT &&
                                        <button
                                            onClick={() => handleSendEmail(invoice.id)}
                                            disabled={loadingEmail[invoice.id]}
                                            className={`p-2 rounded-lg transition-all duration-200 ${loadingEmail[invoice.id]
                                                ? 'text-gray-300 bg-gray-50 cursor-not-allowed'
                                                : 'text-gray-400 hover:text-[#31BCFF] hover:bg-blue-50'
                                                }`}
                                        >
                                            {loadingEmail[invoice.id] ? (
                                                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                            ) : (
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25H4.5a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                                                </svg>
                                            )}
                                        </button>
                                    }
                                </div>
                                {invoice.status !== InvoiceStatus.DRAFT &&
                                    <DropdownMenu.Root>
                                        <DropdownMenu.Trigger asChild>
                                            <button className="p-1 hover:bg-gray-200 rounded">
                                                <EllipsisVerticalIcon className="h-4 w-4 text-gray-600" />
                                            </button>
                                        </DropdownMenu.Trigger>
                                        <DropdownMenu.Portal>
                                            <DropdownMenu.Content
                                                align="end"
                                                className="min-w-[220px] bg-white rounded-lg shadow-lg border border-gray-200 p-1 z-50"
                                            >
                                                {invoice.status !== InvoiceStatus.PAID ? (
                                                    <DropdownMenu.Item
                                                        className="px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded cursor-pointer outline-none flex items-center gap-2"
                                                        onSelect={() => setSelectedInvoiceForPayment(invoice)}
                                                    >
                                                        <CheckCircleIcon className="h-4 w-4" />
                                                        Register payment
                                                    </DropdownMenu.Item>
                                                ) : null}
                                                <DropdownMenu.Item className="px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded cursor-pointer outline-none flex items-center gap-2">
                                                    <Link
                                                        href={`/dashboard/invoices/create?invoiceId=${invoice.id}&copy=true`}
                                                        className="px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded cursor-pointer outline-none flex items-center gap-2"
                                                    >
                                                        <span className="text-base">📋</span>
                                                        Copy invoice
                                                    </Link>
                                                </DropdownMenu.Item>
                                                {(invoice.status !== InvoiceStatus.CREDIT_NOTE && invoice.status !== InvoiceStatus.CREDITED) ?
                                                    <DropdownMenu.Item
                                                        className="px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded cursor-pointer outline-none flex items-center gap-2"
                                                        onSelect={() => setSelectedInvoiceForCredit(invoice)}
                                                    >
                                                        <span className="text-base">✓</span>
                                                        Credit Note
                                                    </DropdownMenu.Item> : null}
                                            </DropdownMenu.Content>
                                        </DropdownMenu.Portal>
                                    </DropdownMenu.Root>}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Mobile Pagination */}
                {totalPages > 1 && (
                    <div className="md:hidden border-t border-gray-200 bg-white px-4 py-4 rounded-lg">
                        <Pagination>
                            <PaginationContent className="flex-wrap justify-center">
                                <PaginationItem>
                                    <PaginationPrevious
                                        onClick={() => currentPage > 1 && handlePageChange(currentPage - 1)}
                                        className={currentPage <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer hover:bg-gray-100"}
                                    />
                                </PaginationItem>

                                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                                    if (page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)) {
                                        return (
                                            <PaginationItem key={page}>
                                                <PaginationLink
                                                    onClick={() => handlePageChange(page)}
                                                    isActive={page === currentPage}
                                                    className="cursor-pointer"
                                                >
                                                    {page}
                                                </PaginationLink>
                                            </PaginationItem>
                                        )
                                    } else if (page === currentPage - 2 || page === currentPage + 2) {
                                        return (
                                            <PaginationItem key={page}>
                                                <PaginationEllipsis />
                                            </PaginationItem>
                                        )
                                    }
                                    return null
                                })}

                                <PaginationItem>
                                    <PaginationNext
                                        onClick={() => currentPage < totalPages && handlePageChange(currentPage + 1)}
                                        className={
                                            currentPage >= totalPages ? "pointer-events-none opacity-50" : "cursor-pointer hover:bg-gray-100"
                                        }
                                    />
                                </PaginationItem>
                            </PaginationContent>
                        </Pagination>
                    </div>
                )}

                {/* Mobile Footer Totals */}
                <div className="md:hidden bg-white rounded-lg border border-gray-200 p-3 space-y-2">
                    <h4 className="font-semibold text-sm text-gray-900">Summary</h4>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                            <p className="text-gray-600">Invoices</p>
                            <p className="font-semibold text-gray-900">{invoices.length}</p>
                        </div>
                        <div>
                            <p className="text-gray-600">Total incl. VAT</p>
                            <p className="font-semibold text-gray-900">
                                {invoices.reduce((sum, inv) => sum + Number(inv.totalInclVAT), 0).toFixed(2)}
                            </p>
                        </div>
                        <div>
                            <p className="text-gray-600">Total paid</p>
                            <p className="font-semibold text-gray-900">
                                {invoices
                                    .reduce((sum, inv) => sum + (inv.status === "PAID" ? Number(inv.totalInclVAT) : 0), 0)
                                    .toFixed(2)}
                            </p>
                        </div>
                        <div>
                            <p className="text-gray-600">Outstanding</p>
                            <p className="font-semibold text-gray-900">
                                {invoices
                                    .reduce((sum, inv) => sum + (inv.status !== "PAID" ? Number(inv.totalInclVAT) : 0), 0)
                                    .toFixed(2)}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
            {selectedInvoiceForPayment && (
                <RegisterPaymentDialog
                    open={true}
                    onOpenChange={(open) => {
                        if (!open && !loadingPayment) {
                            setSelectedInvoiceForPayment(null);
                        }
                    }}
                    paymentData={{
                        customer: selectedInvoiceForPayment.customer,
                        invoiceId: selectedInvoiceForPayment.id,
                        amount: Number(selectedInvoiceForPayment.totalInclVAT),
                    }}
                    fetchInvoices={fetchInvoices}
                    loadingPayment={loadingPayment}
                    setLoadingPayment={setLoadingPayment}
                />
            )}

            {selectedInvoiceForCredit && (
                <CreditNoteDialog
                    open={true}
                    onOpenChange={(open) => {
                        if (!open && !loadingCredit) {
                            setSelectedInvoiceForCredit(null)
                        }
                    }}
                    creditNoteData={{
                        customer: selectedInvoiceForCredit.customer,
                        invoiceId: selectedInvoiceForCredit.id,
                        amount: Number(selectedInvoiceForCredit.totalInclVAT),
                    }}
                    fetchInvoices={fetchInvoices}
                    loadingCredit={loadingCredit}
                    setLoadingCredit={setLoadingCredit}
                />
            )}
        </div>
    )
}
