'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import Link from 'next/link'
import { ArrowLeftIcon, ArrowDownIcon } from '@heroicons/react/24/outline'
import Swal from 'sweetalert2'

interface Customer {
    id: string
    customerName: string
}

interface Invoice {
    id: string
    productName: string
}

export default function CreateInvoicePage() {
    const router = useRouter()
    const { t } = useTranslation()
    const [loading, setLoading] = useState(false)
    const [customers, setCustomers] = useState<Customer[]>([])
    const [products, setProducts] = useState<Invoice[]>([])
    const [showDropdown, setShowDropdown] = useState(false)
    const [formData, setFormData] = useState({
        customerId: '',
        productId: '',
        quantity: 0,
        pricePerUnit: 0.0,
        discountPercentage: 0,
        notes: ''
    })
  const [emailSendLoading, setEmailSendLoading] = useState(false);

    useEffect(() => {
        fetchCustomers()
        fetchProducts()
    }, [])

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

    const exportToPDF = async (invoiceId: string) => {
        try {
            const response = await fetch(`/api/invoices/export/pdf?invoiceId=${invoiceId}`)
            
            if (response.ok) {
                const blob = await response.blob()
                const url = window.URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `invoice_${invoiceId}.pdf`
                a.click()
                window.URL.revokeObjectURL(url)
                
                return true
            } else {
                console.error('Failed to export PDF')
                return false
            }
        } catch (error) {
            console.error('Error exporting PDF:', error)
            return false
        }
    }

    const sendEmail = async (invoiceId: string) => {
        try {
            const response = await fetch('/api/invoices/email/send', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ 
                    invoiceId: invoiceId,
                  }),
                })
            
            if (response.ok) {
               Swal.fire({
                   title: 'Success!',
                   text: 'Invoice created and sent email to the customer!',
                   icon: 'success',
                   toast: true,
                   position: 'top-end',
                   showConfirmButton: false,
                   timer: 3000,
                   timerProgressBar: true
                  });
            } else {
               const data = await response.json();
               throw new Error(data.error || 'Failed to send invite');
            }
        } catch (error) {
            console.error('Error sending invite:', error);
                Swal.fire({
                  title: 'Partial Success!',
                  text: 'Invoice created but Email functionality failed!',
                  icon: 'info',
                  toast: true,
                  position: 'top-end',
                  showConfirmButton: false,
                  timer: 3000,
                  timerProgressBar: true
                });
        }
    }

    const handleSubmit = async (e: React.FormEvent,action: 'save' | 'print' | 'email') => {
        e.preventDefault()
        setLoading(true)

        try {
            const res = await fetch('/api/invoices', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            })

            if (!res.ok) {
                const error = await res.json()
                throw new Error(error.error || 'Failed to create product')
            }
             const createdInvoice = await res.json()

            // Handle different actions
            if (action === 'print') {
                const pdfSuccess = await exportToPDF(createdInvoice.id)
                
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
            } else if (action === 'email') {
                // Placeholder for email functionality
                await sendEmail(createdInvoice.id);
                
            } else {
                await Swal.fire({
                    title: 'Success!',
                    text: 'Invoice created successfully',
                    icon: 'success',
                    confirmButtonColor: '#31BCFF',
                })
            }

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
                                Create Invoice
                            </h1>
                        </div>
                        <p className="mt-2 text-gray-600 ml-14">
                            Add a new invoice to send
                        </p>
                    </div>
                    <div className="hidden md:flex items-center space-x-2">
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
                <form onSubmit={(e) => { e.preventDefault(); handleSubmit(e,'save'); }} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Customer && Invoice */}
                        <div>
                            <label htmlFor="customerId" className="block text-sm font-medium text-gray-700 mb-2">
                                Customers *
                            </label>
                            <select
                                id="customerId"
                                required
                                value={formData.customerId || ''}
                                onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                                className="block w-full px-4 py-3 rounded-xl border border-gray-300 bg-white/70 backdrop-blur-sm text-gray-900 focus:ring-2 focus:ring-[#31BCFF]/50 focus:border-[#31BCFF] transition-all duration-200"
                            >
                                <option value="">Select Invoice Group</option>
                                {customers.map((cus) => (
                                    <option key={cus.id} value={cus.id}>
                                        {cus.customerName}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label htmlFor="productId" className="block text-sm font-medium text-gray-700 mb-2">
                                Products *
                            </label>
                            <select
                                id="productId"
                                required
                                value={formData.productId || ''}
                                onChange={(e) => setFormData({ ...formData, productId: e.target.value })}
                                className="block w-full px-4 py-3 rounded-xl border border-gray-300 bg-white/70 backdrop-blur-sm text-gray-900 focus:ring-2 focus:ring-[#31BCFF]/50 focus:border-[#31BCFF] transition-all duration-200"
                            >
                                <option value="">Select Sales Account</option>
                                {products.map((pr) => (
                                    <option key={pr.id} value={pr.id}>
                                        {pr.productName}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* quantity & pricePerUnit */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label htmlFor="salesPrice" className="block text-sm font-medium text-gray-700 mb-2">
                                Quantity *
                            </label>
                            <input
                                type="number"
                                id="quantity"
                                required
                                min="1"
                                value={formData.quantity || ""}
                                onChange={(e) => setFormData({ ...formData, quantity: parseFloat(e.target.value) })}
                                className="block w-full px-4 py-3 rounded-xl border border-gray-300 bg-white/70 backdrop-blur-sm text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-[#31BCFF]/50 focus:border-[#31BCFF] transition-all duration-200"
                                placeholder="Enter the quantity"
                            />
                        </div>

                        <div>
                            <label htmlFor="costPrice" className="block text-sm font-medium text-gray-700 mb-2">
                                Price Per Unit *
                            </label>
                            <input
                                type="number"
                                id="pricePerUnit"
                                required
                                step="0.01"
                                value={formData.pricePerUnit || ""}
                                onChange={(e) => setFormData({ ...formData, pricePerUnit: parseFloat(e.target.value) })}
                                className="block w-full px-4 py-3 rounded-xl border border-gray-300 bg-white/70 backdrop-blur-sm text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-[#31BCFF]/50 focus:border-[#31BCFF] transition-all duration-200"
                                placeholder="Enter price per unit"
                            />
                        </div>
                    </div>

                    {/* discountPercentage & note */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label htmlFor="salesPrice" className="block text-sm font-medium text-gray-700 mb-2">
                                Discount Percentage *
                            </label>
                            <input
                                type="number"
                                id="discountPercentage"
                                step="0.01"
                                min="0"
                                max="100"
                                required
                                value={formData.discountPercentage || ""}
                                onChange={(e) => setFormData({ ...formData, discountPercentage: parseFloat(e.target.value) })}
                                className="block w-full px-4 py-3 rounded-xl border border-gray-300 bg-white/70 backdrop-blur-sm text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-[#31BCFF]/50 focus:border-[#31BCFF] transition-all duration-200"
                                placeholder="Enter discount percentage"
                            />
                        </div>

                        <div>
                            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
                                Notes
                            </label>
                            <input
                                type="text"
                                id="notes"
                                value={formData.notes || ""}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                className="block w-full px-4 py-3 rounded-xl border border-gray-300 bg-white/70 backdrop-blur-sm text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-[#31BCFF]/50 focus:border-[#31BCFF] transition-all duration-200"
                                placeholder="Enter notes"
                            />
                        </div>
                    </div>

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
                                {loading ? 'Creating...' : 'Create Invoice'}
                            </button>
                            
                            <button
                                type="button"
                                disabled={loading}
                                onClick={() => setShowDropdown(!showDropdown)}
                                className="px-3 py-3 rounded-r-xl bg-gradient-to-r from-[#0EA5E9] to-[#0284C7] text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200 border-l border-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <ArrowDownIcon className="w-5 h-5" />
                            </button>
                            
                            {/* Dropdown Menu */}
                            {showDropdown && (
                                <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-200 py-2 z-10">
                                    <button
                                        type="button"
                                        onClick={(e) => {e.preventDefault();handleSubmit(e,'print')}}
                                        disabled={loading}
                                        className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                        </svg>
                                        <span className="text-gray-700 font-medium">Print</span>
                                    </button>
                                    
                                    <button
                                        type="button"
                                        onClick={(e) => {e.preventDefault();handleSubmit(e,'email')}}
                                        disabled={loading}
                                        className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                        </svg>
                                        <span className="text-gray-700 font-medium">Send by Email</span>
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
