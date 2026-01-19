'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { PlusIcon, PencilIcon, TrashIcon, MagnifyingGlassIcon, Cog6ToothIcon, FunnelIcon, PaperAirplaneIcon, PaperClipIcon } from '@heroicons/react/24/outline'
import { useTranslation } from 'react-i18next'
import Swal from 'sweetalert2'
import { useCurrency } from '@/shared/hooks/useCurrency'
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination"
import { Decimal } from '@prisma/client/runtime/library'
import { EmailService } from '@/shared/lib/notifications'
import { Mail, MailIcon } from 'lucide-react'
import { exportToPDF, formatInvoiceNumberForDisplay, sendEmail } from '@/shared/lib/invoiceHelper'
import { useRouter } from 'next/navigation'
import { useColumnVisibility } from '@/hooks/use-column-visibility'
import { ColumnVisibilityToggle } from '@/components/invoice/column-visibility-toggle'


export enum InvoiceStatus {
    DRAFT = 'DRAFT',       // Not sent yet
    SENT = 'SENT',         // Sent to customer
    PAID = 'PAID',         // Payment received
    OVERDUE = 'OVERDUE',   // Past due date
    CANCELLED = 'CANCELLED' // Cancelled
}

interface Customer {
    id: string
    customerName: string
}

interface Product {
    id: string
    productName: string
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

export default function InvoicesPage() {
    const { t } = useTranslation()
    // const { currencySymbol } = useCurrency()
    const router = useRouter()
    const [invoices, setInvoices] = useState<Invoice[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedFilter, setSelectedFilter] = useState('all')

    // Pagination states
    const [currentPage, setCurrentPage] = useState(1)
    const [itemsPerPage] = useState(10)
    const [selectedInvoices, setSelectedInvoices] = useState<string[]>([])
    const [loadingEmail, setLoadingEmail] = useState<Record<string, boolean>>({});
    const handleSendEmail = async (invoiceId: string) => {
        setLoadingEmail(prev => ({ ...prev, [invoiceId]: true }));
        await sendEmail(invoiceId, "invoiced");
        setLoadingEmail(prev => ({ ...prev, [invoiceId]: false }));
    }

    const COLUMNS = [
        { key: "invoiceNumber", label: "Invoice Number" },
        { key: "customer", label: "Customer" },
        { key: "sentAt", label: "Invoice Date" },
        { key: "status", label: "Status" },
        { key: "totalExclVAT", label: "Total (excl. VAT)" },
        { key: "vatAmount", label: "VAT" },
        { key: "totalInclVAT", label: "Total (incl. VAT)" },
    ];

    const { columns, toggleColumn, resetColumns, isColumnVisible } = useColumnVisibility({
        storageKey: "invoices-columns",
        initialColumns: COLUMNS,
        defaultVisibility: {
            invoiceNumber: true,
            customer: true,
            sentAt: true,
            status: true,
            totalExclVAT: true,
            vatAmount: true,
            totalInclVAT: true,
        },
    });

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

            console.log('Fetched invoices:', data)

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

    const handleDelete = async (id: string, invoiceNumber: string) => {
        try {
            const result = await Swal.fire({
                title: t('common.confirm'),
                text: `Are you sure you want to delete "${invoiceNumber}"?`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#31BCFF',
                cancelButtonColor: '#d33',
                confirmButtonText: t('common.yes'),
                cancelButtonText: t('common.cancel')
            })

            if (result.isConfirmed) {
                const res = await fetch(`/api/invoices/${id}`, {
                    method: 'DELETE',
                })

                if (!res.ok) {
                    throw new Error('Failed to delete invoice')
                }

                setInvoices(invoices.filter(invoice => invoice.id !== id))

                await Swal.fire({
                    title: t('common.success'),
                    text: 'Invoice deleted successfully',
                    icon: 'success',
                    confirmButtonColor: '#31BCFF',
                })
            }
        } catch (error) {
            console.error('Error deleting invoice:', error)
            await Swal.fire({
                title: t('common.error'),
                text: 'Failed to delete invoice',
                icon: 'error',
                confirmButtonColor: '#31BCFF',
            })
        }
    }

    const filteredInvoices = invoices.filter(invoice => {
        const matchesSearch = invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
            invoice.customer?.customerName.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesFilter = selectedFilter === "all" ||
            invoice.status.toLowerCase() === selectedFilter.toLowerCase();

        return matchesSearch && matchesFilter;
    }
    )

    // Pagination calculations
    const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage)
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    const paginatedInvoices = filteredInvoices.slice(startIndex, endIndex)

