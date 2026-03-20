'use client'

import { useState, useEffect, use, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import Link from 'next/link'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import Swal from 'sweetalert2'
import { ContactPerson, InvoiceFormData, InvoiceLine, Project } from '../../create/page'
import { Department } from '@prisma/client'
import { useInvoiceSettings } from '@/shared/hooks/useInvoiceSettings'
import { calculateInvoiceTotals, exportToPDF, sendEmail } from '@/shared/lib/invoiceHelper'
import InvoiceSummaryCalculation from '@/components/invoice/InvoiceSummaryCalculation'
import { CustomerCombobox } from '@/components/invoice/CustomerCombobox'
import { InvoiceFieldSettingsDialog } from '@/components/invoice/InvoiceFieldSettingsDialog'
import SendInvoiceDialog, { SendInvoiceDialogResult } from '@/components/invoice/SendInvoiceDialog'
import { useHasChanges } from '@/hooks/useHasChanges'
import { AlertTriangle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/shared/lib/toast'

interface Customer {
    id: string
    customerName: string
}

interface VatCode { name: string; rate: number }
interface BusinessVatCode { vatCode: VatCode }

interface Product {
    id: string
    productName: string
    salesPrice: number
    ledgerAccount?: {
        vatCode?: { code: number; rate: number }
        businessVatCodes: BusinessVatCode[]
    }
}

export default function EditInvoicePage({
    params,
    searchParams,
}: {
    params: Promise<{ id: string }>
    searchParams: Promise<{ 'credit-note'?: string }>
}) {
    const resolvedParams = use(params)
    const resolvedSearchParams = use(searchParams)
    const isCreditNote =
        resolvedSearchParams['credit-note'] != null
            ? resolvedSearchParams['credit-note'] === 'true'
            : false

    const router = useRouter()
    const { t } = useTranslation()
    const [loading, setLoading] = useState(false)
    const [customers, setCustomers] = useState<Customer[]>([])
    const [products, setProducts] = useState<Product[]>([])
    const [fetchingLoading, setFetchingLoading] = useState(false)
    const [projects, setProjects] = useState<Project[]>([])
    const [departments, setDepartments] = useState<Department[]>([])
    const [contacts, setContacts] = useState<ContactPerson[]>([])
    const [fetchingCustomer, setFetchingCustomer] = useState(false)
    const [formData, setFormData] = useState<InvoiceFormData>({
        customerId: '',
        invoiceNumber: '',
        contactPersonId: '',
        deliveryAddress: '',
        sentAt: new Date().toISOString().split('T')[0],
        dueDay: 14,
        paidAt: '',
        projectId: '',
        departmentId: '',
        seller: '',
        invoiceLines: [],
        status: '',
        notes: '',
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
        showNote: true,
    })
    const [originalInvoiceData, setOriginalInvoiceData] = useState<{
        customerId: string
        amount: number
    } | null>(null)

    // ── Dialog state ──────────────────────────────────────────────────────────
    const [showSendDialog, setShowSendDialog] = useState(false)
    const [pendingAction, setPendingAction] = useState<
        'send_invoice_without_email' | 'send_invoice_with_email' | 'print' | 'send_new_credit_note' | null
    >(null)

    // ─── 1. Refs ──────────────────────────────────────────────────────────────
    const isDirtyRef = useRef(false)
    const isSavingRef = useRef(false)
    const formDataRef = useRef(formData)
    useEffect(() => {
        formDataRef.current = formData
        if (formData.customerId && !isCreditNote) {
            isDirtyRef.current = true
        }
    }, [formData, isCreditNote])

    // ─── 2. Beacon ────────────────────────────────────────────────────────────
    const fireBeacon = useCallback(() => {
        if (!isDirtyRef.current || isSavingRef.current || isCreditNote) return
        const current = formDataRef.current
        if (!current.customerId) return
        isSavingRef.current = true
        const { seller, ...filteredData } = current
        navigator.sendBeacon(`/api/invoices/${resolvedParams.id}`, JSON.stringify(filteredData))
        isDirtyRef.current = false
        setTimeout(() => { isSavingRef.current = false }, 500)
    }, [isCreditNote, resolvedParams.id])

    // ─── 3. History patching ──────────────────────────────────────────────────
    useEffect(() => {
        if (isCreditNote) return
        const originalPush = history.pushState.bind(history)
        const originalReplace = history.replaceState.bind(history)
        history.pushState = (...args) => { fireBeacon(); return originalPush(...args) }
        history.replaceState = (...args) => { fireBeacon(); return originalReplace(...args) }
        window.addEventListener('popstate', fireBeacon)
        window.addEventListener('beforeunload', fireBeacon)
        return () => {
            history.pushState = originalPush
            history.replaceState = originalReplace
            window.removeEventListener('popstate', fireBeacon)
            window.removeEventListener('beforeunload', fireBeacon)
        }
    }, [isCreditNote, fireBeacon])

    // ─── 4. Auto-save ─────────────────────────────────────────────────────────
    const autoSave = useCallback(async () => {
        if (!isDirtyRef.current || isCreditNote) return
        const current = formDataRef.current
        if (!current.customerId) return
        try {
            const { seller, ...filteredData } = current
            await fetch(`/api/invoices/${resolvedParams.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(filteredData),
            })
            isDirtyRef.current = false
        } catch (_) { }
    }, [isCreditNote, resolvedParams.id])

    // ─── 5. Back button ───────────────────────────────────────────────────────
    const handleBack = async () => {
        if (!isCreditNote && isDirtyRef.current) {
            await autoSave()
            isDirtyRef.current = false
        }
        if (window.history.length > 1) router.back()
        else router.push('/dashboard/invoices')
    }

    // ─── Effects ──────────────────────────────────────────────────────────────
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
                showNote: settings.showNote,
            })
        }
    }, [settings])

    const { hasChanges, resetChanges, setInitialData } = useHasChanges(formData);

    useEffect(() => {
        fetchCustomers()
        fetchProducts()
        fetchInvoice()
    }, [resolvedParams.id])

    // paidAt recalculation — edit page keeps sentAt/dueDay in the form
    useEffect(() => {
        if (formData.sentAt && formData.dueDay) {
            const sentDate = new Date(formData.sentAt)
            const paidDate = new Date(sentDate)
            paidDate.setDate(paidDate.getDate() + Number(formData.dueDay))
            setFormData(prev => ({ ...prev, paidAt: paidDate.toISOString().split('T')[0] }))
        }
    }, [formData.sentAt, formData.dueDay])

    // ─── Data fetching ────────────────────────────────────────────────────────
    const fetchCustomers = async () => {
        try {
            const res = await fetch('/api/customers')
            if (res.ok) setCustomers(await res.json())
        } catch (error) { console.error('Error fetching customers:', error) }
    }

    const fetchProducts = async () => {
        try {
            const res = await fetch('/api/products')
            if (res.ok) setProducts(await res.json())
        } catch (error) { console.error('Error fetching products:', error) }
    }

    const fetchInvoice = async () => {
        try {
            const res = await fetch(`/api/invoices/${resolvedParams.id}`)
            if (res.ok) {
                const data = await res.json()
                if (data.customer?.projects?.length > 0) setProjects(data.customer.projects)
                else setProjects([])
                if (data.customer?.department) setDepartments([data.customer.department])
                if (data.customer?.contactPersons) setContacts(data.customer.contactPersons)

                const rawLines: InvoiceLine[] = data.invoiceLines || []
                const invoiceLines = isCreditNote
                    ? rawLines.map(line => ({
                        ...line,
                        quantity: -Math.abs(Number(line.quantity)),
                        pricePerUnit: -Math.abs(Number(line.pricePerUnit)),
                    }))
                    : rawLines

                if (isCreditNote) {
                    const totalAmount = rawLines.reduce((sum, line) => {
                        const qty = Math.abs(Number(line.quantity)) || 0
                        const price = Math.abs(Number(line.pricePerUnit)) || 0
                        const discount = Number(line.discountPercentage) || 0
                        const { totalExclVAT } = calculateInvoiceTotals(qty, price, discount, Number(line.vatPercentage) || 0)
                        return sum + totalExclVAT
                    }, 0)
                    setOriginalInvoiceData({ customerId: data.customerId, amount: totalAmount })
                }
                const formattedData = {
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
                    notes: data.notes || '',
                };
                setFormData(formattedData)
                setInitialData(formattedData)
                isDirtyRef.current = false
            }
        } catch (error) {
            console.error('Error fetching invoice:', error)
        } finally {
            setFetchingLoading(false)
        }
    }

    // ─── Line helpers ─────────────────────────────────────────────────────────
    const deleteInvoiceLine = (index: number) => {
        setFormData(prev => ({ ...prev, invoiceLines: prev.invoiceLines.filter((_, i) => i !== index) }))
    }

    const handleNewOrderLine = () => {
        setFormData(prev => ({
            ...prev,
            invoiceLines: [...prev.invoiceLines, {
                productId: '', quantity: 1, pricePerUnit: 0,
                vatPercentage: 0, discountPercentage: 0, productName: '',
            }],
        }))
    }

    const handleCopyOrderLine = (copiedInvoiceLine: InvoiceLine, netTotal: number) => {
        const isOriginalLine = !!copiedInvoiceLine.id
        setFormData(prev => ({
            ...prev,
            invoiceLines: [...prev.invoiceLines, {
                productId: copiedInvoiceLine.productId,
                quantity: isOriginalLine ? Math.abs(Number(copiedInvoiceLine.quantity)) : copiedInvoiceLine.quantity,
                pricePerUnit: isOriginalLine ? Math.abs(Number(copiedInvoiceLine.pricePerUnit)) : copiedInvoiceLine.pricePerUnit,
                vatPercentage: copiedInvoiceLine.vatPercentage,
                discountPercentage: copiedInvoiceLine.discountPercentage,
                productName: copiedInvoiceLine.productName,
            }],
        }))
    }

    const updateInvoiceLine = (index: number, updates: Partial<InvoiceLine>) => {
        setFormData(prev => ({
            ...prev,
            invoiceLines: prev.invoiceLines.map((line, i) =>
                i === index ? { ...line, ...updates } : line
            ),
        }))
    }

    // ── Opens dialog for ALL actions ─────────────────────────────────────────
    const handleSendClick = (action: 'send_invoice_without_email' | 'send_invoice_with_email' | 'print' | 'send_new_credit_note') => {
        setPendingAction(action)
        setShowSendDialog(true)
    }

    // ── Dialog confirm ────────────────────────────────────────────────────────
    const handleSendDialogConfirm = async (result: SendInvoiceDialogResult) => {
        setShowSendDialog(false)
        if (!pendingAction) return

        setFormData(prev => ({ ...prev, sentAt: result.sentAt, dueDay: result.dueDay, paidAt: result.paidAt }))

        let resolvedAction = pendingAction
        if (pendingAction !== 'send_new_credit_note') {
            if (result.deliveryMethod === 'EMAIL') resolvedAction = 'send_invoice_with_email'
            else if (result.deliveryMethod === 'PRINT') resolvedAction = 'print'
            else resolvedAction = 'send_invoice_without_email' // EHF coming soon
        }

        await handleSubmit(resolvedAction, { sentAt: result.sentAt, dueDay: result.dueDay, paidAt: result.paidAt })
    }

    // ─── Submit ───────────────────────────────────────────────────────────────
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
        filteredData = {
            ...filteredData,
            sentAt: dateOverride?.sentAt ?? filteredData.sentAt,
            dueDay: dateOverride?.dueDay ?? filteredData.dueDay,
            paidAt: dateOverride?.paidAt ?? filteredData.paidAt,
            status: invoiceStatus,
        }

        try {
            // Standalone credit note from edit page (negative total on a draft)
            if (action === 'send_new_credit_note' && !isCreditNote && isNegativeTotal) {
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
                        sourceDraftId: resolvedParams.id,
                    }),
                })
                if (!res.ok) { const error = await res.json(); throw new Error(error.error || 'Failed to create standalone credit note') }
                await toast('success', 'Credit note created successfully')
                resetChanges();
                isDirtyRef.current = false
                router.push('/dashboard/invoices')
                router.refresh()
                return
            }

            // Credit note from existing sent invoice
            if (isCreditNote && originalInvoiceData) {
                const creditLines = formData.invoiceLines.filter(line => line.id)
                const rebillLines = formData.invoiceLines.filter(line => !line.id)
                const response = await fetch(`/api/invoices/${resolvedParams.id}/customer/credit-note`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        customerId: originalInvoiceData.customerId,
                        creditNoteDate: filteredData.sentAt,
                        comment: formData.notes || '',
                        creditLineIds: creditLines.map(l => l.id),
                        rebillLines,
                    }),
                })
                if (!response.ok) { const error = await response.json(); throw new Error(error.error || 'Failed to create the credit note') }
                await toast('success', 'Credit note sent successfully')
                isDirtyRef.current = false
                router.push('/dashboard/invoices')
                router.refresh()
                return
            }

            // Regular invoice update
            const res = await fetch(`/api/invoices/${resolvedParams.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(filteredData),
            })
            if (!res.ok) { const error = await res.json(); throw new Error(error.error || 'Failed to update the invoice') }
            const updatedInvoice = await res.json()

            if (action === 'print') {
                const pdfSuccess = await exportToPDF(updatedInvoice.id)

                await toast(
                    pdfSuccess ? 'success' : 'warning',
                    pdfSuccess
                        ? 'Invoice updated and PDF downloaded'
                        : 'Invoice updated but PDF download failed'
                )
            } else if (action === 'send_invoice_with_email') {
                const result = await sendEmail(updatedInvoice.id)
                toast('success', result.message)
            } else {
                toast('success', 'Invoice updated successfully')
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
        const qty = Number(line.quantity) || 0
        const price = Number(line.pricePerUnit) || 0
        const discount = Number(line.discountPercentage) || 0
        const vat = Number(line.vatPercentage) || 0
        const { totalInclVAT } = calculateInvoiceTotals(Math.abs(qty), Math.abs(price), discount, vat)
        const sign = isCreditNote && !!line.id ? -1 : qty < 0 ? -1 : 1
        return sum + totalInclVAT * sign
    }, 0)

    const isNegativeTotal = totalInclVAT < 0

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <button onClick={handleBack} className="p-2 hover:bg-white/50 rounded-lg transition-colors">
                                <ArrowLeftIcon className="w-5 h-5 text-gray-600" />
                            </button>
                            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                                {isCreditNote ? 'Credit Note' : isNegativeTotal ? 'Edit Credit Note' : 'Edit Invoice'}
                            </h1>
                        </div>
                        <p className="mt-2 text-gray-600 ml-14">
                            {isCreditNote || isNegativeTotal ? 'Update the credit note to issue' : 'Update the invoice to send'}
                        </p>
                    </div>
                    <div className="hidden md:flex items-center space-x-2">
                        <InvoiceFieldSettingsDialog initialSettings={visibleFields} onSettingsSaved={(s) => setVisibleFields(s)} onRefresh={refetch} />
                        <div className="w-12 h-12 bg-[#31BCFF]/10 rounded-xl flex items-center justify-center">
                            <svg className="w-6 h-6 text-[#31BCFF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                            </svg>
                        </div>
                    </div>
                </div>
            </div>

            {/* Form */}
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 shadow-lg p-6">
                {isCreditNote && (
                    <div className="mb-3 text-amber-800 text-sm text-right font-medium">
                        ⚠️ You are issuing a credit note. Invoice details are locked and cannot be edited!
                    </div>
                )}
                <div className="space-y-6">
                    {/* Customer Information */}
                    <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-xl border border-slate-200 p-6">
                        {hasChanges && (
                            <div className="flex justify-end items-center gap-3">
                                <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                                    <AlertTriangle className="w-3 h-3 mr-1" />
                                    Unsaved Changes
                                </Badge>
                            </div>

                        )}
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-gray-900">Customer Information</h2>
                        </div>
                        <div className="flex flex-wrap gap-6 mb-6">
                            <div className="w-full md:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)] min-w-[250px]">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Customer *</label>
                                <CustomerCombobox customers={customers} value={formData.customerId || ''} onChange={(customerId) => setFormData({ ...formData, customerId })} placeholder="Select Customer" disabled={isCreditNote} />
                                {/* <p className="text-xs mt-2 text-blue-400">Customer is already assigned</p> */}
                            </div>

                            {settings.showContactPerson && (
                                <div className="w-full md:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)] min-w-[250px]">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Contact Name *</label>
                                    <select value={formData.contactPersonId || ''} onChange={(e) => setFormData({ ...formData, contactPersonId: e.target.value })} disabled={isCreditNote} className={`block w-full px-4 py-3 rounded-xl border border-gray-300 bg-white/70 backdrop-blur-sm text-gray-900 focus:ring-2 focus:ring-[#31BCFF]/50 focus:border-[#31BCFF] transition-all duration-200 ${isCreditNote ? 'opacity-60 cursor-not-allowed' : ''}`}>
                                        <option value="">Select Contact Name</option>
                                        {contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                            )}

                            {/* {settings.showPaymentTerms && (
                                <>
                                    <div className="w-full md:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)] min-w-[250px]">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Invoice Date (sentAt) *</label>
                                        <input type="date" value={formData.sentAt || ''} onChange={(e) => setFormData({ ...formData, sentAt: e.target.value })} disabled={isCreditNote} className={`block w-full px-4 py-3 rounded-xl border border-gray-300 bg-white/70 backdrop-blur-sm text-gray-900 focus:ring-2 focus:ring-[#31BCFF]/50 focus:border-[#31BCFF] transition-all duration-200 ${isCreditNote ? 'opacity-60 cursor-not-allowed' : ''}`} />
                                    </div>
                                    <div className="w-full md:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)] min-w-[250px]">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Days until due (PaidAt - {formData.paidAt || 'Not calculated'})</label>
                                        <input type="number" min="0" value={formData.dueDay} onChange={(e) => setFormData({ ...formData, dueDay: Number.parseInt(e.target.value) || 0 })} disabled={isCreditNote} className={`block w-full px-4 py-3 rounded-xl border border-gray-300 bg-white/70 backdrop-blur-sm text-gray-900 focus:ring-2 focus:ring-[#31BCFF]/50 focus:border-[#31BCFF] transition-all duration-200 ${isCreditNote ? 'opacity-60 cursor-not-allowed' : ''}`} placeholder="Enter days until due" />
                                    </div>
                                </>
                            )} */}

                            {settings.showProject && (
                                <div className="w-full md:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)] min-w-[250px]">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Project *</label>
                                    <select value={formData.projectId || ''} onChange={(e) => setFormData({ ...formData, projectId: e.target.value })} disabled={isCreditNote} className={`block w-full px-4 py-3 rounded-xl border border-gray-300 bg-white/70 backdrop-blur-sm text-gray-900 focus:ring-2 focus:ring-[#31BCFF]/50 focus:border-[#31BCFF] transition-all duration-200 ${isCreditNote ? 'opacity-60 cursor-not-allowed' : ''}`}>
                                        <option value="">Select Project</option>
                                        {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                </div>
                            )}

                            {settings.showDepartment && (
                                <div className="w-full md:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)] min-w-[250px]">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Department *</label>
                                    <select value={formData.departmentId || ''} onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })} disabled={isCreditNote} className={`block w-full px-4 py-3 rounded-xl border border-gray-300 bg-white/70 backdrop-blur-sm text-gray-900 focus:ring-2 focus:ring-[#31BCFF]/50 focus:border-[#31BCFF] transition-all duration-200 ${isCreditNote ? 'opacity-60 cursor-not-allowed' : ''}`}>
                                        <option value="">Select Department</option>
                                        {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                    </select>
                                </div>
                            )}

                            {settings.showDeliveryAddress && (
                                <div className="w-full md:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)] min-w-[250px]">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Delivery Address *</label>
                                    <input type="text" value={formData.deliveryAddress || ''} onChange={(e) => setFormData({ ...formData, deliveryAddress: e.target.value })} disabled={isCreditNote} className={`block w-full px-4 py-3 rounded-xl border border-gray-300 bg-white/70 backdrop-blur-sm text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-[#31BCFF]/50 focus:border-[#31BCFF] transition-all duration-200 ${isCreditNote ? 'opacity-60 cursor-not-allowed' : ''}`} placeholder="Enter delivery address" />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Seller */}
                    {settings.showSeller && (
                        <div className="bg-gradient-to-br rounded-xl border p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">Seller Information</h2>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Seller *</label>
                                <input type="text" value={formData.seller || ''} disabled className="block w-full px-4 py-3 rounded-xl border border-gray-300 bg-white/70 backdrop-blur-sm text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-[#31BCFF]/50 focus:border-[#31BCFF] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed" placeholder="Seller Name" />
                            </div>
                        </div>
                    )}

                    {/* Order Lines */}
                    <div className="bg-gradient-to-br rounded-xl border p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-semibold text-gray-900">Order Lines</h2>
                            {!isCreditNote && (
                                <button type="button" onClick={handleNewOrderLine} disabled={loading} className="px-4 py-2 rounded-lg bg-[#31BCFF] text-white hover:bg-[#0ea5e9] transition-colors">
                                    New Order Line
                                </button>
                            )}
                        </div>
                        {formData.invoiceLines.map((line, index) => {
                            const qty = Number(line.quantity) || 0
                            const price = Number(line.pricePerUnit) || 0
                            const discount = Number(line.discountPercentage) || 0
                            const vat = Number(line.vatPercentage) || 0
                            const { totalExclVAT: rawTotal } = calculateInvoiceTotals(Math.abs(qty), Math.abs(price), discount, vat)
                            const sign = (isCreditNote && !!line.id) ? -1 : (qty < 0 ? -1 : 1)
                            const totalExclVAT = rawTotal * sign
                            return (!line.isCredited && (
                                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-7 gap-10" key={index}>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Product *</label>
                                        <select required value={line.productId || ''} disabled={isCreditNote} onChange={(e) => {
                                            const product = products.find(p => p.id === e.target.value)
                                            const businessVat = product?.ledgerAccount?.businessVatCodes?.[0]?.vatCode
                                            const vatRate = businessVat?.rate ?? product?.ledgerAccount?.vatCode?.rate ?? 0
                                            const basePrice = product?.salesPrice ?? 0
                                            updateInvoiceLine(index, {
                                                productId: e.target.value,
                                                pricePerUnit: isCreditNote && line.id ? -Math.abs(basePrice) : basePrice,
                                                vatPercentage: Number(vatRate),
                                                productName: product?.productName,
                                            })
                                        }} className={`block w-full px-4 py-3 rounded-xl border border-gray-300 bg-white/70 backdrop-blur-sm text-gray-900 focus:ring-2 focus:ring-[#31BCFF]/50 focus:border-[#31BCFF] transition-all duration-200 ${isCreditNote ? 'opacity-60 cursor-not-allowed' : ''}`}>
                                            <option value="">Select Product</option>
                                            {products.map(pr => <option key={pr.id} value={pr.id}>{pr.productName}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Quantity *</label>
                                        <input type="number" required value={line.quantity || ''} disabled={isCreditNote} onChange={(e) => updateInvoiceLine(index, { quantity: parseFloat(e.target.value) })} className={`block w-full px-4 py-3 rounded-xl border border-gray-300 bg-white/70 backdrop-blur-sm text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-[#31BCFF]/50 focus:border-[#31BCFF] transition-all duration-200 ${isCreditNote ? 'opacity-60 cursor-not-allowed' : ''}`} placeholder="Enter quantity" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Price Per Unit *</label>
                                        <input type="number" required step="0.01" value={line.pricePerUnit || 0.0} disabled={isCreditNote} onChange={(e) => updateInvoiceLine(index, { pricePerUnit: parseFloat(e.target.value) })} className={`block w-full px-4 py-3 rounded-xl border border-gray-300 bg-white/70 backdrop-blur-sm text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-[#31BCFF]/50 focus:border-[#31BCFF] transition-all duration-200 ${isCreditNote ? 'opacity-60 cursor-not-allowed' : ''}`} placeholder="Enter price per unit" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Vat Percent *</label>
                                        <input type="number" readOnly step="0.01" value={line.vatPercentage || 0} className="block w-full px-4 py-3 rounded-xl border border-gray-300 bg-white/70 backdrop-blur-sm text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-[#31BCFF]/50 focus:border-[#31BCFF] transition-all duration-200 opacity-60 cursor-not-allowed" />
                                    </div>
                                    {settings.showDiscount && (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Discount(%) *</label>
                                            <input type="number" step="0.01" min="0" max="100" value={line.discountPercentage || ''} disabled={isCreditNote} onChange={(e) => updateInvoiceLine(index, { discountPercentage: parseFloat(e.target.value) })} className={`block w-full px-4 py-3 rounded-xl border border-gray-300 bg-white/70 backdrop-blur-sm text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-[#31BCFF]/50 focus:border-[#31BCFF] transition-all duration-200 ${isCreditNote ? 'opacity-60 cursor-not-allowed' : ''}`} placeholder="Enter discount percentage" />
                                        </div>
                                    )}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Net Total</label>
                                        <input type="number" step="0.01" value={(totalExclVAT || 0).toFixed(2)} disabled className="block w-full px-4 py-3 rounded-xl border border-gray-300 bg-white/70 backdrop-blur-sm text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-[#31BCFF]/50 focus:border-[#31BCFF] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed" />
                                    </div>
                                    <div className="items-end flex space-x-4 mb-3">
                                        <button type="button" onClick={() => deleteInvoiceLine(index)} disabled={isCreditNote} className={isCreditNote ? 'opacity-60 cursor-not-allowed' : ''}>
                                            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        </button>
                                        <button type="button" onClick={() => handleCopyOrderLine(line, Number(totalExclVAT || 0))} disabled={isCreditNote} className={isCreditNote ? 'opacity-60 cursor-not-allowed' : ''}>
                                            <svg className="w-8 h-8 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2h-6a2 2 0 01-2-2V7z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H7a2 2 0 00-2 2v7a2 2 0 002 2h7a2 2 0 002-2v-1" /></svg>
                                        </button>
                                    </div>
                                </div>
                            ))
                        })}
                    </div>

                    {/* Notes */}
                    {settings.showNote && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Additional Notes</label>
                            <textarea value={formData.notes || ''} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="block w-full px-4 py-3 rounded-xl border border-gray-300 bg-white/70 backdrop-blur-sm text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-[#31BCFF]/50 focus:border-[#31BCFF] transition-all duration-200" placeholder="Enter any additional notes" rows={3} />
                        </div>
                    )}

                    <InvoiceSummaryCalculation invoiceLines={formData.invoiceLines} isCreditNote={isCreditNote} />

                    {/* Form Actions — single button, dialog handles delivery method */}
                    <div className="flex items-center justify-end gap-4 pt-6 border-t border-gray-200">
                        {/* <Link href="/dashboard/invoices" className="px-6 py-3 rounded-xl border border-gray-300 bg-white text-gray-700 font-medium hover:bg-gray-50 transition-colors duration-200">
                            Cancel
                        </Link> */}
                        <button
                            type="button"
                            disabled={loading}
                            onClick={() => handleSendClick(
                                isCreditNote
                                    ? 'send_invoice_without_email'   // credit note from sent invoice — no delivery choice needed but still goes through dialog for date
                                    : isNegativeTotal
                                        ? 'send_new_credit_note'
                                        : 'send_invoice_without_email'
                            )}
                            className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#31BCFF] to-[#0EA5E9] text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                        >
                            {loading ? 'Sending...' : isCreditNote ? 'Send Credit Note' : isNegativeTotal ? 'Create Credit Note' : 'Send Invoice'}
                        </button>
                    </div>
                </div>
            </div>

            <SendInvoiceDialog
                open={showSendDialog}
                onOpenChange={setShowSendDialog}
                defaultDueDay={formData.dueDay}
                loading={loading}
                isCreditNote={isCreditNote || isNegativeTotal}
                onConfirm={handleSendDialogConfirm}
            />
        </div>
    )
}