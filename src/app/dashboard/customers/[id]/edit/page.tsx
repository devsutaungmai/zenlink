'use client'

import { useState, useEffect, use, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import Link from 'next/link'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import Swal from 'sweetalert2'
import { Department, InvoicePaymentTerms } from '../../create/page'
import CustomerPaymentTermComponent, { CustomerPaymentTermForComponent } from '@/components/invoice/CustomerPaymentTerm'
import CustomerContactComponent, { CustomerContact } from '@/components/invoice/CustomerContact'
import { customerValidationSchema } from '@/components/invoice/validation'
import z from 'zod'
import { useCustomerSettings } from '@/shared/hooks/useCustomerSettings'
import { CustomerFieldSettingsDialog } from '@/components/invoice/CustomerFieldSettingsDialog'
import { formatCustomerNumberForDisplay } from '@/shared/lib/invoiceHelper'
import { useInvoiceGeneralSettings } from '@/shared/hooks/useInvoiceGeneralSettings'

export default function EditCustomersPage({ params, searchParams }: { params: Promise<{ id: string }>, searchParams: Promise<{ overview?: string }> }) {
    const resolvedParams = use(params)
    const resolvedSearchParams = use(searchParams)
    const overviewMode = resolvedSearchParams.overview === 'true'
    console.log("Overview mode:", overviewMode);
    const router = useRouter()
    const { t } = useTranslation()
    const [loading, setLoading] = useState(false)
    const [fetchingLoading, setFetchingLoading] = useState(false)
    const [departments, setDepartments] = useState<Department[]>([])
    const [paymentTermDefaults, setPaymentTermDefaults] = useState<CustomerPaymentTermForComponent>({
        dueDateType: 'DAYS_AFTER' as const,
        daysAfter: 14,
        unit: 'DAYS' as const,
        fixedDateDay: 1,
    })
    const [formData, setFormData] = useState<{
        customerName: string
        active: boolean
        customerNumber: string
        organizationNumber: string
        address: string
        postalCode: string
        postalAddress: string
        phoneNumber: string
        email: string
        discountPercentage: string
        deliveryAddress: string
        deliveryAddressPostalCode: string
        deliveryAddressPostalAddress: string
        departmentId: string
        customerPaymentTerm: InvoicePaymentTerms,
        customerContacts?: CustomerContact[]
    }>({
        customerName: "",
        active: false,
        customerNumber: "",
        organizationNumber: "",
        address: "",
        postalCode: "",
        postalAddress: "",
        phoneNumber: "",
        email: "",
        discountPercentage: "",
        deliveryAddress: "",
        deliveryAddressPostalCode: "",
        deliveryAddressPostalAddress: "",
        departmentId: "",
        customerPaymentTerm: {
            dueDateType: "DAYS_AFTER",
            dueDateValue: 14,
            dueDateUnit: "DAYS"
        },
        customerContacts: []
    })
    const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
    const validationTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    const { settings, refetch } = useCustomerSettings();
    const [visibleFields, setVisibleFields] = useState({
        showOrganizationNumber: true,
        showAddress: true,
        showPhoneNumber: true,
        showEmail: true,
        showDiscountPercentage: true,
        showDeliveryAddress: true,
        showDepartment: true,
        showInvoicePaymentTerms: true,
        showContactPerson: true,
    })

    useEffect(() => {
        if (settings) {
            setVisibleFields({
                showOrganizationNumber: settings.showOrganizationNumber ?? true,
                showAddress: settings.showAddress ?? true,
                showPhoneNumber: settings.showPhoneNumber ?? true,
                showEmail: settings.showEmail ?? true,
                showDiscountPercentage: settings.showDiscountPercentage ?? true,
                showDeliveryAddress: settings.showDeliveryAddress ?? true,
                showDepartment: settings.showDepartment ?? true,
                showInvoicePaymentTerms: settings.showInvoicePaymentTerms ?? true,
                showContactPerson: settings.showContactPerson ?? true,
            })
        }
    }, [settings])

    const validateField = (fieldName: string, value: any) => {
        try {
            const fieldSchema = customerValidationSchema.shape[fieldName as keyof typeof customerValidationSchema.shape]
            if (fieldSchema) {
                fieldSchema.parse(value)
                setValidationErrors(prev => ({ ...prev, [fieldName]: '' }))
            }
        } catch (error) {
            if (error instanceof z.ZodError && error.issues.length > 0) {
                setValidationErrors(prev => ({ ...prev, [fieldName]: error.issues[0].message }))
            }
        }
    }

    const debouncedValidation = (fieldName: string, value: any) => {
        if (validationTimeoutRef.current) {
            clearTimeout(validationTimeoutRef.current)
        }

        validationTimeoutRef.current = setTimeout(() => {
            validateField(fieldName, value)
        }, 500)
    }
    useEffect(() => {
        fetchCustomer()
        fetchDepartments()
    }, [resolvedParams.id, overviewMode])

    const fetchDepartments = async () => {
        try {
            const res = await fetch('/api/departments')
            if (res.ok) {
                const data = await res.json()
                setDepartments(data)
            }
        } catch (error) {
            console.error('Error fetching departments:', error)
        }
    }
    const fetchCustomer = async () => {
        try {
            const res = await fetch(`/api/customers/${resolvedParams.id}`)
            if (res.ok) {
                const data = await res.json()
                //let's prepare for component's format
                let paymentTermForComponent = {
                    dueDateType: 'DAYS_AFTER' as const,
                    daysAfter: 14,
                    unit: 'DAYS' as const,
                    fixedDateDay: 1,
                }

                if (data.InvoicePaymentTerms) {
                    paymentTermForComponent = {
                        dueDateType: data.InvoicePaymentTerms.invoiceDueDateType,
                        daysAfter: data.InvoicePaymentTerms.invoiceDueDateType === 'DAYS_AFTER'
                            ? data.InvoicePaymentTerms.invoiceDueDateValue
                            : 14,
                        fixedDateDay: data.InvoicePaymentTerms.invoiceDueDateType === 'FIXED_DATE'
                            ? data.InvoicePaymentTerms.invoiceDueDateValue
                            : 1,
                        unit: data.InvoicePaymentTerms.invoiceDueDateUnit,
                    }
                }
                setFormData({
                    customerName: data.customerName || '',
                    active: data.active || false,
                    customerNumber: data.customerNumber || '',
                    organizationNumber: data.organizationNumber || '',
                    address: data.address || '',
                    postalCode: data.postalCode || '',
                    postalAddress: data.postalAddress || '',
                    phoneNumber: data.phoneNumber || '',
                    email: data.email || '',
                    discountPercentage: data.discountPercentage || '',
                    deliveryAddress: data.deliveryAddress || '',
                    deliveryAddressPostalCode: data.deliveryAddressPostalCode || '',
                    deliveryAddressPostalAddress: data.deliveryAddressPostalAddress || '',
                    departmentId: data.departmentId || "",
                    customerPaymentTerm: {
                        dueDateType: data.InvoicePaymentTerms?.invoiceDueDateType || "DAYS_AFTER",
                        dueDateValue: data.InvoicePaymentTerms?.invoiceDueDateValue || 14,
                        dueDateUnit: data.InvoicePaymentTerms?.invoiceDueDateUnit || "DAYS"
                    },
                    customerContacts: data.contactPersons || []
                })
                setPaymentTermDefaults(paymentTermForComponent)
            }
        } catch (error) {
            console.error('Error fetching customer:', error)
        } finally {
            setFetchingLoading(false)
        }
    }
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const res = await fetch(`/api/customers/${resolvedParams.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            })

            if (!res.ok) {
                const error = await res.json()
                throw new Error(error.error || 'Failed to update customer')
            }

            await Swal.fire({
                title: 'Success!',
                text: 'Customer updated successfully',
                icon: 'success',
                confirmButtonColor: '#31BCFF',
            })

            router.push('/dashboard/customers')
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
    const handleBack = () => {
        if (window.history.length > 1) {
            router.back()
        } else {
            router.push("/dashboard/customers")
        }
    }
    if (fetchingLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#31BCFF]"></div>
            </div>
        )
    }

    const { generalSettings } = useInvoiceGeneralSettings();

    useEffect(() => {
        if (generalSettings?.defaultDueDays) {
            setFormData(prev => ({
                ...prev,
                customerPaymentTerm: {
                    dueDateType: "DAYS_AFTER",
                    dueDateValue: generalSettings.defaultDueDays,
                    dueDateUnit: "DAYS"
                }
            }))
        }
    }, [generalSettings])

    const safePaymentTerm: InvoicePaymentTerms =
        formData.customerPaymentTerm ?? {
            dueDateType: "DAYS_AFTER",
            dueDateValue: generalSettings?.defaultDueDays ?? 14,
            dueDateUnit: "DAYS",
        }

    return (
        <div className="space-y-6">
            {/* Header Section */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            {/* <Link
                                href="/dashboard/customers"
                                className="p-2 hover:bg-white/50 rounded-lg transition-colors"
                            > */}
                            <button onClick={handleBack}>
                                <ArrowLeftIcon className="w-5 h-5 text-gray-600" />
                            </button>
                            {/* </Link> */}
                            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                                {overviewMode ? "View Customer" : "Edit Customer"}
                            </h1>
                        </div>
                        <p className="mt-2 text-gray-600 ml-14">
                            {overviewMode ? "Viewing customer details" : "Update the customer information"}
                        </p>
                    </div>
                    <div className="hidden md:flex items-center space-x-2">
                        <CustomerFieldSettingsDialog initialSettings={visibleFields}
                            onSettingsSaved={(newSettings) => {
                                setVisibleFields(newSettings);
                            }} onRefresh={refetch} />
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
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="flex justify-end items-center gap-3 mt-8">
                        <input
                            id="active"
                            type="checkbox"
                            checked={formData.active}
                            onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                            className="h-5 w-5 text-[#31BCFF] border-gray-300 rounded focus:ring-[#31BCFF]/50"
                        />
                        <label htmlFor="active" className="text-sm font-medium text-gray-700">
                            Active
                        </label>
                    </div>
                    {/* Row 1: Customer Name + Customer Number (always visible) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label htmlFor="customerName" className="block text-sm font-medium text-gray-700 mb-2">
                                Customer Name *
                            </label>
                            <input
                                type="text"
                                id="customerName"
                                required
                                value={formData.customerName}
                                onChange={(e) => {
                                    setFormData({ ...formData, customerName: e.target.value })
                                    debouncedValidation("customerName", e.target.value)
                                }}
                                onBlur={(e) => validateField("customerName", e.target.value)}
                                className={`block w-full px-4 py-3 rounded-xl border ${validationErrors.customerName ? "border-red-500" : "border-gray-300"
                                    } bg-white/70 backdrop-blur-sm text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-[#31BCFF]/50 focus:border-[#31BCFF] transition-all duration-200`}
                                placeholder="Customer name"
                            />
                            {validationErrors.customerName && (
                                <p className="mt-1 text-sm text-red-600">{validationErrors.customerName}</p>
                            )}
                        </div>

                        <div>
                            <label htmlFor="customerNumber" className="block text-sm font-medium text-gray-700 mb-2">
                                Customer Number *
                            </label>
                            <input
                                type="text"
                                id="customerNumber"
                                required
                                value={formatCustomerNumberForDisplay(formData.customerNumber)}
                                onChange={(e) => {
                                    setFormData({ ...formData, customerNumber: e.target.value })
                                    debouncedValidation("customerNumber", e.target.value)
                                }}
                                onBlur={(e) => validateField("customerNumber", e.target.value)}
                                className={`block w-full px-4 py-3 rounded-xl border ${validationErrors.customerNumber ? "border-red-500" : "border-gray-300"
                                    } bg-white/70 backdrop-blur-sm text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-[#31BCFF]/50 focus:border-[#31BCFF] transition-all duration-200`}
                                placeholder="Customer number"
                            />
                            {validationErrors.customerNumber && (
                                <p className="mt-1 text-sm text-red-600">{validationErrors.customerNumber}</p>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-6">
                        {settings.showOrganizationNumber && (
                            <div className="grow basis-[calc(50%-12px)] min-w-[250px]">
                                <label htmlFor="organizationNumber" className="block text-sm font-medium text-gray-700 mb-2">
                                    Organization Number
                                </label>
                                <input
                                    type="text"
                                    id="organizationNumber"
                                    value={formData.organizationNumber}
                                    onChange={(e) => {
                                        setFormData({ ...formData, organizationNumber: e.target.value })
                                        debouncedValidation("organizationNumber", e.target.value)
                                    }}
                                    onBlur={(e) => validateField("organizationNumber", e.target.value)}
                                    className={`block w-full px-4 py-3 rounded-xl border ${validationErrors.organizationNumber ? "border-red-500" : "border-gray-300"
                                        } bg-white/70 backdrop-blur-sm text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-[#31BCFF]/50 focus:border-[#31BCFF] transition-all duration-200`}
                                    placeholder="Organization number"
                                />
                                {validationErrors.organizationNumber && (
                                    <p className="mt-1 text-sm text-red-600">{validationErrors.organizationNumber}</p>
                                )}
                            </div>
                        )}

                        {settings.showAddress && (
                            <div className="grow basis-[calc(50%-12px)] min-w-[250px]">
                                <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
                                    Address
                                </label>
                                <input
                                    type="text"
                                    id="address"
                                    value={formData.address}
                                    onChange={(e) => {
                                        setFormData({ ...formData, address: e.target.value })
                                        debouncedValidation("address", e.target.value)
                                    }}
                                    onBlur={(e) => validateField("address", e.target.value)}
                                    className={`block w-full px-4 py-3 rounded-xl border ${validationErrors.address ? "border-red-500" : "border-gray-300"
                                        } bg-white/70 backdrop-blur-sm text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-[#31BCFF]/50 focus:border-[#31BCFF] transition-all duration-200`}
                                    placeholder="Address"
                                />
                                {validationErrors.address && <p className="mt-1 text-sm text-red-600">{validationErrors.address}</p>}
                            </div>
                        )}

                        {settings.showAddress && (
                            <div className="grow basis-[calc(50%-12px)] min-w-[250px]">
                                <label htmlFor="postalCode" className="block text-sm font-medium text-gray-700 mb-2">
                                    Postal Code
                                </label>
                                <input
                                    type="text"
                                    id="postalCode"
                                    value={formData.postalCode}
                                    onChange={(e) => {
                                        setFormData({ ...formData, postalCode: e.target.value })
                                        debouncedValidation("postalCode", e.target.value)
                                    }}
                                    onBlur={(e) => validateField("postalCode", e.target.value)}
                                    className={`block w-full px-4 py-3 rounded-xl border ${validationErrors.postalCode ? "border-red-500" : "border-gray-300"
                                        } bg-white/70 backdrop-blur-sm text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-[#31BCFF]/50 focus:border-[#31BCFF] transition-all duration-200`}
                                    placeholder="Postal code"
                                />
                                {validationErrors.postalCode && (
                                    <p className="mt-1 text-sm text-red-600">{validationErrors.postalCode}</p>
                                )}
                            </div>
                        )}

                        {settings.showAddress && (
                            <div className="grow basis-[calc(50%-12px)] min-w-[250px]">
                                <label htmlFor="postalAddress" className="block text-sm font-medium text-gray-700 mb-2">
                                    Postal Address
                                </label>
                                <input
                                    type="text"
                                    id="postalAddress"
                                    value={formData.postalAddress}
                                    onChange={(e) => {
                                        setFormData({ ...formData, postalAddress: e.target.value })
                                        debouncedValidation("postalAddress", e.target.value)
                                    }}
                                    onBlur={(e) => validateField("postalAddress", e.target.value)}
                                    className={`block w-full px-4 py-3 rounded-xl border ${validationErrors.postalAddress ? "border-red-500" : "border-gray-300"
                                        } bg-white/70 backdrop-blur-sm text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-[#31BCFF]/50 focus:border-[#31BCFF] transition-all duration-200`}
                                    placeholder="Postal address"
                                />
                                {validationErrors.postalAddress && (
                                    <p className="mt-1 text-sm text-red-600">{validationErrors.postalAddress}</p>
                                )}
                            </div>
                        )}

                        {settings.showPhoneNumber && (
                            <div className="grow basis-[calc(50%-12px)] min-w-[250px]">
                                <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-2">
                                    Phone Number
                                </label>
                                <input
                                    type="text"
                                    id="phoneNumber"
                                    value={formData.phoneNumber}
                                    onChange={(e) => {
                                        setFormData({ ...formData, phoneNumber: e.target.value })
                                        debouncedValidation("phoneNumber", e.target.value)
                                    }}
                                    onBlur={(e) => validateField("phoneNumber", e.target.value)}
                                    className={`block w-full px-4 py-3 rounded-xl border ${validationErrors.phoneNumber ? "border-red-500" : "border-gray-300"
                                        } bg-white/70 backdrop-blur-sm text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-[#31BCFF]/50 focus:border-[#31BCFF] transition-all duration-200`}
                                    placeholder="Phone number"
                                />
                                {validationErrors.phoneNumber && (
                                    <p className="mt-1 text-sm text-red-600">{validationErrors.phoneNumber}</p>
                                )}
                            </div>
                        )}

                        {settings.showEmail && (
                            <div className="grow basis-[calc(50%-12px)] min-w-[250px]">
                                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                                    Email
                                </label>
                                <input
                                    type="email"
                                    id="email"
                                    value={formData.email}
                                    onChange={(e) => {
                                        setFormData({ ...formData, email: e.target.value })
                                        debouncedValidation("email", e.target.value)
                                    }}
                                    onBlur={(e) => validateField("email", e.target.value)}
                                    className={`block w-full px-4 py-3 rounded-xl border ${validationErrors.email ? "border-red-500" : "border-gray-300"
                                        } bg-white/70 backdrop-blur-sm text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-[#31BCFF]/50 focus:border-[#31BCFF] transition-all duration-200`}
                                    placeholder="Email address"
                                />
                                {validationErrors.email && <p className="mt-1 text-sm text-red-600">{validationErrors.email}</p>}
                            </div>
                        )}

                        {settings.showDiscountPercentage && (
                            <div className="grow basis-[calc(50%-12px)] min-w-[250px]">
                                <label htmlFor="discountPercentage" className="block text-sm font-medium text-gray-700 mb-2">
                                    Discount Percentage
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    id="discountPercentage"
                                    value={formData.discountPercentage}
                                    onChange={(e) => {
                                        setFormData({ ...formData, discountPercentage: e.target.value })
                                        debouncedValidation("discountPercentage", e.target.value)
                                    }}
                                    onBlur={(e) => validateField("discountPercentage", e.target.value)}
                                    className={`block w-full px-4 py-3 rounded-xl border ${validationErrors.discountPercentage ? "border-red-500" : "border-gray-300"
                                        } bg-white/70 backdrop-blur-sm text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-[#31BCFF]/50 focus:border-[#31BCFF] transition-all duration-200`}
                                    placeholder="e.g., 10.00"
                                />
                                {validationErrors.discountPercentage && (
                                    <p className="mt-1 text-sm text-red-600">{validationErrors.discountPercentage}</p>
                                )}
                            </div>
                        )}

                        {settings.showDeliveryAddress && (
                            <div className="grow basis-[calc(50%-12px)] min-w-[250px]">
                                <label htmlFor="deliveryAddress" className="block text-sm font-medium text-gray-700 mb-2">
                                    Delivery Address
                                </label>
                                <input
                                    type="text"
                                    id="deliveryAddress"
                                    value={formData.deliveryAddress}
                                    onChange={(e) => {
                                        setFormData({ ...formData, deliveryAddress: e.target.value })
                                        debouncedValidation("deliveryAddress", e.target.value)
                                    }}
                                    onBlur={(e) => validateField("deliveryAddress", e.target.value)}
                                    className={`block w-full px-4 py-3 rounded-xl border ${validationErrors.deliveryAddress ? "border-red-500" : "border-gray-300"
                                        } bg-white/70 backdrop-blur-sm text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-[#31BCFF]/50 focus:border-[#31BCFF] transition-all duration-200`}
                                    placeholder="Delivery address"
                                />
                                {validationErrors.deliveryAddress && (
                                    <p className="mt-1 text-sm text-red-600">{validationErrors.deliveryAddress}</p>
                                )}
                            </div>
                        )}

                        {settings.showDeliveryAddress && (
                            <div className="grow basis-[calc(50%-12px)] min-w-[250px]">
                                <label htmlFor="deliveryAddressPostalCode" className="block text-sm font-medium text-gray-700 mb-2">
                                    Delivery Address Postal Code
                                </label>
                                <input
                                    type="text"
                                    id="deliveryAddressPostalCode"
                                    value={formData.deliveryAddressPostalCode}
                                    onChange={(e) => {
                                        setFormData({ ...formData, deliveryAddressPostalCode: e.target.value })
                                        debouncedValidation("deliveryAddressPostalCode", e.target.value)
                                    }}
                                    onBlur={(e) => validateField("deliveryAddressPostalCode", e.target.value)}
                                    className={`block w-full px-4 py-3 rounded-xl border ${validationErrors.deliveryAddressPostalCode ? "border-red-500" : "border-gray-300"
                                        } bg-white/70 backdrop-blur-sm text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-[#31BCFF]/50 focus:border-[#31BCFF] transition-all duration-200`}
                                    placeholder="Postal code for delivery"
                                />
                                {validationErrors.deliveryAddressPostalCode && (
                                    <p className="mt-1 text-sm text-red-600">{validationErrors.deliveryAddressPostalCode}</p>
                                )}
                            </div>
                        )}

                        {settings.showDepartment && (
                            <div className="grow basis-[calc(50%-12px)] min-w-[250px]">
                                <label htmlFor="departmentId" className="block text-sm font-medium text-gray-700 mb-2">
                                    Department *
                                </label>
                                <select
                                    id="departmentId"
                                    value={formData.departmentId || ""}
                                    onChange={(e) => {
                                        setFormData({ ...formData, departmentId: e.target.value })
                                        debouncedValidation("departmentId", e.target.value)
                                    }}
                                    onBlur={(e) => validateField("departmentId", e.target.value)}
                                    className={`block w-full px-4 py-3 rounded-xl border ${validationErrors.departmentId ? "border-red-500" : "border-gray-300"
                                        } bg-white/70 backdrop-blur-sm text-gray-900 focus:ring-2 focus:ring-[#31BCFF]/50 focus:border-[#31BCFF] transition-all duration-200`}
                                >
                                    <option value="">Select Department</option>
                                    {departments.map((dep) => (
                                        <option key={dep.id} value={dep.id}>
                                            {dep.name}
                                        </option>
                                    ))}
                                </select>
                                {validationErrors.departmentId && (
                                    <p className="mt-1 text-sm text-red-600">{validationErrors.departmentId}</p>
                                )}
                            </div>
                        )}

                        {settings.showDeliveryAddress && (
                            <div className="grow basis-[calc(50%-12px)] min-w-[250px]">
                                <label htmlFor="deliveryAddressPostalAddress" className="block text-sm font-medium text-gray-700 mb-2">
                                    Delivery Address Postal Address
                                </label>
                                <input
                                    type="text"
                                    id="deliveryAddressPostalAddress"
                                    value={formData.deliveryAddressPostalAddress}
                                    onChange={(e) => {
                                        setFormData({ ...formData, deliveryAddressPostalAddress: e.target.value })
                                        debouncedValidation("deliveryAddressPostalAddress", e.target.value)
                                    }}
                                    onBlur={(e) => validateField("deliveryAddressPostalAddress", e.target.value)}
                                    className={`block w-full px-4 py-3 rounded-xl border ${validationErrors.deliveryAddressPostalAddress ? "border-red-500" : "border-gray-300"
                                        } bg-white/70 backdrop-blur-sm text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-[#31BCFF]/50 focus:border-[#31BCFF] transition-all duration-200`}
                                    placeholder="Postal address for delivery"
                                />
                                {validationErrors.deliveryAddressPostalAddress && (
                                    <p className="mt-1 text-sm text-red-600">{validationErrors.deliveryAddressPostalAddress}</p>
                                )}
                            </div>
                        )}
                    </div>

                    {settings.showInvoicePaymentTerms &&
                        <CustomerPaymentTermComponent
                            value={{
                                dueDateType: safePaymentTerm.dueDateType,
                                daysAfter:
                                    safePaymentTerm.dueDateType === "DAYS_AFTER"
                                        ? safePaymentTerm.dueDateValue
                                        : undefined,
                                fixedDateDay:
                                    safePaymentTerm.dueDateType === "FIXED_DATE"
                                        ? safePaymentTerm.dueDateValue
                                        : undefined,
                                unit: safePaymentTerm.dueDateUnit,
                            }}
                            onSettingsChange={(settings) => {
                                setFormData(prev => {
                                    const previous = prev.customerPaymentTerm ?? safePaymentTerm

                                    const updatedPaymentTerm: InvoicePaymentTerms = {
                                        dueDateType: settings.dueDateType,

                                        dueDateValue:
                                            settings.dueDateType === "DAYS_AFTER"
                                                ? settings.daysAfter ?? previous.dueDateValue
                                                : settings.fixedDateDay ?? previous.dueDateValue,

                                        dueDateUnit:
                                            settings.dueDateType === "DAYS_AFTER"
                                                ? settings.unit ?? previous.dueDateUnit
                                                : "MONTHS",
                                    }

                                    return {
                                        ...prev,
                                        customerPaymentTerm: updatedPaymentTerm,
                                    }
                                })
                            }}
                        />
                    }

                    {settings.showContactPerson && <CustomerContactComponent
                        defaultValues={formData.customerContacts}
                        oncustomerContactsChange={(customerContacts) => {
                            setFormData({ ...formData, customerContacts: customerContacts });
                            console.log('FormData of Customer Contact:', formData);
                        }}
                    />}
                    {/* After CustomerContactComponent */}
                    {validationErrors.customerContacts && (
                        <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-sm text-red-600">{validationErrors.customerContacts}</p>
                        </div>
                    )}

                    {/* Form Actions */}
                    <div className="flex items-center justify-end gap-4 pt-6 border-t border-gray-200">
                        <Link
                            href="/dashboard/customers"
                            className="px-6 py-3 rounded-xl border border-gray-300 bg-white text-gray-700 font-medium hover:bg-gray-50 transition-colors duration-200"
                        >
                            Cancel
                        </Link>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#31BCFF] to-[#0EA5E9] text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                        >
                            {loading ? 'Updating...' : 'Update Customer'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