    // Reset to page 1 when search changes
    useEffect(() => {
        setCurrentPage(1)
    }, [searchTerm])

    const handlePageChange = (page: number) => {
        setCurrentPage(page)
        // Scroll to top of table when page changes
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    const handleFilterClick = (filter: string) => () => {
        setSelectedFilter(filter)
        setCurrentPage(1)
    }
    const draftInvoices = paginatedInvoices.filter((inv) => inv.status === InvoiceStatus.DRAFT);
    const isAllSelected = draftInvoices.length > 0 && selectedInvoices.length === draftInvoices.length
    const isPartiallySelected = selectedInvoices.length > 0 && selectedInvoices.length < draftInvoices.length
    const hasSelectedInvoices = selectedInvoices.length > 0

    const handleSelectAll = () => {
        if (selectedInvoices.length === draftInvoices.length) {
            setSelectedInvoices([])
        } else {
            setSelectedInvoices(draftInvoices.map((inv) => inv.id))
        }
    }

    const handleSelectInvoice = (invoiceId: string) => {
        if (selectedInvoices.includes(invoiceId)) {
            setSelectedInvoices(selectedInvoices.filter((id) => id !== invoiceId))
        } else {
            setSelectedInvoices([...selectedInvoices, invoiceId])
        }
    }

    const handleSendInvoices = async (sendType: 'send' | 'send_with_email') => {
        // Validate that selected invoices are all in DRAFT status
        const selectedInvoicesList = paginatedInvoices.filter(inv =>
            selectedInvoices.includes(inv.id)
        )
        const nonDraftInvoices = selectedInvoicesList.filter(
            inv => inv.status !== InvoiceStatus.DRAFT
        )

        if (nonDraftInvoices.length > 0) {
            await Swal.fire({
                title: 'Error',
                text: 'Only DRAFT invoices can be sent',
                icon: 'error',
                confirmButtonColor: '#31BCFF',
            })
            return
        }

        if (selectedInvoices.length === 0) {
            await Swal.fire({
                title: 'Error',
                text: 'Please select at least one invoice',
                icon: 'error',
                confirmButtonColor: '#31BCFF',
            })
            return
        }

        setLoading(true)
        console.log('Selected invoice IDs to send:', selectedInvoices)
        try {
            // Step 1: Update invoice status to SENT via API
            const res = await fetch('/api/invoices/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ids: selectedInvoices,
                    sendType
                }),
            })

            if (!res.ok) {
                const error = await res.json()
                throw new Error(error.error || 'Failed to send invoices')
            }

            const result = await res.json()
            console.log('Send invoices result:', JSON.stringify(result, null, 2))

