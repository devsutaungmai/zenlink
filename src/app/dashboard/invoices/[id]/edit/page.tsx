'use client'

import { useState, useEffect, use } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import Link from 'next/link'
import { ArrowDownIcon, ArrowLeftIcon } from '@heroicons/react/24/outline'
import Swal from 'sweetalert2'
import { ContactPerson, InvoiceFormData, InvoiceLine, Project } from '../../create/page'
import { Department } from '@prisma/client'
import { useInvoiceSettings } from '@/shared/hooks/useInvoiceSettings'
import { calculateInvoiceTotals, exportToPDF, sendEmail } from '@/shared/lib/invoiceHelper'
import InvoiceSummaryCalculation from '@/components/invoice/InvoiceSummaryCalculation'
import { set } from 'zod'
import { CustomerCombobox } from '@/components/invoice/CustomerCombobox'
import { InvoiceFieldSettingsDialog } from '@/components/invoice/InvoiceFieldSettingsDialog'

interface Customer {
    id: string
    customerName: string
}

interface VatCode {
    name: string
    rate: number
}

interface BusinessVatCode {
    vatCode: VatCode
}

interface Product {
    id: string
    productName: string
    salesPrice: number
    ledgerAccount?: {
        vatCode?: {
            code: number
            rate: number
        },
        businessVatCodes: BusinessVatCode[]
    }
}

