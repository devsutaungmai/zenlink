'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import Link from 'next/link'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import Swal from 'sweetalert2'
import { calculateInvoiceTotals, exportToPDF, formatCreditNoteNumberForDisplay, formatInvoiceNumberForDisplay, sendEmail } from '@/shared/lib/invoiceHelper'
import InvoiceSummaryCalculation from '@/components/invoice/InvoiceSummaryCalculation'
import CustomerDialog, { CustomerFormType } from '@/components/invoice/CustomerDialog'
import { useInvoiceSettings } from '@/shared/hooks/useInvoiceSettings'
import { CustomerCombobox } from '@/components/invoice/CustomerCombobox'
import { InvoiceFieldSettingsDialog } from '@/components/invoice/InvoiceFieldSettingsDialog'
import SendInvoiceDialog, { SendInvoiceDialogResult } from '@/components/invoice/SendInvoiceDialog'
import { toast } from '@/shared/lib/toast'
export interface Customer {
    id: string
    customerName: string
    contactPerson?: {
        id: string,
        name: string
    }
    InvoicePaymentTerms?: {
        id: string
        invoiceDueDateType: 'DAYS_AFTER' | 'FIXED_DATE',
        invoiceDueDateValue: number
        invoiceDueDateUnit: 'DAYS' | 'MONTHS'
    }
    project?: Project
    department?: Department,
    business: {
        name: string
    }

}

interface VatCode {
    name: string
    rate: number
}

interface BusinessVatCode {
    vatCode: VatCode
}

export interface Product {
    id: string
    productName: string
    salesPrice: number
    discountPercentage: number
    ledgerAccount?: {
        vatCode?: {
            code: number
            rate: number
        },
        businessVatCodes: BusinessVatCode[]
    }
}


export interface Project {
    id: string
    name: string
}