            // Step 2: If sendType is 'send_with_email', also send emails
            if (sendType === 'send_with_email') {
                const emailErrors = []

                // Send email for each successfully updated invoice
                for (const invoice of result.invoices) {
                    try {
                        await sendEmail(invoice.id)
                    } catch (emailError) {
                        emailErrors.push({
                            invoiceNumber: invoice.invoiceNumber,
                            error: emailError instanceof Error ? emailError.message : 'Failed to send email'
                        })
                    }
                }
                // Show appropriate success message
                //   if (emailErrors.length === 0) {
                //     await Swal.fire({
                //       title: 'Success!',
                //       text: `${result.count} invoice(s) sent successfully with email notifications`,
                //       icon: 'success',
                //       confirmButtonColor: '#31BCFF',
                //     })
                //   } else {
                //     await Swal.fire({
                //       title: 'Partial Success',
                //       html: `
                //         <p>${result.count} invoice(s) updated to SENT status</p>
                //         <p class="text-red-600 mt-2">Failed to send ${emailErrors.length} email(s):</p>
                //         <ul class="text-sm text-left mt-2">
                //           ${emailErrors.map(e => `<li>${e.invoiceNumber}: ${e.error}</li>`).join('')}
                //         </ul>
                //       `,
                //       icon: 'warning',
                //       confirmButtonColor: '#31BCFF',
                //     })
                //   }
            } else {
                // Just show success for status update
                await Swal.fire({
                    title: 'Success!',
                    text: `Invoice(s) sent successfully`,
                    icon: 'success',
                    confirmButtonColor: '#31BCFF',
                })
            }

