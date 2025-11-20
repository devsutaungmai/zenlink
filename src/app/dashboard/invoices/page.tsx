'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { PlusIcon, PencilIcon, TrashIcon, MagnifyingGlassIcon, Cog6ToothIcon } from '@heroicons/react/24/outline'
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useInvoiceSettings } from '@/shared/hooks/useInvoiceSettings'

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
    const { currencySymbol } = useCurrency()
    const [invoices, setInvoices] = useState<Invoice[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [searchTerm, setSearchTerm] = useState('')

    // Pagination states
    const [currentPage, setCurrentPage] = useState(1)
    const [itemsPerPage] = useState(10)
    const { settings } = useInvoiceSettings();
    const [settingsOpen, setSettingsOpen] = useState(false)
    const [visibleFields, setVisibleFields] = useState({
        showDiscount: true,
        showPaymentTerms: true,
        showDepartment: true,
        showSeller: true,
        showContactPerson: true,
        showDeliveryAddress: true,
    })
    useEffect(() => {
        fetchInvoices()
    }, [])

    useEffect(() => {
        if (settings) {
            setVisibleFields({
                showDiscount: settings.showDiscount,
                showPaymentTerms: settings.showPaymentTerms,
                showDepartment: settings.showDepartment,
                showSeller: settings.showSeller,
                showContactPerson: settings.showContactPerson,
                showDeliveryAddress: settings.showDeliveryAddress,
            })
        }
    }, [settings])

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

    const filteredInvoices = invoices.filter(invoice =>
        invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.customer?.customerName.toLowerCase().includes(searchTerm.toLowerCase())
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
    const handleSaveSettings = async () => {

        console.log(JSON.stringify(visibleFields));
        setSettingsOpen(false)
        setLoading(true)
        try {
            const res = await fetch('/api/invoices/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(visibleFields),
            })

            if (!res.ok) {
                const error = await res.json()
                throw new Error(error.error || 'Failed to save the settings')
            }
            Swal.fire({
                title: t('common.success'),
                text: 'Settings saved successfully',
                icon: 'success',
                confirmButtonColor: '#31BCFF',
            })

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
                        <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
                            <DialogTrigger asChild>
                                <button className="inline-flex items-center justify-center px-4 py-3 rounded-2xl bg-white text-gray-700 font-medium shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 border border-gray-200">
                                    <Cog6ToothIcon className="w-5 h-5 mr-2" />
                                    Settings
                                </button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
                                <DialogHeader>
                                    <DialogTitle className="text-2xl font-bold">Invoice Field Settings</DialogTitle>
                                    <DialogDescription>
                                        Select which fields you want to display in the invoice form
                                    </DialogDescription>
                                </DialogHeader>

                                <div className="space-y-4 py-4">

                                    <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                                        <input
                                            type="checkbox"
                                            id="showDiscount"
                                            checked={visibleFields.showDiscount}
                                            onChange={(e) =>
                                                setVisibleFields({ ...visibleFields, showDiscount: e.target.checked })
                                            }
                                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
                                        />
                                        <label htmlFor="showDiscount" className="text-base font-medium cursor-pointer flex-1">
                                            Discount
                                        </label>
                                    </div>

                                    <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                                        <input
                                            type="checkbox"
                                            id="showPaymentTerms"
                                            checked={visibleFields.showPaymentTerms}
                                            onChange={(e) =>
                                                setVisibleFields({ ...visibleFields, showPaymentTerms: e.target.checked })
                                            }
                                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
                                        />
                                        <label htmlFor="showPaymentTerms" className="text-base font-medium cursor-pointer flex-1">
                                            Payment Terms
                                        </label>
                                    </div>

                                    <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                                        <input
                                            type="checkbox"
                                            id="showDepartment"
                                            checked={visibleFields.showDepartment}
                                            onChange={(e) =>
                                                setVisibleFields({ ...visibleFields, showDepartment: e.target.checked })
                                            }
                                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
                                        />
                                        <label htmlFor="showDepartment" className="text-base font-medium cursor-pointer flex-1">
                                            Department
                                        </label>
                                    </div>

                                    <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                                        <input
                                            type="checkbox"
                                            id="showSeller"
                                            checked={visibleFields.showSeller}
                                            onChange={(e) =>
                                                setVisibleFields({ ...visibleFields, showSeller: e.target.checked })
                                            }
                                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
                                        />
                                        <label htmlFor="showSeller" className="text-base font-medium cursor-pointer flex-1">
                                            Seller
                                        </label>
                                    </div>

                                    <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                                        <input
                                            type="checkbox"
                                            id="showContactPerson"
                                            checked={visibleFields.showContactPerson}
                                            onChange={(e) =>
                                                setVisibleFields({ ...visibleFields, showContactPerson: e.target.checked })
                                            }
                                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
                                        />
                                        <label htmlFor="showContactPerson" className="text-base font-medium cursor-pointer flex-1">
                                            Contact Person
                                        </label>
                                    </div>

                                    <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                                        <input
                                            type="checkbox"
                                            id="showDeliveryAddress"
                                            checked={visibleFields.showDeliveryAddress}
                                            onChange={(e) =>
                                                setVisibleFields({ ...visibleFields, showDeliveryAddress: e.target.checked })
                                            }
                                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
                                        />
                                        <label htmlFor="showDeliveryAddress" className="text-base font-medium cursor-pointer flex-1">
                                            Delivery Address
                                        </label>
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 pt-4 border-t">
                                    <Button variant="outline" onClick={() => setSettingsOpen(false)}>
                                        Cancel
                                    </Button>
                                    <Button onClick={handleSaveSettings} className="bg-[#31BCFF] hover:bg-[#0EA5E9] text-white">
                                        Save Settings
                                    </Button>
                                </div>
                            </DialogContent>
                        </Dialog>

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
                <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
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
                </div>
            </div>

            {/* Invoices List */}
            {filteredInvoices.length === 0 ? (
                <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-12 border border-gray-200/50 shadow-lg text-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <MagnifyingGlassIcon className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">{t('employee_groups.no_groups_found')}</h3>
                    <p className="text-gray-500 mb-6">
                        {searchTerm ? t('employee_groups.adjust_search') : t('employee_groups.get_started')}
                    </p>
                    {!searchTerm && (
                        <Link
                            href="/dashboard/invoices/create"
                            className="inline-flex items-center px-6 py-3 rounded-xl bg-[#31BCFF] text-white font-medium hover:bg-[#31BCFF]/90 transition-colors duration-200"
                        >
                            <PlusIcon className="w-5 h-5 mr-2" />
                            {t('employee_groups.create_first_group')}
                        </Link>
                    )}
                </div>
            ) : (
                <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 shadow-lg overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50/80">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Invoice Number
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Customer
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Invoice Date
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Total Excl VAT
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        VAT Amount
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Total Incl VAT
                                    </th>
                                    <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        {t('actions')}
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200/50">
                                {paginatedInvoices.map((invoice) => (
                                    <tr key={invoice.id} className="hover:bg-blue-50/30 transition-colors duration-200">
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-medium text-gray-900">
                                                {invoice.invoiceNumber}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-gray-900">
                                                {invoice.customer?.customerName}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-gray-900">
                                                {new Date(invoice.invoiceDate).toLocaleDateString()}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                {invoice.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-gray-900">
                                                {currencySymbol}{Number(invoice?.totalExclVAT ?? 0).toFixed(2)}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-gray-900">
                                                {currencySymbol}{Number(invoice?.vatAmount ?? 0).toFixed(2)}

                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-medium text-gray-900">
                                                {currencySymbol}{Number(invoice?.totalInclVAT ?? 0).toFixed(2)}

                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-end gap-2">
                                                <Link
                                                    href={`/dashboard/invoices/${invoice.id}/edit`}
                                                    className="p-2 text-gray-400 hover:text-[#31BCFF] hover:bg-blue-50 rounded-lg transition-all duration-200"
                                                    title="View Invoice"
                                                >
                                                    <PencilIcon className="h-4 w-4" />
                                                </Link>
                                                <button
                                                    onClick={() => handleDelete(invoice.id, invoice.invoiceNumber)}
                                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                                                    title={t('employee_groups.delete_group')}
                                                >
                                                    <TrashIcon className="h-4 w-4" />
                                                </button>
                                            </div>
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
                </div>
            )}
        </div>
    )
}