export default function EditInvoicePage({ params, searchParams }: { params: Promise<{ id: string }>, searchParams: Promise<{ "credit-note"?: string }> }) {
    const resolvedParams = use(params)
    const resolvedSearchParams = use(searchParams)
    const isCreditNote =
        resolvedSearchParams["credit-note"] != null
            ? resolvedSearchParams["credit-note"] === "true"
            : false;
    const router = useRouter()
    const { t } = useTranslation()
    const [loading, setLoading] = useState(false)
    const [customers, setCustomers] = useState<Customer[]>([])
    const [products, setProducts] = useState<Product[]>([])
    const [fetchingLoading, setFetchingLoading] = useState(false);
    const [projects, setProjects] = useState<Project[]>([])
    const [departments, setDepartments] = useState<Department[]>([])
    const [contacts, setContacts] = useState<ContactPerson[]>([]);
    const [fetchingCustomer, setFetchingCustomer] = useState(false)
    const [showDropdown, setShowDropdown] = useState(false)
    const [formData, setFormData] = useState<InvoiceFormData>({
        customerId: '',
        invoiceNumber: '',
        contactPersonId: '',
        deliveryAddress: '',
        sentAt: new Date().toISOString().split('T')[0],
        dueDay: 0,
        paidAt: '',
        projectId: '',
        departmentId: '',
        seller: '',
        invoiceLines: [],
        status: '',
        notes: ''
    })
    const { settings, refetch } = useInvoiceSettings()
    const [visibleFields, setVisibleFields] = useState({
        showDiscount: true,
        showPaymentTerms: true,
        showDepartment: true,
        showSeller: true,
        showContactPerson: true,
        showDeliveryAddress: true,
        showProject: true,
        showNote: true
    })
    // credit note
    const [originalInvoiceData, setOriginalInvoiceData] = useState<{
        customerId: string
        amount: number
    } | null>(null)

    useEffect(() => {
        if (settings) {
            setVisibleFields({
                showDiscount: settings.showDiscount,
                showPaymentTerms: settings.showPaymentTerms,
                showDepartment: settings.showDepartment,
                showSeller: settings.showSeller,
                showContactPerson: settings.showContactPerson,
                showDeliveryAddress: settings.showDeliveryAddress,
                showProject: settings.showProject,
                showNote: settings.showNote
            })
        }
    }, [settings])

    useEffect(() => {
        fetchCustomers()
        fetchProducts()
        fetchInvoice()
    }, [resolvedParams.id])

    // Calculate paidAt whenever sentAt or dueDay changes
    useEffect(() => {
        if (formData.sentAt && formData.dueDay) {
            const sentDate = new Date(formData.sentAt)
            const paidDate = new Date(sentDate)
            paidDate.setDate(paidDate.getDate() + Number(formData.dueDay))

            setFormData(prev => ({
                ...prev,
                paidAt: paidDate.toISOString().split('T')[0]
            }))
        }

    }, [formData.sentAt, formData.dueDay])

    const fetchCustomers = async () => {
        try {
            const res = await fetch('/api/customers')
            if (res.ok) {
                const data = await res.json()
                setCustomers(data)
                if (data.length > 0) {
                    setFormData(prev => ({ ...prev, unitId: data[0].id }))
                }
            }
        } catch (error) {
            console.error('Error fetching customers:', error)
        }
    }

    const fetchProducts = async () => {
        try {
            const res = await fetch('/api/products')
            if (res.ok) {
                const data = await res.json()
                setProducts(data)
                if (data.length > 0) {
                    setFormData(prev => ({ ...prev, productGroupId: data[0].id }))
                }
            }
        } catch (error) {
            console.error('Error fetching products:', error)
        }
    }

    const fetchInvoice = async () => {
        try {
            const res = await fetch(`/api/invoices/${resolvedParams.id}`)
            if (res.ok) {
                const data = await res.json()
                console.log("Invoice", JSON.stringify(data));
                // Update projects list if customer has projects
                if (data.customer?.projects && data.customer?.projects.length > 0) {
                    setProjects(data.customer.projects)
                } else {
                    setProjects([]);
                }

                // Update departments list if customer has department
                if (data.customer?.department) {
                    setDepartments([data.customer?.department])
                }

                if (data.customer?.contactPersons) {
                    setContacts(data.customer?.contactPersons)
                }

                const rawLines: InvoiceLine[] = data.invoiceLines || [];

                const invoiceLines = isCreditNote
                    ? rawLines.map((line) => ({
                        ...line,
                        quantity: -Math.abs(Number(line.quantity)),
                        pricePerUnit: -Math.abs(Number(line.pricePerUnit)),
                    }))
                    : rawLines;

                if (isCreditNote) {
                    const totalAmount = rawLines.reduce((sum, line) => {
                        const qty = Math.abs(Number(line.quantity)) || 0;
                        const price = Math.abs(Number(line.pricePerUnit)) || 0;
                        const discount = Number(line.discountPercentage) || 0;
                        const { totalExclVAT } = calculateInvoiceTotals(qty, price, discount, Number(line.vatPercentage) || 0);
                        return sum + totalExclVAT;
                    }, 0);

                    setOriginalInvoiceData({
                        customerId: data.customerId,
                        amount: totalAmount,
                    });
                }

                setFormData({
                    customerId: data.customerId || '',
                    invoiceNumber: data.invoiceNumber || '',
                    contactPersonId: data.contactPersonId || '',
                    deliveryAddress: data.deliveryAddress || '',
                    sentAt: data.sentAt ? data.sentAt.split('T')[0] : new Date().toISOString().split('T')[0],
                    dueDay: data.dueDay ?? 0,
                    paidAt: data.paidAt ? data.paidAt.split('T')[0] : '',
                    projectId: data.projectId || '',
                    departmentId: data.departmentId || '',
                    seller: data.customer.business.name || '',
                    invoiceLines: invoiceLines || [],
                    status: data.status || '',
                    notes: data.notes || ''
                })

            }
        } catch (error) {
            console.error('Error fetching invoice:', error)
        } finally {
            setFetchingLoading(false)
        }
    }

    // const handleCustomerChange = (customerId: string) => {
    //     setFormData({ ...formData, customerId })
    //     fetchCustomerDetails(customerId)
    // }

    const deleteInvoiceLine = (index: number) => {
        console.log("Deleting....")
        const updatedInvoices = formData.invoiceLines.filter((_, i) => i !== index);
        setFormData(prev => ({ ...prev, invoiceLines: updatedInvoices }));
    }

    const handleNewOrderLine = () => {
        setFormData((prev: InvoiceFormData) => ({
            ...prev,
            invoiceLines: [
                ...prev.invoiceLines,
                {
                    productId: '',
                    quantity: 1,
                    pricePerUnit: 0,
                    vatPercentage: 0,
                    discountPercentage: 0,
                    productName: ''
                }
            ]
        }))
    }

    const handleCopyOrderLine = (copiedInvoiceLine: InvoiceLine, netTotal: number) => {
        const isOriginalLine = !!copiedInvoiceLine.id
        setFormData((prev: InvoiceFormData) => ({
            ...prev,
            invoiceLines: [
                ...prev.invoiceLines,
                {
                    productId: copiedInvoiceLine.productId,
                    quantity: isOriginalLine ? Math.abs(Number(copiedInvoiceLine.quantity)) : copiedInvoiceLine.quantity,
                    pricePerUnit: isOriginalLine ? Math.abs(Number(copiedInvoiceLine.pricePerUnit)) : copiedInvoiceLine.pricePerUnit,
                    vatPercentage: copiedInvoiceLine.vatPercentage,
                    discountPercentage: copiedInvoiceLine.discountPercentage,
                    productName: copiedInvoiceLine.productName
                    // no id → treated as rebill line
                }
            ]
        }))
    }

    const updateLineTotal = (index: number) => {
        const line = formData.invoiceLines[index];

        const qty = Number(line.quantity) || 0;
        const price = Number(line.pricePerUnit) || 0;
        const discount = Number(line.discountPercentage) || 0;

        const { totalExclVAT } = calculateInvoiceTotals(qty, price, discount, 25);

    };

    // Helper function to update a specific invoice line
    const updateInvoiceLine = (index: number, updates: Partial<InvoiceLine>) => {
        setFormData(prev => ({
            ...prev,
            invoiceLines: prev.invoiceLines.map((line, i) =>
                i === index ? { ...line, ...updates } : line
            )
        }))
    }

    const handleSubmit = async (e: React.FormEvent, action: 'update' | 'print' | 'send_invoice_with_email' | 'send_invoice_without_email') => {
        e.preventDefault()
        setLoading(true)
        const invoiceStatus = action === "send_invoice_with_email" || action === "send_invoice_without_email" ? "SENT" : "DRAFT";
        let { seller, ...filteredData } = formData
        filteredData = { ...filteredData, status: invoiceStatus }
        console.log("Submitting data:", filteredData);
        try {
            // If it's a credit note, create it using the specific endpoint and pass the original invoice data
            if (isCreditNote && originalInvoiceData) {
                const creditLines = formData.invoiceLines.filter(line => line.id) // original lines
                const rebillLines = formData.invoiceLines.filter(line => !line.id) // new lines added by user

                const response = await fetch(`/api/invoices/${resolvedParams.id}/customer/credit-note`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        customerId: originalInvoiceData.customerId,
                        creditNoteDate: formData.sentAt,
                        comment: formData.notes || "",
                        creditLineIds: creditLines.map(l => l.id),   // IDs of original lines to credit
                        rebillLines: rebillLines,                      // new lines for rebill invoice
                    }),
                })

                if (!response.ok) {
                    const error = await response.json()
                    throw new Error(error.error || 'Failed to create the credit note')
                }

                await Swal.fire({
                    title: 'Success!',
                    text: 'Credit note sent successfully',
                    icon: 'success',
                    confirmButtonColor: '#31BCFF',
                })

                router.push('/dashboard/invoices')
                router.refresh()
                return
            }
            const res = await fetch(`/api/invoices/${resolvedParams.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(filteredData),
            })

            if (!res.ok) {
                const error = await res.json()
                throw new Error(error.error || 'Failed to update the invoice')
            }

            const updatedInvoice = await res.json()

            // Handle different actions
            if (action === 'print') {
                const pdfSuccess = await exportToPDF(updatedInvoice.id)

                if (pdfSuccess) {
                    await Swal.fire({
                        title: 'Success!',
                        text: 'Invoice created and PDF downloaded',
                        icon: 'success',
                        confirmButtonColor: '#31BCFF',
                    })
                } else {
                    await Swal.fire({
                        title: 'Partial Success',
                        text: 'Invoice created but PDF download failed',
                        icon: 'warning',
                        confirmButtonColor: '#31BCFF',
                    })
                }
            } else if (action === 'send_invoice_with_email') {
                // Placeholder for email functionality
                await sendEmail(updatedInvoice.id);

            }
            await Swal.fire({
                title: 'Success!',
                text: 'Invoice updated successfully',
                icon: 'success',
                confirmButtonColor: '#31BCFF',
            })

            router.push('/dashboard/invoices')
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

    return (
        <div className="space-y-6">
            {/* Header Section */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <Link
                                href="/dashboard/invoices"
                                className="p-2 hover:bg-white/50 rounded-lg transition-colors"
                            >
                                <ArrowLeftIcon className="w-5 h-5 text-gray-600" />
                            </Link>
                            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                                {isCreditNote ? "Credit Note" : "Edit Invoice"}
                            </h1>
                        </div>
                        <p className="mt-2 text-gray-600 ml-14">
                            Update the invoice to send
                        </p>
                    </div>
                    <div className="hidden md:flex items-center space-x-2">

                        <InvoiceFieldSettingsDialog
                            initialSettings={visibleFields}
                            onSettingsSaved={(newSettings) => setVisibleFields(newSettings)}
                            onRefresh={refetch}
                        />
                        <div className="w-12 h-12 bg-[#31BCFF]/10 rounded-xl flex items-center justify-center">
                            <svg className="w-6 h-6 text-[#31BCFF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                            </svg>
                        </div>
                    </div>
                </div>
            </div>

            {/* Form Container */}
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 shadow-lg p-6">
                {isCreditNote && (
                    <div className="mb-3 text-amber-800 text-sm text-right font-medium">
                        ⚠️ You are issuing a credit note. Invoice details are locked and cannot be edited!
                    </div>
                )}
                <form onSubmit={(e) => handleSubmit(e, 'update')} className="space-y-6">

                    <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-xl border border-slate-200 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-gray-900">Customer Information</h2>

                        </div>

                        <div className="flex flex-wrap gap-6 mb-6">
                            <div className="w-full md:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)] min-w-[250px]">
                                <label htmlFor="customerId" className="block text-sm font-medium text-gray-700 mb-2">
                                    Customer *
                                </label>
                                {/* <select
                                    id="customerId"
                                    required
                                    value={formData.customerId || ''}
                                    disabled
                                    onChange={(e) => setFormData({ ...formData, contactPersonId: e.target.value })}
                                    className="block w-full px-4 py-3 rounded-xl border border-gray-300 bg-white/70 backdrop-blur-sm text-gray-900 focus:ring-2 focus:ring-[#31BCFF]/50 focus:border-[#31BCFF] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    <option value="">Select Customer</option>
                                    {customers.map((cus) => (
                                        <option key={cus.id} value={cus.id}>
                                            {cus.customerName}
                                        </option>
                                    ))}
                                </select> */}
                                <CustomerCombobox
                                    customers={customers}
                                    value={formData.customerId || ""}
                                    onChange={(customerId) => setFormData({ ...formData, customerId })}
                                    placeholder="Select Customer"
                                    disabled={isCreditNote}
                                />
                                <p className="text-xs mt-2 text-blue-400">Customer is already assigned </p>
                            </div>

                            {settings.showContactPerson && (
                                <div className="w-full md:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)] min-w-[250px]">
                                    <label htmlFor="contactPersonId" className="block text-sm font-medium text-gray-700 mb-2">
                                        Contact Name *
                                    </label>
                                    <select
                                        id="contactPersonId"
                                        value={formData.contactPersonId || ""}
                                        onChange={(e) => setFormData({ ...formData, contactPersonId: e.target.value })}
                                        disabled={isCreditNote}
                                        className={`block w-full px-4 py-3 rounded-xl border border-gray-300 bg-white/70 backdrop-blur-sm text-gray-900 focus:ring-2 focus:ring-[#31BCFF]/50 focus:border-[#31BCFF] transition-all duration-200 ${isCreditNote ? 'disabled:opacity-60 disabled:cursor-not-allowed' : ''}`}
                                    >
                                        <option value="">Select Contact Name</option>
                                        {contacts.map((contact) => (
                                            <option key={contact.id} value={contact.id}>
                                                {contact.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {settings.showPaymentTerms && (
                                <>
                                    <div className="w-full md:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)] min-w-[250px]">
                                        <label htmlFor="sentAt" className="block text-sm font-medium text-gray-700 mb-2">
                                            Invoice Date (sentAt) *
                                        </label>
                                        <input
                                            type="date"
                                            id="sentAt"
                                            required
                                            value={formData.sentAt || ""}
                                            onChange={(e) => setFormData({ ...formData, sentAt: e.target.value })}
                                            disabled={isCreditNote}
                                            className={`block w-full px-4 py-3 rounded-xl border border-gray-300 bg-white/70 backdrop-blur-sm text-gray-900 focus:ring-2 focus:ring-[#31BCFF]/50 focus:border-[#31BCFF] transition-all duration-200 ${isCreditNote ? 'disabled:opacity-60 disabled:cursor-not-allowed' : ''}`}
                                        />
                                    </div>
                                    <div className="w-full md:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)] min-w-[250px]">
                                        <label htmlFor="dueDay" className="block text-sm font-medium text-gray-700 mb-2">
                                            Days until due (PaidAt - {formData.paidAt || "Not calculated"})
                                        </label>
                                        <input
                                            type="number"
                                            id="dueDay"
                                            required
                                            min="0"
                                            value={formData.dueDay}
                                            onChange={(e) => setFormData({ ...formData, dueDay: Number.parseInt(e.target.value) || 0 })}
                                            disabled={isCreditNote}
                                            className={`block w-full px-4 py-3 rounded-xl border border-gray-300 bg-white/70 backdrop-blur-sm text-gray-900 focus:ring-2 focus:ring-[#31BCFF]/50 focus:border-[#31BCFF] transition-all duration-200 ${isCreditNote ? 'disabled:opacity-60 disabled:cursor-not-allowed' : ''}`}
                                            placeholder="Enter days until due"
                                        />
                                    </div>
                                </>
                            )}

                            {settings.showProject && (
                                <div className="w-full md:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)] min-w-[250px]">
                                    <label htmlFor="projectId" className="block text-sm font-medium text-gray-700 mb-2">
                                        Project *
                                    </label>
                                    <select
                                        id="projectId"
                                        value={formData.projectId || ""}
                                        onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                                        disabled={isCreditNote}
                                        className={`block w-full px-4 py-3 rounded-xl border border-gray-300 bg-white/70 backdrop-blur-sm text-gray-900 focus:ring-2 focus:ring-[#31BCFF]/50 focus:border-[#31BCFF] transition-all duration-200 ${isCreditNote ? 'disabled:opacity-60 disabled:cursor-not-allowed' : ''}`}
                                    >
                                        <option value="">Select Project</option>
                                        {projects.map((proj) => (
                                            <option key={proj.id} value={proj.id}>
                                                {proj.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {settings.showDepartment && (
                                <div className="w-full md:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)] min-w-[250px]">
                                    <label htmlFor="departmentId" className="block text-sm font-medium text-gray-700 mb-2">
                                        Department *
                                    </label>
                                    <select
                                        id="departmentId"
                                        value={formData.departmentId || ""}
                                        onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                                        disabled={isCreditNote}
                                        className={`block w-full px-4 py-3 rounded-xl border border-gray-300 bg-white/70 backdrop-blur-sm text-gray-900 focus:ring-2 focus:ring-[#31BCFF]/50 focus:border-[#31BCFF] transition-all duration-200 ${isCreditNote ? 'disabled:opacity-60 disabled:cursor-not-allowed' : ''}`}
                                    >
                                        <option value="">Select Department</option>
                                        {departments.map((dept) => (
                                            <option key={dept.id} value={dept.id}>
                                                {dept.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {settings.showDeliveryAddress && (
                                <div className="w-full md:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)] min-w-[250px]">
                                    <label htmlFor="deliveryAddress" className="block text-sm font-medium text-gray-700 mb-2">
                                        Delivery Address *
                                    </label>
                                    <input
                                        type="text"
                                        id="deliveryAddress"
                                        value={formData.deliveryAddress || ""}
                                        onChange={(e) => setFormData({ ...formData, deliveryAddress: e.target.value })}
                                        disabled={isCreditNote}
                                        className={`block w-full px-4 py-3 rounded-xl border border-gray-300 bg-white/70 backdrop-blur-sm text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-[#31BCFF]/50 focus:border-[#31BCFF] transition-all duration-200 ${isCreditNote ? 'disabled:opacity-60 disabled:cursor-not-allowed' : ''}`}
                                        placeholder="Enter delivery address"
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    {settings.showSeller && <div className="bg-gradient-to-br rounded-xl border p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Seller Information</h2>

                        <div className="grid grid-cols-1 md:grid-cols-1 gap-6 mb-6">

                            <div>
                                <label htmlFor="seller" className="block text-sm font-medium text-gray-700 mb-2">
                                    Seller *
                                </label>
                                <input
                                    type="text"
                                    id="seller"
                                    required
                                    min="1"
                                    value={formData.seller || ""}
                                    disabled
                                    className={`block w-full px-4 py-3 rounded-xl border border-gray-300 bg-white/70 backdrop-blur-sm text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-[#31BCFF]/50 focus:border-[#31BCFF] transition-all duration-200 ${isCreditNote ? 'disabled:opacity-60 disabled:cursor-not-allowed' : ''}`}
                                    placeholder="Seller Name"
                                />
                            </div>
                        </div>
                    </div>}
                    <div className="bg-gradient-to-br rounded-xl border p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Lines</h2>
                            {!isCreditNote && (
                                <button
                                    type="button"
                                    onClick={handleNewOrderLine}
                                    disabled={loading}
                                >
                                    New Order Line
                                </button>
                            )}
                        </div>
                        {formData.invoiceLines.map((line, index) => {
                            // Calculate net total for display
                            const qty = Number(line.quantity) || 0;
                            const price = Number(line.pricePerUnit) || 0;
                            const discount = Number(line.discountPercentage) || 0;
                            const vat = Number(line.vatPercentage) || 0;
                            const { totalExclVAT: rawTotal } = calculateInvoiceTotals(
                                Math.abs(qty),
                                Math.abs(price),
                                discount,
                                vat
                            );
                            const totalExclVAT = (isCreditNote && line.id) ? -rawTotal : rawTotal;

                            return (!line.isCredited && (
                                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-7 gap-10" key={index}>
                                    <div>
                                        <label htmlFor="productId" className="block text-sm font-medium text-gray-700 mb-2">
                                            Product *
                                        </label>
                                        <select
                                            id="productId"
                                            required
                                            value={line.productId || ''}
                                            disabled={isCreditNote}
                                            onChange={(e) => {
                                                const product = products.find(p => p.id === e.target.value);
                                                const businessVat = product?.ledgerAccount?.businessVatCodes?.[0]?.vatCode;
                                                const vatRate = businessVat?.rate ?? product?.ledgerAccount?.vatCode?.rate ?? 0;
                                                const basePrice = product?.salesPrice ?? 0;

                                                updateInvoiceLine(index, {
                                                    productId: e.target.value,
                                                    // line.id exists = original credit line → keep negative; no id = rebill line → keep positive
                                                    pricePerUnit: (isCreditNote && line.id) ? -Math.abs(basePrice) : basePrice,
                                                    vatPercentage: Number(vatRate),
                                                    productName: product?.productName,
                                                })
                                            }}
                                            className={`block w-full px-4 py-3 rounded-xl border border-gray-300 bg-white/70 backdrop-blur-sm text-gray-900 focus:ring-2 focus:ring-[#31BCFF]/50 focus:border-[#31BCFF] transition-all duration-200 ${isCreditNote ? 'disabled:opacity-60 disabled:cursor-not-allowed' : ''}`}
                                        >
                                            <option value="">Select Product</option>
                                            {products.map((pr) => (
                                                <option key={pr.id} value={pr.id}>
                                                    {pr.productName}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-2">
                                            Quantity *
                                        </label>
                                        <input
                                            type="number"
                                            id="quantity"
                                            required
                                            value={line.quantity || ""}
                                            disabled={isCreditNote}
                                            onChange={(e) => {

                                                updateInvoiceLine(index, { quantity: parseFloat(e.target.value) })

                                            }}
                                            className={`block w-full px-4 py-3 rounded-xl border border-gray-300 bg-white/70 backdrop-blur-sm text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-[#31BCFF]/50 focus:border-[#31BCFF] transition-all duration-200 ${isCreditNote ? 'disabled:opacity-60 disabled:cursor-not-allowed' : ''}`}
                                            placeholder="Enter quantity"
                                        />
                                    </div>

                                    <div>
                                        <label htmlFor="pricePerUnit" className="block text-sm font-medium text-gray-700 mb-2">
                                            Price Per Unit *
                                        </label>
                                        <input
                                            type="number"
                                            id="pricePerUnit"
                                            required
                                            step="0.01"
                                            value={line.pricePerUnit || 0.0}
                                            disabled={isCreditNote}
                                            onChange={(e) => {
                                                updateInvoiceLine(index, {
                                                    pricePerUnit: parseFloat(e.target.value)
                                                });
                                                setFormData(prev => ({
                                                    ...prev, invoiceLines: prev.invoiceLines.map((line, i) =>
                                                        i === index ?
                                                            { ...line, pricePerUnit: parseFloat(e.target.value) }
                                                            : line
                                                    )
                                                }))
                                                updateLineTotal(index);
                                            }}
                                            className={`block w-full px-4 py-3 rounded-xl border border-gray-300 bg-white/70 backdrop-blur-sm text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-[#31BCFF]/50 focus:border-[#31BCFF] transition-all duration-200 ${isCreditNote ? 'disabled:opacity-60 disabled:cursor-not-allowed' : ''}`}
                                            placeholder="Enter price per unit"
                                        />
                                    </div>

                                    <div>
                                        <label htmlFor="vatPercent" className="block text-sm font-medium text-gray-700 mb-2">
                                            Vat Percent *
                                        </label>
                                        <input
                                            type="number"
                                            id="vatPercent"
                                            readOnly
                                            step="0.01"
                                            value={line.vatPercentage || 0}
                                            disabled={isCreditNote}
                                            className={`block w-full px-4 py-3 rounded-xl border border-gray-300 bg-white/70 backdrop-blur-sm text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-[#31BCFF]/50 focus:border-[#31BCFF] transition-all duration-200 ${isCreditNote ? 'disabled:opacity-60 disabled:cursor-not-allowed' : ''}`}
                                        />
                                    </div>


                                    {settings.showDiscount &&
                                        <div>
                                            <label htmlFor="discountPercentage" className="block text-sm font-medium text-gray-700 mb-2">
                                                Discount(%) *
                                            </label>
                                            <input
                                                type="number"
                                                id="discountPercentage"
                                                step="0.01"
                                                min="0"
                                                max="100"
                                                value={line.discountPercentage || ""}
                                                disabled={isCreditNote}
                                                onChange={(e) => {

                                                    updateInvoiceLine(index, {
                                                        discountPercentage: parseFloat(e.target.value)
                                                    });
                                                    // setFormData(prev => ({
                                                    //     ...prev, invoiceLines: prev.invoiceLines.map((line, i) =>
                                                    //         i === index
                                                    //             ? { ...line, discountPercentage: parseFloat(e.target.value) }
                                                    //             : line
                                                    //     )
                                                    // }))
                                                    // const updatedLines = [...formData.invoiceLines];
                                                    // updatedLines[index].discountPercentage = parseFloat(e.target.value);
                                                    // setFormData({ ...formData, invoiceLines: updatedLines })
                                                    // updateLineTotal(index);
                                                }}
                                                className={`block w-full px-4 py-3 rounded-xl border border-gray-300 bg-white/70 backdrop-blur-sm text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-[#31BCFF]/50 focus:border-[#31BCFF] transition-all duration-200 ${isCreditNote ? 'disabled:opacity-60 disabled:cursor-not-allowed' : ''}`}
                                                placeholder="Enter discount percentage"
                                            />
                                        </div>
                                    }

                                    <div>
                                        <label htmlFor="netTotal" className="block text-sm font-medium text-gray-700 mb-2">
                                            Net Total
                                        </label>
                                        <input
                                            type="number"
                                            id="netTotal"
                                            required
                                            step="0.01"
                                            value={(totalExclVAT || 0).toFixed(2)}
                                            disabled
                                            className="block w-full px-4 py-3 rounded-xl border border-gray-300 bg-white/70 backdrop-blur-sm text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-[#31BCFF]/50 focus:border-[#31BCFF] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                                        />
                                    </div>
                                    <div className='items-end flex space-x-4 mb-3'>
                                        <button
                                            type='button'
                                            onClick={() => deleteInvoiceLine(index)}
                                            disabled={isCreditNote}
                                            className={`${isCreditNote ? 'disabled:opacity-60 disabled:cursor-not-allowed' : ''}`}
                                        >
                                            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>

                                        </button>
                                        <button
                                            type='button'
                                            onClick={() => handleCopyOrderLine(line, Number(totalExclVAT || 0))}
                                            disabled={isCreditNote}
                                            className={`${isCreditNote ? 'disabled:opacity-60 disabled:cursor-not-allowed' : ''}`}
                                        >
                                            <svg className="w-8 h-8 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2h-6a2 2 0 01-2-2V7z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H7a2 2 0 00-2 2v7a2 2 0 002 2h7a2 2 0 002-2v-1" />
                                            </svg>

                                        </button>

                                    </div>

                                </div>
                            ))
                        })}
                    </div>

                    {/* Notes Section */}
                    {settings.showNote
                        && <div>
                            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
                                Additional Notes
                            </label>
                            <textarea
                                id="notes"
                                value={formData.notes || ""}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                className="block w-full px-4 py-3 rounded-xl border border-gray-300 bg-white/70 backdrop-blur-sm text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-[#31BCFF]/50 focus:border-[#31BCFF] transition-all duration-200"
                                placeholder="Enter any additional notes"
                                rows={3}
                            />
                        </div>}

                    {/* Summary Calculation */}
                    <InvoiceSummaryCalculation invoiceLines={formData.invoiceLines} isCreditNote={isCreditNote} />


                    {/* Form Actions */}
                    <div className="flex items-center justify-end gap-4 pt-6 border-t border-gray-200">
                        <Link
                            href="/dashboard/invoices"
                            className="px-6 py-3 rounded-xl border border-gray-300 bg-white text-gray-700 font-medium hover:bg-gray-50 transition-colors duration-200"
                        >
                            Cancel
                        </Link>
                        {/* Dropdown Button Group */}
                        <div className="relative inline-flex">
                            <button
                                type="submit"
                                disabled={loading}
                                className="px-6 py-3 rounded-l-xl bg-gradient-to-r from-[#31BCFF] to-[#0EA5E9] text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                            >
                                {isCreditNote ? 'Send Credit Note' : 'Update Invoice'}
                            </button>

                            {!isCreditNote && (
                                <button
                                    type="button"
                                    disabled={loading}
                                    onClick={() => setShowDropdown(!showDropdown)}
                                    className="px-3 py-3 rounded-r-xl bg-gradient-to-r from-[#0EA5E9] to-[#0284C7] text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200 border-l border-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <ArrowDownIcon className="w-5 h-5" />
                                </button>)}

                            {/* Dropdown Menu */}
                            {showDropdown && !isCreditNote && (
                                <div className="absolute right-0 bottom-full mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-200 py-2 z-10">
                                    <button
                                        type="button"
                                        onClick={(e) => { handleSubmit(e, 'print') }}
                                        disabled={loading}
                                        className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                        </svg>
                                        <span className="text-gray-700 font-medium">Preview(PDF)</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={(e) => { handleSubmit(e, 'send_invoice_without_email') }}
                                        disabled={loading}
                                        className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                        </svg>
                                        <span className="text-gray-700 font-medium">Send Invoice</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={(e) => { handleSubmit(e, 'send_invoice_with_email') }}
                                        disabled={loading}
                                        className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                        </svg>
                                        <span className="text-gray-700 font-medium">Send invoice with Email</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </form>
            </div>
        </div>
    )
}