            // Clear selection and refresh
            setSelectedInvoices([])
            fetchInvoices()
            router.refresh()

        } catch (error) {
            await Swal.fire({
                title: 'Error',
                text: error instanceof Error ? error.message : 'An error occurred',
                icon: 'error',
                confirmButtonColor: '#31BCFF',
            })
        } finally {
            setLoading(false)
        }
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

    const handleDeleteInvoices = async () => {
        // Validate that selected invoices are all in DRAFT status
        const selectedInvoicesList = paginatedInvoices.filter(inv =>
            selectedInvoices.includes(inv.id)
        )
        const nonDraftInvoices = selectedInvoicesList.filter(
            inv => inv.status !== InvoiceStatus.DRAFT
        )

        if (nonDraftInvoices.length > 0) {
            await Swal.fire({
                title: 'Error',
                text: 'Only DRAFT invoices can be sent',
                icon: 'error',
                confirmButtonColor: '#31BCFF',
            })
            return
        }

        if (selectedInvoices.length === 0) {
            await Swal.fire({
                title: 'Error',
                text: 'Please select at least one invoice',
                icon: 'error',
                confirmButtonColor: '#31BCFF',
            })
            return
        }

        setLoading(true)
        console.log('Selected invoice IDs to send:', selectedInvoices)
        try {
            const res = await fetch('/api/invoices/bulk', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ids: selectedInvoices,
                }),
            })

            if (!res.ok) {
                const error = await res.json()
                throw new Error(error.error || 'Failed to delete invoices')
            }

            const result = await res.json()
            await Swal.fire({
                title: t('common.success'),
                text: 'Invoices deleted successfully',
                icon: 'success',
                confirmButtonColor: '#31BCFF',
            })

            // Clear selection and refresh
            setSelectedInvoices([])
            fetchInvoices()
            router.refresh()

        } catch (error) {
            await Swal.fire({
                title: 'Error',
                text: error instanceof Error ? error.message : 'An error occurred',
                icon: 'error',
                confirmButtonColor: '#31BCFF',
            })
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#31BCFF]"></div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="p-6">
                <div className="text-center text-red-600">
                    {t('common.error')}: {error}
                    <button
                        onClick={fetchInvoices}
                        className="ml-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                        {t('common.try_again')}
                    </button>
                </div>
            </div>
        )
    }



    return (
        <div className="space-y-6">
            {/* Header Section */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between">
                    <div className="mb-4 sm:mb-0">
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                            Invoices
                        </h1>
                        <p className="mt-2 text-gray-600">
                            Invoice Management for all business
                        </p>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                        <Link
                            href="/dashboard/invoices/create"
                            className="inline-flex items-center justify-center px-6 py-3 rounded-2xl bg-gradient-to-r from-[#31BCFF] to-[#0EA5E9] text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 group"
                        >
                            <PlusIcon className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform duration-200" />
                            Create New Invoice
                        </Link>
                    </div>
                </div>
            </div>

            {/* Search and Filters */}
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 border border-gray-200/50 shadow-lg">
                <div className="flex flex-col lg:flex-row gap-4">
                    <div className="relative flex-1">
                        <MagnifyingGlassIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search invoices by invoice number and customer name"
                            className="block w-full pl-12 pr-4 py-3 rounded-xl border border-gray-300 bg-white/70 backdrop-blur-sm text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-[#31BCFF]/50 focus:border-[#31BCFF] transition-all duration-200"
                        />
                    </div>
                </div>
                {/* <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
                    <span>
                        {filteredInvoices.length > 0
                            ? t('showing_paginated', {
                                start: startIndex + 1,
                                end: Math.min(endIndex, filteredInvoices.length),
                                total: filteredInvoices.length
                            })
                            : t('employee_groups.showing', { current: 0, total: invoices.length })
                        }
                    </span>
                    {totalPages > 1 && (
                        <span className="text-xs text-gray-400">
                            {t('page_info', { current: currentPage, total: totalPages })}
                        </span>
                    )}
                </div> */}
                {/* Filter Buttons */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-4">
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-500">
                            <FunnelIcon className="w-4 h-4 flex-shrink-0" />
                            <span>Filter</span>
                        </div>
                        {[
                            { value: 'all', label: "ALL" },
                            { value: 'draft', label: "DRAFT" },
                            { value: 'outstanding', label: "OUTSTANDING" },
                            { value: 'paid', label: "PAID" }
                        ].map((filter) => (
                            <button
                                key={filter.value}
                                onClick={handleFilterClick(filter.value)}
                                className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 ${selectedFilter === filter.value
                                    ? 'bg-[#31BCFF] text-white shadow-md'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                            >
                                {filter.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Invoices List */}
            {filteredInvoices.length === 0 ? (
                <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-12 border border-gray-200/50 shadow-lg text-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <MagnifyingGlassIcon className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No invoice found</h3>

                    {!searchTerm && (
                        <Link
                            href="/dashboard/invoices/create"
                            className="inline-flex items-center px-6 py-3 rounded-xl bg-[#31BCFF] text-white font-medium hover:bg-[#31BCFF]/90 transition-colors duration-200"
                        >
                            <PlusIcon className="w-5 h-5 mr-2" />
                            Create your invoice
                        </Link>
                    )}
                </div>
            ) : (
                <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 shadow-lg overflow-hidden">
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50/80">
                                <tr>
                                    <th className="px-4 py-4 text-left">
                                        <input
                                            type="checkbox"
                                            checked={isAllSelected}
                                            ref={(el) => {
                                                if (el) el.indeterminate = isPartiallySelected
                                            }}
                                            onChange={handleSelectAll}
                                            className="w-4 h-4 text-[#31BCFF] border-gray-300 rounded focus:ring-[#31BCFF] cursor-pointer"
                                        />
                                    </th>
                                   {isColumnVisible('invoiceNumber')&&<th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Invoice Number
                                    </th>}
                                    {isColumnVisible('customer')&&<th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Customer
                                    </th>}
                                   {isColumnVisible('sentAt')&&<th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Invoice Date
                                    </th>}
                                    {isColumnVisible('status')&&<th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Status
                                    </th>}
                                    {isColumnVisible('totalExclVAT')&&<th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Total Excl VAT
                                    </th>}
                                    {isColumnVisible('vatAmount')&&<th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        VAT Amount
                                    </th>}
                                    {isColumnVisible('totalInclVAT')&&<th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Total Incl VAT
                                    </th>}
                                    <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        <div className="flex items-center justify-end gap-2">

                                            {hasSelectedInvoices ? (
                                                <>
                                                    <span className="text-[#31BCFF] mr-2">{selectedInvoices.length} selected</span>
                                                    <button
                                                        onClick={() => handleSendInvoices("send")}
                                                        className="p-2 text-green-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all duration-200"
                                                        title="Send Selected Invoices"
                                                    >
                                                        <PaperAirplaneIcon className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleSendInvoices("send_with_email")}
                                                        className="p-2 text-green-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all duration-200"
                                                        title="Send Selected Invoices with Email"
                                                    >
                                                        <MailIcon className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteInvoices()}
                                                        className="p-2 text-green-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all duration-200"
                                                        title="Send Selected Invoices"
                                                    >
                                                        <TrashIcon className="h-4 w-4" />
                                                    </button>
                                                </>
                                            ) : (
                                                t("actions")
                                            )}
                                            <ColumnVisibilityToggle
                                                columns={columns}
                                                onColumnToggle={toggleColumn}
                                                onResetColumns={resetColumns}
                                            />
                                        </div>

                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200/50">
                                {paginatedInvoices.map((invoice) => (
                                    <tr key={invoice.id} className="hover:bg-blue-50/30 transition-colors duration-200">
                                        <td className="px-4 py-4">
                                            {invoice.status === InvoiceStatus.DRAFT && (<input
                                                type="checkbox"
                                                checked={selectedInvoices.includes(invoice.id)}
                                                onChange={() => handleSelectInvoice(invoice.id)}
                                                className="w-4 h-4 text-[#31BCFF] border-gray-300 rounded focus:ring-[#31BCFF] cursor-pointer"
                                            />)}
                                        </td>
                                       {isColumnVisible('invoiceNumber')&&<td className="px-6 py-4">
                                            <div className="text-sm font-medium text-gray-900">
                                                {invoice.status !== InvoiceStatus.DRAFT ? formatInvoiceNumberForDisplay(invoice.invoiceNumber) : "-"}
                                            </div>
                                        </td>}
                                        {isColumnVisible('customer')&&<td className="px-6 py-4">
                                            <div className="text-sm text-gray-900">
                                                {invoice.customer?.customerName}
                                            </div>
                                        </td>}
                                       {isColumnVisible('sentAt')&& <td className="px-6 py-4">
                                            <div className="text-sm text-gray-900">
                                                {/* {new Date(invoice.invoiceDate).toLocaleDateString()}
                                                 */}
                                                {invoice.sentAt ? new Date(invoice.sentAt).toLocaleDateString() : '-'}
                                            </div>
                                        </td>}
                                       {isColumnVisible('status')&&<td className="px-6 py-4">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                {invoice.status}
                                            </span>
                                        </td>}
                                       {isColumnVisible('totalExclVAT')&&<td className="px-6 py-4">
                                            <div className="text-sm text-gray-900">
                                                {Number(invoice?.totalExclVAT ?? 0).toFixed(2)}
                                            </div>
                                        </td>}
                                        {isColumnVisible('vatAmount')&&<td className="px-6 py-4">
                                            <div className="text-sm text-gray-900">
                                                {Number(invoice?.vatAmount ?? 0).toFixed(2)}

                                            </div>
                                        </td>}
                                       {isColumnVisible('totalInclVAT')&&<td className="px-6 py-4">
                                            <div className="text-sm font-medium text-gray-900">
                                                {Number(invoice?.totalInclVAT ?? 0).toFixed(2)}

                                            </div>
                                        </td>}
                                        <td className="px-6 py-4">
                                            {(!hasSelectedInvoices && invoice.status === InvoiceStatus.DRAFT) ? (
                                                <div className="flex items-center justify-end gap-2">
                                                    <Link
                                                        href={`/dashboard/invoices/${invoice.id}/edit`}
                                                        className="p-2 text-gray-400 hover:text-[#31BCFF] hover:bg-blue-50 rounded-lg transition-all duration-200"
                                                        title="Edit Invoice"
                                                    >
                                                        <PencilIcon className="h-4 w-4" />
                                                    </Link>
                                                    <button
                                                        onClick={() => handleDelete(invoice.id, invoice.invoiceNumber)}
                                                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                                                        title={t("employee_groups.delete_group")}
                                                    >
                                                        <TrashIcon className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            ) : (<div className="flex items-center justify-end gap-2">
                                                <button className="p-1 hover:bg-gray-200 rounded" onClick={() => handlePDf(invoice.id)}>
                                                    <PaperClipIcon className="h-4 w-4 text-gray-400" />
                                                </button>


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
                                            </div>)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-center px-6 py-4 border-t border-gray-200/50">
                            <Pagination>
                                <PaginationContent>
                                    <PaginationItem>
                                        <PaginationPrevious
                                            onClick={() => currentPage > 1 && handlePageChange(currentPage - 1)}
                                            className={currentPage <= 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                                        />
                                    </PaginationItem>

                                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                                        // Show first page, last page, current page, and pages around current page
                                        if (
                                            page === 1 ||
                                            page === totalPages ||
                                            (page >= currentPage - 1 && page <= currentPage + 1)
                                        ) {
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
                                        } else if (
                                            page === currentPage - 2 ||
                                            page === currentPage + 2
                                        ) {
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
                                            className={currentPage >= totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                                        />
                                    </PaginationItem>
                                </PaginationContent>
                            </Pagination>
                        </div>
                    )}

                    {/* Mobile Cards  */}
                    <div className="md:hidden space-y-4 p-4">
                        {paginatedInvoices.length > 0 && (
                            <div className="flex items-center justify-between gap-3 p-3 bg-gray-50 rounded-xl">
                                <div className="flex items-center gap-3">
                                    <input
                                        type="checkbox"
                                        checked={isAllSelected}
                                        ref={(el) => {
                                            if (el) el.indeterminate = isPartiallySelected
                                        }}
                                        onChange={handleSelectAll}
                                        className="w-5 h-5 text-[#31BCFF] border-gray-300 rounded focus:ring-[#31BCFF] cursor-pointer"
                                    />
                                    <span className="text-sm font-medium text-gray-700">
                                        {isAllSelected ? "Deselect All" : "Select All"}
                                    </span>
                                    {selectedInvoices.length > 0 && (
                                        <span className="text-sm text-[#31BCFF] font-medium">{selectedInvoices.length} selected</span>
                                    )}
                                </div>
                                {hasSelectedInvoices && (
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => handleSendInvoices("send")}
                                            className="p-2 text-green-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all duration-200"
                                            title="Send Selected Invoices"
                                        >
                                            <PaperAirplaneIcon className="h-5 w-5" />
                                        </button>
                                        <button
                                            onClick={() => handleSendInvoices("send_with_email")}
                                            className="p-2 text-green-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all duration-200"
                                            title="Send Selected Invoices with Email"
                                        >
                                            <MailIcon className="h-5 w-5" />
                                        </button>
                                    </div>
                                )}
                                <div className="flex item-center gap-2">
                                     <ColumnVisibilityToggle
                                                columns={columns}
                                                onColumnToggle={toggleColumn}
                                                onResetColumns={resetColumns}
                                            />
                                </div>
                            </div>
                        )}
                        {paginatedInvoices.map((invoice) => (
                            <div
                                key={invoice.id}
                                className="bg-white/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 shadow-lg overflow-hidden hover:shadow-xl transition-all duration-200"
                            >
                                {/* Card Header */}
                                <div className="p-4 bg-gradient-to-r from-gray-50 to-blue-50/30">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-start gap-3 flex-1">
                                            {invoice.status === InvoiceStatus.DRAFT && (<input
                                                type="checkbox"
                                                checked={selectedInvoices.includes(invoice.id)}
                                                onChange={() => handleSelectInvoice(invoice.id)}
                                                className="w-5 h-5 mt-0.5 text-[#31BCFF] border-gray-300 rounded focus:ring-[#31BCFF] cursor-pointer"
                                            />)}
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 flex-wrap mb-2">
                                                {isColumnVisible('invoiceNumber')&&<span className="text-base font-bold text-gray-900">
                                                        {invoice.status !== InvoiceStatus.DRAFT ? formatInvoiceNumberForDisplay(invoice.invoiceNumber) : "-"}

                                                    </span>}
                                                   {isColumnVisible('status')&&<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                        {invoice.status}
                                                    </span>}
                                                </div>
                                                {isColumnVisible('customer')&&<p className="text-sm text-gray-600">
                                                    {invoice.customer?.customerName}
                                                </p>}
                                            </div>
                                        </div>
                                    </div>

                                </div>

                                {/* Card Body */}
                                <div className="p-4 space-y-3">
                                    {/* Date Information */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="bg-gray-50 rounded-lg p-3">
                                            <div className="text-xs text-gray-500 mb-1">Invoice Date</div>
                                            <div className="text-sm font-medium text-gray-900">
                                                {invoice.sentAt ? new Date(invoice.sentAt).toLocaleDateString() : '-'}
                                            </div>
                                        </div>
                                        {/* <div className="bg-gray-50 rounded-lg p-3">
                                            <div className="text-xs text-gray-500 mb-1">Due Date</div>
                                            <div className="text-sm font-medium text-gray-900">
                                                {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : '-'}
                                            </div>
                                        </div> */}
                                    </div>

                                    {/* Financial Breakdown */}
                                    <div className="bg-blue-50/50 rounded-lg p-3 space-y-2">
                                       {isColumnVisible('totalExclVAT')&&<div className="flex items-center justify-between text-sm">
                                            <span className="text-gray-600">Total Excl VAT</span>
                                            <span className="font-medium text-gray-900">
                                                {Number(invoice.totalExclVAT).toFixed(2)}
                                            </span>
                                        </div>}
                                       {isColumnVisible('vatAmount')&&<div className="flex items-center justify-between text-sm">
                                            <span className="text-gray-600">VAT Amount</span>
                                            <span className="font-medium text-gray-900">
                                                {Number(invoice.vatAmount).toFixed(2)}
                                            </span>
                                        </div>}
                                       {isColumnVisible('totalInclVAT')&&<div className="flex items-center justify-between text-sm pt-2 border-t border-blue-200">
                                            <span className="font-semibold text-gray-900">Total Incl VAT</span>
                                            <span className="font-bold text-gray-900">
                                                {Number(invoice.totalInclVAT).toFixed(2)}
                                            </span>
                                        </div>}
                                    </div>

                                    {/* Notes */}
                                    {invoice.notes && (
                                        <div className="bg-gray-50 rounded-lg p-3">
                                            <div className="text-xs text-gray-500 mb-1">Notes</div>
                                            <div className="text-sm text-gray-900">{invoice.notes}</div>
                                        </div>
                                    )}

                                    {/* Payment Info */}
                                    {invoice.paidAt && (
                                        <div className="bg-green-50 rounded-lg p-3">
                                            <div className="text-xs text-gray-500 mb-1">Paid On</div>
                                            <div className="text-sm font-medium text-green-700">
                                                {new Date(invoice.paidAt).toLocaleDateString()}
                                            </div>
                                        </div>
                                    )}

                                    {/* Action Buttons */}
                                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-200">
                                        {(!hasSelectedInvoices && invoice.status === InvoiceStatus.DRAFT) ? (
                                            <>
                                                <Link
                                                    href={`/dashboard/invoices/${invoice.id}/edit`}
                                                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
                                                    title="Edit Invoice"
                                                >
                                                    <PencilIcon className="h-5 w-5" />
                                                </Link>
                                                <button
                                                    onClick={() => handleDelete(invoice.id, invoice.invoiceNumber)}
                                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                                                    title={t("employee_groups.delete_group")}
                                                >
                                                    <TrashIcon className="h-5 w-5" />
                                                </button>
                                            </>
                                        ) : null}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}