export interface Department {
    id: string
    name: string
}
export interface ContactPerson {
    id: string,
    name: string
}
export interface InvoiceLine {
    id?: string,
    productId: string;
    quantity: number;
    pricePerUnit: number;
    vatPercentage: number;
    discountPercentage: number;
    subtotal?: number;
    discountAmount?: number;
    lineTotal?: number;
    productName?: string;
    productNumber?: string;
    isCredited?: boolean;
}
export interface InvoiceFormData {
    invoiceNumber: string,
    customerId: string,
    contactPersonId: string,
    deliveryAddress: string,
    sentAt: string,
    dueDay: number,
    paidAt: string,
    projectId: string,
    departmentId: string,
    seller: string,
    invoiceLines: InvoiceLine[],
    status: string,
    notes: string
}
export default function CreateInvoicePage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const copyMode = searchParams.get('copy') === "true";
    const overviewMode = searchParams.get('overview') === "true";
    const invoiceId = searchParams.get('invoiceId') ?? "";
    const isCreditNote = searchParams.get('credit-note') === "true";
    const { t } = useTranslation()
    const [loading, setLoading] = useState(false)
    const [customers, setCustomers] = useState<Customer[]>([])
    const [products, setProducts] = useState<Product[]>([])
    const [projects, setProjects] = useState<Project[]>([])
    const [departments, setDepartments] = useState<Department[]>([])
    const [contacts, setContacts] = useState<ContactPerson[]>([]);
    const [fetchingCustomer, setFetchingCustomer] = useState(false)
    const [fetchingLoading, setFetchingLoading] = useState(false);
    const [formData, setFormData] = useState<InvoiceFormData>({
        invoiceNumber: '',
        customerId: '',
        contactPersonId: '',
        deliveryAddress: '',
        sentAt: new Date().toISOString().split('T')[0],
        dueDay: 14,
        paidAt: '',
        projectId: '',
        departmentId: '',
        seller: '',
        invoiceLines: [] as InvoiceLine[],
        status: '',
        notes: ''
    })
    const [netTotals, setNetTotals] = useState<Number[]>([]);

    const [loadingCustomer, setLoadingCustomer] = useState<boolean>(false);
    const [customerDialog, setCustomerDialog] = useState<boolean>(false)
    const { settings, refetch } = useInvoiceSettings();
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

    const [showSendDialog, setShowSendDialog] = useState(false)
    const [pendingAction, setPendingAction] = useState<'send_invoice_without_email' | 'send_invoice_with_email' | 'print' | 'send_new_credit_note' | null>(null)

    // ─── 1. Refs (place after all useState declarations) ─────────────────────────

    // Track whether form has been "dirtied" with a customer selection
    const isDirtyRef = useRef(false)
    // Prevent double-firing (pushState + popstate can both trigger on back nav)
    const isSavingRef = useRef(false)
    // Always holds latest formData — safe to read inside event handlers
    const formDataRef = useRef(formData)
    useEffect(() => {
        formDataRef.current = formData
        if (formData.customerId) {
            isDirtyRef.current = true
        }
    }, [formData])


    // ─── 2. Core beacon helper — fire-and-forget, survives page unload ───────────

    const fireBeacon = useCallback(() => {
        if (!isDirtyRef.current || isSavingRef.current || overviewMode) return
        const current = formDataRef.current
        if (!current.customerId) return
        isSavingRef.current = true
        const { seller, ...filteredData } = current
        navigator.sendBeacon('/api/invoices', JSON.stringify({ ...filteredData, status: 'DRAFT' }))
        isDirtyRef.current = false
        // Reset flag after a tick so rapid navigations don't permanently block
        setTimeout(() => { isSavingRef.current = false }, 500)
    }, [overviewMode])


    // ─── 3. Intercept ALL client-side navigation (Next.js App Router) ────────────
    // Next.js App Router uses history.pushState / replaceState for every
    // <Link> click and router.push(). Patching them is the only reliable hook.

    useEffect(() => {
        if (overviewMode) return

        const originalPush = history.pushState.bind(history)
        const originalReplace = history.replaceState.bind(history)

        history.pushState = (...args) => {
            fireBeacon()
            return originalPush(...args)
        }
        history.replaceState = (...args) => {
            fireBeacon()
            return originalReplace(...args)
        }

        // Browser back/forward button
        window.addEventListener('popstate', fireBeacon)
        // Hard refresh / tab close
        window.addEventListener('beforeunload', fireBeacon)

        return () => {
            // Restore originals on unmount so other pages aren't affected
            history.pushState = originalPush
            history.replaceState = originalReplace
            window.removeEventListener('popstate', fireBeacon)
            window.removeEventListener('beforeunload', fireBeacon)
        }
    }, [overviewMode, fireBeacon])


    // ─── 4. Awaitable save — used by the explicit back button only ────────────────

    const autoSaveDraft = useCallback(async () => {
        if (!isDirtyRef.current || overviewMode) return
        const current = formDataRef.current
        if (!current.customerId) return
        try {
            const { seller, ...filteredData } = current
            await fetch('/api/invoices', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...filteredData, status: 'DRAFT' }),
            })
            isDirtyRef.current = false
        } catch (_) {
            // Silent fail
        }
    }, [overviewMode])


    // ─── 5. Back button handler ───────────────────────────────────────────────────

    const handleBack = async () => {
        if (!overviewMode && isDirtyRef.current) {
            await autoSaveDraft()
            // Prevent the history.pushState patch from double-saving on router.back()
            isDirtyRef.current = false
        }
        if (window.history.length > 1) {
            router.back()
        } else {
            router.push("/dashboard/invoices")
        }
    }

    const onSaveCustomer = async (customer: CustomerFormType) => {
        console.log("CustomerFormData" + JSON.stringify(customer));
        setCustomerDialog(false)
        try {
            setLoadingCustomer(true)
            const res = await fetch('/api/customers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(customer),
            })

            if (!res.ok) {
                const error = await res.json()
                throw new Error(error.error || 'Failed to create customer')
            }

            await toast('success', 'Customer created successfully')
            router.refresh()
        } catch (error) {
            await toast(
                'error',
                error instanceof Error ? error.message : 'An error occurred'
            )
        } finally {
            setLoadingCustomer(false)
            setCustomerDialog(false)
        }
    }

    useEffect(() => {
        fetchCustomers()
        fetchProducts()

        setFormData(prev => {
            if (prev.invoiceLines.length > 0) return prev;

            return {
                ...prev,
                invoiceLines: [
                    {
                        productId: '',
                        quantity: 1,
                        pricePerUnit: 0,
                        vatPercentage: 0,
                        discountPercentage: 0
                    }
                ]
            };
        });

        setNetTotals(prev => (prev.length > 0 ? prev : [0]));
    }, []);

    useEffect(() => {
        if (copyMode && invoiceId) {
            fetchInvoice();
        }
    }, [copyMode, invoiceId]);

    useEffect(() => {
        // Refetch customers when dialog closes after successful save
        if (!customerDialog && !loadingCustomer) {
            fetchCustomers()
        }
    }, [customerDialog, loadingCustomer])

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

    const fetchInvoice = async () => {
        try {
            const res = await fetch(`/api/invoices/${invoiceId}`)
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

                setFormData({
                    invoiceNumber: data.invoiceNumber || '',
                    customerId: data.customerId || '',
                    contactPersonId: data.contactPersonId || '',
                    deliveryAddress: data.deliveryAddress || '',
                    sentAt: data.sentAt ? data.sentAt.split('T')[0] : new Date().toISOString().split('T')[0],
                    dueDay: data.dueDay ?? 0,
                    paidAt: data.paidAt ? data.paidAt.split('T')[0] : '',
                    projectId: data.projectId || '',
                    departmentId: data.departmentId || '',
                    invoiceLines: invoiceLines || [],
                    seller: data.customer.business.name || '',
                    status: data.status || '',
                    notes: data.notes || ''
                })
                const calculatedNetTotals = (rawLines || []).map((line: InvoiceLine) => {
                    const qty = Math.abs(Number(line.quantity)) || 0;
                    const price = Math.abs(Number(line.pricePerUnit)) || 0;
                    const discount = Number(line.discountPercentage) || 0;
                    const { totalExclVAT } = calculateInvoiceTotals(qty, price, discount, Number(line.vatPercentage) || 0);
                    return isCreditNote ? -totalExclVAT : totalExclVAT;  // ← apply sign
                });
                setNetTotals(calculatedNetTotals);
            }
        } catch (error) {
            console.error('Error fetching invoice:', error)
        } finally {
            setFetchingLoading(false)
        }
    }

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
                // Keep only active products
                const activeProducts = Array.isArray(data) ? data.filter((product: any) => product.active === true) : []
                setProducts(activeProducts)
                if (activeProducts.length > 0) {
                    setFormData(prev => ({ ...prev, productGroupId: activeProducts[0].id }))
                }
            }
        } catch (error) {
            console.error('Error fetching products:', error)
        }
    }

    const fetchCustomerDetails = async (customerId: string) => {
        if (!customerId) return

        setFetchingCustomer(true)
        try {
            const res = await fetch(`/api/customers/${customerId}`)
            if (res.ok) {
                const data = await res.json()
                console.log("Customer Details ===> ", JSON.stringify(data?.InvoicePaymentTerms))
                // Calculate default due days from payment terms
                let defaultDueDay = 14 // Default fallback
                if (data.InvoicePaymentTerms) {
                    const { invoiceDueDateValue, invoiceDueDateUnit } = data.InvoicePaymentTerms
                    if (invoiceDueDateUnit === 'DAYS') {
                        defaultDueDay = invoiceDueDateValue
                    } else if (invoiceDueDateUnit === 'MONTHS') {
                        defaultDueDay = invoiceDueDateValue * 30 // Convert months to days
                    }
                }
                // Update form data with customer information
                setFormData(prev => ({
                    ...prev,
                    customerId: customerId,
                    contactName: data.contactPersons?.[0]?.name || '',
                    deliveryAddress: data.deliveryAddress || data.address || '',
                    departmentId: data.departmentId || '',
                    discountPercentage: data.discountPercentage || prev.invoiceLines[0].discountPercentage,
                    seller: data.business?.name,
                    dueDay: defaultDueDay
                }))

                // Update projects list if customer has projects
                if (data.projects && data.projects.length > 0) {
                    setProjects(data.projects)
                    setFormData(prev => ({
                        ...prev,
                        projectId: data.projects?.[0].id
                    }))
                } else {
                    setProjects([]);
                }

                // Update departments list if customer has department
                if (data.department) {
                    setDepartments([data.department])
                }

                if (Array.isArray(data.contactPersons) && data.contactPersons.length > 0) {
                    setContacts(data.contactPersons)
                    setFormData(prev => ({
                        ...prev,
                        contactPersonId: data.contactPersons[0]?.id ?? prev.contactPersonId ?? ''
                    }))
                } else if (data.contactPersons) {
                    // Ensure contacts is cleared if contactPersons exists but has no items
                    setContacts([])
                }
            }
        } catch (error) {
            console.error('Error fetching customer details:', error)
            await toast('error', 'Failed to fetch customer details')
        } finally {
            setFetchingCustomer(false)
        }
    }
    const handleCustomerChange = (customerId: string) => {
        setFormData({ ...formData, customerId })
        fetchCustomerDetails(customerId)
    }

    const deleteInvoiceLine = (index: number) => {
        console.log("Deleting....")
        const updatedInvoices = formData.invoiceLines.filter((_, i) => i !== index);
        setFormData(prev => ({ ...prev, invoiceLines: updatedInvoices }));
        setNetTotals((prevNetTotals) => prevNetTotals.filter((_, i) => i !== index));
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
                    productName: '',
                }
            ]
        }))
        setNetTotals((prevNetTotals) => ([...prevNetTotals, 0]));
    }

    const handleCopyOrderLine = (copiedInvoiceLine: InvoiceLine, netTotal: number) => {
        setFormData((prev: InvoiceFormData) => ({
            ...prev,
            invoiceLines: [
                ...prev.invoiceLines,
                {
                    productId: copiedInvoiceLine.productId,
                    quantity: copiedInvoiceLine.quantity,
                    pricePerUnit: copiedInvoiceLine.pricePerUnit,
                    vatPercentage: copiedInvoiceLine.vatPercentage,
                    discountPercentage: copiedInvoiceLine.discountPercentage,
                    productName: copiedInvoiceLine.productName,
                }
            ]
        }))
        setNetTotals((prevNetTotals) => ([...prevNetTotals, netTotal]));

    }

    const updateLineTotal = (index: number, currentQty?: number) => {
        const line = formData.invoiceLines[index];
        const qty = currentQty !== undefined ? currentQty : Number(line.quantity);
        const absQty = Math.abs(qty) || 0;
        const price = Math.abs(Number(line.pricePerUnit)) || 0;
        const discount = Number(line.discountPercentage) || 0;
        const vat = Number(line.vatPercentage) || 0;
        const { totalExclVAT } = calculateInvoiceTotals(absQty, price, discount, vat);
        // Derive sign from the actual current quantity, not stale isNegativeTotal
        const sign = (isCreditNote && !!line.id) ? -1 : (qty < 0 ? -1 : 1);
        setNetTotals((prevNetTotals) => {
            const newNetTotals = [...prevNetTotals];
            newNetTotals[index] = totalExclVAT * sign;
            return newNetTotals;
        });
    };

    const handleSendClick = (action: 'send_invoice_without_email' | 'send_invoice_with_email' | 'print' | 'send_new_credit_note') => {
        setPendingAction(action)
        setShowSendDialog(true)
    }

    const handleSendDialogConfirm = async (result: SendInvoiceDialogResult) => {
        setShowSendDialog(false)
        if (!pendingAction) return

        setFormData(prev => ({ ...prev, sentAt: result.sentAt, dueDay: result.dueDay, paidAt: result.paidAt }))

        // For credit note: keep as-is. For invoices: delivery method decides the action.
        let resolvedAction = pendingAction
        if (pendingAction !== 'send_new_credit_note') {
            if (result.deliveryMethod === 'EMAIL') resolvedAction = 'send_invoice_with_email'
            else if (result.deliveryMethod === 'PRINT') resolvedAction = 'print'
            else resolvedAction = 'send_invoice_without_email' // EHF coming soon
        }

        await handleSubmit(resolvedAction, { sentAt: result.sentAt, dueDay: result.dueDay, paidAt: result.paidAt })
    }

    // Updated handleSubmit — accepts optional dateOverride to avoid stale state
    const handleSubmit = async (
        action: 'print' | 'send_invoice_with_email' | 'send_invoice_without_email' | 'send_new_credit_note',
        dateOverride?: { sentAt: string; dueDay: number; paidAt: string }
    ) => {
        setLoading(true)

        const invoiceStatus =
            action === 'send_invoice_with_email' || action === 'send_invoice_without_email'
                ? 'SENT'
                : 'DRAFT'

        let { seller, ...filteredData } = formData

        // Use dialog-provided dates if available (setFormData is async — override prevents stale read)
        filteredData = {
            ...filteredData,
            sentAt: dateOverride?.sentAt ?? filteredData.sentAt,
            dueDay: dateOverride?.dueDay ?? filteredData.dueDay,
            paidAt: dateOverride?.paidAt ?? filteredData.paidAt,
            status: invoiceStatus,
        }

        try {
            // Standalone credit note — separate flow
            if (action === 'send_new_credit_note') {
                if (!formData.customerId) {
                    await toast('warning', 'Please select a customer before creating a credit note')
                    setLoading(false)
                    return
                }
                if (formData.invoiceLines.length === 0 || formData.invoiceLines.every(l => !l.productId)) {

                    await toast('warning', 'Please add at least one order line')
                    setLoading(false)
                    return
                }
                const res = await fetch('/api/invoices/credit-note/standalone', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        customerId: formData.customerId,
                        creditNoteDate: filteredData.sentAt,
                        comment: formData.notes || '',
                        lines: formData.invoiceLines.filter(l => l.productId),
                        projectId: formData.projectId || null,
                        departmentId: formData.departmentId || null,
                        contactPersonId: formData.contactPersonId || null,
                    }),
                })
                if (!res.ok) {
                    const error = await res.json()
                    throw new Error(error.error || 'Failed to create standalone credit note')
                }
                await toast('success', 'Standalone credit note created successfully')
                isDirtyRef.current = false
                router.push('/dashboard/invoices')
                router.refresh()
                return
            }

            // Regular invoice flow
            const res = await fetch('/api/invoices', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(filteredData),
            })
            if (!res.ok) {
                const error = await res.json()
                throw new Error(error.error || 'Failed to create invoice')
            }
            const createdInvoice = await res.json()

            if (action === 'print') {
                const pdfSuccess = await exportToPDF(createdInvoice.id)
                await toast(
                    pdfSuccess ? 'success' : 'warning',
                    pdfSuccess
                        ? 'Invoice created and PDF downloaded'
                        : 'Invoice created but PDF download failed'
                )
            } else if (action === 'send_invoice_with_email') {
               const result = await sendEmail(createdInvoice.id)

                await toast('success',result?.message)
            } else {
                await toast('success', 'Invoice created successfully')
            }

            isDirtyRef.current = false
            router.push('/dashboard/invoices')
            router.refresh()
        } catch (error) {
            await toast(
                'error',
                error instanceof Error ? error.message : 'An error occurred'
            )
        } finally {
            setLoading(false)
        }
    }

    const totalInclVAT = formData.invoiceLines.reduce((sum, line) => {
        const qty = Number(line.quantity) || 0;
        const price = Number(line.pricePerUnit) || 0;
        const discount = Number(line.discountPercentage) || 0;
        const vat = Number(line.vatPercentage) || 0;
        const { totalInclVAT } = calculateInvoiceTotals(Math.abs(qty), Math.abs(price), discount, vat);
        return sum + (qty < 0 ? -totalInclVAT : totalInclVAT);
    }, 0);

    const isNegativeTotal = totalInclVAT < 0;

    return (
        <div className="space-y-6">
            {/* Header Section */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <button onClick={handleBack}>
                                <ArrowLeftIcon className="w-5 h-5 text-gray-600" />
                            </button>
                            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                                {overviewMode && !isCreditNote
                                    ? `Invoice Details (Invoice Number -${formatInvoiceNumberForDisplay(formData.invoiceNumber)})`
                                    : overviewMode && isCreditNote
                                        ? `Credit Note Detail (${formData.invoiceNumber.startsWith('CN') ? formatCreditNoteNumberForDisplay(formData.invoiceNumber) : formatInvoiceNumberForDisplay(formData.invoiceNumber)})`
                                        : isNegativeTotal
                                            ? "Create Credit Note"
                                            : "Create Invoice"}
                            </h1>
                        </div>
                        {overviewMode ? null : <p className="mt-2 text-gray-600 ml-14">
                            {isNegativeTotal
                                ? "Add a new credit note to issue"
                                : "Add a new invoice to send"}
                        </p>}
                    </div>
                    <div className="hidden md:flex items-center space-x-2">
                        {overviewMode ? null :
                            <InvoiceFieldSettingsDialog
                                initialSettings={visibleFields}
                                onSettingsSaved={(newSettings) => setVisibleFields(newSettings)}
                                onRefresh={refetch}
                            />}
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
                {/* <form onSubmit={(e) => { e.preventDefault(); handleSubmit('save'); }} className="space-y-6"> */}
                <div className="space-y-6">
                    <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-xl border border-slate-200 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-gray-900">Customer Information</h2>
                            {!overviewMode && <button
                                type="button"
                                onClick={() => setCustomerDialog(true)}
                                className="px-4 py-2 rounded-lg bg-[#31BCFF] text-white hover:bg-[#0ea5e9] transition-colors"
                            >
                                Add New Customer
                            </button>}
                        </div>

                        <div className="flex flex-wrap gap-6 mb-6">
                            <div className="w-full md:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)] min-w-[250px]">
                                <label htmlFor="customerId" className="block text-sm font-medium text-gray-700 mb-2">
                                    Customer *
                                </label>

                                <CustomerCombobox
                                    customers={customers}
                                    value={formData.customerId || ""}
                                    onChange={handleCustomerChange}
                                    placeholder="Select Customer"
                                    overviewMode={overviewMode}
                                />
                            </div>

                            {visibleFields.showContactPerson && (
                                <div className="w-full md:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)] min-w-[250px]">
                                    <label htmlFor="contactPersonId" className="block text-sm font-medium text-gray-700 mb-2">
                                        Contact Name *
                                    </label>
                                    <select
                                        id="contactPersonId"
                                        value={formData.contactPersonId || ""}
                                        onChange={(e) => setFormData({ ...formData, contactPersonId: e.target.value })}
                                        className="block w-full px-4 py-3 rounded-xl border border-gray-300 bg-white/70 backdrop-blur-sm text-gray-900 focus:ring-2 focus:ring-[#31BCFF]/50 focus:border-[#31BCFF] transition-all duration-200"
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

                            {/* {visibleFields.showPaymentTerms && (
                                <>
                                    <div className="w-full md:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)] min-w-[250px]">
                                        <label htmlFor="sentAt" className="block text-sm font-medium text-gray-700 mb-2">
                                            Invoice Date (SentAt) *
                                        </label>
                                        <input
                                            type="date"
                                            id="sentAt"
                                            required
                                            value={formData.sentAt || ""}
                                            onChange={(e) => setFormData({ ...formData, sentAt: e.target.value })}
                                            className="block w-full px-4 py-3 rounded-xl border border-gray-300 bg-white/70 backdrop-blur-sm text-gray-900 focus:ring-2 focus:ring-[#31BCFF]/50 focus:border-[#31BCFF] transition-all duration-200"
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
                                            className="block w-full px-4 py-3 rounded-xl border border-gray-300 bg-white/70 backdrop-blur-sm text-gray-900 focus:ring-2 focus:ring-[#31BCFF]/50 focus:border-[#31BCFF] transition-all duration-200"
                                            placeholder="Enter days until due"
                                        />
                                    </div>
                                </>
                            )} */}

                            {visibleFields.showProject && (
                                <div className="w-full md:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)] min-w-[250px]">
                                    <label htmlFor="projectId" className="block text-sm font-medium text-gray-700 mb-2">
                                        Project *
                                    </label>
                                    <select
                                        id="projectId"
                                        value={formData.projectId || ""}
                                        onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                                        className="block w-full px-4 py-3 rounded-xl border border-gray-300 bg-white/70 backdrop-blur-sm text-gray-900 focus:ring-2 focus:ring-[#31BCFF]/50 focus:border-[#31BCFF] transition-all duration-200"
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

                            {visibleFields.showDepartment && (
                                <div className="w-full md:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)] min-w-[250px]">
                                    <label htmlFor="departmentId" className="block text-sm font-medium text-gray-700 mb-2">
                                        Department *
                                    </label>
                                    <select
                                        id="departmentId"
                                        value={formData.departmentId || ""}
                                        onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                                        className="block w-full px-4 py-3 rounded-xl border border-gray-300 bg-white/70 backdrop-blur-sm text-gray-900 focus:ring-2 focus:ring-[#31BCFF]/50 focus:border-[#31BCFF] transition-all duration-200"
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

                            {visibleFields.showDeliveryAddress && (
                                <div className="w-full md:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)] min-w-[250px]">
                                    <label htmlFor="deliveryAddress" className="block text-sm font-medium text-gray-700 mb-2">
                                        Delivery Address *
                                    </label>
                                    <input
                                        type="text"
                                        id="deliveryAddress"
                                        value={formData.deliveryAddress || ""}
                                        onChange={(e) => setFormData({ ...formData, deliveryAddress: e.target.value })}
                                        className="block w-full px-4 py-3 rounded-xl border border-gray-300 bg-white/70 backdrop-blur-sm text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-[#31BCFF]/50 focus:border-[#31BCFF] transition-all duration-200"
                                        placeholder="Enter delivery address"
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                    {visibleFields.showSeller && <div className="bg-gradient-to-br rounded-xl border p-6">
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
                                    className="block w-full px-4 py-3 rounded-xl border border-gray-300 bg-white/70 backdrop-blur-sm text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-[#31BCFF]/50 focus:border-[#31BCFF] transition-all duration-200"
                                    placeholder="Seller Name"
                                />
                            </div>
                        </div>
                    </div>}

                    <div className="bg-gradient-to-br rounded-xl border p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Lines</h2>
                            {!overviewMode && <button
                                type="button"
                                onClick={handleNewOrderLine}
                                disabled={loading}
                                className="px-4 py-2 rounded-lg bg-[#31BCFF] text-white hover:bg-[#0ea5e9] transition-colors"
                            >New Order Line</button>}
                        </div>
                        {formData.invoiceLines.map((line, index) => (
                            <div className={`grid grid-cols-1 md:grid-cols-3 ${overviewMode ? 'lg:grid-cols-6' : 'lg:grid-cols-7'} gap-10`} key={index}>
                                <div>
                                    <label htmlFor="productId" className="block text-sm font-medium text-gray-700 mb-2">
                                        Product *
                                    </label>
                                    <select
                                        id="productId"
                                        value={line.productId || ''}
                                        onChange={(e) => {
                                            const product = products.find(p => p.id === e.target.value);
                                            const updatedLines = [...formData.invoiceLines];
                                            const businessVat =
                                                product?.ledgerAccount?.businessVatCodes?.[0]?.vatCode

                                            const vatRate =
                                                businessVat?.rate ??
                                                product?.ledgerAccount?.vatCode?.rate ??
                                                0
                                            updatedLines[index].productId = e.target.value;
                                            updatedLines[index].pricePerUnit = product?.salesPrice ?? 0;
                                            updatedLines[index].discountPercentage = product?.discountPercentage ?? 0;
                                            updatedLines[index].vatPercentage = Number(vatRate);
                                            updatedLines[index].productName = product?.productName;
                                            setFormData({ ...formData, invoiceLines: updatedLines });
                                            updateLineTotal(index,updatedLines[index].quantity);
                                        }}
                                        disabled={overviewMode}
                                        className="block w-full px-1 py-3 rounded-xl border border-gray-300 bg-white/70 backdrop-blur-sm text-gray-900 focus:ring-2 focus:ring-[#31BCFF]/50 focus:border-[#31BCFF] transition-all duration-200"
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
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            const updatedLines = [...formData.invoiceLines];
                                            updatedLines[index].quantity = Number(val);
                                            setFormData({ ...formData, invoiceLines: updatedLines })
                                            updateLineTotal(index,Number(val));

                                        }}
                                        disabled={overviewMode}
                                        className="block w-full px-4 py-3 rounded-xl border border-gray-300 bg-white/70 backdrop-blur-sm text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-[#31BCFF]/50 focus:border-[#31BCFF] transition-all duration-200"
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
                                        onChange={(e) => {
                                            const updatedLines = [...formData.invoiceLines];
                                            updatedLines[index].pricePerUnit = parseFloat(e.target.value);
                                            setFormData({ ...formData, invoiceLines: updatedLines })
                                            updateLineTotal(index);
                                        }}
                                        disabled={overviewMode}
                                        className="block w-full px-4 py-3 rounded-xl border border-gray-300 bg-white/70 backdrop-blur-sm text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-[#31BCFF]/50 focus:border-[#31BCFF] transition-all duration-200"
                                        placeholder="Enter price per unit"
                                    />
                                </div>

                                <div>
                                    <label htmlFor="vatPercentage" className="block text-sm font-medium text-gray-700 mb-2">
                                        Vat Percent (%) *
                                    </label>
                                    <input
                                        type="number"
                                        id="vatPercentage"
                                        required
                                        step="0.01"
                                        value={line.vatPercentage || 0.0}
                                        disabled
                                        className="block w-full px-4 py-3 rounded-xl border border-gray-300 bg-white/70 backdrop-blur-sm text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-[#31BCFF]/50 focus:border-[#31BCFF] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                                    />
                                </div>

                                {(visibleFields.showDiscount || formData.invoiceLines[index].discountPercentage > 0) &&
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
                                            onChange={(e) => {
                                                const updatedLines = [...formData.invoiceLines];
                                                updatedLines[index].discountPercentage = parseFloat(e.target.value);
                                                setFormData({ ...formData, invoiceLines: updatedLines })
                                                updateLineTotal(index);
                                            }}
                                            disabled={overviewMode}
                                            className="block w-full px-4 py-3 rounded-xl border border-gray-300 bg-white/70 backdrop-blur-sm text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-[#31BCFF]/50 focus:border-[#31BCFF] transition-all duration-200"
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
                                        value={(netTotals[index] || 0).toFixed(2)}
                                        disabled
                                        className="block w-full px-4 py-3 rounded-xl border border-gray-300 bg-white/70 backdrop-blur-sm text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-[#31BCFF]/50 focus:border-[#31BCFF] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                                    />
                                </div>
                                {overviewMode ? null : <div className='items-end flex space-x-4 mb-3 '>
                                    <button
                                        type='button'
                                        onClick={() => deleteInvoiceLine(index)}
                                    >
                                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>

                                    </button>
                                    <button
                                        type='button'
                                        onClick={() => handleCopyOrderLine(line, Number(netTotals[index]))}
                                    >
                                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2h-6a2 2 0 01-2-2V7z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H7a2 2 0 00-2 2v7a2 2 0 002 2h7a2 2 0 002-2v-1" />
                                        </svg>

                                    </button>

                                </div>}

                            </div>
                        ))}
                    </div>

                    {/* Notes Section */}
                    {visibleFields.showNote
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
                    {overviewMode ? null :

                        <div className="flex items-center justify-end gap-4 pt-6 border-t border-gray-200">
                            {/* <Link href="/dashboard/invoices" className="px-6 py-3 rounded-xl border border-gray-300 bg-white text-gray-700 font-medium hover:bg-gray-50 transition-colors duration-200">
                                Cancel
                            </Link> */}
                            <button
                                type="button"
                                disabled={loading}
                                onClick={() => handleSendClick(isNegativeTotal ? 'send_new_credit_note' : 'send_invoice_without_email')}
                                className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#31BCFF] to-[#0EA5E9] text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                            >
                                {loading ? 'Sending...' : isNegativeTotal ? 'Create Credit Note' : 'Send Invoice'}
                            </button>
                        </div>
                    }
                    {/* </form> */}
                </div>
            </div>
            {customerDialog && <CustomerDialog
                open={true}
                onOpenChange={(open) => {
                    setCustomerDialog(open);
                }}
                loading={loadingCustomer}
                onSave={onSaveCustomer}
            />}

            <SendInvoiceDialog
                open={showSendDialog}
                onOpenChange={setShowSendDialog}
                defaultDueDay={formData.dueDay}   // carries customer payment terms
                loading={loading}
                isCreditNote={isNegativeTotal || isCreditNote}
                onConfirm={handleSendDialogConfirm}
            />
        </div>
    )
}
