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
import { Decimal } from "@prisma/client/runtime/library"

export enum InvoiceStatus {
    DRAFT = 'DRAFT',       // Not sent yet
    SENT = 'SENT',         // Sent to customer
    PAID = 'PAID',         // Payment received
    OVERDUE = 'OVERDUE',   // Past due date
    CANCELLED = 'CANCELLED',
    OUTSTANDING = 'OUTSTANDING' // Cancelled
}

interface Customer {
    id: string
    customerName: string,
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
    customer?: Customer,
    product?: Product,
    project?:Project

    // Summary calculations
    totalExclVAT: Decimal
    vatAmount: Decimal
    vatPercentage: Decimal
    totalInclVAT: Decimal

    // Additional fields
    notes?: string | null
    sentAt?: Date | null
    paidAt?: Date | null
}
// Mock data for demonstration
const mockInvoices = [
    {
        id: "1",
        invoiceNo: "1000",
        customer: "Marry Janes",
        customerId: "10001",
        project: "Ecommerce Proj...",
        projectId: "1",
        status: "Outstanding",
        invoiceDate: "2025-11-20",
        dueDate: "2025-12-04",
        amountInclVAT: 720.0,
        paid: 0.0,
        outstanding: 720.0,
        details: {
            dateSent: "2025-11-20",
            dueDate: "2025-12-04",
            description: "Invoice sent",
            sendingType: "Email",
            email: "pyaephoo66@gmail.com",
            amount: 720.0,
        },
    },
    {
        id: "2",
        invoiceNo: "1001",
        customer: "Marry Janes",
        customerId: "10001",
        project: "Ecommerce Proj...",
        projectId: "1",
        status: "Paid",
        invoiceDate: "2025-11-20",
        dueDate: "2025-12-04",
        amountInclVAT: 800.0,
        paid: 800.0,
        outstanding: 0.0,
        details: null,
    },
    {
        id: "3",
        invoiceNo: "1002",
        customer: "Marry Janes",
        customerId: "10001",
        project: "",
        projectId: "",
        status: "Credited",
        invoiceDate: "2025-11-20",
        dueDate: "2025-12-04",
        amountInclVAT: 700.0,
        paid: 0.0,
        outstanding: 0.0,
        details: null,
    },
    {
        id: "4",
        invoiceNo: "1003",
        customer: "Marry Janes",
        customerId: "10001",
        project: "",
        projectId: "",
        status: "Credit note",
        invoiceDate: "2025-11-20",
        dueDate: null,
        amountInclVAT: -700.0,
        paid: 0.0,
        outstanding: 0.0,
        details: null,
    },
]

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

    const totalPages = Math.ceil(mockInvoices.length / itemsPerPage)
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    const paginatedInvoices = mockInvoices.slice(startIndex, endIndex)

    useEffect(() => {
        fetchInvoices()
    }, [])

    const fetchInvoices = async () => {
        try {
            setLoading(true)
            setError(null)
            const res = await fetch('/api/invoices')

            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`)
            }

            const data = await res.json()

            if (Array.isArray(data)) {
                setInvoices(data)
            } else {
                console.error('API did not return an array:', data)
                setInvoices([])
                setError('Invalid response format from server')
            }
        } catch (error) {
            console.error('Error fetching invoices:', error)
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
        const invoice = mockInvoices.find((inv) => inv.id === id)
        return invoice ? sum + invoice.amountInclVAT : sum
    }, 0)

    const toggleSelectAll = () => {
        if (selectedInvoices.size === mockInvoices.length) {
            setSelectedInvoices(new Set())
        } else {
            setSelectedInvoices(new Set(mockInvoices.map((inv) => inv.id)))
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

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-[1600px] mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <h1 className="text-3xl font-semibold text-gray-900">Invoice overview</h1>
                    <div className="flex items-center gap-3">
                        <Button variant="outline" className="bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100">
                            <span className="mr-2">What is new?</span>
                            <span className="text-blue-400">💡</span>
                        </Button>
                        <Button className="bg-blue-600 hover:bg-blue-700 text-white">New invoice</Button>
                        <DropdownMenu.Root>
                            <DropdownMenu.Trigger asChild>
                                <Button variant="ghost" size="icon">
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
                        className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${activeTab === "invoices"
                                ? "border-blue-600 text-blue-600"
                                : "border-transparent text-gray-500 hover:text-gray-700"
                            }`}
                    >
                        Invoices
                    </button>
                    <button
                        onClick={() => setActiveTab("other")}
                        className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${activeTab === "other"
                                ? "border-blue-600 text-blue-600"
                                : "border-transparent text-gray-500 hover:text-gray-700"
                            }`}
                    >
                        Other entries
                    </button>
                </div>

                {selectedInvoices.size > 0 ? (
                    <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
                        <div className="flex items-center justify-between">
                            <div className="text-sm text-gray-900">
                                <span className="font-semibold">{selectedInvoices.size}</span> invoices selected. Total amount is{" "}
                                <span className="font-semibold">{selectedTotal.toFixed(2)}</span>
                            </div>
                            <div className="flex items-center gap-4">
                                <button className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium">
                                    <CheckCircleIcon className="h-5 w-5" />
                                    Register payment
                                </button>
                                <button className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium">
                                    <ClockIcon className="h-5 w-5" />
                                    Payment follow-up
                                </button>
                                <button className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium">
                                    <PrinterIcon className="h-5 w-5" />
                                    Print
                                </button>
                                <button className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium">
                                    <CheckCircleIcon className="h-5 w-5" />
                                    Close entries
                                </button>
                                <button
                                    onClick={() => setSelectedInvoices(new Set())}
                                    className="text-sm text-gray-600 hover:text-gray-900 font-medium"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="bg-white rounded-lg border border-gray-200 p-4">
                        <div className="flex items-center gap-3 flex-wrap">
                            <Button variant="outline" className="gap-2 bg-transparent">
                                <FunnelIcon className="h-4 w-4" />
                                Filters
                            </Button>

                            <div className="relative flex-1 min-w-[200px]">
                                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>

                            <select
                                value={selectedStatus}
                                onChange={(e) => setSelectedStatus(e.target.value)}
                                className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option>All statuses</option>
                                <option>Outstanding</option>
                                <option>Paid</option>
                                <option>Credited</option>
                                <option>Credit note</option>
                            </select>

                            <div className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm">
                                <span>{dateRange}</span>
                                <div className="flex items-center gap-1">
                                    <button className="p-1 hover:bg-gray-100 rounded">
                                        <ChevronLeftIcon className="h-4 w-4" />
                                    </button>
                                    <button className="p-1 hover:bg-gray-100 rounded">
                                        <ChevronRightIcon className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>

                            <div className="ml-auto flex items-center gap-2">
                                <Button variant="ghost" size="icon">
                                    <ArrowDownTrayIcon className="h-5 w-5" />
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Table */}
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="w-12 px-4 py-3">
                                        <input
                                            type="checkbox"
                                            checked={selectedInvoices.size === mockInvoices.length && mockInvoices.length > 0}
                                            onChange={toggleSelectAll}
                                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        />
                                    </th>
                                    <th className="w-12 px-2 py-3"></th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                                        Invoice no.
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                                        Customer
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                                        Project
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                                        Invoice date
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                                        Due date
                                    </th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">
                                        Amount incl. VAT
                                    </th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">
                                        Paid
                                    </th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">
                                        Outstanding
                                    </th>
                                    <th className="w-12 px-2 py-3"></th>
                                    <th className="w-12 px-2 py-3"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {invoices.map((invoice) => (
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
                                            <td className="px-4 py-3">
                                                <span className="text-sm font-medium text-blue-600 hover:underline cursor-pointer">
                                                    {invoice.invoiceNumber}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="text-sm">
                                                    <div className="text-blue-600 hover:underline cursor-pointer">{invoice.customer?.customerName}</div>
                                                    <div className="text-gray-500 text-xs">({invoice.customer?.id})</div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                {invoice.project && (
                                                    <div className="text-sm">
                                                        <div className="text-blue-600 hover:underline cursor-pointer">{invoice.project?.name}</div>
                                                        <div className="text-gray-500 text-xs">({invoice.project?.id})</div>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span
                                                    className={`text-sm ${invoice.status === "OUTSTANDING"
                                                            ? "text-gray-900"
                                                            : invoice.status === "PAID"
                                                                ? "text-gray-900"
                                                                : "text-gray-900"
                                                        }`}
                                                >
                                                    {invoice.status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-900">{invoice.sentAt ? new Date(invoice.sentAt).getDate() : ""}</td>
                                            <td className="px-4 py-3 text-sm text-gray-900">{invoice.dueDate ? new Date(invoice.dueDate).getDate() : ""}</td>
                                            <td className="px-4 py-3 text-sm text-gray-900 text-right">{(invoice.totalInclVAT).toString()}</td>
                                            <td className="px-4 py-3 text-sm text-gray-900 text-right">{0.0}</td>
                                            <td className="px-4 py-3 text-sm text-gray-900 text-right">{(invoice.totalExclVAT).toString()}</td>
                                            <td className="px-2 py-3">
                                                <button className="p-1 hover:bg-gray-200 rounded">
                                                    <PaperClipIcon className="h-4 w-4 text-gray-400" />
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
                                                            <DropdownMenu.Item className="px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded cursor-pointer outline-none flex items-center gap-2">
                                                                <CheckCircleIcon className="h-4 w-4" />
                                                                Register payment
                                                            </DropdownMenu.Item>
                                                            <DropdownMenu.Item className="px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded cursor-pointer outline-none flex items-center gap-2">
                                                                <ClockIcon className="h-4 w-4" />
                                                                Payment follow-up
                                                            </DropdownMenu.Item>
                                                            <DropdownMenu.Item className="px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded cursor-pointer outline-none flex items-center gap-2">
                                                                <span className="text-base">📄</span>
                                                                Credit note
                                                            </DropdownMenu.Item>
                                                            <DropdownMenu.Item className="px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded cursor-pointer outline-none flex items-center gap-2">
                                                                <span className="text-base">📋</span>
                                                                Copy invoice
                                                            </DropdownMenu.Item>
                                                            <DropdownMenu.Item className="px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded cursor-pointer outline-none flex items-center gap-2">
                                                                <span className="text-base">✓</span>
                                                                Delete amount outstanding
                                                            </DropdownMenu.Item>
                                                            <DropdownMenu.Item className="px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded cursor-pointer outline-none flex items-center gap-2">
                                                                <span className="text-base">✓</span>
                                                                Close with other entries
                                                            </DropdownMenu.Item>
                                                        </DropdownMenu.Content>
                                                    </DropdownMenu.Portal>
                                                </DropdownMenu.Root>
                                            </td>
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
                                                                    <td className="px-4 py-3 text-sm text-gray-900">{invoice.sentAt ? new Date(invoice.sentAt).getDate() : ""}</td>
                                                                    <td className="px-4 py-3 text-sm text-gray-900">{invoice.dueDate? new Date(invoice.dueDate).getDate() : ""}</td>
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
                        <div className="px-4 py-4 flex items-center justify-end gap-12 text-sm">
                            <div className="flex items-center gap-2">
                                <span className="text-gray-600">Number of invoices</span>
                                <span className="font-semibold text-gray-900">{mockInvoices.length}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-gray-600">Total incl. VAT</span>
                                <span className="font-semibold text-gray-900">
                                    {mockInvoices.reduce((sum, inv) => sum + inv.amountInclVAT, 0).toFixed(2)}
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-gray-600">Total paid</span>
                                <span className="font-semibold text-gray-900">
                                    {mockInvoices.reduce((sum, inv) => sum + inv.paid, 0).toFixed(2)}
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-gray-600">Total outstanding</span>
                                <span className="font-semibold text-gray-900">
                                    {mockInvoices.reduce((sum, inv) => sum + inv.outstanding, 0).toFixed(2)}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
